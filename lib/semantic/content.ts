import type { INote, INoteGroup } from "@/lib/data-types";
import { SEMANTIC_MODEL } from "./constants";

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

export function buildSemanticInput(note: INote, groups: INoteGroup[]) {
  const groupsById = new Map(groups.map((group) => [group._id, group]));
  const groupIds = note.groupIds ?? [];
  const tags = note.tags ?? [];
  const groupPaths = groupIds
    .map((groupId) => pathForGroup(groupId, groupsById))
    .filter(Boolean);
  const domain = note.url ? safeDomain(note.url) : "";

  return [
    `passage: ${normalizeText(note.title)}`,
    note.class ? `class: ${normalizeText(note.class)}` : "",
    tags.length > 0 ? `tags: ${[...tags].sort().join(", ")}` : "",
    groupPaths.length > 0 ? `groups: ${groupPaths.join(" | ")}` : "",
    note.url ? `url: ${normalizeText(note.url)}` : "",
    domain ? `domain: ${domain}` : "",
    normalizeText(note.description),
    normalizeText(note.siteName),
    normalizeText(note.content).slice(0, 4000),
  ]
    .filter(Boolean)
    .join("\n\n");
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
