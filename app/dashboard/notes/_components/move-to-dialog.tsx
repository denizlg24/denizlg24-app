"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { denizApi } from "@/lib/api-wrapper";
import { useState, useEffect, useCallback } from "react";
import { Folder, Home, ChevronRight } from "lucide-react";
import React from "react";

interface FolderEntry {
  _id: string;
  name: string;
  type: "folder" | "note";
}

interface BreadcrumbEntry {
  folderId: string;
  folderName: string;
}

interface MoveToDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemType: "folder" | "note";
  itemName: string;
  API: denizApi | null;
  currentFolderId: string | undefined;
  onMoved: () => void;
}

export const MoveToDialog = ({
  open,
  onOpenChange,
  itemId,
  itemType,
  itemName,
  API,
  currentFolderId,
  onMoved,
}: MoveToDialogProps) => {
  const [browseFolderId, setBrowseFolderId] = useState<string | undefined>(
    undefined,
  );
  const [browsePath, setBrowsePath] = useState<BreadcrumbEntry[]>([]);
  const [folders, setFolders] = useState<FolderEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFolders = useCallback(
    async (folderId?: string) => {
      if (!API) return;
      setLoading(true);
      const endpoint = folderId ? `files?folderId=${folderId}` : `files`;
      const result = await API.GET<{ items: FolderEntry[] }>({ endpoint });
      if (!("code" in result)) {
        setFolders(
          result.items.filter(
            (f) => f.type === "folder" && f._id !== itemId,
          ),
        );
      } else {
        setFolders([]);
      }
      setLoading(false);
    },
    [API, itemId],
  );

  useEffect(() => {
    if (open) {
      setBrowseFolderId(undefined);
      setBrowsePath([]);
      fetchFolders(undefined);
    }
  }, [open, fetchFolders]);

  const navigateTo = (folderId: string | undefined, path: BreadcrumbEntry[]) => {
    setBrowseFolderId(folderId);
    setBrowsePath(path);
    fetchFolders(folderId);
  };

  const handleMove = async () => {
    if (!API) return;
    await API.PATCH({
      endpoint:
        itemType === "folder" ? `folders/${itemId}` : `notes/${itemId}`,
      body: { parentId: browseFolderId ?? "null" },
    });
    onMoved();
    onOpenChange(false);
  };

  const isCurrentLocation = browseFolderId === currentFolderId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Move &ldquo;{itemName}&rdquo;</DialogTitle>
        <DialogDescription>Select a destination folder.</DialogDescription>

        <div className="flex items-center gap-1 flex-wrap text-xs">
          <button
            onClick={() => navigateTo(undefined, [])}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="w-3 h-3" />
            home
          </button>
          {browsePath.map((entry, i) => (
            <React.Fragment key={entry.folderId}>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <button
                onClick={() =>
                  navigateTo(entry.folderId, browsePath.slice(0, i + 1))
                }
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {entry.folderName}
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="flex flex-col min-h-20 max-h-60 overflow-y-auto border rounded-md">
          {loading ? (
            <p className="text-xs text-muted-foreground p-3">Loading...</p>
          ) : folders.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3">
              No folders here
            </p>
          ) : (
            folders.map((folder) => (
              <button
                key={folder._id}
                onClick={() =>
                  navigateTo(folder._id, [
                    ...browsePath,
                    { folderId: folder._id, folderName: folder.name },
                  ])
                }
                className="flex items-center gap-2 text-xs px-3 py-2 hover:bg-muted text-left transition-colors border-b last:border-b-0"
              >
                <Folder className="w-3 h-3 shrink-0 text-muted-foreground" />
                {folder.name}
              </button>
            ))
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleMove} disabled={isCurrentLocation}>
            Move here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
