import type { SemanticEmbeddingProvider } from "./constants";
import { embedTextsWithHashing } from "./embedding-hashing";
import { embedTextsWithTransformers } from "./embedding-transformers";

interface EmbedTextsOptions {
  provider?: SemanticEmbeddingProvider;
  allowFallback?: boolean;
  onFallback?: (error: unknown) => void;
}

export async function embedTexts(
  texts: string[],
  {
    provider = "transformers-local",
    allowFallback = true,
    onFallback,
  }: EmbedTextsOptions = {},
) {
  if (provider === "hashing") return embedTextsWithHashing(texts);

  try {
    return await embedTextsWithTransformers(texts);
  } catch (error) {
    if (!allowFallback) throw error;
    onFallback?.(error);
    return embedTextsWithHashing(texts);
  }
}
