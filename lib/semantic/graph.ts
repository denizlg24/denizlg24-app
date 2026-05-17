import type {
  INote,
  INoteEmbedding,
  INoteGroup,
  ISemanticSuggestion,
} from "@/lib/data-types";
import {
  SEMANTIC_CLUSTER_K,
  SEMANTIC_CLUSTER_MIN_SIZE,
  SEMANTIC_MIN_SIMILARITY,
  SEMANTIC_STRONG_SIMILARITY,
  SEMANTIC_TOP_K,
} from "./constants";

export interface SemanticEdgeDraft {
  from: string;
  to: string;
  strength: number;
  similarity: number;
  reason: string;
  mutual: boolean;
}

export function cosine(left: number[], right: number[]) {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftNorm += leftValue * leftValue;
    rightNorm += rightValue * rightValue;
  }

  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / Math.sqrt(leftNorm * rightNorm);
}

export function buildSemanticEdges(embeddings: INoteEmbedding[]) {
  const topKByNote = new Map<
    string,
    { noteId: string; similarity: number; rank: number }[]
  >();

  for (const source of embeddings) {
    const ranked = embeddings
      .filter((candidate) => candidate.noteId !== source.noteId)
      .map((candidate) => ({
        noteId: candidate.noteId,
        similarity: cosine(source.vector, candidate.vector),
      }))
      .filter((candidate) => candidate.similarity >= SEMANTIC_MIN_SIMILARITY)
      .sort((left, right) => right.similarity - left.similarity)
      .slice(0, SEMANTIC_TOP_K)
      .map((candidate, index) => ({ ...candidate, rank: index + 1 }));

    topKByNote.set(source.noteId, ranked);
  }

  const clusterRankByNote = new Map<string, Map<string, number>>();
  for (const [noteId, neighbors] of topKByNote) {
    const ranks = new Map<string, number>();
    for (const neighbor of neighbors.slice(0, SEMANTIC_CLUSTER_K)) {
      ranks.set(neighbor.noteId, neighbor.rank);
    }
    clusterRankByNote.set(noteId, ranks);
  }

  const edges = new Map<string, SemanticEdgeDraft>();

  for (const [sourceId, neighbors] of topKByNote) {
    for (const neighbor of neighbors) {
      const [from, to] =
        sourceId < neighbor.noteId
          ? [sourceId, neighbor.noteId]
          : [neighbor.noteId, sourceId];
      const key = `${from}:${to}`;
      const existing = edges.get(key);
      if (existing && existing.similarity >= neighbor.similarity) continue;

      const mutual = Boolean(
        clusterRankByNote.get(sourceId)?.has(neighbor.noteId) &&
          clusterRankByNote.get(neighbor.noteId)?.has(sourceId),
      );

      edges.set(key, {
        from,
        to,
        similarity: neighbor.similarity,
        strength: neighbor.similarity,
        mutual,
        reason: mutual
          ? "Mutual nearest neighbours"
          : neighbor.similarity >= SEMANTIC_STRONG_SIMILARITY
            ? "Strong semantic overlap"
            : "Related by semantic similarity",
      });
    }
  }

  return [...edges.values()];
}

export function findClusters(edges: SemanticEdgeDraft[]) {
  const adjacency = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!edge.mutual) continue;
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, new Set());
    if (!adjacency.has(edge.to)) adjacency.set(edge.to, new Set());
    adjacency.get(edge.from)?.add(edge.to);
    adjacency.get(edge.to)?.add(edge.from);
  }

  const clusters: string[][] = [];
  const visited = new Set<string>();

  for (const noteId of adjacency.keys()) {
    if (visited.has(noteId)) continue;
    const stack = [noteId];
    const cluster: string[] = [];
    visited.add(noteId);

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      cluster.push(current);
      for (const next of adjacency.get(current) ?? []) {
        if (visited.has(next)) continue;
        visited.add(next);
        stack.push(next);
      }
    }

    if (cluster.length >= SEMANTIC_CLUSTER_MIN_SIZE) clusters.push(cluster);
  }

  return clusters;
}

function groupPath(group: INoteGroup, groupsById: Map<string, INoteGroup>) {
  const parts = [group.name];
  let current = group.parentId ? groupsById.get(group.parentId) : undefined;

  while (current) {
    parts.unshift(current.name);
    current = current.parentId ? groupsById.get(current.parentId) : undefined;
  }

  return parts.join(" > ");
}

function pickClusterName(notes: INote[]) {
  const counts = new Map<string, number>();
  for (const note of notes) {
    for (const token of (note.title ?? "").toLowerCase().split(/[^a-z0-9]+/i)) {
      if (token.length < 4) continue;
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return best ? best[0].toUpperCase() + best.slice(1) : "Related Notes";
}

export function buildSuggestions({
  runId,
  notes,
  groups,
  edges,
}: {
  runId: string;
  notes: INote[];
  groups: INoteGroup[];
  edges: SemanticEdgeDraft[];
}) {
  const noteById = new Map(notes.map((note) => [note._id, note]));
  const groupsById = new Map(groups.map((group) => [group._id, group]));
  const clusters = findClusters(edges);
  const suggestions: Omit<
    ISemanticSuggestion,
    "_id" | "createdAt" | "updatedAt" | "status"
  >[] = [];

  for (const cluster of clusters) {
    const clusterNotes = cluster
      .map((noteId) => noteById.get(noteId))
      .filter((note): note is INote => Boolean(note));
    const parentCounts = new Map<string, number>();

    for (const note of clusterNotes) {
      for (const groupId of note.groupIds ?? []) {
        const group = groupsById.get(groupId);
        if (!group) continue;
        const root = groupPath(group, groupsById).split(" > ")[0];
        parentCounts.set(groupId, (parentCounts.get(groupId) ?? 0) + 1);
        if (root !== group.name) {
          const rootGroup = groups.find((candidate) => candidate.name === root);
          if (rootGroup) {
            parentCounts.set(
              rootGroup._id,
              (parentCounts.get(rootGroup._id) ?? 0) + 1,
            );
          }
        }
      }
    }

    const [parentId, count = 0] =
      [...parentCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    const confidence =
      clusterNotes.length > 0 ? count / clusterNotes.length : 0;

    if (parentId && confidence >= 0.5) {
      suggestions.push({
        runId,
        type: "create-group",
        source: "semantic",
        proposedParentId: parentId,
        proposedName: pickClusterName(clusterNotes),
        proposedDescription: `Generated from ${clusterNotes.length} related notes.`,
        confidence: Math.min(0.9, Math.max(0.55, confidence)),
        reason: `${clusterNotes.length} notes form a semantic cluster under ${groupsById.get(parentId)?.name ?? "this group"}.`,
      });
    }
  }

  for (const edge of edges.filter(
    (candidate) => candidate.similarity >= SEMANTIC_STRONG_SIMILARITY,
  )) {
    suggestions.push({
      runId,
      type: "add-edge",
      source: "semantic",
      noteId: edge.from,
      proposedRelatedNoteIds: [edge.to],
      confidence: edge.similarity,
      reason: edge.reason,
    });
  }

  return suggestions;
}
