import {
  env,
  pipeline,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";
import { SEMANTIC_DIMENSION, SEMANTIC_TRANSFORMERS_MODEL } from "./constants";

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (extractorPromise) return extractorPromise;
  extractorPromise = (async () => {
    try {
      env.allowLocalModels = true;
      env.allowRemoteModels = true;
      env.useBrowserCache = true;
      console.log(
        "[semantic] creating pipeline for",
        SEMANTIC_TRANSFORMERS_MODEL,
      );
      const extractor = await pipeline(
        "feature-extraction",
        SEMANTIC_TRANSFORMERS_MODEL,
      );
      console.log("[semantic] pipeline ready");
      return extractor;
    } catch (error) {
      console.error("[semantic] transformers init failed", error);
      extractorPromise = null;
      throw error;
    }
  })();
  return extractorPromise;
}

export async function embedTextsWithTransformers(texts: string[]) {
  const extractor = await getExtractor();
  const embeddings: number[][] = [];

  for (const text of texts) {
    const output = await extractor(text, {
      pooling: "mean",
      normalize: true,
    });
    const vector = Array.from(output.data) as number[];

    if (vector.length !== SEMANTIC_DIMENSION) {
      throw new Error(
        `Expected ${SEMANTIC_DIMENSION} dimensions from ${SEMANTIC_TRANSFORMERS_MODEL}, got ${vector.length}`,
      );
    }

    embeddings.push(vector);
  }

  return {
    model: SEMANTIC_TRANSFORMERS_MODEL,
    dimension: SEMANTIC_DIMENSION,
    embeddings,
    provider: "transformers-local" as const,
  };
}
