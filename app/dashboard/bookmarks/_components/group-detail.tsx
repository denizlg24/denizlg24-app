"use client";

import { ArrowLeft, Folder, Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
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
import type { IBookmark, IBookmarkGroup } from "@/lib/data-types";

interface Props {
  group: IBookmarkGroup;
  groups: IBookmarkGroup[];
  bookmarks: IBookmark[];
  onBack: () => void;
  onUpdate: (id: string, patch: Partial<IBookmarkGroup>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSelectBookmark: (b: IBookmark) => void;
  onSelectGroup: (g: IBookmarkGroup) => void;
}

const NONE_VALUE = "__none__";

function descendantIds(
  rootId: string,
  groups: IBookmarkGroup[],
): Set<string> {
  const result = new Set<string>();
  const stack = [rootId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    for (const g of groups) {
      if (g.parentId === current && !result.has(g._id)) {
        result.add(g._id);
        stack.push(g._id);
      }
    }
  }
  return result;
}

export function GroupDetail({
  group,
  groups,
  bookmarks,
  onBack,
  onUpdate,
  onDelete,
  onSelectBookmark,
  onSelectGroup,
}: Props) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || "");

  useEffect(() => {
    setName(group.name);
    setDescription(group.description || "");
  }, [group._id, group.name, group.description]);

  const parentOptions = useMemo(() => {
    const forbidden = descendantIds(group._id, groups);
    forbidden.add(group._id);
    return groups
      .filter((g) => !forbidden.has(g._id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [group, groups]);

  const parent = useMemo(() => {
    if (!group.parentId) return null;
    return groups.find((g) => g._id === group.parentId) ?? null;
  }, [group, groups]);

  const subtreeIds = useMemo(() => {
    const ids = descendantIds(group._id, groups);
    ids.add(group._id);
    return ids;
  }, [group, groups]);
  const members = useMemo(
    () => bookmarks.filter((b) => b.groupIds.some((gid) => subtreeIds.has(gid))),
    [bookmarks, subtreeIds],
  );
  const directMemberCount = useMemo(
    () => bookmarks.filter((b) => b.groupIds.includes(group._id)).length,
    [bookmarks, group._id],
  );
  const nestedMemberCount = members.length - directMemberCount;
  const children = groups.filter((g) => g.parentId === group._id);

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

  const onParentChange = (value: string) => {
    const next = value === NONE_VALUE ? null : value;
    if ((group.parentId ?? null) === next) return;
    onUpdate(group._id, { parentId: next });
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
          <Folder className="size-4" />
          <div className="flex items-center gap-1.5 text-xs">
            {parent && (
              <>
                <button
                  type="button"
                  onClick={() => onSelectGroup(parent)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {parent.name}
                </button>
                <span className="text-muted-foreground">/</span>
              </>
            )}
            <span className="font-medium">{group.name}</span>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this group?</AlertDialogTitle>
              <AlertDialogDescription>
                Sub-groups become top-level. Bookmarks stay but lose membership.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(group._id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-5 p-6">
          <div className="space-y-2">
            <Label className="text-xs">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              className="h-8 text-xs"
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
            <Label className="text-xs">Parent group</Label>
            <Select
              value={group.parentId ?? NONE_VALUE}
              onValueChange={onParentChange}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE} className="text-xs">
                  None (top level)
                </SelectItem>
                {parentOptions.map((g) => (
                  <SelectItem key={g._id} value={g._id} className="text-xs">
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {children.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">
                Sub-groups ({children.length})
              </Label>
              <div className="flex flex-wrap gap-1">
                {children.map((c) => (
                  <button
                    type="button"
                    key={c._id}
                    onClick={() => onSelectGroup(c)}
                    className="rounded border px-2 py-0.5 text-[10px] hover:bg-muted"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs">
              Members ({members.length})
              {nestedMemberCount > 0 && (
                <span className="ml-1 font-normal text-muted-foreground">
                  · {directMemberCount} direct · {nestedMemberCount} nested
                </span>
              )}
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
                    className="flex w-full min-w-0 items-center gap-2 px-3 py-2 text-left hover:bg-muted/40"
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
                    <span className="min-w-0 flex-1 truncate text-xs">
                      {b.title}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground">
            {group.autoCreated ? "Auto-created by LLM" : "Manually created"} ·{" "}
            {new Date(group.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}
