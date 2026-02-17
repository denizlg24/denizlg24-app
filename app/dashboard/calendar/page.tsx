"use client";

import { useUserSettings } from "@/context/user-context";
import { denizApi } from "@/lib/api-wrapper";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarGrid } from "./_components/calendar-grid";
import type { ICalendarEvent } from "@/lib/data-types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, formatDuration } from "date-fns";
import {
  MapPin,
  Bell,
  BellOff,
  Clock,
  ExternalLink,
  Pencil,
  Check,
  X,
  ChevronDown,
  Plus,
  CalendarDays,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function CalendarPage() {
  const { settings, loading: loadingSettings } = useUserSettings();

  const API = useMemo(() => {
    if (loadingSettings) return null;
    return new denizApi(settings.apiKey);
  }, [settings, loadingSettings]);

  const [events, setEvents] = useState<ICalendarEvent[]>([]);

  const eventsCache = useRef<Map<string, ICalendarEvent[]>>(new Map());

  const cacheKey = useCallback((start: Date, end: Date) =>
    `${start.toISOString()}|${end.toISOString()}`, []);

  const invalidateCache = useCallback((start: Date, end: Date) => {
    eventsCache.current.delete(cacheKey(start, end));
  }, [cacheKey]);

  const now = new Date();
  const [startDate, setStartDate] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const [endDate, setEndDate] = useState(
    () => new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
  );

  const [viewEvent, setViewEvent] = useState<ICalendarEvent | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    title: string;
    place: string;
    date: string;
    status: ICalendarEvent["status"];
    notifyBySlack: boolean;
    notifyBeforeMinutes: number;
  }>({
    title: "",
    place: "",
    date: "",
    status: "scheduled",
    notifyBySlack: false,
    notifyBeforeMinutes: 0,
  });
  const [saving, setSaving] = useState(false);

  const openViewEvent = useCallback((e: ICalendarEvent) => {
    setViewEvent(e);
    setEditing(false);
  }, []);

  const startEditing = useCallback(() => {
    if (!viewEvent) return;
    setEditForm({
      title: viewEvent.title,
      place: viewEvent.place ?? "",
      date: format(new Date(viewEvent.date), "yyyy-MM-dd'T'HH:mm"),
      status: viewEvent.status,
      notifyBySlack: viewEvent.notifyBySlack,
      notifyBeforeMinutes: viewEvent.notifyBeforeMinutes,
    });
    setEditing(true);
  }, [viewEvent]);

  const saveEvent = useCallback(async () => {
    if (!API || !viewEvent) return;
    setSaving(true);
    try {
      const result = await API.PATCH<{ event: ICalendarEvent }>({
        endpoint: `calendar/${viewEvent._id}`,
        body: {
          title: editForm.title,
          place: editForm.place || undefined,
          date: new Date(editForm.date).toISOString(),
          status: editForm.status,
          notifyBySlack: editForm.notifyBySlack,
          notifyBeforeMinutes: editForm.notifyBeforeMinutes,
        },
      });
      if (!("code" in result)) {
        setViewEvent(result.event);
        invalidateCache(startDate, endDate);
        setEvents((prev) =>
          prev.map((e) => (e._id === result.event._id ? result.event : e)),
        );
        setEditing(false);
      }
    } catch (error) {
      console.error("Failed to save event:", error);
    } finally {
      setSaving(false);
    }
  }, [API, viewEvent, editForm, invalidateCache, startDate, endDate]);

  const changeStatus = useCallback(
    async (status: ICalendarEvent["status"]) => {
      if (!API || !viewEvent) return;
      try {
        const result = await API.PATCH<{ event: ICalendarEvent }>({
          endpoint: `calendar/${viewEvent._id}`,
          body: { status },
        });
        if (!("code" in result)) {
          setViewEvent(result.event);
          invalidateCache(startDate, endDate);
          setEvents((prev) =>
            prev.map((e) => (e._id === result.event._id ? result.event : e)),
          );
        }
      } catch (error) {
        console.error("Failed to update status:", error);
      }
    },
    [API, viewEvent, invalidateCache, startDate, endDate],
  );

  const [addingEvent, setAddingEvent] = useState(false);
  const [addForm, setAddForm] = useState({
    title: "",
    place: "",
    date: "",
    notifyBySlack: false,
    notifyBeforeMinutes: 30,
  });
  const [addSaving, setAddSaving] = useState(false);

  const openAddEvent = useCallback((date?: Date) => {
    setAddForm({
      title: "",
      place: "",
      date: date
        ? format(date, "yyyy-MM-dd'T'HH:mm")
        : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      notifyBySlack: false,
      notifyBeforeMinutes: 30,
    });
    setAddingEvent(true);
  }, []);

  const createEvent = useCallback(async () => {
    if (!API || !addForm.title || !addForm.date) return;
    setAddSaving(true);
    try {
      const result = await API.POST<{ event: ICalendarEvent }>({
        endpoint: "calendar",
        body: {
          title: addForm.title,
          place: addForm.place || undefined,
          date: new Date(addForm.date).toISOString(),
          status: "scheduled",
          notifyBySlack: addForm.notifyBySlack,
          notifyBeforeMinutes: addForm.notifyBeforeMinutes,
        },
      });
      if (!("code" in result)) {
        invalidateCache(startDate, endDate);
        setEvents((prev) => [...prev, result.event]);
        setAddingEvent(false);
      }
    } catch (error) {
      console.error("Failed to create event:", error);
    } finally {
      setAddSaving(false);
    }
  }, [API, addForm, invalidateCache, startDate, endDate]);

  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);

  const dayViewEvents = useMemo(() => {
    if (!dayViewDate) return [];
    return events
      .filter((e) => {
        const d = new Date(e.date);
        return (
          d.getFullYear() === dayViewDate.getFullYear() &&
          d.getMonth() === dayViewDate.getMonth() &&
          d.getDate() === dayViewDate.getDate()
        );
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [dayViewDate, events]);

  const openDayView = useCallback((date: Date) => {
    setDayViewDate(date);
  }, []);

  const fetchEvents = useCallback(
    async (start: Date, end: Date, skipCache = false) => {
      if (!API) return;
      const key = cacheKey(start, end);
      if (!skipCache && eventsCache.current.has(key)) {
        setEvents(eventsCache.current.get(key)!);
        return;
      }
      try {
        const result = await API.GET<{ events: ICalendarEvent[] }>({
          endpoint: `calendar?start=${start.toISOString()}&end=${end.toISOString()}`,
        });
        if ("code" in result) {
          return;
        }
        eventsCache.current.set(key, result.events);
        setEvents(result.events);
      } catch (error) {
        console.error("Failed to fetch calendar events:", error);
      }
    },
    [API, cacheKey],
  );

  useEffect(() => {
    fetchEvents(startDate, endDate);
  }, [fetchEvents, startDate, endDate]);

  const handleMonthChange = useCallback((start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  }, []);

  return (
    <div className="p-4 w-full flex items-center justify-center">
      <CalendarGrid
        events={events}
        onMonthChange={handleMonthChange}
        onEventClick={openViewEvent}
        onDayClick={openDayView}
        onAddEvent={openAddEvent}
      />

      <Dialog
        open={viewEvent !== null}
        onOpenChange={() => {
          setViewEvent(null);
          setEditing(false);
        }}
      >
        <DialogContent className="max-w-md">
          {!editing ? (
            <>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <DialogTitle className="leading-snug">
                    {viewEvent?.title}
                  </DialogTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="shrink-0 cursor-pointer">
                        <Badge
                          variant={
                            viewEvent?.status === "completed"
                              ? "default"
                              : viewEvent?.status === "canceled"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {viewEvent?.status}
                          <ChevronDown className="w-3 h-3" />
                        </Badge>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem
                        onClick={() => changeStatus("scheduled")}
                      >
                        Scheduled
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => changeStatus("completed")}
                      >
                        Completed
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => changeStatus("canceled")}
                      >
                        Canceled
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <DialogDescription className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  {viewEvent
                    ? `${format(new Date(viewEvent.date), "p")} · ${format(new Date(viewEvent.date), "PPP")}`
                    : ""}
                </DialogDescription>
              </div>

              <Separator />

              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>{viewEvent?.place || "No location specified"}</span>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground">
                  {viewEvent?.notifyBySlack ? (
                    <>
                      <Bell className="w-4 h-4 shrink-0" />
                      <span>
                        Slack{" "}
                        {formatDuration(
                          {
                            hours: Math.floor(
                              viewEvent.notifyBeforeMinutes / 60,
                            ),
                            minutes: viewEvent.notifyBeforeMinutes % 60,
                          },
                          { zero: false },
                        )}{" "}
                        before
                        {viewEvent.isNotificationSent
                          ? " · sent"
                          : " · pending"}
                      </span>
                    </>
                  ) : (
                    <>
                      <BellOff className="w-4 h-4 shrink-0" />
                      <span>No notifications</span>
                    </>
                  )}
                </div>
              </div>

              {(viewEvent?.links?.length ?? 0) > 0 && (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    {viewEvent?.links.map((link) => (
                      <a
                        key={link._id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.icon ? (
                          <img
                            src={link.icon}
                            alt=""
                            className="w-4 h-4 shrink-0"
                          />
                        ) : (
                          <ExternalLink className="w-4 h-4 shrink-0" />
                        )}
                        <span>{link.label}</span>
                      </a>
                    ))}
                  </div>
                </>
              )}

              <Separator />

              <Button variant="outline" size="sm" onClick={startEditing}>
                <Pencil className="w-3.5 h-3.5" />
                Edit event
              </Button>
            </>
          ) : (
            <>
              <DialogTitle>Edit event</DialogTitle>
              <DialogDescription className="sr-only">
                Edit event details
              </DialogDescription>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, title: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Date & time</Label>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-start font-normal flex-1"
                        >
                          <CalendarDays className="w-4 h-4 shrink-0" />
                          {editForm.date
                            ? format(new Date(editForm.date), "PPP")
                            : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            editForm.date ? new Date(editForm.date) : undefined
                          }
                          onSelect={(day) => {
                            if (!day) return;
                            const prev = editForm.date
                              ? new Date(editForm.date)
                              : new Date();
                            day.setHours(prev.getHours(), prev.getMinutes());
                            setEditForm((f) => ({
                              ...f,
                              date: format(day, "yyyy-MM-dd'T'HH:mm"),
                            }));
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <Select
                      value={
                        editForm.date
                          ? String(new Date(editForm.date).getHours())
                          : "0"
                      }
                      onValueChange={(v) => {
                        const d = editForm.date
                          ? new Date(editForm.date)
                          : new Date();
                        d.setHours(Number(v));
                        setEditForm((f) => ({
                          ...f,
                          date: format(d, "yyyy-MM-dd'T'HH:mm"),
                        }));
                      }}
                    >
                      <SelectTrigger className="w-18">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-48">
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {String(i).padStart(2, "0")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">:</span>
                    <Select
                      value={
                        editForm.date
                          ? String(new Date(editForm.date).getMinutes())
                          : "0"
                      }
                      onValueChange={(v) => {
                        const d = editForm.date
                          ? new Date(editForm.date)
                          : new Date();
                        d.setMinutes(Number(v));
                        setEditForm((f) => ({
                          ...f,
                          date: format(d, "yyyy-MM-dd'T'HH:mm"),
                        }));
                      }}
                    >
                      <SelectTrigger className="w-18">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-48">
                        {Array.from({ length: 60 }, (_, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {String(i).padStart(2, "0")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-place">Location</Label>
                  <Input
                    id="edit-place"
                    value={editForm.place}
                    placeholder="No location"
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, place: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(v) =>
                      setEditForm((f) => ({
                        ...f,
                        status: v as ICalendarEvent["status"],
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="canceled">Canceled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-slack">Slack notification</Label>
                  <Switch
                    id="edit-slack"
                    checked={editForm.notifyBySlack}
                    onCheckedChange={(v) =>
                      setEditForm((f) => ({ ...f, notifyBySlack: v }))
                    }
                  />
                </div>

                {editForm.notifyBySlack && (
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-minutes">Minutes before</Label>
                    <Input
                      id="edit-minutes"
                      type="number"
                      min={0}
                      value={editForm.notifyBeforeMinutes}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          notifyBeforeMinutes:
                            Number.parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex items-center gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </Button>
                <Button size="sm" onClick={saveEvent} disabled={saving}>
                  <Check className="w-3.5 h-3.5" />
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addingEvent} onOpenChange={setAddingEvent}>
        <DialogContent className="max-w-md">
          <DialogTitle>New event</DialogTitle>
          <DialogDescription className="sr-only">
            Create a new calendar event
          </DialogDescription>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="add-title">Title</Label>
              <Input
                id="add-title"
                value={addForm.title}
                placeholder="Event title"
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>Date & time</Label>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start font-normal flex-1"
                    >
                      <CalendarDays className="w-4 h-4 shrink-0" />
                      {addForm.date
                        ? format(new Date(addForm.date), "PPP")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={
                        addForm.date ? new Date(addForm.date) : undefined
                      }
                      onSelect={(day) => {
                        if (!day) return;
                        const prev = addForm.date
                          ? new Date(addForm.date)
                          : new Date();
                        day.setHours(prev.getHours(), prev.getMinutes());
                        setAddForm((f) => ({
                          ...f,
                          date: format(day, "yyyy-MM-dd'T'HH:mm"),
                        }));
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <Select
                  value={
                    addForm.date
                      ? String(new Date(addForm.date).getHours())
                      : "0"
                  }
                  onValueChange={(v) => {
                    const d = addForm.date
                      ? new Date(addForm.date)
                      : new Date();
                    d.setHours(Number(v));
                    setAddForm((f) => ({
                      ...f,
                      date: format(d, "yyyy-MM-dd'T'HH:mm"),
                    }));
                  }}
                >
                  <SelectTrigger className="w-18">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-48">
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {String(i).padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">:</span>
                <Select
                  value={
                    addForm.date
                      ? String(new Date(addForm.date).getMinutes())
                      : "0"
                  }
                  onValueChange={(v) => {
                    const d = addForm.date
                      ? new Date(addForm.date)
                      : new Date();
                    d.setMinutes(Number(v));
                    setAddForm((f) => ({
                      ...f,
                      date: format(d, "yyyy-MM-dd'T'HH:mm"),
                    }));
                  }}
                >
                  <SelectTrigger className="w-18">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-48">
                    {Array.from({ length: 60 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {String(i).padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-place">Location</Label>
              <Input
                id="add-place"
                value={addForm.place}
                placeholder="Optional"
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, place: e.target.value }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="add-slack">Slack notification</Label>
              <Switch
                id="add-slack"
                checked={addForm.notifyBySlack}
                onCheckedChange={(v) =>
                  setAddForm((f) => ({ ...f, notifyBySlack: v }))
                }
              />
            </div>

            {addForm.notifyBySlack && (
              <div className="space-y-1.5">
                <Label htmlFor="add-minutes">Minutes before</Label>
                <Input
                  id="add-minutes"
                  type="number"
                  min={0}
                  value={addForm.notifyBeforeMinutes}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      notifyBeforeMinutes: Number.parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            )}
          </div>

          <Separator />

          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddingEvent(false)}
              disabled={addSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={createEvent}
              disabled={addSaving || !addForm.title}
            >
              <Plus className="w-3.5 h-3.5" />
              {addSaving ? "Creating…" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dayViewDate !== null}
        onOpenChange={() => setDayViewDate(null)}
      >
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <DialogTitle>
                {dayViewDate ? format(dayViewDate, "EEEE, MMMM d") : ""}
              </DialogTitle>
              <DialogDescription>
                {dayViewEvents.length === 0
                  ? "No events"
                  : `${dayViewEvents.length} event${dayViewEvents.length > 1 ? "s" : ""}`}
              </DialogDescription>
            </div>
          </div>

          {dayViewEvents.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {dayViewEvents.map((event) => (
                  <button
                    type="button"
                    key={event._id}
                    onClick={() => {
                      setDayViewDate(null);
                      openViewEvent(event);
                    }}
                    className="flex items-center gap-3 w-full rounded-md px-2 py-1.5 text-left hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-medium truncate">
                        {event.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(event.date), "p")}
                      </span>
                    </div>
                    <Badge
                      variant={
                        event.status === "completed"
                          ? "default"
                          : event.status === "canceled"
                            ? "destructive"
                            : "secondary"
                      }
                      className="shrink-0"
                    >
                      {event.status}
                    </Badge>
                  </button>
                ))}
              </div>
            </>
          )}

          <Separator />

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDayViewDate(null);
              openAddEvent(dayViewDate ?? undefined);
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add event
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
