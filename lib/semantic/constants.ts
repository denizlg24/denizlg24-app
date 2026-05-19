export type SemanticEmbeddingProvider = "transformers-local" | "hashing";

export const SEMANTIC_CLASSIFICATION_MODEL =
  "mixedbread-ai/mxbai-embed-large-v1";
export const SEMANTIC_CLASSIFICATION_DIMENSION = 1024;
export const SEMANTIC_SYNC_MODEL = "Xenova/multilingual-e5-base";
export const SEMANTIC_SYNC_DIMENSION = 768;
export const SEMANTIC_TRANSFORMERS_MODEL = SEMANTIC_CLASSIFICATION_MODEL;
export const SEMANTIC_TRANSFORMERS_DIMENSION =
  SEMANTIC_CLASSIFICATION_DIMENSION;
export const SEMANTIC_HASHING_MODEL = "local-hashing-384-v1";
export const SEMANTIC_HASHING_DIMENSION = 384;
export const SEMANTIC_MODEL = SEMANTIC_SYNC_MODEL;
export const SEMANTIC_DIMENSION = SEMANTIC_SYNC_DIMENSION;
export const SEMANTIC_TOP_K = 8;
export const SEMANTIC_CLUSTER_K = 4;
export const SEMANTIC_MIN_SIMILARITY = 0.72;
export const SEMANTIC_STRONG_SIMILARITY = 0.82;
export const SEMANTIC_CLUSTER_MIN_SIZE = 3;
export const SEMANTIC_MAX_GROUPS_PER_NOTE = 3;
