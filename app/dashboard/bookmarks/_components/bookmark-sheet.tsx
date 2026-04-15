"use client";

import { ExternalLink, Plus, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { IBookmark, IBookmarkGroup } from "@/lib/data-types";

interface Props {
  bookmark: IBookmark | null;
  groups: IBookmarkGroup[];
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<IBookmark>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreateGroup: (name: string) => Promise<void>;
}

export function BookmarkSheet({
  bookmark,
  groups,
  onClose,
  onUpdate,
  onDelete,
  onCreateGroup,
}: Props) {
  const [tagInput, setTagInput] = useState("");
  const [notes, setNotes] = useState("");
  const [newGroup, setNewGroup] = useState("");

  useEffect(() => {
    setNotes(bookmark?.userNotes || "");
    setTagInput("");
    setNewGroup("");
  }, [bookmark]);

  if (!bookmark) return null;

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t || bookmark.tags.includes(t)) return;
    onUpdate(bookmark._id, { tags: [...bookmark.tags, t] });
    setTagInput("");
  };

  const removeTag = (t: string) => {
    onUpdate(bookmark._id, { tags: bookmark.tags.filter((x) => x !== t) });
  };

  const toggleGroup = (gid: string) => {
    const next = bookmark.groupIds.includes(gid)
      ? bookmark.groupIds.filter((x) => x !== gid)
      : [...bookmark.groupIds, gid];
    onUpdate(bookmark._id, { groupIds: next });
  };

  const saveNotes = () => {
    if (notes !== (bookmark.userNotes || "")) {
      onUpdate(bookmark._id, { userNotes: notes });
    }
  };

  const createAndJoin = async () => {
    const name = newGroup.trim();
    if (!name) return;
    await onCreateGroup(name);
    setNewGroup("");
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full p-0 sm:max-w-md">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-sm">
            {bookmark.favicon ? (
              <Image
                src={bookmark.favicon}
                alt=""
                width={16}
                height={16}
                className="size-4 rounded-sm"
                unoptimized
              />
            ) : null}
            <span className="truncate">{bookmark.title}</span>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-7rem)]">
          <div className="space-y-5 p-4">
            <div>
              <a
                href={bookmark.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="size-3" />
                {bookmark.url}
              </a>
            </div>

            {bookmark.image && (
              <Image
                src={bookmark.image}
                alt=""
                width={400}
                height={210}
                className="aspect-video w-full rounded-md object-cover"
                unoptimized
              />
            )}

            {bookmark.description && (
              <p className="text-xs text-muted-foreground">
                {bookmark.description}
              </p>
            )}

            <div className="space-y-2">
              <Label className="text-xs">Tags</Label>
              <div className="flex flex-wrap gap-1">
                {bookmark.tags.map((t) => (
                  <Badge
                    key={t}
                    variant="outline"
                    className="h-5 gap-1 px-1.5 text-[10px]"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      className="hover:text-destructive"
                    >
                      <X className="size-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTag()}
                  placeholder="Add tag…"
                  className="h-7 text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7"
                  onClick={addTag}
                >
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Groups</Label>
              <div className="flex flex-wrap gap-1">
                {groups.map((g) => {
                  const active = bookmark.groupIds.includes(g._id);
                  return (
                    <button
                      type="button"
                      key={g._id}
                      onClick={() => toggleGroup(g._id)}
                      className={`rounded border px-2 py-0.5 text-[10px] transition ${
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-foreground/50"
                      }`}
                    >
                      {g.name}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createAndJoin()}
                  placeholder="New group…"
                  className="h-7 text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7"
                  onClick={createAndJoin}
                >
                  <Plus className="size-3" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={saveNotes}
                placeholder="Personal notes…"
                className="min-h-24 text-xs"
              />
            </div>
          </div>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between border-t bg-background px-4 py-3">
          <span className="text-[10px] text-muted-foreground">
            Added {new Date(bookmark.createdAt).toLocaleDateString()}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(bookmark._id)}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
