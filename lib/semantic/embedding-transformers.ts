import {
  env,
  type FeatureExtractionPipeline,
  pipeline,
} from "@huggingface/transformers";
import {
  SEMANTIC_CLASSIFICATION_DIMENSION,
  SEMANTIC_CLASSIFICATION_MODEL,
  SEMANTIC_SYNC_DIMENSION,
  SEMANTIC_SYNC_MODEL,
  SEMANTIC_TRANSFORMERS_DIMENSION,
  SEMANTIC_TRANSFORMERS_MODEL,
} from "./constants";

const extractorPromises = new Map<string, Promise<FeatureExtractionPipeline>>();
const MODEL_DIMENSIONS = new Map([
  [SEMANTIC_CLASSIFICATION_MODEL, SEMANTIC_CLASSIFICATION_DIMENSION],
  [SEMANTIC_SYNC_MODEL, SEMANTIC_SYNC_DIMENSION],
]);

async function getExtractor(model: string): Promise<FeatureExtractionPipeline> {
  const existing = extractorPromises.get(model);
  if (existing) return existing;

  const extractorPromise = (async () => {
    try {
      env.allowLocalModels = true;
      env.allowRemoteModels = true;
      env.useBrowserCache = true;
      console.log("[semantic] creating pipeline for", model);
      const extractor = await pipeline("feature-extraction", model);
      console.log("[semantic] pipeline ready", model);
      return extractor;
    } catch (error) {
      console.error("[semantic] transformers init failed", error);
      extractorPromises.delete(model);
      throw error;
    }
  })();

  extractorPromises.set(model, extractorPromise);
  return extractorPromise;
}

export async function embedTextsWithTransformers(
  texts: string[],
  model = SEMANTIC_TRANSFORMERS_MODEL,
) {
  const extractor = await getExtractor(model);
  const embeddings: number[][] = [];
  const dimension =
    MODEL_DIMENSIONS.get(model) ?? SEMANTIC_TRANSFORMERS_DIMENSION;

  for (const text of texts) {
    const output = await extractor(text, {
      pooling: "cls",
      normalize: true,
    });
    const vector = Array.from(output.data) as number[];

    if (vector.length !== dimension) {
      throw new Error(
        `Expected ${dimension} dimensions from ${model}, got ${vector.length}`,
      );
    }

    embeddings.push(vector);
  }

  return {
    model,
    dimension,
    embeddings,
    provider: "transformers-local" as const,
  };
}
