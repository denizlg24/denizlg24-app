"use client";

import { useState } from "react";
import { IKanbanCard, IKanbanColumn } from "@/lib/data-types";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2,
  Clock,
  Eye,
  Loader,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { KanbanCardItem } from "./kanban-card-item";
import type { LucideIcon } from "lucide-react";

export type ColumnWithCards = IKanbanColumn & { cards: IKanbanCard[] };

export type DraggingState =
  | { kind: "card"; cardId: string; fromColumnId: string }
  | { kind: "column"; columnId: string };

function getColumnMeta(title: string): {
  Icon: LucideIcon;
  iconClass: string;
} {
  const t = title.toLowerCase();
  if (
    t.includes("done") ||
    t.includes("complet") ||
    t.includes("finish") ||
    t.includes("publish") ||
    t.includes("launch") ||
    t.includes("fixed") ||
    t.includes("closed")
  ) {
    return { Icon: CheckCircle2, iconClass: "text-accent" };
  }
  if (
    t.includes("progress") ||
    t.includes("doing") ||
    t.includes("active") ||
    t.includes("writing") ||
    t.includes("develop")
  ) {
    return { Icon: Loader, iconClass: "text-amber-700" };
  }
  if (
    t.includes("review") ||
    t.includes("testing") ||
    t.includes("qa") ||
    t.includes("check") ||
    t.includes("approv")
  ) {
    return { Icon: Eye, iconClass: "text-blue-500" };
  }
  if (t.includes("block") || t.includes("cancel")) {
    return { Icon: XCircle, iconClass: "text-red-500" };
  }
  return { Icon: Clock, iconClass: "text-muted-foreground" };
}

interface KanbanColumnProps {
  column: ColumnWithCards;
  dragging: DraggingState | null;
  onCardDragStart: (cardId: string, fromColumnId: string) => void;
  onColumnDragStart: (columnId: string) => void;
  onCardDragOver: (columnId: string, beforeCardId: string | null) => void;
  onDrop: (columnId: string) => void;
  onCardClick: (card: IKanbanCard) => void;
  onAddCard: (columnId: string, title: string) => void;
  onUpdateColumn: (columnId: string, title: string) => void;
  onDeleteColumn: (columnId: string) => void;
}

export function KanbanColumn({
  column,
  dragging,
  onCardDragStart,
  onColumnDragStart,
  onCardDragOver,
  onDrop,
  onCardClick,
  onAddCard,
  onUpdateColumn,
  onDeleteColumn,
}: KanbanColumnProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(column.title);
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [isColumnDragOver, setIsColumnDragOver] = useState(false);

  const { Icon, iconClass } = getColumnMeta(column.title);

  const isDraggingCard = dragging?.kind === "card";

  const handleTitleSubmit = () => {
    if (titleValue.trim() && titleValue.trim() !== column.title) {
      onUpdateColumn(column._id, titleValue.trim());
    } else {
      setTitleValue(column.title);
    }
    setEditingTitle(false);
  };

  const handleAddCard = () => {
    if (!newCardTitle.trim()) return;
    onAddCard(column._id, newCardTitle.trim());
    setNewCardTitle("");
    setAddingCard(false);
  };

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return;
    const startX = e.clientX;
    const startY = e.clientY;

    const onMove = (me: MouseEvent) => {
      if (
        Math.abs(me.clientX - startX) > 5 ||
        Math.abs(me.clientY - startY) > 5
      ) {
        onColumnDragStart(column._id);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      className={`min-w-64 w-full flex-1 flex flex-col max-h-full rounded-2xl transition-colors select-none ${
        isColumnDragOver && dragging?.kind === "column"
          ? "bg-primary/5 ring-2 ring-primary ring-offset-2"
          : "bg-secondary/60 dark:bg-muted/40"
      }`}
      onMouseEnter={() => {
        if (dragging?.kind === "column") setIsColumnDragOver(true);
      }}
      onMouseLeave={() => setIsColumnDragOver(false)}
      onMouseUp={() => {
        if (dragging?.kind === "column") {
          onDrop(column._id);
          setIsColumnDragOver(false);
        }
      }}
    >
      <div
        className="flex items-center gap-2 px-4 py-3 shrink-0 cursor-grab"
        onMouseDown={handleHeaderMouseDown}
      >
        <Icon className={`size-4 shrink-0 ${iconClass}`} />

        {editingTitle ? (
          <Input
            autoFocus
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleSubmit();
              if (e.key === "Escape") {
                setTitleValue(column.title);
                setEditingTitle(false);
              }
            }}
            className="h-6 text-sm font-medium flex-1 px-1 py-0 bg-transparent border-0 border-b rounded-none focus-visible:ring-0 shadow-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="text-sm font-medium flex-1 truncate"
            onDoubleClick={() => setEditingTitle(true)}
          >
            {column.title}
          </span>
        )}

        <span className="text-xs text-muted-foreground bg-background rounded-full px-2 py-0.5 font-medium shrink-0">
          {column.cards.length}
          {column.wipLimit ? `/${column.wipLimit}` : ""}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="size-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-colors shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditingTitle(true)}>
              <Pencil className="size-3.5 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDeleteColumn(column._id)}
            >
              <Trash2 className="size-3.5 mr-2" />
              Delete column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          className="size-6 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background hover:border-foreground/20 transition-colors shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            setAddingCard(true);
          }}
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-2.5 px-3 py-3 overflow-y-auto flex-1 min-h-[150px]">
        {addingCard && (
          <div className="flex flex-col gap-2 p-3 bg-card rounded-xl border shadow-sm">
            <Input
              autoFocus
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="Card title…"
              className="text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCard();
                if (e.key === "Escape") {
                  setAddingCard(false);
                  setNewCardTitle("");
                }
              }}
            />
            <div className="flex gap-2">
              <button
                className="flex-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                onClick={handleAddCard}
                disabled={!newCardTitle.trim()}
              >
                Add card
              </button>
              <button
                className="text-xs px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-background transition-colors"
                onClick={() => {
                  setAddingCard(false);
                  setNewCardTitle("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {column.cards.map((card, idx) => (
          <KanbanCardItem
            key={card._id}
            card={card}
            nextCardId={column.cards[idx + 1]?._id ?? null}
            isDraggingCard={isDraggingCard}
            onDragStart={() => onCardDragStart(card._id, column._id)}
            onDragOver={(beforeCardId) =>
              onCardDragOver(column._id, beforeCardId)
            }
            onDrop={() => onDrop(column._id)}
            onClick={() => onCardClick(card)}
          />
        ))}

        <div
          className="flex-1 min-h-6"
          onMouseEnter={() => {
            if (!isDraggingCard) return;
            onCardDragOver(column._id, null);
          }}
          onMouseUp={(e) => {
            if (!isDraggingCard) return;
            e.stopPropagation();
            onDrop(column._id);
          }}
        />
      </div>
    </div>
  );
}
