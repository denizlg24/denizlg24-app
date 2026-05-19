import type { denizApi } from "@/lib/api-wrapper";
import type { INote, INoteGroup } from "@/lib/data-types";
import { SEMANTIC_CLASSIFICATION_MODEL } from "./constants";
import {
  buildContentHash,
  buildSemanticInput,
  buildSemanticInputParts,
} from "./content";
import { embedWeightedSemanticParts } from "./embedding";

interface ClassifyNoteResponse {
  note: INote;
  groups: INoteGroup[];
  classification: {
    model: string;
    assignedGroupIds: string[];
    preservedGroupIds: string[];
    bestSimilarity: number;
  };
}

function isApiError<T>(value: T | { code: number; message: string }): value is {
  code: number;
  message: string;
} {
  return Boolean(value && typeof value === "object" && "code" in value);
}

export async function classifyNoteLocally({
  api,
  note,
  groups,
  signal,
}: {
  api: denizApi;
  note: INote;
  groups: INoteGroup[];
  signal?: AbortSignal;
}) {
  const input = buildSemanticInput(note, groups);
  const parts = buildSemanticInputParts(note, groups);
  if (signal?.aborted) throw new Error("Aborted");
  const embedding = await embedWeightedSemanticParts(parts, {
    provider: "transformers-local",
    model: SEMANTIC_CLASSIFICATION_MODEL,
    allowFallback: false,
  });
  if (signal?.aborted) throw new Error("Aborted");
  const contentHash = buildContentHash(note, groups, embedding.model);

  const result = await api.POST<ClassifyNoteResponse>({
    endpoint: `semantic/notes/${note._id}/classify`,
    body: {
      model: embedding.model,
      dimension: embedding.dimension,
      vector: embedding.embedding,
      contentHash,
      inputTextPreview: input.slice(0, 500),
    },
  });

  if (isApiError(result)) {
    throw new Error(result.message);
  }

  return result;
}
