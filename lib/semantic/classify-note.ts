import type { denizApi } from "@/lib/api-wrapper";
import type { INote, INoteGroup } from "@/lib/data-types";
import { buildContentHash, buildSemanticInput } from "./content";
import { embedTexts } from "./embedding";

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
}: {
  api: denizApi;
  note: INote;
  groups: INoteGroup[];
}) {
  const input = buildSemanticInput(note, groups);
  const embedding = await embedTexts([input], {
    provider: "transformers-local",
    allowFallback: false,
  });
  const contentHash = buildContentHash(note, groups, embedding.model);

  const result = await api.POST<ClassifyNoteResponse>({
    endpoint: `semantic/notes/${note._id}/classify`,
    body: {
      model: embedding.model,
      dimension: embedding.dimension,
      vector: embedding.embeddings[0],
      contentHash,
      inputTextPreview: input.slice(0, 500),
    },
  });

  if (isApiError(result)) {
    throw new Error(result.message);
  }

  return result;
}
