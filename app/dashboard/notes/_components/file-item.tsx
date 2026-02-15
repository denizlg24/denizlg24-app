import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { denizApi } from "@/lib/api-wrapper";
import { format } from "date-fns";
import { FileText, Folder, Trash2,Edit3 } from "lucide-react";
import { Dispatch, SetStateAction } from "react";

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

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <button
          className="w-full group flex flex-row items-center gap-1"
          onClick={onClick}
        >
          <Icon className="text-muted-foreground group-hover:text-foreground transition-colors w-4 h-4 shrink-0" />
          <p className="text-xs text-left truncate grow">{name}</p>
          <p className="text-xs text-right w-max shrink-0">
            {format(new Date(updatedAt), "Pp").replace(",", "")}
          </p>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem className="text-xs!">
          Rename
          <ContextMenuShortcut className="text-xs!"><Edit3 className="w-3 h-3"/></ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={async () => {
            if(!API) return;
            await API.DELETE({
              endpoint: type === "folder" ? `folders/${_id}` : `notes/${_id}`,
            });
            setFiles((prev) => prev.filter((file) => file._id !== _id));
          }}
          className="text-xs!"
        >
          Delete
          <ContextMenuShortcut className="text-xs!"><Trash2 className="w-3 h-3"/></ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
