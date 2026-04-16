"use client";

import { Plus, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions: string[];
  placeholder?: string;
}

function normalize(t: string) {
  return t.trim().toLowerCase();
}

export function TagAutocomplete({
  value,
  onChange,
  suggestions,
  placeholder = "Add tag…",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const available = useMemo(() => {
    const set = new Set(value.map(normalize));
    return suggestions.filter((s) => !set.has(normalize(s)));
  }, [suggestions, value]);

  const addTag = (raw: string) => {
    const t = normalize(raw);
    if (!t) return;
    if (value.some((v) => normalize(v) === t)) return;
    onChange([...value, t]);
    setQuery("");
  };

  const removeTag = (t: string) => {
    onChange(value.filter((v) => v !== t));
  };

  const showCreate =
    query.trim().length > 0 &&
    !available.some((s) => normalize(s) === normalize(query)) &&
    !value.some((v) => normalize(v) === normalize(query));

  return (
    <div className="flex flex-wrap items-center gap-1">
      {value.map((t) => (
        <Badge
          key={t}
          variant="outline"
          className="h-5 gap-1 px-1.5 text-[10px]"
        >
          {t}
          <button
            type="button"
            onClick={() => removeTag(t)}
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Remove tag ${t}`}
          >
            <X className="size-2.5" />
          </button>
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            ref={triggerRef}
            type="button"
            className="inline-flex h-5 items-center gap-1 rounded border border-dashed px-1.5 text-[10px] text-muted-foreground hover:border-solid hover:text-foreground"
          >
            <Plus className="size-2.5" />
            {placeholder}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command
            filter={(value, search) => {
              if (value.toLowerCase().includes(search.toLowerCase())) return 1;
              return 0;
            }}
          >
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Search or create…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && query.trim() && showCreate) {
                  e.preventDefault();
                  addTag(query);
                  setOpen(false);
                }
              }}
            />
            <CommandList>
              <CommandEmpty>
                {query.trim() ? (
                  <button
                    type="button"
                    onClick={() => {
                      addTag(query);
                      setOpen(false);
                    }}
                    className="w-full px-2 py-1.5 text-left text-xs hover:bg-muted"
                  >
                    Create &ldquo;{query.trim()}&rdquo;
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    No tags yet
                  </span>
                )}
              </CommandEmpty>
              {available.length > 0 && (
                <CommandGroup heading="Existing">
                  {available.map((s) => (
                    <CommandItem
                      key={s}
                      value={s}
                      onSelect={() => {
                        addTag(s);
                        setOpen(false);
                      }}
                      className="text-xs"
                    >
                      {s}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {showCreate && available.length > 0 && (
                <CommandGroup heading="Create">
                  <CommandItem
                    value={`__create_${query}`}
                    onSelect={() => {
                      addTag(query);
                      setOpen(false);
                    }}
                    className="text-xs"
                  >
                    <Plus className="mr-1 size-3" />
                    Create &ldquo;{query.trim()}&rdquo;
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
