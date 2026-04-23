"use client";

import { useMemo } from "react";
import {
  KnowledgeGraph,
  type KnowledgeGraphLinkData,
  type KnowledgeGraphNodeData,
} from "@/components/graph/knowledge-graph";
import { classColor } from "@/lib/bookmark-color";
import type { INote, INoteEdge, INoteGroup } from "@/lib/data-types";

interface Props {
  notes: INote[];
  groups: INoteGroup[];
  edges: INoteEdge[];
  onSelectNote: (note: INote) => void;
  onSelectGroup: (group: INoteGroup) => void;
}

function themeScheme() {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function NoteGraph({
  notes,
  groups,
  edges,
  onSelectNote,
  onSelectGroup,
}: Props) {
  const data = useMemo(() => {
    const scheme = themeScheme();
    const visibleNoteIds = new Set(notes.map((note) => note._id));
    const groupMemberCount = new Map<string, number>();

    for (const note of notes) {
      for (const groupId of note.groupIds) {
        groupMemberCount.set(groupId, (groupMemberCount.get(groupId) ?? 0) + 1);
      }
    }

    const noteEdgeCount = new Map<string, number>();
    for (const edge of edges) {
      if (visibleNoteIds.has(edge.from) && visibleNoteIds.has(edge.to)) {
        noteEdgeCount.set(edge.from, (noteEdgeCount.get(edge.from) ?? 0) + 1);
        noteEdgeCount.set(edge.to, (noteEdgeCount.get(edge.to) ?? 0) + 1);
      }
    }

    const nodes: KnowledgeGraphNodeData<INote, INoteGroup>[] = [
      ...notes.map((note) => {
        const connections =
          (noteEdgeCount.get(note._id) ?? 0) + note.groupIds.length;

        return {
          id: note._id,
          label: note.title,
          type: "item" as const,
          val: 0.6 + connections * 0.24,
          color: note.class
            ? classColor(note.class, scheme)
            : classColor(note.siteName ?? note.title, scheme),
          item: note,
        };
      }),
      ...groups.map((group) => ({
        id: `group:${group._id}`,
        label: group.name,
        type: "group" as const,
        val: 4 + (groupMemberCount.get(group._id) ?? 0) * 1.2,
        color: group.color ?? classColor(group.name, scheme),
        group,
      })),
    ];

    const links: KnowledgeGraphLinkData[] = [];

    for (const note of notes) {
      for (const groupId of note.groupIds) {
        if (groups.some((group) => group._id === groupId)) {
          links.push({
            source: note._id,
            target: `group:${groupId}`,
            type: "membership",
            strength: 1,
          });
        }
      }
    }

    for (const group of groups) {
      if (
        group.parentId &&
        groups.some((parent) => parent._id === group.parentId)
      ) {
        links.push({
          source: `group:${group._id}`,
          target: `group:${group.parentId}`,
          type: "membership",
          strength: 1,
        });
      }
    }

    for (const edge of edges) {
      if (visibleNoteIds.has(edge.from) && visibleNoteIds.has(edge.to)) {
        links.push({
          source: edge.from,
          target: edge.to,
          type: "relation",
          strength: edge.strength,
        });
      }
    }

    return { nodes, links };
  }, [notes, groups, edges]);

  return (
    <KnowledgeGraph
      nodes={data.nodes}
      links={data.links}
      onSelectItem={onSelectNote}
      onSelectGroup={onSelectGroup}
      onRelationClick={(sourceId) => {
        const note = notes.find((candidate) => candidate._id === sourceId);
        if (note) onSelectNote(note);
      }}
    />
  );
}
