"use client";

import type { DailyUptimeEntry } from "@/lib/data-types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const STATUS_COLORS: Record<DailyUptimeEntry["status"], string> = {
  up: "bg-accent",
  degraded: "bg-amber-400",
  down: "bg-red-500",
  unknown: "bg-muted-foreground/30",
};

export function UptimeBar({ history }: { history: DailyUptimeEntry[] }) {
  const padded = [...history];
  while (padded.length < 30) {
    padded.unshift({ date: "", totalChecks: 0, healthyChecks: 0, avgResponseTimeMs: null, status: "unknown" });
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex gap-px items-end h-4">
        {padded.map((entry, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <div
                className={`flex-1 min-w-0.75 max-w-1.5 h-full rounded-[1px] transition-opacity hover:opacity-80 ${STATUS_COLORS[entry.status]}`}
              />
            </TooltipTrigger>
            {entry.date && (
              <TooltipContent side="top" className="text-[11px] font-mono p-2">
                <p className="font-semibold">{entry.date}</p>
                <p className="text-muted-foreground">
                  {entry.healthyChecks}/{entry.totalChecks} healthy
                  {entry.avgResponseTimeMs != null && ` · ${Math.round(entry.avgResponseTimeMs)}ms`}
                </p>
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
