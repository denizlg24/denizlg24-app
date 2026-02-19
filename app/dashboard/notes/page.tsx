"use client";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserSettings } from "@/context/user-context";
import { denizApi } from "@/lib/api-wrapper";
import { cn } from "@/lib/utils";
import { IFolder, IKanbanBoard, INote } from "@/lib/data-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileItem } from "./_components/file-item";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilePlus2, FileText, Folder, FolderPlus, Loader2, MoveLeft } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbItem as BreadcrumbItemUI,
} from "@/components/ui/breadcrumb";
import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { NoteEditor } from "./_components/note-editor";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface FileItem {
  type: "folder" | "note";
  _id: string;
  name: string;
  updatedAt: string;
}

interface BreadcrumbItem {
  folderId: string;
  folderName: string;
}

export default function NotesPage() {
  const { settings, loading: loadingSettings } = useUserSettings();

  const API = useMemo(() => {
    if (loadingSettings) return null;
    return new denizApi(settings.apiKey);
  }, [settings, loadingSettings]);

  const filesCache = useRef<Map<string, FileItem[]>>(new Map());

  const cacheKey = useCallback(
    (parentId: string | undefined, searchQuery: string, sortOrder: string) =>
      `${parentId ?? "root"}|${searchQuery}|${sortOrder}`,
    [],
  );

  const [loading, setLoading] = useState(true);
  const [noteLoading, setNoteLoading] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [directory, setDirectory] = useState<BreadcrumbItem[]>([]);
  const [breadcrumbDragOver, setBreadcrumbDragOver] = useState<
    string | "home" | "back" | null
  >(null);
  const [dragging, setDragging] = useState<{
    _id: string;
    type: "folder" | "note";
  } | null>(null);

  const mousePosRef = useRef({ x: 0, y: 0 });
  const ghostRef = useRef<HTMLDivElement>(null);

  const [note, setNote] = useState<INote | undefined>(undefined);

  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState("");
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  const [newFileDialogOpen, setNewFileDialogOpen] = useState(false);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const [sort, setSort] = useState<
    "nameAsc" | "nameDesc" | "dateAsc" | "dateDesc"
  >("dateDesc");

  const [addToBoardItem, setAddToBoardItem] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [kanbanBoards, setKanbanBoards] = useState<IKanbanBoard[]>([]);
  const [kanbanBoardsLoading, setKanbanBoardsLoading] = useState(false);
  const [addingToBoard, setAddingToBoard] = useState(false);

  useEffect(() => {
    if (!addToBoardItem || !API) return;
    setKanbanBoardsLoading(true);
    API.GET<{ boards: IKanbanBoard[] }>({ endpoint: "kanban/boards" })
      .then((result) => {
        if (!("code" in result)) setKanbanBoards(result.boards ?? []);
      })
      .finally(() => setKanbanBoardsLoading(false));
  }, [addToBoardItem, API]);

  const handleAddToBoard = async (board: IKanbanBoard) => {
    if (!API || !addToBoardItem) return;
    setAddingToBoard(true);
    try {
      const boardResult = await API.GET<{
        board: { columns: { _id: string; order: number }[] };
      }>({ endpoint: `kanban/boards/${board._id}` });
      if ("code" in boardResult) {
        toast.error("Failed to fetch board");
        return;
      }
      const columns = (boardResult.board.columns ?? []).sort(
        (a, b) => a.order - b.order,
      );
      if (columns.length === 0) {
        toast.error("This board has no columns");
        return;
      }
      const cardResult = await API.POST<{}>({
        endpoint: `kanban/boards/${board._id}/cards`,
        body: {
          columnId: columns[0]._id,
          title: `Read ${addToBoardItem.name}`,
          description: `[note](${addToBoardItem.id},${addToBoardItem.name})`,
          priority: "none",
        },
      });
      if ("code" in cardResult) {
        toast.error("Failed to add card to board");
        return;
      }
      toast.success(`Added to "${board.title}"`);
      setAddToBoardItem(null);
    } finally {
      setAddingToBoard(false);
    }
  };

  const fetchFiles = useCallback(
    async (parentId?: string, skipCache = false, resetNote = true) => {
      if (!API) return;
      const key = cacheKey(parentId, search, sort);
      if (!skipCache && filesCache.current.has(key)) {
        setFiles(filesCache.current.get(key)!);
        if (resetNote) setNote(undefined);
        setLoading(false);
        return;
      }
      setLoading(true);
      const endpoint = parentId
        ? `files?folderId=${parentId}&search=${search}&sort=${sort}`
        : `files?search=${search}&sort=${sort}`;
      const result = await API.GET<{
        items: FileItem[];
        breadcrumbs: BreadcrumbItem[];
      }>({ endpoint });
      if ("code" in result) {
        setFiles([]);
      } else {
        filesCache.current.set(key, result.items);
        setFiles(result.items);
        setDirectory(result.breadcrumbs);
      }
      setLoading(false);
      if (resetNote) setNote(undefined);
    },
    [API, cacheKey, search, sort],
  );

  const currentFolderId =
    directory.length > 0 ? directory[directory.length - 1].folderId : undefined;

  const invalidateFolderCache = useCallback((folderId: string | undefined) => {
    const prefix = `${folderId ?? "root"}|`;
    for (const key of filesCache.current.keys()) {
      if (key.startsWith(prefix)) {
        filesCache.current.delete(key);
      }
    }
  }, []);

  const handleMouseUpMove = async (targetFolderId: string | undefined) => {
    if (!dragging || !API) return;
    const item = dragging;
    setDragging(null);
    setBreadcrumbDragOver(null);
    await API.PATCH({
      endpoint:
        item.type === "folder" ? `folders/${item._id}` : `notes/${item._id}`,
      body: { parentId: targetFolderId ?? "null" },
    });
    setFiles((prev) => prev.filter((f) => f._id !== item._id));
    invalidateFolderCache(targetFolderId);
  };

  useEffect(() => {
    if (!dragging) return;
    document.body.style.cursor = "grabbing";
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
      if (ghostRef.current) {
        ghostRef.current.style.left = `${e.clientX + 12}px`;
        ghostRef.current.style.top = `${e.clientY - 12}px`;
      }
    };
    const handleMouseUp = () => {
      document.body.style.cursor = "";
      setDragging(null);
      setBreadcrumbDragOver(null);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging]);

  useEffect(() => {
    if (!API) return;
    const hasNoteParam = new URLSearchParams(window.location.search).has(
      "note",
    );
    fetchFiles(currentFolderId, false, !hasNoteParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API, sort]);

  useEffect(() => {
    if (!API) return;
    const params = new URLSearchParams(window.location.search);
    const noteId = params.get("note");
    if (!noteId) return;
    window.history.replaceState({}, "", "/dashboard/notes");
    setNoteLoading(true);
    API.GET<{ note: INote }>({ endpoint: `notes/${noteId}` })
      .then((result) => {
        if (!("code" in result)) {
          setNote(result.note);
        }
      })
      .finally(() => setNoteLoading(false));
  }, [API]);

  //
  useEffect(() => {
    const key = cacheKey(currentFolderId, search, sort);
    if (filesCache.current.has(key)) {
      filesCache.current.set(key, files);
    }
  }, [files, cacheKey, currentFolderId, search, sort]);

  if (loading) {
    return (
      <div className="w-full flex flex-col gap-4 px-4 py-2">
        <div className="flex flex-row items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            disabled={directory.length === 0}
          >
            <MoveLeft />
          </Button>
          {searching ? (
            <Input
              placeholder=""
              className="w-full border-border"
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              value={search}
            />
          ) : (
            <Breadcrumb className="h-9 border border-border w-full px-3 py-1 rounded-md flex items-center">
              <BreadcrumbList className="text-sm">
                <BreadcrumbItemUI>
                  <BreadcrumbLink>home</BreadcrumbLink>
                </BreadcrumbItemUI>
                {directory.map((parent, index) => (
                  <React.Fragment key={parent.folderId}>
                    <BreadcrumbSeparator />
                    <BreadcrumbItemUI>{parent.folderName}</BreadcrumbItemUI>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}

          <Select
            value={sort ?? "dateAsc"}
            onValueChange={(value) => {
              setSort(value as typeof sort);
            }}
          >
            <SelectTrigger className="w-40 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nameAsc">Name A-Z</SelectItem>
              <SelectItem value="nameDesc">Name Z-A</SelectItem>
              <SelectItem value="dateDesc">Recent First</SelectItem>
              <SelectItem value="dateAsc">Oldest first</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon">
            <FolderPlus />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={directory.length === 0}
          >
            <FilePlus2 />
          </Button>
        </div>
        <div className="w-full flex flex-col gap-0">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index}>
              <div className="w-full relative">
                <div className="flex flex-row items-center gap-1">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                  <div className="grow" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
              </div>
              <Separator className="my-1 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (noteLoading) {
    return (
      <div className="w-full flex flex-col gap-4 px-4 py-2">
        <div className="flex flex-row items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            disabled={directory.length === 0}
          >
            <MoveLeft />
          </Button>
          {searching ? (
            <Input
              placeholder=""
              className="w-full border-border"
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              value={search}
            />
          ) : (
            <Breadcrumb className="h-9 border border-border w-full px-3 py-1 rounded-md flex items-center">
              <BreadcrumbList className="text-sm">
                <BreadcrumbItemUI>
                  <BreadcrumbLink>home</BreadcrumbLink>
                </BreadcrumbItemUI>
                {directory.map((parent, index) => (
                  <React.Fragment key={parent.folderId}>
                    <BreadcrumbSeparator />
                    <BreadcrumbItemUI>{parent.folderName}</BreadcrumbItemUI>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}

          <Select
            value={sort ?? "dateAsc"}
            onValueChange={(value) => {
              setSort(value as typeof sort);
            }}
          >
            <SelectTrigger className="w-40 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nameAsc">Name A-Z</SelectItem>
              <SelectItem value="nameDesc">Name Z-A</SelectItem>
              <SelectItem value="dateDesc">Recent First</SelectItem>
              <SelectItem value="dateAsc">Oldest first</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon">
            <FolderPlus />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={directory.length === 0}
          >
            <FilePlus2 />
          </Button>
        </div>

        <Skeleton className="h-[calc(100vh-16rem)] w-full rounded" />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4 px-4 py-2">
      <div className="flex flex-row items-center gap-1">
        <Button
          onClick={() => {
            if (directory.length === 0) return;
            const newDirectory = [...directory];
            newDirectory.pop();
            setDirectory(newDirectory);
            fetchFiles(
              newDirectory.length > 0
                ? newDirectory[newDirectory.length - 1].folderId
                : undefined,
            );
          }}
          onMouseEnter={() => {
            if (dragging && directory.length > 0) setBreadcrumbDragOver("back");
          }}
          onMouseLeave={() => setBreadcrumbDragOver(null)}
          onMouseUp={async () => {
            if (!dragging || directory.length === 0) return;
            const parentFolderId =
              directory.length > 1
                ? directory[directory.length - 2].folderId
                : undefined;
            await handleMouseUpMove(parentFolderId);
          }}
          variant={breadcrumbDragOver === "back" ? "default" : "outline"}
          size="icon"
          disabled={directory.length === 0}
        >
          <MoveLeft />
        </Button>
        {searching ? (
          <Input
            autoFocus
            ref={searchInputRef}
            onBlur={() => {
              setSearching(false);
              setSearch("");
            }}
            placeholder=""
            className="w-full border-border"
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            value={search}
            onKeyDown={(e) => {
              if (e.key == "Enter") {
                fetchFiles(
                  directory.length > 0
                    ? directory[directory.length - 1].folderId
                    : undefined,
                );
              }
            }}
          />
        ) : (
          <Breadcrumb
            onClick={() => {
              setSearching(true);
              searchInputRef.current?.focus();
            }}
            className="h-9 border border-border w-full px-3 py-1 rounded-md flex items-center"
          >
            <BreadcrumbList className="text-sm">
              <BreadcrumbItemUI
                className={cn(
                  "hover:cursor-pointer transition-colors",
                  breadcrumbDragOver === "home" && "text-primary underline",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setDirectory([]);
                  fetchFiles(undefined);
                }}
                onMouseEnter={() => {
                  if (dragging) setBreadcrumbDragOver("home");
                }}
                onMouseLeave={() => setBreadcrumbDragOver(null)}
                onMouseUp={async () => {
                  await handleMouseUpMove(undefined);
                }}
              >
                <BreadcrumbLink>home</BreadcrumbLink>
              </BreadcrumbItemUI>
              {directory.map((parent, index) => (
                <React.Fragment key={parent.folderId}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItemUI
                    className={cn(
                      "hover:cursor-pointer transition-colors",
                      breadcrumbDragOver === parent.folderId &&
                        "text-primary underline",
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (index === directory.length - 1) return;
                      const newDirectory = directory.slice(0, index + 1);
                      setDirectory(newDirectory);
                      fetchFiles(
                        newDirectory.length > 0
                          ? newDirectory[newDirectory.length - 1].folderId
                          : undefined,
                      );
                    }}
                    onMouseEnter={() => {
                      if (dragging) setBreadcrumbDragOver(parent.folderId);
                    }}
                    onMouseLeave={() => setBreadcrumbDragOver(null)}
                    onMouseUp={async () => {
                      await handleMouseUpMove(parent.folderId);
                    }}
                  >
                    <BreadcrumbLink>{parent.folderName}</BreadcrumbLink>
                  </BreadcrumbItemUI>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}

        {!note && (
          <>
            <Select
              value={sort ?? "dateAsc"}
              onValueChange={(value) => {
                setSort(value as typeof sort);
              }}
            >
              <SelectTrigger className="w-40! border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start" position="popper">
                <SelectItem value="nameAsc">Name A-Z</SelectItem>
                <SelectItem value="nameDesc">Name Z-A</SelectItem>
                <SelectItem value="dateDesc">Recent First</SelectItem>
                <SelectItem value="dateAsc">Oldest first</SelectItem>
              </SelectContent>
            </Select>
            <Dialog
              open={newFolderDialogOpen}
              onOpenChange={setNewFolderDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <FolderPlus />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>Create new folder</DialogTitle>
                <DialogDescription>
                  Enter the name for the new folder.
                </DialogDescription>
                <Input
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                  }}
                  placeholder="New folder"
                  className="w-full"
                />
                <DialogFooter>
                  <Button
                    onClick={() => {
                      setNewName("");
                      setNewFolderDialogOpen(false);
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!API) return;
                      const result = await API.POST<{ _id: string }>({
                        endpoint: "folders",
                        body: {
                          name: newName,
                          parentId:
                            directory.length > 0
                              ? directory[directory.length - 1].folderId
                              : "null",
                        },
                      });
                      if ("code" in result) {
                        return;
                      } else {
                        setFiles((prev) => [
                          ...prev,
                          {
                            _id: result._id,
                            name: newName,
                            type: "folder",
                            updatedAt: new Date().toISOString(),
                          },
                        ]);
                        setNewName("");
                        setNewFolderDialogOpen(false);
                      }
                    }}
                    variant="default"
                  >
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog
              open={newFileDialogOpen}
              onOpenChange={setNewFileDialogOpen}
            >
              <DialogTrigger disabled={directory.length === 0} asChild>
                <Button variant="outline" size="icon">
                  <FilePlus2 />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>Create new file</DialogTitle>
                <DialogDescription>
                  Enter the name for the new file.
                </DialogDescription>
                <Input
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                  }}
                  placeholder="New file"
                  className="w-full"
                />
                <DialogFooter>
                  <Button
                    onClick={() => {
                      setNewName("");
                      setNewFileDialogOpen(false);
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!API) return;
                      const result = await API.POST<{ _id: string }>({
                        endpoint: "notes",
                        body: {
                          name: newName,
                          parentId:
                            directory.length > 0
                              ? directory[directory.length - 1].folderId
                              : "null",
                        },
                      });
                      if ("code" in result) {
                        return;
                      } else {
                        setFiles((prev) => [
                          ...prev,
                          {
                            _id: result._id,
                            name: newName,
                            type: "note",
                            updatedAt: new Date().toISOString(),
                          },
                        ]);
                        setNewName("");
                        setNewFileDialogOpen(false);
                      }
                    }}
                    variant="default"
                  >
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
      {!note ? (
        <ContextMenu>
          <ContextMenuTrigger className="w-full flex flex-col gap-0 h-[calc(100vh-8rem)]">
            {files.map((file) => (
              <FileItem
                API={API}
                setFiles={setFiles}
                currentFolderId={currentFolderId}
                dragging={dragging}
                setDragging={setDragging}
                invalidateFolderCache={invalidateFolderCache}
                onClick={async () => {
                  if (file.type === "folder") {
                    setDirectory((prev) => [
                      ...prev,
                      { folderId: file._id, folderName: file.name },
                    ]);
                    fetchFiles(file._id);
                    return;
                  }
                  if (!API) return;
                  setNoteLoading(true);
                  const result = await API?.GET<{ note: INote }>({
                    endpoint: `notes/${file._id}`,
                  });
                  if ("code" in result) {
                    setNoteLoading(false);
                    return;
                  } else {
                    setNote(result.note);
                    setDirectory((prev) => [
                      ...prev,
                      {
                        folderId: result.note._id,
                        folderName: file.name + ".md",
                      },
                    ]);
                    setNoteLoading(false);
                  }
                }}
                key={file._id}
                type={file.type}
                _id={file._id}
                name={file.name}
                updatedAt={file.updatedAt}
                onAddToBoard={
                  file.type === "note"
                    ? () =>
                        setAddToBoardItem({ id: file._id, name: file.name })
                    : undefined
                }
              />
            ))}
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem
              onClick={() => {
                setNewFolderDialogOpen(true);
              }}
              className="text-xs!"
            >
              New Folder
              <ContextMenuShortcut className="text-xs!">
                <FolderPlus className="w-3 h-3" />
              </ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem
              disabled={directory.length === 0}
              onClick={() => {
                setNewFileDialogOpen(true);
              }}
              className="text-xs!"
            >
              New File
              <ContextMenuShortcut className="text-xs!">
                <FilePlus2 className="w-3 h-3" />
              </ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ) : (
        <NoteEditor note={note} API={API} />
      )}

      {dragging &&
        (() => {
          const file = files.find((f) => f._id === dragging._id);
          if (!file) return null;
          const GhostIcon = file.type === "folder" ? Folder : FileText;
          return (
            <div
              ref={ghostRef}
              className="fixed z-50 pointer-events-none opacity-75"
              style={{
                left: mousePosRef.current.x + 12,
                top: mousePosRef.current.y - 12,
              }}
            >
              <div className="bg-card rounded-lg border shadow-2xl px-3 py-2 flex items-center gap-2 select-none">
                <GhostIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium truncate max-w-48">
                  {file.name}
                </span>
              </div>
            </div>
          );
        })()}

      <Dialog
        open={!!addToBoardItem}
        onOpenChange={(open) => !open && setAddToBoardItem(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add to board</DialogTitle>
            <DialogDescription>
              Select a board to add &quot;{addToBoardItem?.name}&quot; as a
              card.
            </DialogDescription>
          </DialogHeader>
          {kanbanBoardsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : kanbanBoards.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No boards found. Create a board in Kanban first.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {kanbanBoards.map((board) => (
                <button
                  key={board._id}
                  disabled={addingToBoard}
                  onClick={() => handleAddToBoard(board)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left disabled:opacity-50"
                >
                  <div
                    className="size-3 rounded-full shrink-0"
                    style={{ backgroundColor: board.color ?? "#6366f1" }}
                  />
                  <span className="text-sm font-medium truncate">
                    {board.title}
                  </span>
                  {addingToBoard && (
                    <Loader2 className="size-3 animate-spin ml-auto shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
