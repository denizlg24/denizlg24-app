import type { INote, INoteGroup } from "@/lib/data-types";
import { SEMANTIC_MODEL } from "./constants";

const CONTENT_CHUNK_CHARS = 1800;
const CONTENT_CHUNK_OVERLAP_CHARS = 240;

export interface SemanticInputPart {
  text: string;
  weight: number;
}

function normalizeText(value?: string) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function pathForGroup(groupId: string, groupsById: Map<string, INoteGroup>) {
  const parts: string[] = [];
  let current: INoteGroup | undefined = groupsById.get(groupId);
  const seen = new Set<string>();

  while (current && !seen.has(current._id)) {
    seen.add(current._id);
    parts.unshift(current.name);
    current = current.parentId ? groupsById.get(current.parentId) : undefined;
  }

  return parts.join(" > ");
}

function extractHeadings(content?: string) {
  const matches = (content ?? "").match(/^#{1,6}\s+.+$/gm) ?? [];
  return matches
    .map((heading) => heading.replace(/^#{1,6}\s+/, "").trim())
    .filter(Boolean)
    .slice(0, 16);
}

function chunkText(value?: string) {
  const text = (value ?? "").trim();
  if (!text) return [];

  const paragraphs = text
    .split(/\n{2,}/)
    .map(normalizeText)
    .filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs.length > 0 ? paragraphs : [text]) {
    if (!current) {
      current = paragraph;
      continue;
    }

    if (current.length + paragraph.length + 2 <= CONTENT_CHUNK_CHARS) {
      current = `${current}\n\n${paragraph}`;
      continue;
    }

    chunks.push(current);
    const overlap =
      current.length > CONTENT_CHUNK_OVERLAP_CHARS
        ? current.slice(-CONTENT_CHUNK_OVERLAP_CHARS)
        : current;
    current = `${overlap}\n\n${paragraph}`;

    while (current.length > CONTENT_CHUNK_CHARS) {
      chunks.push(current.slice(0, CONTENT_CHUNK_CHARS));
      current = current.slice(
        CONTENT_CHUNK_CHARS - CONTENT_CHUNK_OVERLAP_CHARS,
      );
    }
  }

  if (current) chunks.push(current);
  return chunks.flatMap((chunk) => {
    if (chunk.length <= CONTENT_CHUNK_CHARS) return [chunk];

    const splitChunks: string[] = [];
    let remainder = chunk;
    while (remainder.length > CONTENT_CHUNK_CHARS) {
      splitChunks.push(remainder.slice(0, CONTENT_CHUNK_CHARS));
      remainder = remainder.slice(
        CONTENT_CHUNK_CHARS - CONTENT_CHUNK_OVERLAP_CHARS,
      );
    }
    if (remainder) splitChunks.push(remainder);
    return splitChunks;
  });
}

function buildSemanticMetadata(note: INote, groups: INoteGroup[]) {
  const groupsById = new Map(groups.map((group) => [group._id, group]));
  const groupIds = note.groupIds ?? [];
  const tags = note.tags ?? [];
  const groupPaths = groupIds
    .map((groupId) => pathForGroup(groupId, groupsById))
    .filter(Boolean);
  const domain = note.url ? safeDomain(note.url) : "";
  const headings = extractHeadings(note.content);

  return [
    `title: ${normalizeText(note.title)}`,
    note.class ? `class: ${normalizeText(note.class)}` : "",
    tags.length > 0 ? `tags: ${[...tags].sort().join(", ")}` : "",
    groupPaths.length > 0 ? `groups: ${groupPaths.join(" | ")}` : "",
    note.url ? `url: ${normalizeText(note.url)}` : "",
    domain ? `domain: ${domain}` : "",
    normalizeText(note.description),
    normalizeText(note.siteName),
    headings.length > 0 ? `headings: ${headings.join(" | ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildSemanticInputParts(
  note: INote,
  groups: INoteGroup[],
  options: { maxContentChunks?: number } = {},
): SemanticInputPart[] {
  const metadata = buildSemanticMetadata(note, groups);
  const contentChunks = chunkText(note.content).slice(
    0,
    options.maxContentChunks,
  );
  const title = normalizeText(note.title);

  const parts: SemanticInputPart[] = [];
  if (metadata) {
    parts.push({
      text: metadata,
      weight: contentChunks.length > 0 ? 2.2 : 1,
    });
  }

  for (const [index, chunk] of contentChunks.entries()) {
    parts.push({
      text: [title ? `title: ${title}` : "", `content: ${chunk}`]
        .filter(Boolean)
        .join("\n\n"),
      weight: index === 0 ? 1.25 : 1,
    });
  }

  return parts.length > 0 ? parts : [{ text: `title: ${title}`, weight: 1 }];
}

export function buildSemanticInput(note: INote, groups: INoteGroup[]) {
  return buildSemanticInputParts(note, groups)
    .map((part) => part.text)
    .join("\n\n---\n\n");
}

function safeDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function buildContentHash(
  note: INote,
  groups: INoteGroup[],
  model = SEMANTIC_MODEL,
) {
  const payload = JSON.stringify({
    model,
    title: note.title,
    content: note.content,
    url: note.url,
    description: note.description,
    siteName: note.siteName,
    tags: [...(note.tags ?? [])].sort(),
    groupIds: [...(note.groupIds ?? [])].sort(),
    class: note.class,
    input: buildSemanticInput(note, groups),
  });

  return `${hashString(payload)}-${payload.length}`;
}
