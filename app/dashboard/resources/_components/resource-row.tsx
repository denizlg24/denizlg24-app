"use client";

import type { IResource } from "@/lib/data-types";
import { UptimeBar } from "./uptime-bar";
import { Activity, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TYPE_LABELS: Record<IResource["type"], string> = {
  pi: "PI",
  vps: "VPS",
  api: "API",
  service: "SVC",
};

function StatusDot({ isHealthy }: { isHealthy: boolean | null }) {
  if (isHealthy === null) {
    return <span className="relative flex size-2"><span className="size-2 rounded-full bg-muted-foreground/30" /></span>;
  }
  if (isHealthy) {
    return (
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full rounded-full bg-accent opacity-40 animate-ping" />
        <span className="relative inline-flex size-2 rounded-full bg-accent" />
      </span>
    );
  }
  return (
    <span className="relative flex size-2">
      <span className="absolute inline-flex size-full rounded-full bg-red-400 opacity-40 animate-ping" />
      <span className="relative inline-flex size-2 rounded-full bg-red-500" />
    </span>
  );
}

export function ResourceRow({
  resource,
  onSelect,
  onEdit,
  onDelete,
  onHealthCheck,
}: {
  resource: IResource;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onHealthCheck: () => void;
}) {
  const uptimePercent = resource.uptime?.uptimePercentage;
  const lastMs = resource.healthCheck.lastResponseTimeMs;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className="group flex items-center gap-4 px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
    >
      <StatusDot isHealthy={resource.healthCheck.isHealthy} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{resource.name}</span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
            {TYPE_LABELS[resource.type]}
          </span>
          {!resource.isActive && (
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
              inactive
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground/70 truncate mt-0.5 font-mono">
          {resource.url}
        </p>
      </div>

      <div className="hidden md:flex items-center gap-6 shrink-0">
        {resource.uptime && resource.uptime.dailyHistory.length > 0 && (
          <div className="w-32" onClick={(e) => e.stopPropagation()}>
            <UptimeBar history={resource.uptime.dailyHistory} />
          </div>
        )}

        <div className="flex items-center gap-4 text-right">
          {uptimePercent != null && (
            <div className="w-14">
              <p className="text-sm font-mono font-semibold tabular-nums">
                {uptimePercent.toFixed(1)}%
              </p>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">uptime</p>
            </div>
          )}
          {lastMs != null && (
            <div className="w-14">
              <p className="text-sm font-mono font-semibold tabular-nums">
                {Math.round(lastMs)}
              </p>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">ms</p>
            </div>
          )}
          <div className="w-8">
            <p className="text-sm font-mono font-semibold tabular-nums">
              {resource.capabilities.length}
            </p>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">caps</p>
          </div>
        </div>
      </div>

      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded hover:bg-muted/50 text-muted-foreground/60 hover:text-muted-foreground transition-colors">
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onHealthCheck}>
              <Activity className="size-3.5 mr-2" /> Health check
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="size-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="size-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
