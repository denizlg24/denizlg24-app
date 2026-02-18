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
import { FileText, Folder, Trash2, Edit3 } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";

interface FileItem {
  type: "folder" | "note";
  _id: string;
  name: string;
  updatedAt: string;
}

export const FileItem = ({
  type,
  name,
  updatedAt,
  onClick,
  _id,
  setFiles,
  API,
}: FileItem & {
  onClick: () => void;
  setFiles: Dispatch<SetStateAction<FileItem[]>>;
  API: denizApi | null;
}) => {
  const Icon = type === "folder" ? Folder : FileText;
  const [renaming, setRenaming] = useState(false);
  const [renamingValue, setRenamingValue] = useState(name);
  const renamingValueRef = useRef(renamingValue);

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
          endpoint: type === "folder" ? `folders/${_id}/name` : `notes/${_id}/name`,
          body: { name: current },
        });
        setFiles((prev) => {
          return prev.map((file) => {
            if (file._id === _id) {
              return { ...file, name: current };
            }
            return file;
          });
        });
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

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <button
          className="w-full group flex flex-row items-center gap-1 pb-1 border-b mb-1"
          onClick={(e) => {
            if (renaming) {
              e.preventDefault();
              return;
            }
            onClick();
          }}
          onKeyDown={(e) => {
            if (renaming && e.key === " ") {
              e.preventDefault();
            }
          }}
        >
          <Icon className="text-muted-foreground group-hover:text-foreground transition-colors w-4 h-4 shrink-0" />
          <p
            className={cn(
              "text-xs text-left truncate grow",
              renaming && "bg-surface text-accent-strong",
            )}
          >
            {renaming ? renamingValue : name}{renaming && <span className="text-accent-strong animate-caret-blink">|</span>}
          </p>
          <p className="text-xs text-right w-max shrink-0">
            {format(new Date(updatedAt), "Pp").replace(",", "")}
          </p>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => {
            setRenaming(true);
          }}
          className="text-xs!"
        >
          Rename
          <ContextMenuShortcut className="text-xs!">
            <Edit3 className="w-3 h-3" />
          </ContextMenuShortcut>
        </ContextMenuItem>
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
  );
};
