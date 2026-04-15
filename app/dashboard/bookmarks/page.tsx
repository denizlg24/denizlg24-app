"use client";

import { Bookmark as BookmarkIcon, LayoutGrid, List, Loader2, Plus, RefreshCcw } from "lucide-react";
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
import { BookmarkGraph } from "./_components/bookmark-graph";
import { BookmarkList } from "./_components/bookmark-list";
import { BookmarkSheet } from "./_components/bookmark-sheet";
import { GroupSheet } from "./_components/group-sheet";
import { PasteDialog } from "./_components/paste-dialog";

type View = "graph" | "list";

export default function BookmarksPage() {
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
  const [pasteOpen, setPasteOpen] = useState(false);
  const [selectedBookmark, setSelectedBookmark] = useState<IBookmark | null>(
    null,
  );
  const [selectedGroup, setSelectedGroup] = useState<IBookmarkGroup | null>(
    null,
  );
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    const res = await api.GET<IBookmarkGraph>({ endpoint: "bookmarks" });
    if ("code" in res) {
      toast.error(res.message);
    } else {
      setBookmarks(res.bookmarks);
      setGroups(res.groups);
      setEdges(res.edges);
    }
    setLoading(false);
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = useCallback(
    async (url: string) => {
      if (!api) return;
      const res = await api.POST<{
        bookmark: IBookmark;
        groups: IBookmarkGroup[];
        edges: IBookmarkEdge[];
      }>({ endpoint: "bookmarks", body: { url } });
      if ("code" in res) {
        toast.error(res.message);
        return false;
      }
      setBookmarks((prev) => [res.bookmark, ...prev]);
      setGroups(res.groups);
      setEdges((prev) => {
        const map = new Map(prev.map((e) => [e._id, e]));
        for (const e of res.edges) map.set(e._id, e);
        return Array.from(map.values());
      });
      toast.success("Bookmark added");
      return true;
    },
    [api],
  );

  const handleUpdateBookmark = useCallback(
    async (id: string, patch: Partial<IBookmark>) => {
      if (!api) return;
      const prev = bookmarks;
      setBookmarks((bs) =>
        bs.map((b) => (b._id === id ? { ...b, ...patch } : b)),
      );
      const res = await api.PATCH<{ bookmark: IBookmark }>({
        endpoint: `bookmarks/${id}`,
        body: patch,
      });
      if ("code" in res) {
        toast.error(res.message);
        setBookmarks(prev);
        return;
      }
      setBookmarks((bs) =>
        bs.map((b) => (b._id === id ? res.bookmark : b)),
      );
      setSelectedBookmark((s) => (s && s._id === id ? res.bookmark : s));
    },
    [api, bookmarks],
  );

  const handleDeleteBookmark = useCallback(
    async (id: string) => {
      if (!api) return;
      const prev = { bookmarks, edges };
      setBookmarks((bs) => bs.filter((b) => b._id !== id));
      setEdges((es) => es.filter((e) => e.from !== id && e.to !== id));
      setSelectedBookmark(null);
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
      setSelectedGroup((s) => (s && s._id === id ? res.group : s));
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
      setSelectedGroup(null);
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

  const handleCreateGroup = useCallback(
    async (name: string) => {
      if (!api) return;
      const res = await api.POST<{ group: IBookmarkGroup }>({
        endpoint: "bookmark-groups",
        body: { name },
      });
      if ("code" in res) {
        toast.error(res.message);
        return;
      }
      setGroups((gs) =>
        [...gs, res.group].sort((a, b) => a.name.localeCompare(b.name)),
      );
      toast.success("Group created");
    },
    [api],
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

  if (loading) return <BookmarksLoadingSkeleton />;

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
            className="h-7 w-48 text-xs"
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
            className="h-7"
            onClick={() => setPasteOpen(true)}
          >
            <Plus className="size-3.5" />
            Paste URL
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {view === "graph" ? (
          <BookmarkGraph
            bookmarks={filteredBookmarks}
            groups={groups}
            edges={edges}
            onSelectBookmark={setSelectedBookmark}
            onSelectGroup={setSelectedGroup}
          />
        ) : (
          <BookmarkList
            bookmarks={filteredBookmarks}
            groups={groups}
            onSelect={setSelectedBookmark}
          />
        )}
      </div>

      <PasteDialog
        open={pasteOpen}
        onOpenChange={setPasteOpen}
        onSubmit={handleAdd}
      />

      <BookmarkSheet
        bookmark={selectedBookmark}
        groups={groups}
        onClose={() => setSelectedBookmark(null)}
        onUpdate={handleUpdateBookmark}
        onDelete={handleDeleteBookmark}
        onCreateGroup={handleCreateGroup}
      />

      <GroupSheet
        group={selectedGroup}
        bookmarks={bookmarks}
        onClose={() => setSelectedGroup(null)}
        onUpdate={handleUpdateGroup}
        onDelete={handleDeleteGroup}
        onSelectBookmark={setSelectedBookmark}
      />
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
