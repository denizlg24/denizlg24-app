"use client";

import { useState } from "react";
import type { IResource, ICapability } from "@/lib/data-types";
import type { denizApi } from "@/lib/api-wrapper";
import { UptimeBar } from "./uptime-bar";
import { CapabilitySection } from "./capability-section";
import { AddCapabilityDialog } from "./add-capability-dialog";
import { PiCronDashboard } from "./picron/picron-dashboard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";

export function ResourceDetail({
  resource,
  API,
  onUpdate,
}: {
  resource: IResource;
  API: denizApi;
  onUpdate: (updated: IResource) => void;
}) {
  const [addCapOpen, setAddCapOpen] = useState(false);
  const [deleteCapTarget, setDeleteCapTarget] = useState<string | null>(null);
  const [selectedCap, setSelectedCap] = useState<ICapability | null>(null);
  const [deleting, setDeleting] = useState(false);

  const uptimePercent = resource.uptime?.uptimePercentage;
  const lastMs = resource.healthCheck.lastResponseTimeMs;
  const lastChecked = resource.healthCheck.lastCheckedAt;

  const handleAddCapability = async (data: { type: string; label: string; config: Record<string, unknown> }) => {
    const result = await API.POST<ICapability>({
      endpoint: `resources/${resource._id}/capabilities`,
      body: data,
    });
    if ("code" in result) { toast.error("Failed to add capability"); return; }
    onUpdate({ ...resource, capabilities: [...resource.capabilities, result] });
    setAddCapOpen(false);
    toast.success("Capability added");
  };

  const handleToggleCapability = async (capId: string, isActive: boolean) => {
    const result = await API.PATCH<ICapability>({
      endpoint: `resources/${resource._id}/capabilities/${capId}`,
      body: { isActive },
    });
    if ("code" in result) { toast.error("Failed to update capability"); return; }
    onUpdate({
      ...resource,
      capabilities: resource.capabilities.map((c) => (c._id === capId ? { ...c, isActive } : c)),
    });
  };

  const handleDeleteCapability = async () => {
    if (!deleteCapTarget) return;
    setDeleting(true);
    const result = await API.DELETE<{ status: string }>({
      endpoint: `resources/${resource._id}/capabilities/${deleteCapTarget}`,
    });
    setDeleting(false);
    if ("code" in result) { toast.error("Failed to delete capability"); return; }
    onUpdate({
      ...resource,
      capabilities: resource.capabilities.filter((c) => c._id !== deleteCapTarget),
    });
    if (selectedCap?._id === deleteCapTarget) setSelectedCap(null);
    setDeleteCapTarget(null);
    toast.success("Capability removed");
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-6 py-6">
        
        <div className="flex items-start gap-6 mb-8">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground/70 font-mono truncate mb-1 flex items-center gap-1.5">
              {resource.url}
              <a href={resource.url} target="_blank" rel="noreferrer" className="text-muted-foreground/70 hover:text-muted-foreground transition-colors">
                <ExternalLink className="size-3" />
              </a>
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {resource.description}
            </p>
          </div>

          <div className="flex items-center gap-5 shrink-0">
            {uptimePercent != null && (
              <div className="text-right">
                <p className="text-2xl font-mono font-semibold tabular-nums tracking-tight">
                  {uptimePercent.toFixed(1)}
                  <span className="text-sm text-muted-foreground/60">%</span>
                </p>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">uptime</p>
              </div>
            )}
            {lastMs != null && (
              <div className="text-right">
                <p className="text-2xl font-mono font-semibold tabular-nums tracking-tight">
                  {Math.round(lastMs)}
                  <span className="text-sm text-muted-foreground/60">ms</span>
                </p>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">latency</p>
              </div>
            )}
          </div>
        </div>

        
        {resource.uptime && resource.uptime.dailyHistory.length > 0 && (
          <div className="mb-8">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-2">30-day uptime</p>
            <UptimeBar history={resource.uptime.dailyHistory} />
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-muted-foreground/70 font-mono">30d ago</span>
              <span className="text-[9px] text-muted-foreground/70 font-mono">today</span>
            </div>
          </div>
        )}

        
        {resource.healthCheck.enabled && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground/60 mb-8 pb-8 border-b border-border/30">
            <span className="font-mono">
              every {resource.healthCheck.intervalMinutes}m
            </span>
            <span className="text-muted-foreground/60">·</span>
            <span className="font-mono">
              expect {resource.healthCheck.expectedStatus}
            </span>
            <span className="text-muted-foreground/60">·</span>
            <span className="font-mono">
              timeout {resource.healthCheck.responseTimeThresholdMs}ms
            </span>
            {lastChecked && (
              <>
                <span className="text-muted-foreground/60">·</span>
                <span>
                  checked {new Date(lastChecked).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </>
            )}
          </div>
        )}

        
        <div className="mb-8">
          <CapabilitySection
            capabilities={resource.capabilities}
            onAdd={() => setAddCapOpen(true)}
            onToggle={handleToggleCapability}
            onDelete={(capId) => setDeleteCapTarget(capId)}
            onSelect={(cap) => setSelectedCap(selectedCap?._id === cap._id ? null : cap)}
          />
        </div>

        
        {selectedCap && selectedCap.type === "picron" && (
          <div className="border-t border-border/30 pt-6">
            <PiCronDashboard
              API={API}
              resourceId={resource._id}
              capability={selectedCap}
            />
          </div>
        )}

      </div>

      <AddCapabilityDialog
        open={addCapOpen}
        onOpenChange={setAddCapOpen}
        onSubmit={handleAddCapability}
      />

      <Dialog open={!!deleteCapTarget} onOpenChange={(o) => !o && setDeleteCapTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Capability</DialogTitle>
            <DialogDescription>
              This will remove the capability and all associated configuration. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCapTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteCapability} disabled={deleting}>
              {deleting ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
