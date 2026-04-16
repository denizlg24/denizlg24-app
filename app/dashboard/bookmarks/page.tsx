"use client";

import {
  Bookmark as BookmarkIcon,
  FolderPlus,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  RefreshCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserSettings } from "@/context/user-context";
import { denizApi } from "@/lib/api-wrapper";
import type {
  IBookmark,
  IBookmarkEdge,
  IBookmarkGraph,
  IBookmarkGroup,
} from "@/lib/data-types";
import { BookmarkDetail } from "./_components/bookmark-detail";
import { BookmarkGraph } from "./_components/bookmark-graph";
import { BookmarkList } from "./_components/bookmark-list";
import { GroupDetail } from "./_components/group-detail";

type View = "graph" | "list";

export default function BookmarksPage() {
  const router = useRouter();
  const { settings, loading: loadingSettings } = useUserSettings();

  const api = useMemo(() => {
    if (loadingSettings) return null;
    return new denizApi(settings.apiKey);
  }, [settings, loadingSettings]);

  const [view, setView] = useState<View>("graph");
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState<IBookmark[]>([]);
  const [groups, setGroups] = useState<IBookmarkGroup[]>([]);
  const [edges, setEdges] = useState<IBookmarkEdge[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    const [graphRes, tagsRes] = await Promise.all([
      api.GET<IBookmarkGraph>({ endpoint: "bookmarks" }),
      api.GET<{ tags: string[] }>({ endpoint: "bookmarks/tags" }),
    ]);
    if ("code" in graphRes) {
      toast.error(graphRes.message);
    } else {
      setBookmarks(graphRes.bookmarks);
      setGroups(graphRes.groups);
      setEdges(graphRes.edges);
    }
    if (!("code" in tagsRes)) setSuggestions(tagsRes.tags);
    setLoading(false);
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePatchBookmark = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      if (!api) return null;
      const res = await api.PATCH<{ bookmark: IBookmark }>({
        endpoint: `bookmarks/${id}`,
        body,
      });
      if ("code" in res) {
        toast.error(res.message);
        return null;
      }
      setBookmarks((bs) =>
        bs.map((b) => (b._id === id ? res.bookmark : b)),
      );
      return res.bookmark;
    },
    [api],
  );

  const handleDeleteBookmark = useCallback(
    async (id: string) => {
      if (!api) return;
      const prev = { bookmarks, edges };
      setBookmarks((bs) => bs.filter((b) => b._id !== id));
      setEdges((es) => es.filter((e) => e.from !== id && e.to !== id));
      setSelectedId(null);
      const res = await api.DELETE<{ success: true }>({
        endpoint: `bookmarks/${id}`,
      });
      if ("code" in res) {
        toast.error(res.message);
        setBookmarks(prev.bookmarks);
        setEdges(prev.edges);
      } else {
        toast.success("Deleted");
      }
    },
    [api, bookmarks, edges],
  );

  const handleUpdateGroup = useCallback(
    async (id: string, patch: Partial<IBookmarkGroup>) => {
      if (!api) return;
      const prev = groups;
      setGroups((gs) =>
        gs.map((g) => (g._id === id ? { ...g, ...patch } : g)),
      );
      const res = await api.PATCH<{ group: IBookmarkGroup }>({
        endpoint: `bookmark-groups/${id}`,
        body: patch,
      });
      if ("code" in res) {
        toast.error(res.message);
        setGroups(prev);
        return;
      }
      setGroups((gs) => gs.map((g) => (g._id === id ? res.group : g)));
    },
    [api, groups],
  );

  const handleDeleteGroup = useCallback(
    async (id: string) => {
      if (!api) return;
      const prev = { groups, bookmarks };
      setGroups((gs) => gs.filter((g) => g._id !== id));
      setBookmarks((bs) =>
        bs.map((b) => ({
          ...b,
          groupIds: b.groupIds.filter((gid) => gid !== id),
        })),
      );
      setSelectedGroupId(null);
      const res = await api.DELETE<{ success: true }>({
        endpoint: `bookmark-groups/${id}`,
      });
      if ("code" in res) {
        toast.error(res.message);
        setGroups(prev.groups);
        setBookmarks(prev.bookmarks);
      } else {
        toast.success("Group deleted");
      }
    },
    [api, groups, bookmarks],
  );

  const filteredBookmarks = useMemo(() => {
    if (!filter.trim()) return bookmarks;
    const q = filter.toLowerCase();
    return bookmarks.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.url.toLowerCase().includes(q) ||
        (b.description || "").toLowerCase().includes(q) ||
        b.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [bookmarks, filter]);

  const selected = useMemo(
    () => (selectedId ? bookmarks.find((b) => b._id === selectedId) : null),
    [bookmarks, selectedId],
  );

  const selectedGroup = useMemo(
    () =>
      selectedGroupId
        ? groups.find((g) => g._id === selectedGroupId) ?? null
        : null,
    [groups, selectedGroupId],
  );

  if (loading) return <BookmarksLoadingSkeleton />;

  if (selected) {
    return (
      <BookmarkDetail
        bookmark={selected}
        allBookmarks={bookmarks}
        groups={groups}
        edges={edges}
        suggestions={suggestions}
        onPatch={(body) => handlePatchBookmark(selected._id, body)}
        onDelete={() => handleDeleteBookmark(selected._id)}
        onBack={() => setSelectedId(null)}
        onSelectBookmark={(b) => setSelectedId(b._id)}
        onSuggestionsChange={setSuggestions}
      />
    );
  }

  if (selectedGroup) {
    return (
      <GroupDetail
        group={selectedGroup}
        groups={groups}
        bookmarks={bookmarks}
        onBack={() => setSelectedGroupId(null)}
        onUpdate={handleUpdateGroup}
        onDelete={handleDeleteGroup}
        onSelectBookmark={(b) => {
          setSelectedGroupId(null);
          setSelectedId(b._id);
        }}
        onSelectGroup={(g) => setSelectedGroupId(g._id)}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <BookmarkIcon className="size-4" />
          <h1 className="text-sm font-medium">Bookmarks</h1>
          <span className="text-xs text-muted-foreground tabular-nums">
            {bookmarks.length} · {groups.length} groups
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter…"
            className="h-7 w-full! max-w-full! text-xs"
          />
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList className="h-7">
              <TabsTrigger value="graph" className="h-6 px-2 text-xs">
                <LayoutGrid className="size-3.5" />
              </TabsTrigger>
              <TabsTrigger value="list" className="h-6 px-2 text-xs">
                <List className="size-3.5" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            size="sm"
            variant="outline"
            className="h-7"
            onClick={load}
            title="Refresh"
          >
            <RefreshCcw className="size-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7"
            onClick={() => router.push("/dashboard/bookmarks/new-group")}
          >
            <FolderPlus className="size-3.5" />
            Group
          </Button>
          <Button
            size="sm"
            className="h-7"
            onClick={() => router.push("/dashboard/bookmarks/new")}
          >
            <Plus className="size-3.5" />
            Bookmark
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {view === "graph" ? (
          <BookmarkGraph
            bookmarks={filteredBookmarks}
            groups={groups}
            edges={edges}
            onSelectBookmark={(b) => setSelectedId(b._id)}
            onSelectGroup={(g) => setSelectedGroupId(g._id)}
          />
        ) : (
          <BookmarkList
            bookmarks={filteredBookmarks}
            groups={groups}
            onSelect={(b) => setSelectedId(b._id)}
          />
        )}
      </div>
    </div>
  );
}

function BookmarksLoadingSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <BookmarkIcon className="size-4" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-7 w-24" />
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}
