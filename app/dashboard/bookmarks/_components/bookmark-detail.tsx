"use client";

import {
  ArrowLeft,
  Bookmark as BookmarkIcon,
  Calendar as CalendarIcon,
  ExternalLink,
  Image as ImageIcon,
  Link as LinkIcon,
  Shapes,
  Tag as TagIcon,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TagAutocomplete } from "@/components/bookmarks/tag-autocomplete";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  BookmarkStatus,
  IBookmark,
  IBookmarkEdge,
  IBookmarkGroup,
} from "@/lib/data-types";

function formatDate(date: string | Date | undefined) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(date: string | Date | undefined) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  bookmark: IBookmark;
  allBookmarks: IBookmark[];
  groups: IBookmarkGroup[];
  edges: IBookmarkEdge[];
  suggestions: string[];
  onPatch: (
    body: Record<string, unknown>,
  ) => Promise<IBookmark | null>;
  onDelete: () => Promise<void>;
  onBack: () => void;
  onSelectBookmark: (b: IBookmark) => void;
  onSuggestionsChange: (next: string[]) => void;
}

export function BookmarkDetail({
  bookmark,
  allBookmarks,
  groups,
  edges,
  suggestions,
  onPatch,
  onDelete,
  onBack,
  onSelectBookmark,
  onSuggestionsChange,
}: Props) {
  const [title, setTitle] = useState(bookmark.title);
  const [initialTitle, setInitialTitle] = useState(bookmark.title);
  const [content, setContent] = useState(bookmark.content || "");
  const [initialContent, setInitialContent] = useState(bookmark.content || "");
  const [savingContent, setSavingContent] = useState(false);
  const titleSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTitle(bookmark.title);
    setInitialTitle(bookmark.title);
    setContent(bookmark.content || "");
    setInitialContent(bookmark.content || "");
  }, [bookmark._id, bookmark.title, bookmark.content]);

  const saveContent = useCallback(async () => {
    setSavingContent(true);
    const res = await onPatch({ content });
    setSavingContent(false);
    if (res) setInitialContent(res.content || "");
  }, [content, onPatch]);

  const saveTitle = useCallback(
    async (next: string) => {
      const trimmed = next.trim();
      if (!trimmed || trimmed === initialTitle) return;
      const res = await onPatch({ title: trimmed });
      if (res) setInitialTitle(res.title);
    },
    [initialTitle, onPatch],
  );

  const scheduleTitleSave = (next: string) => {
    setTitle(next);
    if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
    titleSaveTimer.current = setTimeout(() => saveTitle(next), 700);
  };

  const handleDelete = async () => {
    await onDelete();
  };

  const relatedBookmarks = useMemo(() => {
    const relatedIds = new Set<string>();
    for (const e of edges) {
      if (e.from === bookmark._id) relatedIds.add(e.to);
      else if (e.to === bookmark._id) relatedIds.add(e.from);
    }
    return allBookmarks.filter((b) => relatedIds.has(b._id));
  }, [bookmark._id, edges, allBookmarks]);

  const bookmarkGroups = useMemo(() => {
    return bookmark.groupIds
      .map((gid) => groups.find((g) => g._id === gid))
      .filter((g): g is IBookmarkGroup => !!g);
  }, [bookmark.groupIds, groups]);

  const toggleGroup = (gid: string) => {
    const next = bookmark.groupIds.includes(gid)
      ? bookmark.groupIds.filter((x) => x !== gid)
      : [...bookmark.groupIds, gid];
    onPatch({ groupIds: next });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center justify-between border-b px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
            title="Back"
          >
            <ArrowLeft className="size-4" />
          </Button>
          {bookmark.favicon ? (
            <Image
              src={bookmark.favicon}
              alt=""
              width={16}
              height={16}
              className="size-4 rounded-sm"
              unoptimized
            />
          ) : (
            <BookmarkIcon className="size-4" />
          )}
          <span className="truncate text-xs text-muted-foreground">
            {bookmark.siteName || safeHostname(bookmark.url)}
          </span>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this bookmark?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the bookmark and its edges.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-6 py-6">
          <Input
            value={title}
            onChange={(e) => scheduleTitleSave(e.target.value)}
            onBlur={() => saveTitle(title)}
            className="!h-auto border-none bg-transparent px-0 py-1 text-2xl font-semibold shadow-none focus-visible:ring-0"
          />

          <div className="mt-6">
            <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Properties
            </h2>
            <div className="divide-y border-y text-xs">
              <PropertyRow
                icon={<CalendarIcon className="size-3" />}
                label="created_on"
              >
                <span className="text-muted-foreground">
                  {formatDate(bookmark.createdAt)}
                </span>
              </PropertyRow>

              <PropertyRow
                icon={<CalendarIcon className="size-3" />}
                label="published"
              >
                <DateProperty
                  value={bookmark.publishedDate}
                  onChange={(next) =>
                    onPatch({
                      publishedDate: next ? next.toISOString() : null,
                    })
                  }
                />
              </PropertyRow>

              <PropertyRow
                icon={<LinkIcon className="size-3" />}
                label="source"
              >
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                >
                  <span className="truncate">{bookmark.url}</span>
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              </PropertyRow>

              {bookmark.image && (
                <PropertyRow
                  icon={<ImageIcon className="size-3" />}
                  label="image"
                >
                  <a
                    href={bookmark.image}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                  >
                    <span className="truncate">{bookmark.image}</span>
                    <ExternalLink className="size-3 shrink-0" />
                  </a>
                </PropertyRow>
              )}

              <PropertyRow
                icon={<Shapes className="size-3" />}
                label="class"
              >
                <ClassProperty
                  value={bookmark.class || ""}
                  onCommit={(next) => onPatch({ class: next })}
                />
              </PropertyRow>

              <PropertyRow
                icon={<TagIcon className="size-3" />}
                label="tags"
              >
                <TagAutocomplete
                  value={bookmark.tags}
                  suggestions={suggestions}
                  onChange={(next) => {
                    onPatch({ tags: next }).then(() => {
                      const existing = new Set(suggestions);
                      const added = next.filter((t) => !existing.has(t));
                      if (added.length > 0) {
                        onSuggestionsChange(
                          [...suggestions, ...added].sort((a, b) =>
                            a.localeCompare(b),
                          ),
                        );
                      }
                    });
                  }}
                />
              </PropertyRow>

              <PropertyRow
                icon={<BookmarkIcon className="size-3" />}
                label="groups"
              >
                <div className="flex flex-wrap items-center gap-1">
                  {groups.map((g) => {
                    const active = bookmark.groupIds.includes(g._id);
                    return (
                      <button
                        type="button"
                        key={g._id}
                        onClick={() => toggleGroup(g._id)}
                        className={`rounded border px-2 py-0.5 text-[10px] transition ${
                          active
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-dashed text-muted-foreground hover:border-solid hover:text-foreground"
                        }`}
                      >
                        {g.name}
                      </button>
                    );
                  })}
                  {groups.length === 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      No groups yet
                    </span>
                  )}
                </div>
              </PropertyRow>

              <PropertyRow
                icon={<LinkIcon className="size-3" />}
                label="related"
              >
                <div className="flex flex-wrap items-center gap-1">
                  {relatedBookmarks.length === 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      None
                    </span>
                  )}
                  {relatedBookmarks.map((r) => (
                    <button
                      key={r._id}
                      type="button"
                      onClick={() => onSelectBookmark(r)}
                      className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] hover:bg-muted"
                    >
                      {r.favicon ? (
                        <Image
                          src={r.favicon}
                          alt=""
                          width={10}
                          height={10}
                          className="size-2.5 rounded-sm"
                          unoptimized
                        />
                      ) : null}
                      <span className="max-w-[16rem] truncate">{r.title}</span>
                    </button>
                  ))}
                </div>
              </PropertyRow>

              <PropertyRow
                icon={<CalendarIcon className="size-3" />}
                label="updated"
              >
                <span className="text-muted-foreground">
                  {formatDateTime(bookmark.updatedAt)}
                </span>
              </PropertyRow>

              <PropertyRow
                icon={<BookmarkIcon className="size-3" />}
                label="status"
              >
                <Select
                  value={bookmark.status}
                  onValueChange={(v) =>
                    onPatch({ status: v as BookmarkStatus })
                  }
                >
                  <SelectTrigger className="h-6 w-32 border-none bg-transparent px-1 text-xs shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">open</SelectItem>
                    <SelectItem value="archived">archived</SelectItem>
                  </SelectContent>
                </Select>
              </PropertyRow>

              {bookmarkGroups.length > 0 && (
                <PropertyRow
                  icon={<BookmarkIcon className="size-3" />}
                  label="summary"
                >
                  <div className="flex flex-wrap gap-1">
                    {bookmarkGroups.map((g) => (
                      <Badge
                        key={g._id}
                        variant="secondary"
                        className="h-4 px-1.5 text-[10px]"
                      >
                        {g.name}
                      </Badge>
                    ))}
                  </div>
                </PropertyRow>
              )}
            </div>
          </div>

          <div className="mt-8 flex min-h-[60vh] flex-col">
            <MarkdownEditor
              value={content}
              initialValue={initialContent}
              onChange={setContent}
              onSave={saveContent}
              saving={savingContent}
              placeholder="Write notes in markdown…"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function safeHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function PropertyRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-3 px-2 py-1.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="font-mono text-[11px]">{label}</span>
      </div>
      <div className="min-w-0 truncate text-xs">{children}</div>
    </div>
  );
}

function ClassProperty({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (next: string) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <Input
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        if (local !== value) onCommit(local.trim());
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        }
      }}
      placeholder="video, article, paper…"
      className="h-6 border-none bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
    />
  );
}

function DateProperty({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (next: Date | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(value) : undefined;
  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <CalendarIcon className="size-3" />
            {date ? formatDate(date) : "Empty"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              onChange(d ?? null);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {date && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Clear date"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}
