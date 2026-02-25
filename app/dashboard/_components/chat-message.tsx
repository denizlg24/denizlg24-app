"use client";

import { useState } from "react";
import { Code, Eye } from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";
import type { IChatMessage } from "@/lib/data-types";

export function ChatMessage({
  message,
  isStreaming,
  streamContent,
}: {
  message: IChatMessage;
  isStreaming?: boolean;
  streamContent?: string;
}) {
  const [showRaw, setShowRaw] = useState(false);
  const content = isStreaming ? streamContent ?? "" : message.content;

  if (message.role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div className="bg-surface rounded-2xl px-4 py-2 max-w-[80%]">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 group">
      <div className="max-w-none">
        {showRaw ? (
          <pre className="text-sm font-mono whitespace-pre-wrap text-foreground/80 bg-surface rounded-lg p-4 overflow-x-auto">
            {content}
          </pre>
        ) : (
          <MarkdownRenderer content={content} />
        )}
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-foreground/70 animate-pulse ml-0.5 -mb-0.5" />
        )}
      </div>
      {!isStreaming && content && (
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
          >
            {showRaw ? <Eye className="w-3.5 h-3.5" /> : <Code className="w-3.5 h-3.5" />}
          </button>
          {message.tokenUsage && (
            <p className="text-[11px] text-muted-foreground/50">
              {message.tokenUsage.inputTokens + message.tokenUsage.outputTokens}{" "}
              tokens &middot; ${message.tokenUsage.costUsd.toFixed(4)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
