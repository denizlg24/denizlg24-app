import type { denizApi } from "@/lib/api-wrapper";
import type {
  INote,
  INoteEmbedding,
  INoteGroup,
  ISemanticRun,
} from "@/lib/data-types";
import {
  SEMANTIC_CLUSTER_MIN_SIZE,
  SEMANTIC_HASHING_MODEL,
  SEMANTIC_MAX_GROUPS_PER_NOTE,
  SEMANTIC_MIN_SIMILARITY,
  SEMANTIC_MODEL,
  SEMANTIC_STRONG_SIMILARITY,
  SEMANTIC_TOP_K,
  type SemanticEmbeddingProvider,
} from "./constants";
import { buildContentHash, buildSemanticInput } from "./content";
import { embedTexts } from "./embedding";
import { buildSemanticEdges, buildSuggestions } from "./graph";

interface SemanticNotesResponse {
  notes: INote[];
  groups: INoteGroup[];
  embeddings?: INoteEmbedding[];
}

interface RunProgress {
  stage: string;
  current?: number;
  total?: number;
}

function isApiError<T>(value: T | { code: number; message: string }): value is {
  code: number;
  message: string;
} {
  return Boolean(value && typeof value === "object" && "code" in value);
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export async function runSemanticSync({
  api,
  onProgress,
  provider = "transformers-local",
}: {
  api: denizApi;
  onProgress?: (progress: RunProgress) => void;
  provider?: SemanticEmbeddingProvider;
}) {
  const preferredModel =
    provider === "hashing" ? SEMANTIC_HASHING_MODEL : SEMANTIC_MODEL;
  let activeModel = preferredModel;
  onProgress?.({ stage: "Creating semantic run" });
  const runResult = await api.POST<{ run: ISemanticRun }>({
    endpoint: "semantic/runs",
    body: {
      model: preferredModel,
      parameters: {
        topK: SEMANTIC_TOP_K,
        minSimilarity: SEMANTIC_MIN_SIMILARITY,
        strongSimilarity: SEMANTIC_STRONG_SIMILARITY,
        clusterMinSize: SEMANTIC_CLUSTER_MIN_SIZE,
        maxGroupsPerNote: SEMANTIC_MAX_GROUPS_PER_NOTE,
      },
    },
  });
  if (isApiError(runResult)) throw new Error(runResult.message);
  const runId = runResult.run._id;

  try {
    onProgress?.({ stage: "Loading notes" });
    const semanticResult = await api.GET<SemanticNotesResponse>({
      endpoint: "semantic/notes?status=all&includeEmbeddings=true",
    });
    if (isApiError(semanticResult)) throw new Error(semanticResult.message);
    const notes = semanticResult.notes ?? [];
    const groups = semanticResult.groups ?? [];
    const embeddings = semanticResult.embeddings ?? [];

    const existingEmbeddingByNoteId = new Map(
      embeddings
        .filter((embedding) => embedding.model === preferredModel)
        .map((embedding) => [embedding.noteId, embedding] as const),
    );

    const pending = notes
      .map((note) => ({
        note,
        input: buildSemanticInput(note, groups),
        contentHash: buildContentHash(note, groups, activeModel),
      }))
      .filter((item) => {
        const existing = existingEmbeddingByNoteId.get(item.note._id);
        return !existing || existing.contentHash !== item.contentHash;
      });

    const uploadedEmbeddings: INoteEmbedding[] = [
      ...embeddings.filter(
        (embedding) =>
          embedding.model === preferredModel &&
          notes.some((note) => note._id === embedding.noteId),
      ),
    ];

    const batches = chunk(pending, 32);
    let embeddedCount = 0;
    for (const batch of batches) {
      onProgress?.({
        stage: "Embedding notes",
        current: embeddedCount,
        total: pending.length,
      });
      let result: Awaited<ReturnType<typeof embedTexts>>;
      try {
        result = await embedTexts(
          batch.map((item) => item.input),
          {
            provider,
            allowFallback: true,
            onFallback: (error) => {
              console.warn("Falling back to hashing embeddings:", error);
            },
          },
        );
      } catch (error) {
        console.error("[semantic] embedTexts failed", error, {
          provider,
          batchSize: batch.length,
          inputPreview: batch[0]?.input?.slice(0, 200),
        });
        throw error;
      }
      activeModel = result.model;
      const payload = batch.map((item, index) => ({
        noteId: item.note._id,
        vector: result.embeddings[index],
        contentHash: item.contentHash,
        inputTextPreview: item.input.slice(0, 500),
      }));

      const uploadResult = await api.POST<{ updated: number }>({
        endpoint: "semantic/embeddings/bulk",
        body: {
          runId,
          model: result.model,
          dimension: result.dimension,
          embeddings: payload,
        },
      });
      if (isApiError(uploadResult)) throw new Error(uploadResult.message);

      for (const item of payload) {
        uploadedEmbeddings.push({
          noteId: item.noteId,
          model: result.model,
          dimension: result.dimension,
          vector: item.vector,
          contentHash: item.contentHash,
          updatedAt: new Date().toISOString(),
        });
      }
      embeddedCount += batch.length;
    }

    onProgress?.({ stage: "Building local semantic graph" });
    const latestEmbeddingByNoteId = new Map<string, INoteEmbedding>();
    for (const embedding of uploadedEmbeddings) {
      latestEmbeddingByNoteId.set(embedding.noteId, embedding);
    }
    const edges = buildSemanticEdges([...latestEmbeddingByNoteId.values()]);
    const buckets = [0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.01];
    const histogram = new Array(buckets.length).fill(0) as number[];
    for (const edge of edges) {
      const bucketIndex = buckets.findIndex((b) => edge.similarity < b);
      if (bucketIndex >= 0) histogram[bucketIndex] += 1;
    }
    console.log("[semantic] edge similarity histogram", {
      activeModel,
      totalEdges: edges.length,
      mutualEdges: edges.filter((e) => e.mutual).length,
      noteCount: notes.length,
      distribution: buckets.map((b, i) => `<${b}: ${histogram[i]}`),
      maxSimilarity: edges.reduce((m, e) => Math.max(m, e.similarity), 0),
      minSimilarity: edges.reduce((m, e) => Math.min(m, e.similarity), 1),
    });

    onProgress?.({ stage: "Generating suggestions" });
    const suggestions = buildSuggestions({
      runId,
      notes,
      groups,
      edges,
    }).filter((suggestion) => suggestion.type !== "add-edge");

    if (suggestions.length > 0) {
      const suggestionResult = await api.POST<{
        inserted: number;
        superseded: number;
      }>({
        endpoint: "semantic/suggestions/bulk",
        body: { runId, suggestions },
      });
      if (isApiError(suggestionResult))
        throw new Error(suggestionResult.message);
    }

    const completeResult = await api.POST<{ run: ISemanticRun }>({
      endpoint: `semantic/runs/${runId}/complete`,
      body: {
        status: "completed",
        embeddedCount,
        staleCount: pending.length,
        edgeCount: 0,
        clusterCount: suggestions.filter(
          (suggestion) => suggestion.type === "create-group",
        ).length,
      },
    });
    if (isApiError(completeResult)) throw new Error(completeResult.message);

    onProgress?.({ stage: "Complete" });
    return {
      run: completeResult.run,
      embeddedCount,
      edgeCount: 0,
      suggestionCount: suggestions.length,
    };
  } catch (error) {
    console.error("[semantic] runSemanticSync failed", error, {
      runId,
      stack: error instanceof Error ? error.stack : undefined,
    });
    await api.POST({
      endpoint: `semantic/runs/${runId}/complete`,
      body: {
        status: "failed",
        embeddedCount: 0,
        staleCount: 0,
        edgeCount: 0,
        clusterCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    throw error;
  }
}
