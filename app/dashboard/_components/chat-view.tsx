"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, MessageSquare, Trash2 } from "lucide-react";
import { useUserSettings } from "@/context/user-context";
import { denizApi } from "@/lib/api-wrapper";
import type {
  IChatMessage,
  IChatContentSegment,
  IChatPendingAction,
  IChatToolCall,
  IConversation,
  IConversationMeta,
} from "@/lib/data-types";
import { useChatStream } from "@/hooks/use-chat-stream";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const MODEL_LABELS: Record<string, string> = {
  "claude-opus-4-6": "Opus 4.6",
  "claude-sonnet-4-6": "Sonnet 4.6",
  "claude-haiku-4-5": "Haiku 4.5",
  "claude-opus-4-5": "Opus 4.5",
  "claude-sonnet-4-5": "Sonnet 4.5",
};

const SUGGESTIONS = [
  "What events do I have this week?",
  "Summarize my recent notes",
  "Show me my kanban boards",
  "What's on my timetable today?",
  "Search for recent blog posts",
  "List my pending contacts",
  "Show my project portfolio",
  "Check my latest emails",
];

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useSuggestion() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % SUGGESTIONS.length);
        setVisible(true);
      }, 300);
    }, 4000);
    return () => clearInterval(id);
  }, []);
  return { text: SUGGESTIONS[index], visible };
}

function convertApiMessagesToDisplay(
  rawMessages: IConversation["messages"],
): IChatMessage[] {
  const display: IChatMessage[] = [];

  for (let i = 0; i < rawMessages.length; i++) {
    const msg = rawMessages[i];

    if (msg.role === "user") {
      if (typeof msg.content === "string") {
        display.push(msg);
        continue;
      }

      const contentArr = msg.content as any[];
      const isToolResultMessage =
        contentArr.length > 0 &&
        contentArr.every((block: any) => block.type === "tool_result");

      if (isToolResultMessage) {
        const prevDisplay = display[display.length - 1];
        if (prevDisplay?.role === "assistant" && prevDisplay.segments) {
          for (const result of contentArr) {
            for (const seg of prevDisplay.segments) {
              if (seg.type !== "tool_group") continue;
              const tc = seg.calls.find(
                (c: IChatToolCall) => c.toolId === result.tool_use_id,
              );
              if (tc) {
                tc.result =
                  typeof result.content === "string"
                    ? result.content
                    : JSON.stringify(result.content);
                tc.isError = result.is_error ?? false;
                tc.status = result.is_error ? "error" : "done";
              }
            }
          }
        }
        continue;
      }

      display.push(msg);
      continue;
    }

    if (typeof msg.content === "string") {
      display.push(msg);
      continue;
    }

    const contentArr = msg.content as any[];
    const segments: IChatContentSegment[] = [];

    for (const block of contentArr) {
      if (block.type === "text") {
        const last = segments[segments.length - 1];
        if (last?.type === "text") {
          last.text += block.text;
        } else {
          segments.push({ type: "text", text: block.text });
        }
      } else if (block.type === "tool_use") {
        const toolCall: IChatToolCall = {
          toolId: block.id,
          toolName: block.name,
          input: block.input,
          status: "calling",
        };
        const last = segments[segments.length - 1];
        if (last?.type === "tool_group") {
          last.calls.push(toolCall);
        } else {
          segments.push({ type: "tool_group", calls: [toolCall] });
        }
      }
    }

    const nextMsg = rawMessages[i + 1];
    if (
      nextMsg?.role === "user" &&
      Array.isArray(nextMsg.content) &&
      (nextMsg.content as any[]).every(
        (block: any) => block.type === "tool_result",
      )
    ) {
      for (const result of nextMsg.content as any[]) {
        for (const seg of segments) {
          if (seg.type !== "tool_group") continue;
          const tc = seg.calls.find((c) => c.toolId === result.tool_use_id);
          if (tc) {
            tc.result =
              typeof result.content === "string"
                ? result.content
                : JSON.stringify(result.content);
            tc.isError = result.is_error ?? false;
            tc.status = result.is_error ? "error" : "done";
          }
        }
      }
    } else {
      for (const seg of segments) {
        if (seg.type !== "tool_group") continue;
        for (const tc of seg.calls) {
          if (tc.status === "calling") {
            tc.status = "pending_approval";
          }
        }
      }
    }

    const displayMsg: IChatMessage = {
      ...msg,
      segments: segments.length > 0 ? segments : undefined,
      content:
        segments
          .filter((s): s is { type: "text"; text: string } => s.type === "text")
          .map((s) => s.text)
          .join("") || "",
    };

    const prevDisplay = display[display.length - 1];
    if (
      prevDisplay?.role === "assistant" &&
      prevDisplay.segments &&
      i >= 2 &&
      rawMessages[i - 1]?.role === "user" &&
      Array.isArray(rawMessages[i - 1]?.content) &&
      (rawMessages[i - 1]?.content as any[]).every(
        (block: any) => block.type === "tool_result",
      )
    ) {
      prevDisplay.segments = [
        ...prevDisplay.segments,
        ...(displayMsg.segments ?? []),
      ];
      const prevText =
        typeof prevDisplay.content === "string" ? prevDisplay.content : "";
      const newText =
        typeof displayMsg.content === "string" ? displayMsg.content : "";
      prevDisplay.content = prevText + newText;

      if (displayMsg.tokenUsage) {
        prevDisplay.tokenUsage = displayMsg.tokenUsage;
      }
      continue;
    }

    display.push(displayMsg);
  }

  return display;
}

