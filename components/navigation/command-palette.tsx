"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HomeIcon, SearchIcon } from "lucide-react";
import { Command as CommandPrimitive } from "cmdk";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  GROUPS,
  DASHBOARD_PREFIX,
  type NavGroup,
} from "@/components/navigation/navigation-menu";

type CommandEntry = {
  label: string;
  parent?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

function flattenGroup(group: NavGroup): CommandEntry[] {
  const entries: CommandEntry[] = [];
  for (const item of group.items) {
    if (item.children) {
      for (const child of item.children) {
        entries.push({
          label: child.label,
          parent: item.label,
          href: child.href,
          icon: child.icon,
        });
      }
    } else if (item.href) {
      entries.push({ label: item.label, href: item.href, icon: item.icon });
    }
  }
  return entries;
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebounced(value), delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delay]);

  return debounced;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 150);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "p" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (href: string) => {
    setOpen(false);
    router.push(DASHBOARD_PREFIX + href);
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setSearch("");
      setShowAll(false);
    }
  };

  const [showAll, setShowAll] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (!open) {
      setShowAll(false);
      return;
    }

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (search.trim().length > 0) {
      setShowAll(false);
      return;
    }
    idleTimerRef.current = setTimeout(() => setShowAll(true), 2000);
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [open, search]);

  const showResults = debouncedSearch.trim().length > 0 || showAll;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed top-[20%] left-1/2 z-50 w-full max-w-xl -translate-x-1/2 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">
            Command Palette
          </DialogPrimitive.Title>
          <Command
            className="overflow-visible bg-transparent"
            filter={showAll ? () => 1 : undefined}
          >
            <div className="flex items-center gap-3 rounded-full border bg-popover px-5 shadow-lg">
              <SearchIcon className="size-5 shrink-0 text-muted-foreground" />
              <CommandPrimitive.Input
                value={search}
                onValueChange={setSearch}
                placeholder="Search pages..."
                className="flex h-14 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
            </div>

            <div
              className={`mt-2 rounded-xl border bg-popover shadow-lg overflow-hidden transition-all duration-200 ease-out origin-top ${
                showResults
                  ? "opacity-100 scale-y-100 translate-y-0"
                  : "opacity-0 scale-y-95 -translate-y-1 pointer-events-none max-h-0 border-transparent mt-0"
              }`}
            >
              <CommandList className="max-h-75">
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="General">
                  <CommandItem
                    value="Home"
                    onSelect={() => {
                      setOpen(false);
                      router.push(DASHBOARD_PREFIX);
                    }}
                  >
                    <HomeIcon className="size-4 shrink-0" />
                    <span>Home</span>
                  </CommandItem>
                </CommandGroup>
                {GROUPS.map((group) => {
                  const entries = flattenGroup(group);
                  if (entries.length === 0) return null;
                  return (
                    <CommandGroup
                      key={group.groupLabel}
                      heading={group.groupLabel}
                    >
                      {entries.map((entry) => {
                        const Icon = entry.icon;
                        const uniqueValue = entry.parent
                          ? `${entry.parent} ${entry.label}`
                          : entry.label;
                        return (
                          <CommandItem
                            key={entry.href}
                            value={uniqueValue}
                            onSelect={() => handleSelect(entry.href)}
                            className={entry.parent ? "pl-6" : ""}
                          >
                            <Icon className="size-4 shrink-0" />
                            <span>{entry.label}</span>
                            {entry.parent && (
                              <span className="ml-auto text-xs text-muted-foreground">
                                {entry.parent}
                              </span>
                            )}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  );
                })}
              </CommandList>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
