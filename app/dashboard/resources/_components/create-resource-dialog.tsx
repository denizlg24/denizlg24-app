"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { IResource } from "@/lib/data-types";

type ResourceType = IResource["type"];

const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: "pi", label: "Raspberry Pi" },
  { value: "vps", label: "VPS" },
  { value: "api", label: "API" },
  { value: "service", label: "Service" },
];

export function CreateResourceDialog({
  open,
  onOpenChange,
  onSubmit,
  editingResource,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    description: string;
    url: string;
    type: ResourceType;
    isActive: boolean;
    healthCheck: {
      enabled: boolean;
      intervalMinutes: number;
      expectedStatus: number;
      responseTimeThresholdMs: number;
    };
  }) => Promise<void>;
  editingResource?: IResource | null;
}) {
  const [name, setName] = useState(editingResource?.name ?? "");
  const [description, setDescription] = useState(editingResource?.description ?? "");
  const [url, setUrl] = useState(editingResource?.url ?? "");
  const [type, setType] = useState<ResourceType>(editingResource?.type ?? "api");
  const [healthEnabled, setHealthEnabled] = useState(editingResource?.healthCheck.enabled ?? true);
  const [interval, setInterval] = useState(String(editingResource?.healthCheck.intervalMinutes ?? 5));
  const [expectedStatus, setExpectedStatus] = useState(String(editingResource?.healthCheck.expectedStatus ?? 200));
  const [threshold, setThreshold] = useState(String(editingResource?.healthCheck.responseTimeThresholdMs ?? 5000));
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setName(editingResource?.name ?? "");
    setDescription(editingResource?.description ?? "");
    setUrl(editingResource?.url ?? "");
    setType(editingResource?.type ?? "api");
    setHealthEnabled(editingResource?.healthCheck.enabled ?? true);
    setInterval(String(editingResource?.healthCheck.intervalMinutes ?? 5));
    setExpectedStatus(String(editingResource?.healthCheck.expectedStatus ?? 200));
    setThreshold(String(editingResource?.healthCheck.responseTimeThresholdMs ?? 5000));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !url.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        url: url.trim(),
        type,
        isActive: true,
        healthCheck: {
          enabled: healthEnabled,
          intervalMinutes: Number(interval) || 5,
          expectedStatus: Number(expectedStatus) || 200,
          responseTimeThresholdMs: Number(threshold) || 5000,
        },
      });
      if (!editingResource) resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingResource ? "Edit Resource" : "New Resource"}</DialogTitle>
          <DialogDescription>
            {editingResource ? "Update resource configuration." : "Register a new resource to monitor."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1.5">
              <Label htmlFor="res-name">Name</Label>
              <Input id="res-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My API Server" />
            </div>
            <div className="w-32 flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ResourceType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="res-url">URL</Label>
            <Input id="res-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.example.com/health" className="font-mono text-sm" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="res-desc">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea id="res-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this resource do?" rows={2} className="resize-none" />
          </div>

          <div className="border-t pt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Health Checks</Label>
              <button
                type="button"
                onClick={() => setHealthEnabled(!healthEnabled)}
                className={`relative w-8 h-[18px] rounded-full transition-colors ${healthEnabled ? "bg-accent" : "bg-muted-foreground/30"}`}
              >
                <span className={`absolute top-[2px] size-[14px] rounded-full bg-white transition-transform ${healthEnabled ? "left-[17px]" : "left-[2px]"}`} />
              </button>
            </div>
            {healthEnabled && (
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] text-muted-foreground">Interval (min)</Label>
                  <Input value={interval} onChange={(e) => setInterval(e.target.value)} className="font-mono text-xs h-8" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] text-muted-foreground">Expected Status</Label>
                  <Input value={expectedStatus} onChange={(e) => setExpectedStatus(e.target.value)} className="font-mono text-xs h-8" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] text-muted-foreground">Timeout (ms)</Label>
                  <Input value={threshold} onChange={(e) => setThreshold(e.target.value)} className="font-mono text-xs h-8" />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !name.trim() || !url.trim()}>
            {submitting ? (editingResource ? "Saving…" : "Creating…") : (editingResource ? "Save Changes" : "Create Resource")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
