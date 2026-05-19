import type { SemanticEmbeddingProvider } from "./constants";
import type { SemanticInputPart } from "./content";
import { embedTextsWithHashing } from "./embedding-hashing";
import { embedTextsWithTransformers } from "./embedding-transformers";

interface EmbedTextsOptions {
  provider?: SemanticEmbeddingProvider;
  model?: string;
  allowFallback?: boolean;
  onFallback?: (error: unknown) => void;
}

export async function embedTexts(
  texts: string[],
  {
    provider = "transformers-local",
    model,
    allowFallback = true,
    onFallback,
  }: EmbedTextsOptions = {},
) {
  if (provider === "hashing") return embedTextsWithHashing(texts);

  try {
    return await embedTextsWithTransformers(texts, model);
  } catch (error) {
    if (!allowFallback) throw error;
    onFallback?.(error);
    return embedTextsWithHashing(texts);
  }
}

function normalizeVector(vector: number[]) {
  const magnitude = Math.sqrt(
    vector.reduce((sum, value) => sum + value * value, 0),
  );
  if (magnitude === 0) return vector;
  return vector.map((value) => value / magnitude);
}

function weightedAverage(vectors: number[][], weights: number[]) {
  const dimension = vectors[0]?.length ?? 0;
  const output = Array.from({ length: dimension }, () => 0);
  let totalWeight = 0;

  for (const [index, vector] of vectors.entries()) {
    const weight = Math.max(weights[index] ?? 1, 0);
    if (weight === 0) continue;
    totalWeight += weight;

    for (
      let dimensionIndex = 0;
      dimensionIndex < dimension;
      dimensionIndex += 1
    ) {
      output[dimensionIndex] += (vector[dimensionIndex] ?? 0) * weight;
    }
  }

  if (totalWeight === 0) return normalizeVector(output);
  return normalizeVector(output.map((value) => value / totalWeight));
}

export async function embedWeightedSemanticParts(
  parts: SemanticInputPart[],
  options: EmbedTextsOptions = {},
) {
  const result = await embedTexts(
    parts.map((part) => part.text),
    options,
  );

  return {
    model: result.model,
    dimension: result.dimension,
    embedding: weightedAverage(
      result.embeddings,
      parts.map((part) => part.weight),
    ),
    provider: result.provider,
  };
}
