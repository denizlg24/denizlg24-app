"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IKanbanCard, IKanbanColumn, KanbanPriority } from "@/lib/data-types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, FileText, Save, Trash2 } from "lucide-react";
import { format } from "date-fns";

type ColumnMeta = Pick<IKanbanColumn, "_id" | "title">;

interface CardDialogProps {
  card: IKanbanCard;
  columns: ColumnMeta[];
  onClose: () => void;
  onUpdate: (cardId: string, updates: Partial<IKanbanCard>) => Promise<void>;
  onDelete: (cardId: string) => Promise<void>;
}

const NOTE_LINK_RE = /^\[note\]\(([^,]+),(.+)\)$/;

const PRIORITIES: { value: KanbanPriority; label: string }[] = [
  { value: "none", label: "None" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export function CardDialog({
  card,
  columns,
  onClose,
  onUpdate,
  onDelete,
}: CardDialogProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [priority, setPriority] = useState<KanbanPriority>(card.priority);
  const [columnId, setColumnId] = useState(card.columnId);
  const [dueDate, setDueDate] = useState(
    card.dueDate ? format(new Date(card.dueDate), "yyyy-MM-dd") : "",
  );
  const [labelInput, setLabelInput] = useState(
    (card.labels ?? []).join(", "),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const router = useRouter();
  const noteMatch = NOTE_LINK_RE.exec(card.description ?? "");
  const linkedNote = noteMatch
    ? { id: noteMatch[1], name: noteMatch[2] }
    : null;

  const handleSave = async () => {
    if (!title.trim() || isSaving) return;
    setIsSaving(true);
    await onUpdate(card._id, {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      columnId,
      dueDate: dueDate ? (new Date(dueDate) as unknown as Date) : undefined,
      labels: labelInput
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean),
    });
    setIsSaving(false);
    onClose();
  };

  const handleDelete = async () => {
    await onDelete(card._id);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Edit Card</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="card-title">Title</Label>
            <Input
              id="card-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-medium"
            />
          </div>

          {linkedNote && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted/50 border">
              <FileText className="size-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Linked note</p>
                <p className="text-sm font-medium truncate">{linkedNote.name}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => {
                  onClose();
                  router.push(
                    `/dashboard/notes?note=${linkedNote.id}`,
                  );
                }}
              >
                <ExternalLink className="size-3.5 mr-1.5" />
                Open
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="card-desc">Description</Label>
            <Textarea
              id="card-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description…"
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as KanbanPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Column</Label>
              <Select value={columnId} onValueChange={setColumnId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col) => (
                    <SelectItem key={col._id} value={col._id}>
                      {col.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="card-due">Due Date</Label>
            <Input
              id="card-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="card-labels">
              Labels{" "}
              <span className="text-muted-foreground text-xs font-normal">
                (comma-separated)
              </span>
            </Label>
            <Input
              id="card-labels"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              placeholder="bug, design, backend…"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-destructive">Delete this card?</span>
                <Button size="sm" variant="destructive" onClick={handleDelete}>
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-3.5 mr-1.5" />
                Delete
              </Button>
            )}

            <Button
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
              size="sm"
            >
              <Save className="size-3.5 mr-1.5" />
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
