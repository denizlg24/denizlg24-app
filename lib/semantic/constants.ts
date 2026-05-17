export type SemanticEmbeddingProvider = "transformers-local" | "hashing";

export const SEMANTIC_TRANSFORMERS_MODEL = "Xenova/multilingual-e5-small";
export const SEMANTIC_HASHING_MODEL = "local-hashing-384-v1";
export const SEMANTIC_MODEL = SEMANTIC_TRANSFORMERS_MODEL;
export const SEMANTIC_DIMENSION = 384;
export const SEMANTIC_TOP_K = 8;
export const SEMANTIC_CLUSTER_K = 4;
export const SEMANTIC_MIN_SIMILARITY = 0.72;
export const SEMANTIC_STRONG_SIMILARITY = 0.82;
export const SEMANTIC_CLUSTER_MIN_SIZE = 3;
export const SEMANTIC_MAX_GROUPS_PER_NOTE = 3;
