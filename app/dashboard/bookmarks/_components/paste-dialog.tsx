"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (url: string) => Promise<boolean | undefined>;
}

export function PasteDialog({ open, onOpenChange, onSubmit }: Props) {
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setUrl("");
      setSubmitting(false);
    }
  }, [open]);

  const submit = async () => {
    if (!url.trim() || submitting) return;
    setSubmitting(true);
    const ok = await onSubmit(url.trim());
    setSubmitting(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add bookmark</DialogTitle>
          <DialogDescription className="text-xs">
            Paste a URL. We&apos;ll fetch metadata and auto-categorize.
          </DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="https://…"
          disabled={submitting}
        />
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || !url.trim()}>
            {submitting && <Loader2 className="size-3.5 animate-spin" />}
            {submitting ? "Categorizing…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
