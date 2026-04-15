"use client";

import { Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
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
  group: IBookmarkGroup | null;
  bookmarks: IBookmark[];
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<IBookmarkGroup>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSelectBookmark: (b: IBookmark) => void;
}

export function GroupSheet({
  group,
  bookmarks,
  onClose,
  onUpdate,
  onDelete,
  onSelectBookmark,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    setName(group?.name || "");
    setDescription(group?.description || "");
  }, [group]);

  if (!group) return null;

  const members = bookmarks.filter((b) => b.groupIds.includes(group._id));

  const saveName = () => {
    if (name.trim() && name !== group.name) {
      onUpdate(group._id, { name: name.trim() });
    }
  };

  const saveDescription = () => {
    if (description !== (group.description || "")) {
      onUpdate(group._id, { description });
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full p-0 sm:max-w-md">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-sm">Group · {group.name}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-7rem)]">
          <div className="space-y-5 p-4">
            <div className="space-y-2">
              <Label className="text-xs">Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={saveName}
                className="h-7 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={saveDescription}
                placeholder="What this group is about…"
                className="min-h-20 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">
                Members ({members.length})
              </Label>
              <div className="divide-y rounded border">
                {members.length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground">
                    No bookmarks in this group.
                  </div>
                ) : (
                  members.map((b) => (
                    <button
                      type="button"
                      key={b._id}
                      onClick={() => onSelectBookmark(b)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/40"
                    >
                      {b.favicon ? (
                        <Image
                          src={b.favicon}
                          alt=""
                          width={14}
                          height={14}
                          className="size-3.5 shrink-0 rounded-sm"
                          unoptimized
                        />
                      ) : (
                        <div className="size-3.5 shrink-0 rounded-sm bg-muted" />
                      )}
                      <span className="truncate text-xs">{b.title}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground">
              {group.autoCreated
                ? "Auto-created by LLM"
                : "Manually created"}{" "}
              · {new Date(group.createdAt).toLocaleDateString()}
            </div>
          </div>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-end border-t bg-background px-4 py-3">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(group._id)}
          >
            <Trash2 className="size-3.5" />
            Delete group
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
