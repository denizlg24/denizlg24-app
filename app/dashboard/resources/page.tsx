"use client";

import { useEffect, useMemo, useState } from "react";
import { denizApi } from "@/lib/api-wrapper";
import { useUserSettings } from "@/context/user-context";
import type { IResource } from "@/lib/data-types";
import { ResourceRow } from "./_components/resource-row";
import { ResourceDetail } from "./_components/resource-detail";
import { CreateResourceDialog } from "./_components/create-resource-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Activity, ArrowLeft, Loader2, Plus, Radio } from "lucide-react";
import { toast } from "sonner";

export default function ResourcesPage() {
  const { settings, loading: loadingSettings } = useUserSettings();

  const API = useMemo(() => {
    if (loadingSettings) return null;
    return new denizApi(settings.apiKey);
  }, [settings, loadingSettings]);

  const [resources, setResources] = useState<IResource[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(
    null,
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<IResource | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<IResource | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [healthChecking, setHealthChecking] = useState(false);

  useEffect(() => {
    if (!API || !initialLoading) return;
    API.GET<{ resources: IResource[] }>({ endpoint: "resources" })
      .then((result) => {
        if (!("code" in result)) setResources(result.resources ?? []);
      })
      .finally(() => setInitialLoading(false));
  }, [API, initialLoading]);

  const handleCreate = async (data: Record<string, unknown>) => {
    if (!API) return;
    const result = await API.POST<IResource>({
      endpoint: "resources",
      body: data,
    });
    if ("code" in result) {
      toast.error("Failed to create resource");
      return;
    }
    setResources((prev) => [...prev, { ...result, uptime: null }]);
    setCreateOpen(false);
    toast.success("Resource created");
  };

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!API || !editingResource) return;
    const result = await API.PATCH<IResource>({
      endpoint: `resources/${editingResource._id}`,
      body: data,
    });
    if ("code" in result) {
      toast.error("Failed to update resource");
      return;
    }
    setResources((prev) =>
      prev.map((r) =>
        r._id === editingResource._id
          ? { ...r, ...result, uptime: r.uptime }
          : r,
      ),
    );
    setEditingResource(null);
    toast.success("Resource updated");
  };

  const handleDelete = async () => {
    if (!API || !deleteTarget) return;
    setDeleting(true);
    const result = await API.DELETE<{ status: string }>({
      endpoint: `resources/${deleteTarget._id}`,
    });
    setDeleting(false);
    if ("code" in result) {
      toast.error("Failed to delete resource");
      return;
    }
    setResources((prev) => prev.filter((r) => r._id !== deleteTarget._id));
    if (selectedResourceId === deleteTarget._id) setSelectedResourceId(null);
    setDeleteTarget(null);
    toast.success("Resource deleted");
  };

  const handleHealthCheckAll = async () => {
    if (!API) return;
    setHealthChecking(true);
    const result = await API.POST<{
      results: Array<{
        resourceId: string;
        isHealthy: boolean;
        status: number | null;
        responseTimeMs: number | null;
      }>;
    }>({
      endpoint: "resources/health-check",
      body: { force: true },
    });
    setHealthChecking(false);
    if ("code" in result) {
      toast.error("Health check failed");
      return;
    }
    setResources((prev) =>
      prev.map((r) => {
        const check = result.results.find((c) => c.resourceId === r._id);
        if (!check) return r;
        return {
          ...r,
          healthCheck: {
            ...r.healthCheck,
            isHealthy: check.isHealthy,
            lastStatus: check.status,
            lastResponseTimeMs: check.responseTimeMs,
            lastCheckedAt: new Date().toISOString(),
          },
        };
      }),
    );
    const healthy = result.results.filter((r) => r.isHealthy).length;
    toast.success(
      `Health check complete: ${healthy}/${result.results.length} healthy`,
    );
  };

  const handleSingleHealthCheck = async (resource: IResource) => {
    if (!API) return;
    setHealthChecking(true);
    const result = await API.POST<{
      results: Array<{
        resourceId: string;
        isHealthy: boolean;
        status: number | null;
        responseTimeMs: number | null;
      }>;
    }>({
      endpoint: "resources/health-check",
      body: { force: true },
    });
    setHealthChecking(false);
    if ("code" in result) {
      toast.error("Health check failed");
      return;
    }
    const check = result.results.find((c) => c.resourceId === resource._id);
    if (!check) return;
    setResources((prev) =>
      prev.map((r) => {
        if (r._id !== resource._id) return r;
        return {
          ...r,
          healthCheck: {
            ...r.healthCheck,
            isHealthy: check.isHealthy,
            lastStatus: check.status,
            lastResponseTimeMs: check.responseTimeMs,
            lastCheckedAt: new Date().toISOString(),
          },
        };
      }),
    );
    toast.success(
      check.isHealthy
        ? `${resource.name} is healthy`
        : `${resource.name} is unhealthy`,
    );
  };

  const handleResourceUpdate = (updated: IResource) => {
    setResources((prev) =>
      prev.map((r) => (r._id === updated._id ? updated : r)),
    );
  };

  const selectedResource = resources.find((r) => r._id === selectedResourceId);

  if (loadingSettings || !API || initialLoading) {
    return (
      <div className="flex flex-col h-[calc(100dvh-2rem)]">
        <div className="flex items-center gap-2 px-4 border-b h-12 shrink-0">
          <div className="h-4 w-32 bg-muted rounded animate-pulse flex-1" />
          <div className="h-7 w-24 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex-1 overflow-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3 border-b border-border/50"
            >
              <div className="size-2 bg-muted rounded-full animate-pulse" />
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="h-3.5 w-40 bg-muted rounded animate-pulse" />
                <div className="h-2.5 w-56 bg-muted rounded animate-pulse" />
              </div>
              <div className="hidden md:flex gap-6">
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                <div className="h-4 w-14 bg-muted rounded animate-pulse" />
                <div className="h-4 w-14 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalResources = resources.length;
  const healthyCount = resources.filter(
    (r) => r.healthCheck.isHealthy === true,
  ).length;
  const unhealthyCount = resources.filter(
    (r) => r.healthCheck.isHealthy === false,
  ).length;

  return (
    <div className="flex flex-col h-[calc(100dvh-2rem)]">
      <div className="flex items-center gap-2 px-4 border-b h-12 shrink-0">
        {selectedResource ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setSelectedResourceId(null)}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <span
              className={`relative flex size-2 ${
                selectedResource.healthCheck.isHealthy === true
                  ? ""
                  : selectedResource.healthCheck.isHealthy === false
                    ? ""
                    : ""
              }`}
            >
              {selectedResource.healthCheck.isHealthy === true && (
                <>
                  <span className="absolute inline-flex size-full rounded-full bg-accent opacity-40 animate-ping" />
                  <span className="relative inline-flex size-2 rounded-full bg-accent" />
                </>
              )}
              {selectedResource.healthCheck.isHealthy === false && (
                <>
                  <span className="absolute inline-flex size-full rounded-full bg-red-400 opacity-40 animate-ping" />
                  <span className="relative inline-flex size-2 rounded-full bg-red-500" />
                </>
              )}
              {selectedResource.healthCheck.isHealthy === null && (
                <span className="size-2 rounded-full bg-muted-foreground/30" />
              )}
            </span>
            <span className="text-sm font-semibold flex-1 truncate">
              {selectedResource.name}
            </span>
          </>
        ) : (
          <>
            <Radio className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold flex-1">Resources</span>

            <div className="hidden sm:flex items-center gap-3 mr-3 text-xs">
              <span className="font-mono text-muted-foreground/70 tabular-nums">
                {totalResources}{" "}
                <span className="text-[9px] uppercase tracking-wider">
                  total
                </span>
              </span>
              {healthyCount > 0 && (
                <span className="font-mono text-accent tabular-nums">
                  {healthyCount}{" "}
                  <span className="text-[9px] uppercase tracking-wider">
                    up
                  </span>
                </span>
              )}
              {unhealthyCount > 0 && (
                <span className="font-mono text-red-500/70 tabular-nums">
                  {unhealthyCount}{" "}
                  <span className="text-[9px] uppercase tracking-wider">
                    down
                  </span>
                </span>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleHealthCheckAll}
              disabled={healthChecking || resources.length === 0}
              className="gap-1.5 text-muted-foreground"
            >
              {healthChecking ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Activity className="size-3" />
              )}
              Check All
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3" /> New
            </Button>
          </>
        )}
      </div>

      {selectedResource ? (
        <ResourceDetail
          resource={selectedResource}
          API={API}
          onUpdate={handleResourceUpdate}
        />
      ) : resources.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground/60">
          <Radio className="size-8 opacity-30" />
          <p className="text-sm">No resources yet</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-3" /> Add Resource
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {resources.map((resource) => (
            <ResourceRow
              key={resource._id}
              resource={resource}
              onSelect={() => setSelectedResourceId(resource._id)}
              onEdit={() => setEditingResource(resource)}
              onDelete={() => setDeleteTarget(resource)}
              onHealthCheck={() => handleSingleHealthCheck(resource)}
            />
          ))}
        </div>
      )}

      <CreateResourceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />

      <CreateResourceDialog
        open={!!editingResource}
        onOpenChange={(o) => !o && setEditingResource(null)}
        onSubmit={handleUpdate}
        editingResource={editingResource}
        key={editingResource?._id ?? "edit-dialog"}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Resource</DialogTitle>
            <DialogDescription>
              Delete &quot;{deleteTarget?.name}&quot;? All capabilities and
              monitoring data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete Resource"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