export function ChatView() {
  const { settings, loading: loadingSettings } = useUserSettings();

  const API = useMemo(() => {
    if (loadingSettings) return null;
    return new denizApi(settings.apiKey);
  }, [settings, loadingSettings]);

  const {
    streamSegments,
    isStreaming,
    streamChat,
    abort,
    pendingConfirmations,
    setPendingConfirmations,
  } = useChatStream(API);
  const now = useClock();
  const suggestion = useSuggestion();

  const [input, setInput] = useState("");
  const [model, setModel] = useState("claude-haiku-4-5");
  const [toolsEnabled, setToolsEnabled] = useState(true);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<IConversationMeta[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [active, setActive] = useState(false);
  const [title, setTitle] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);
  const lastScrollTop = useRef(0);

  const isActive = active || messages.length > 0;

  const fetchConversations = useCallback(async () => {
    if (!API) return;
    setLoadingConversations(true);
    const result = await API.GET<{ conversations: IConversationMeta[] }>({
      endpoint: "conversations",
    });
    if (!("code" in result)) {
      setConversations(result.conversations);
    }
    setLoadingConversations(false);
  }, [API]);

  useEffect(() => {
    if (API && !isActive) fetchConversations();
  }, [API, isActive, fetchConversations]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (
        scrollTop < lastScrollTop.current &&
        scrollHeight - scrollTop - clientHeight > 100
      ) {
        userScrolledUp.current = true;
      }
      if (scrollHeight - scrollTop - clientHeight < 20) {
        userScrolledUp.current = false;
      }
      lastScrollTop.current = scrollTop;
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [isActive]);

  useEffect(() => {
    if (!userScrolledUp.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [streamSegments, messages]);

  const loadConversation = async (meta: IConversationMeta) => {
    if (!API) return;
    const result = await API.GET<{ conversation: IConversation }>({
      endpoint: `conversations/${meta._id}`,
    });
    if ("code" in result) {
      toast.error("Failed to load conversation");
      return;
    }
    setConversationId(meta._id);
    setMessages(convertApiMessagesToDisplay(result.conversation.messages));
    setModel(result.conversation.llmModel);
    setTitle(result.conversation.title);
    setActive(true);
    userScrolledUp.current = false;
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!API) return;
    const result = await API.DELETE<{ success: boolean }>({
      endpoint: `conversations/${id}`,
    });
    if (!("code" in result)) {
      setConversations((prev) => prev.filter((c) => c._id !== id));
    }
  };

  const handleBack = () => {
    if (isStreaming) abort();
    setActive(false);
    setMessages([]);
    setConversationId(null);
    setTitle("");
    setInput("");
    userScrolledUp.current = false;
  };

  const sendMessage = async (messageContent: string) => {
    if (!API || isStreaming) return;

    const userMessage: IChatMessage = {
      role: "user",
      content: messageContent,
      createdAt: new Date().toISOString(),
    };

    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput("");
    setActive(true);
    userScrolledUp.current = false;

    let currentConversationId = conversationId;

    if (!currentConversationId) {
      const msgTitle =
        messageContent.length > 50
          ? messageContent.slice(0, 50) + "..."
          : messageContent;
      setTitle(msgTitle);

      const createResult = await API.POST<{
        conversation: IConversation;
      }>({
        endpoint: "conversations",
        body: { title: msgTitle, model },
      });

      if ("code" in createResult) {
        toast.error("Failed to create conversation");
        return;
      }
      currentConversationId = createResult.conversation._id;
      setConversationId(currentConversationId);
    }

    const streamResult = await streamChat({
      conversationId: currentConversationId,
      message: messageContent,
      model,
      toolsEnabled,
      webSearchEnabled,
    });

    if (streamResult) {
      const assistantMessage: IChatMessage = {
        role: "assistant",
        content: streamResult.content,
        tokenUsage: streamResult.paused ? undefined : streamResult.usage,
        segments:
          streamResult.segments.length > 0 ? streamResult.segments : undefined,
        pendingActions:
          streamResult.pendingActions.length > 0
            ? streamResult.pendingActions
            : undefined,
        createdAt: new Date().toISOString(),
      };

      setMessages([...currentMessages, assistantMessage]);
    } else {
      toast.error("Failed to get response");
    }
  };

  const continueChat = async (toolApprovals: Record<string, boolean>) => {
    if (!API || isStreaming || !conversationId) return;

    userScrolledUp.current = false;

    const streamResult = await streamChat({
      conversationId,
      toolApprovals,
      model,
      toolsEnabled,
      webSearchEnabled,
    });

    if (streamResult) {
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        const lastMsg = updated[lastIdx];

        if (lastMsg?.role === "assistant") {
          const existingSegments = lastMsg.segments ?? [];
          const newSegments = streamResult.segments;
          const mergedSegments = [...existingSegments, ...newSegments];

          const prevText =
            typeof lastMsg.content === "string" ? lastMsg.content : "";

          updated[lastIdx] = {
            ...lastMsg,
            content: prevText + streamResult.content,
            segments: mergedSegments.length > 0 ? mergedSegments : undefined,
            tokenUsage: streamResult.paused
              ? lastMsg.tokenUsage
              : streamResult.usage,
            pendingActions:
              streamResult.pendingActions.length > 0
                ? streamResult.pendingActions
                : undefined,
          };
        } else {
          updated.push({
            role: "assistant",
            content: streamResult.content,
            tokenUsage: streamResult.paused ? undefined : streamResult.usage,
            segments:
              streamResult.segments.length > 0
                ? streamResult.segments
                : undefined,
            pendingActions:
              streamResult.pendingActions.length > 0
                ? streamResult.pendingActions
                : undefined,
            createdAt: new Date().toISOString(),
          });
        }

        return updated;
      });
    } else {
      toast.error("Failed to continue response");
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input.trim());
  };

  const getAllPendingActions = (): IChatPendingAction[] => {
    if (pendingConfirmations.length > 0) {
      return pendingConfirmations.filter((a) => a.status === "pending");
    }
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.pendingActions) {
      return lastMsg.pendingActions.filter((a) => a.status === "pending");
    }
    return [];
  };

  const markToolCallsInSegments = (
    segments: IChatContentSegment[],
    ids: Set<string>,
    status: "done" | "error",
  ): IChatContentSegment[] =>
    segments.map((seg) => {
      if (seg.type !== "tool_group") return seg;
      return {
        ...seg,
        calls: seg.calls.map((c) =>
          ids.has(c.toolId) ? { ...c, status: status } : c,
        ),
      };
    });

  const handleApproveAll = async () => {
    const pending = getAllPendingActions();
    if (pending.length === 0) return;

    const ids = new Set(pending.map((a) => a.toolId));

    setMessages((prev) =>
      prev.map((msg) => {
        let updated = msg;
        if (msg.pendingActions) {
          updated = {
            ...updated,
            pendingActions: msg.pendingActions.map((a) =>
              a.status === "pending"
                ? { ...a, status: "approved" as const }
                : a,
            ),
          };
        }
        if (msg.segments) {
          updated = {
            ...updated,
            segments: markToolCallsInSegments(msg.segments, ids, "done"),
          };
        }
        return updated;
      }),
    );

    setPendingConfirmations([]);

    const approvals: Record<string, boolean> = {};
    for (const a of pending) {
      approvals[a.toolId] = true;
    }

    await continueChat(approvals);
  };

  const handleDenyAll = async () => {
    const pending = getAllPendingActions();
    if (pending.length === 0) return;

    const ids = new Set(pending.map((a) => a.toolId));

    setMessages((prev) =>
      prev.map((msg) => {
        let updated = msg;
        if (msg.pendingActions) {
          updated = {
            ...updated,
            pendingActions: msg.pendingActions.map((a) =>
              a.status === "pending" ? { ...a, status: "denied" as const } : a,
            ),
          };
        }
        if (msg.segments) {
          updated = {
            ...updated,
            segments: markToolCallsInSegments(msg.segments, ids, "error"),
          };
        }
        return updated;
      }),
    );

    setPendingConfirmations([]);

    const denials: Record<string, boolean> = {};
    for (const a of pending) {
      denials[a.toolId] = false;
    }

    await continueChat(denials);
  };

  if (!isActive) {
    return (
      <div className="flex flex-col items-center h-[calc(100vh-4rem)] px-4 pt-[25vh]">
        <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
          <div className="flex flex-col items-center gap-1">
            <p className="text-3xl font-light text-foreground/80 tabular-nums tracking-tight">
              {now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="text-xs text-muted-foreground/50">
              {now.toLocaleDateString([], {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <p
            className={`text-sm text-muted-foreground/40 italic h-5 transition-opacity duration-300 ${suggestion.visible ? "opacity-100" : "opacity-0"}`}
          >
            {suggestion.text}
          </p>
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            model={model}
            onModelChange={setModel}
            disabled={isStreaming}
            toolsEnabled={toolsEnabled}
            onToolsEnabledChange={setToolsEnabled}
            webSearchEnabled={webSearchEnabled}
            onWebSearchEnabledChange={setWebSearchEnabled}
          />
          {(loadingConversations || conversations.length > 0) && (
            <div className="w-full max-w-md mt-4">
              <p className="text-xs text-muted-foreground/50 mb-2 px-1">
                Recent
              </p>
              <div className="flex flex-col gap-0.5">
                {loadingConversations
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-3 py-2"
                      >
                        <Skeleton className="w-3.5 h-3.5 rounded shrink-0 bg-surface" />
                        <Skeleton
                          className="h-4 flex-1 rounded bg-surface"
                          style={{ maxWidth: `${55 + ((i * 23) % 35)}%` }}
                        />
                        <Skeleton className="h-3 w-14 rounded shrink-0 bg-surface" />
                      </div>
                    ))
                  : conversations.slice(0, 8).map((conv) => (
                      <div
                        key={conv._id}
                        onClick={() => loadConversation(conv)}
                        className="animate-in group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface transition-colors text-left cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                        <span className="text-sm text-foreground/70 truncate flex-1">
                          {conv.title}
                        </span>
                        <span className="text-[11px] text-muted-foreground/30 shrink-0 group-hover:hidden">
                          {MODEL_LABELS[conv.llmModel] ?? conv.llmModel}
                        </span>
                        <button
                          onClick={(e) => deleteConversation(conv._id, e)}
                          className="hidden group-hover:flex items-center justify-center w-5 h-5 rounded hover:bg-destructive/10 transition-colors shrink-0"
                        >
                          <Trash2 className="w-3 h-3 text-muted-foreground/50 hover:text-destructive" />
                        </button>
                      </div>
                    ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-2 px-4 py-2 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm text-foreground/70 truncate">{title}</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {messages.map((msg, i) => {
            const isLastAssistant =
              isStreaming &&
              i === messages.length - 1 &&
              msg.role === "assistant";

            return (
              <ChatMessage
                key={`${i}-${msg.createdAt}`}
                message={msg}
                isStreaming={isLastAssistant}
                streamSegments={isLastAssistant ? streamSegments : undefined}
                onApproveAll={handleApproveAll}
                onDenyAll={handleDenyAll}
              />
            );
          })}
          {isStreaming &&
            (messages.length === 0 ||
              messages[messages.length - 1].role === "user") && (
              <ChatMessage
                message={{
                  role: "assistant",
                  content: "",
                  pendingActions:
                    pendingConfirmations.length > 0
                      ? pendingConfirmations
                      : undefined,
                  createdAt: new Date().toISOString(),
                }}
                isStreaming
                streamSegments={streamSegments}
                onApproveAll={handleApproveAll}
                onDenyAll={handleDenyAll}
              />
            )}
        </div>
      </div>

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        model={model}
        onModelChange={setModel}
        disabled={isStreaming}
        docked
        modelLabel={MODEL_LABELS[model] ?? model}
        toolsEnabled={toolsEnabled}
        onToolsEnabledChange={setToolsEnabled}
        webSearchEnabled={webSearchEnabled}
        onWebSearchEnabledChange={setWebSearchEnabled}
      />
    </div>
  );
}
