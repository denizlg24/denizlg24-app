"use client";

import { ArrowLeft, Bookmark as BookmarkIcon, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { TagAutocomplete } from "@/components/bookmarks/tag-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUserSettings } from "@/context/user-context";
import { denizApi } from "@/lib/api-wrapper";
import type {
  IBookmark,
  IBookmarkEdge,
  IBookmarkGroup,
} from "@/lib/data-types";

export default function NewBookmarkPage() {
  const router = useRouter();
  const { settings, loading: loadingSettings } = useUserSettings();

  const api = useMemo(() => {
    if (loadingSettings) return null;
    return new denizApi(settings.apiKey);
  }, [settings, loadingSettings]);

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cls, setCls] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<IBookmarkGroup[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!api) return;
    Promise.all([
      api.GET<{ groups: IBookmarkGroup[] }>({ endpoint: "bookmark-groups" }),
      api.GET<{ tags: string[] }>({ endpoint: "bookmarks/tags" }),
    ]).then(([gRes, tRes]) => {
      if (!("code" in gRes)) {
        setGroups(
          gRes.groups.sort((a, b) => a.name.localeCompare(b.name)),
        );
      }
      if (!("code" in tRes)) setSuggestions(tRes.tags);
    });
  }, [api]);

  const toggleGroup = (id: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const submit = async () => {
    if (!api || submitting) return;
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      toast.error("URL is required");
      return;
    }
    setSubmitting(true);
    const res = await api.POST<{
      bookmark: IBookmark;
      groups: IBookmarkGroup[];
      edges: IBookmarkEdge[];
    }>({
      endpoint: "bookmarks",
      body: {
        url: trimmedUrl,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        class: cls.trim() || undefined,
        tags,
        groupIds: selectedGroupIds,
      },
    });
    setSubmitting(false);
    if ("code" in res) {
      toast.error(res.message);
      return;
    }
    toast.success("Bookmark added");
    router.push("/dashboard/bookmarks");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push("/dashboard/bookmarks")}
            title="Back"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <BookmarkIcon className="size-4" />
          <h1 className="text-sm font-medium">New bookmark</h1>
        </div>
        <Button size="sm" className="h-7" onClick={submit} disabled={submitting}>
          {submitting && <Loader2 className="size-3.5 animate-spin" />}
          Create
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl space-y-5 p-6">
          <div className="space-y-2">
            <Label className="text-xs">URL</Label>
            <Input
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="h-8 text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              Metadata (favicon, site name, fallback title/description) is
              fetched automatically. Fields below override.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Leave empty to use fetched title"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Leave empty to use fetched description"
              className="min-h-20 text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Class</Label>
            <Input
              value={cls}
              onChange={(e) => setCls(e.target.value)}
              placeholder="video, article, paper…"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Tags</Label>
            <TagAutocomplete
              value={tags}
              onChange={setTags}
              suggestions={suggestions}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Groups</Label>
            {groups.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">
                No groups yet. Create one first.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {groups.map((g) => {
                  const active = selectedGroupIds.includes(g._id);
                  return (
                    <button
                      type="button"
                      key={g._id}
                      onClick={() => toggleGroup(g._id)}
                      className={`rounded border px-2 py-0.5 text-[10px] ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      {g.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
