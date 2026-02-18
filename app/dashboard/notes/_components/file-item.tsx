import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { denizApi } from "@/lib/api-wrapper";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { FileText, Folder, Trash2, Edit3, FolderInput, LayoutGrid } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { MoveToDialog } from "./move-to-dialog";

interface FileItem {
  type: "folder" | "note";
  _id: string;
  name: string;
  updatedAt: string;
}

interface DraggingItem {
  _id: string;
  type: "folder" | "note";
}

export const FileItem = ({
  type,
  name,
  updatedAt,
  onClick,
  _id,
  setFiles,
  API,
  currentFolderId,
  dragging,
  setDragging,
  invalidateFolderCache,
  onAddToBoard,
}: FileItem & {
  onClick: () => void;
  setFiles: Dispatch<SetStateAction<FileItem[]>>;
  API: denizApi | null;
  currentFolderId: string | undefined;
  dragging: DraggingItem | null;
  setDragging: Dispatch<SetStateAction<DraggingItem | null>>;
  invalidateFolderCache: (folderId: string | undefined) => void;
  onAddToBoard?: () => void;
}) => {
  const Icon = type === "folder" ? Folder : FileText;
  const [renaming, setRenaming] = useState(false);
  const [renamingValue, setRenamingValue] = useState(name);
  const renamingValueRef = useRef(renamingValue);
  const [isDragOver, setIsDragOver] = useState(false);
  const [moveToOpen, setMoveToOpen] = useState(false);

  const isDraggingRef = useRef(false);

  useEffect(() => {
    renamingValueRef.current = renamingValue;
  }, [renamingValue]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setRenaming(false);
        setRenamingValue(name);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (!API) return;
        const current = renamingValueRef.current;
        API.PUT({
          endpoint:
            type === "folder" ? `folders/${_id}/name` : `notes/${_id}/name`,
          body: { name: current },
        });
        setFiles((prev) =>
          prev.map((file) =>
            file._id === _id ? { ...file, name: current } : file,
          ),
        );
        setRenaming(false);
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        setRenamingValue((prev) => prev.slice(0, -1));
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        setRenamingValue((prev) => prev + " ");
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setRenamingValue((prev) => prev + e.key);
      }
    };

    if (renaming) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [renaming, name, API, type, _id, setFiles]);

  useEffect(() => {
    if (!dragging) setIsDragOver(false);
  }, [dragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (renaming || e.button !== 0) return;
    const startX = e.clientX;
    const startY = e.clientY;

    const onMove = (me: MouseEvent) => {
      if (
        Math.abs(me.clientX - startX) > 5 ||
        Math.abs(me.clientY - startY) > 5
      ) {
        isDraggingRef.current = true;
        setDragging({ _id, type });
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);

        window.addEventListener("mouseup", resetAfterDrag, { once: true });
      }
    };

    const resetAfterDrag = () => {
      requestAnimationFrame(() => {
        isDraggingRef.current = false;
      });
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const isDropTarget =
    dragging !== null && type === "folder" && dragging._id !== _id;

  return (
    <>
      <MoveToDialog
        open={moveToOpen}
        onOpenChange={setMoveToOpen}
        itemId={_id}
        itemType={type}
        itemName={name}
        API={API}
        currentFolderId={currentFolderId}
        onMoved={() => setFiles((prev) => prev.filter((f) => f._id !== _id))}
      />
      <ContextMenu>
        <ContextMenuTrigger
          className={cn(
            "block transition-colors",
            isDragOver && "bg-primary/10",
          )}
          onMouseEnter={() => {
            if (isDropTarget) setIsDragOver(true);
          }}
          onMouseLeave={() => setIsDragOver(false)}
          onMouseUp={async () => {
            if (!isDropTarget || !API) {
              setIsDragOver(false);
              return;
            }
            setIsDragOver(false);
            const item = dragging!;
            setDragging(null);
            await API.PATCH({
              endpoint:
                item.type === "folder"
                  ? `folders/${item._id}`
                  : `notes/${item._id}`,
              body: { parentId: _id },
            });
            setFiles((prev) => prev.filter((f) => f._id !== item._id));
            invalidateFolderCache(_id);
          }}
        >
          <div
            role="button"
            tabIndex={0}
            className={cn(
              "w-full group flex flex-row items-center gap-1 pb-1 border-b mb-1 transition-colors cursor-pointer select-none",
              isDragOver && "border-primary",
            )}
            onMouseDown={handleMouseDown}
            onClick={() => {
              if (renaming || isDraggingRef.current) return;
              onClick();
            }}
            onKeyDown={(e) => {
              if (renaming && e.key === " ") {
                e.preventDefault();
                return;
              }
              if (!renaming && e.key === "Enter") onClick();
            }}
          >
            <Icon
              className={cn(
                "text-muted-foreground group-hover:text-foreground transition-colors w-4 h-4 shrink-0",
                isDragOver && "text-primary",
              )}
            />
            <p
              className={cn(
                "text-xs text-left truncate grow",
                renaming && "bg-surface text-accent-strong",
              )}
            >
              {renaming ? renamingValue : name}
              {renaming && (
                <span className="text-accent-strong animate-caret-blink">
                  |
                </span>
              )}
            </p>
            <p className="text-xs text-right w-max shrink-0">
              {format(new Date(updatedAt), "Pp").replace(",", "")}
            </p>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onClick={() => setRenaming(true)}
            className="text-xs!"
          >
            Rename
            <ContextMenuShortcut className="text-xs!">
              <Edit3 className="w-3 h-3" />
            </ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => setMoveToOpen(true)}
            className="text-xs!"
          >
            Move to
            <ContextMenuShortcut className="text-xs!">
              <FolderInput className="w-3 h-3" />
            </ContextMenuShortcut>
          </ContextMenuItem>
          {type === "note" && onAddToBoard && (
            <ContextMenuItem onClick={onAddToBoard} className="text-xs!">
              Add to board
              <ContextMenuShortcut className="text-xs!">
                <LayoutGrid className="w-3 h-3" />
              </ContextMenuShortcut>
            </ContextMenuItem>
          )}
          <ContextMenuItem
            onClick={async () => {
              if (!API) return;
              await API.DELETE({
                endpoint: type === "folder" ? `folders/${_id}` : `notes/${_id}`,
              });
              setFiles((prev) => prev.filter((file) => file._id !== _id));
            }}
            className="text-xs!"
          >
            Delete
            <ContextMenuShortcut className="text-xs!">
              <Trash2 className="w-3 h-3" />
            </ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </>
  );
};
