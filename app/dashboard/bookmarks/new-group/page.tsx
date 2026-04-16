"use client";

import { ArrowLeft, FolderPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUserSettings } from "@/context/user-context";
import { denizApi } from "@/lib/api-wrapper";
import type { IBookmarkGroup } from "@/lib/data-types";

const NONE_VALUE = "__none__";

export default function NewGroupPage() {
  const router = useRouter();
  const { settings, loading: loadingSettings } = useUserSettings();

  const api = useMemo(() => {
    if (loadingSettings) return null;
    return new denizApi(settings.apiKey);
  }, [settings, loadingSettings]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState<string>(NONE_VALUE);
  const [groups, setGroups] = useState<IBookmarkGroup[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!api) return;
    api
      .GET<{ groups: IBookmarkGroup[] }>({ endpoint: "bookmark-groups" })
      .then((res) => {
        if (!("code" in res)) {
          setGroups(
            res.groups.sort((a, b) => a.name.localeCompare(b.name)),
          );
        }
      });
  }, [api]);

  const submit = async () => {
    if (!api || submitting) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name is required");
      return;
    }
    setSubmitting(true);
    const res = await api.POST<{ group: IBookmarkGroup }>({
      endpoint: "bookmark-groups",
      body: {
        name: trimmed,
        description: description.trim() || undefined,
        parentId: parentId === NONE_VALUE ? null : parentId,
      },
    });
    setSubmitting(false);
    if ("code" in res) {
      toast.error(res.message);
      return;
    }
    toast.success("Group created");
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
          <FolderPlus className="size-4" />
          <h1 className="text-sm font-medium">New group</h1>
        </div>
        <Button size="sm" className="h-7" onClick={submit} disabled={submitting}>
          {submitting && <Loader2 className="size-3.5 animate-spin" />}
          Create
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-xl space-y-5 p-6">
          <div className="space-y-2">
            <Label className="text-xs">Name</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="Papers"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this group is about…"
              className="min-h-20 text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Parent group</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE} className="text-xs">
                  None (top level)
                </SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g._id} value={g._id} className="text-xs">
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
