"use client";

import { ModelSelector } from "@/components/ui/model-selector";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowUp, Settings } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function ChatInput({
  value,
  onChange,
  onSend,
  model,
  onModelChange,
  disabled,
  docked,
  modelLabel,
  toolsEnabled,
  onToolsEnabledChange,
  webSearchEnabled,
  onWebSearchEnabledChange,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  model: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
  docked?: boolean;
  modelLabel?: string;
  toolsEnabled?: boolean;
  onToolsEnabledChange?: (enabled: boolean) => void;
  webSearchEnabled?: boolean;
  onWebSearchEnabledChange?: (enabled: boolean) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [multiLine, setMultiLine] = useState(false);

  const resize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const singleLineHeight = parseFloat(getComputedStyle(ta).lineHeight) + parseFloat(getComputedStyle(ta).paddingTop) + parseFloat(getComputedStyle(ta).paddingBottom);
    const clamped = Math.min(ta.scrollHeight, docked ? 120 : 200);
    ta.style.height = `${clamped}px`;
    setMultiLine(ta.scrollHeight > singleLineHeight + 2);
  }, [docked]);

  useEffect(resize, [value, resize]);

  useEffect(() => {
    if (!docked) textareaRef.current?.focus();
  }, [docked]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) onSend();
    }
  };

  return (
    <div className={docked ? "w-full max-w-3xl mx-auto px-4 pb-4" : "w-full max-w-2xl"}>
      <div className={`relative border bg-popover shadow-lg flex items-end transition-[border-radius] duration-300 ease-in-out ${multiLine ? "rounded-2xl" : "rounded-full"}`}>
        <Popover>
          <PopoverTrigger asChild>
            <button className="shrink-0 ml-2 mb-2 flex items-center justify-center w-7 h-7 rounded-full text-muted-foreground/50 hover:text-foreground hover:bg-surface transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64">
            <div className="flex flex-col gap-4">
              <ModelSelector model={model} onModelChange={onModelChange} />
              {onToolsEnabledChange && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="tools-toggle" className="text-sm text-muted-foreground">
                    Tools
                  </Label>
                  <Switch
                    id="tools-toggle"
                    checked={toolsEnabled ?? true}
                    onCheckedChange={onToolsEnabledChange}
                  />
                </div>
              )}
              {onWebSearchEnabledChange && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="web-search-toggle" className="text-sm text-muted-foreground">
                    Web search
                  </Label>
                  <Switch
                    id="web-search-toggle"
                    checked={webSearchEnabled ?? false}
                    onCheckedChange={onWebSearchEnabledChange}
                  />
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Ask anything..."
          rows={1}
          className="flex-1 resize-none bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground/60 max-h-50 disabled:opacity-50 scrollbar-none"
          style={{ lineHeight: "1.5" }}
        />
        {docked && modelLabel && (
          <span className="text-[11px] text-muted-foreground/50 pr-2 pb-3 whitespace-nowrap select-none">
            {modelLabel}
          </span>
        )}
        <button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className="shrink-0 mr-2 mb-2 flex items-center justify-center w-7 h-7 rounded-full bg-foreground text-background transition-opacity disabled:opacity-30 hover:opacity-80"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
