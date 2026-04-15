"use client";

import { ExternalLink } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { IBookmark, IBookmarkGroup } from "@/lib/data-types";

interface Props {
  bookmarks: IBookmark[];
  groups: IBookmarkGroup[];
  onSelect: (b: IBookmark) => void;
}

export function BookmarkList({ bookmarks, groups, onSelect }: Props) {
  const groupMap = new Map(groups.map((g) => [g._id, g]));

  if (bookmarks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        No bookmarks yet. Paste a URL to start.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y">
        {bookmarks.map((b) => (
          <button
            type="button"
            key={b._id}
            onClick={() => onSelect(b)}
            className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/40"
          >
            {b.favicon ? (
              <Image
                src={b.favicon}
                alt=""
                width={16}
                height={16}
                className="mt-0.5 size-4 shrink-0 rounded-sm"
                unoptimized
              />
            ) : (
              <div className="mt-0.5 size-4 shrink-0 rounded-sm bg-muted" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{b.title}</span>
                <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
              </div>
              {b.description && (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {b.description}
                </p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                <span className="truncate text-[10px] text-muted-foreground">
                  {b.siteName || new URL(b.url).hostname}
                </span>
                {b.groupIds
                  .map((id) => groupMap.get(id))
                  .filter((g): g is IBookmarkGroup => !!g)
                  .map((g) => (
                    <Badge
                      key={g._id}
                      variant="secondary"
                      className="h-4 px-1.5 text-[10px]"
                    >
                      {g.name}
                    </Badge>
                  ))}
                {b.tags.map((t) => (
                  <Badge
                    key={t}
                    variant="outline"
                    className="h-4 px-1.5 text-[10px]"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
