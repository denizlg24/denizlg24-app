"use client";

import { format } from "date-fns";
import { Brain, MapPin } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserSettings } from "@/context/user-context";
import { denizApi } from "@/lib/api-wrapper";
import type { IDashboardStats } from "@/lib/data-types";

function StatNumber({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-4">
      <span className="font-calistoga text-2xl text-accent-strong leading-none">
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function AgendaItem({
  time,
  title,
  subtitle,
  color,
}: {
  time: string;
  title: string;
  subtitle?: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    accent: "bg-accent",
    "accent-strong": "bg-accent-strong",
    surface: "bg-surface",
    muted: "bg-muted",
    foreground: "bg-foreground",
    background: "bg-muted",
    destructive: "bg-destructive",
  };

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-xs font-mono text-muted-foreground w-10 shrink-0 tabular-nums">
        {time}
      </span>
      <div
        className={`w-0.5 h-4 rounded-full shrink-0 ${colorMap[color] ?? "bg-accent"}`}
      />
      <span className="text-sm text-accent-strong truncate">{title}</span>
      {subtitle && (
        <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
          <MapPin className="w-2.5 h-2.5" />
          {subtitle}
        </span>
      )}
    </div>
  );
}

function ResourceDot({
  name,
  status,
}: {
  name: string;
  status: "healthy" | "degraded" | "unreachable" | null;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          status === "healthy"
            ? "bg-accent"
            : status === "degraded"
              ? "bg-yellow-500"
              : status === "unreachable"
                ? "bg-destructive"
                : "bg-muted"
        }`}
      />
      <span className="text-xs text-muted-foreground">{name}</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="w-full flex flex-col items-center gap-6 animate-in fade-in duration-300">
      <div className="flex justify-center gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton className="h-7 w-7" />
            <Skeleton className="h-2 w-12" />
          </div>
        ))}
      </div>
      <div className="flex gap-8">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function DashboardSummary() {
  const { settings, loading: loadingSettings } = useUserSettings();
  const [stats, setStats] = useState<IDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const API = useMemo(() => {
    if (loadingSettings) return null;
    return new denizApi(settings.apiKey);
  }, [settings, loadingSettings]);

  const fetchStats = useCallback(async () => {
    if (!API) return;
    setLoading(true);
    const result = await API.GET<IDashboardStats>({
      endpoint: "dashboard/stats",
    });
    if (!("code" in result)) {
      setStats(result);
    }
    setLoading(false);
  }, [API]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading || !stats) {
    return <LoadingSkeleton />;
  }

  const agendaItems = [
    ...stats.timetable.map((entry) => ({
      time: entry.startTime,
      title: entry.title,
      subtitle: entry.place,
      color: entry.color,
      sortKey: entry.startTime,
    })),
    ...stats.calendar.events
      .filter((event) => {
        const eventDate = new Date(event.date);
        const today = new Date();
        return eventDate.toDateString() === today.toDateString();
      })
      .map((event) => ({
        time: format(new Date(event.date), "HH:mm"),
        title: event.title,
        subtitle: undefined,
        color:
          event.status === "completed"
            ? "accent"
            : event.status === "canceled"
              ? "destructive"
              : "accent-strong",
        sortKey: format(new Date(event.date), "HH:mm"),
      })),
  ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  return (
    <div className="w-full flex flex-col items-center gap-8 animate-in fade-in duration-500">
      <div className="flex flex-wrap justify-center gap-1">
        <StatNumber value={stats.contacts.total} label="Contacts" />
        <StatNumber
          value={stats.calendar.todayEvents + stats.timetable.length}
          label="Today"
        />
        <StatNumber value={stats.projects.total} label="Projects" />
        <StatNumber value={stats.blogs.published} label="Posts" />
        <StatNumber value={stats.notes.total} label="Notes" />
        <StatNumber value={stats.emails.total} label="Emails" />
      </div>

      {agendaItems.length > 0 && (
        <div className="w-full max-w-md">
          <div className="flex flex-col">
            {agendaItems.slice(0, 4).map((item) => (
              <AgendaItem
                key={`${item.time}-${item.title}`}
                time={item.time}
                title={item.title}
                subtitle={item.subtitle}
                color={item.color}
              />
            ))}
            {agendaItems.length > 4 && (
              <p className="text-[10px] text-muted-foreground mt-1 ml-[52px]">
                +{agendaItems.length - 4} more
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-4">
        {stats.resources.length > 0 && (
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            {stats.resources.map((resource) => (
              <ResourceDot
                key={resource._id}
                name={resource.name}
                status={resource.status}
              />
            ))}
          </div>
        )}

        {stats.llm.todayRequests > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Brain className="w-3 h-3" />
            <span className="font-calistoga text-sm text-accent-strong">
              ${stats.llm.todayCost.toFixed(2)}
            </span>
            <span>· {stats.llm.todayRequests} requests</span>
          </div>
        )}
      </div>
    </div>
  );
}
