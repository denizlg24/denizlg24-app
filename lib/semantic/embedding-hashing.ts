import {
  SEMANTIC_HASHING_DIMENSION,
  SEMANTIC_HASHING_MODEL,
} from "./constants";

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "uma",
  "para",
  "com",
  "que",
  "dos",
  "das",
  "you",
  "your",
]);

function hashToken(token: string) {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

export function embedTextWithHashing(text: string) {
  const vector = Array.from({ length: SEMANTIC_HASHING_DIMENSION }, () => 0);
  const tokens = tokenize(text);

  for (const token of tokens) {
    const hash = hashToken(token);
    const index = hash % SEMANTIC_HASHING_DIMENSION;
    const sign = hash & 1 ? 1 : -1;
    vector[index] += sign;

    if (token.length > 5) {
      const stem = token.slice(0, Math.max(4, token.length - 2));
      const stemHash = hashToken(stem);
      vector[stemHash % SEMANTIC_HASHING_DIMENSION] +=
        stemHash & 1 ? 0.5 : -0.5;
    }
  }

  const magnitude = Math.sqrt(
    vector.reduce((sum, value) => sum + value ** 2, 0),
  );
  if (magnitude === 0) return vector;
  return vector.map((value) => value / magnitude);
}

export function embedTextsWithHashing(texts: string[]) {
  return {
    model: SEMANTIC_HASHING_MODEL,
    dimension: SEMANTIC_HASHING_DIMENSION,
    embeddings: texts.map(embedTextWithHashing),
    provider: "hashing" as const,
  };
}
