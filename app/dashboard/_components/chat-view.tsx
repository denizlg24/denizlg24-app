"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, MessageSquare, Trash2 } from "lucide-react";
import { useUserSettings } from "@/context/user-context";
import { denizApi } from "@/lib/api-wrapper";
import type {
  IChatMessage,
  IConversation,
  IConversationMeta,
} from "@/lib/data-types";
import { useChatStream } from "@/hooks/use-chat-stream";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";
import { Button } from "@/components/ui/button";

const MODEL_LABELS: Record<string, string> = {
  "claude-opus-4-6": "Opus 4.6",
  "claude-sonnet-4-6": "Sonnet 4.6",
  "claude-haiku-4-5": "Haiku 4.5",
  "claude-opus-4-5": "Opus 4.5",
  "claude-sonnet-4-5": "Sonnet 4.5",
};

const SUGGESTIONS = [
  "Summarize my recent notes",
  "Help me plan my week",
  "Draft an email response",
  "Explain a concept to me",
  "Debug a piece of code",
  "Brainstorm project ideas",
  "Write a quick checklist",
  "Review and improve my writing",
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

function buildSystemPrompt(messages: IChatMessage[]) {
  const base =
    "You are a helpful, knowledgeable assistant. Respond clearly and concisely. Use markdown formatting when appropriate.";

  if (messages.length === 0) return base;

  let history = messages;
  if (messages.length > 20) {
    history = [...messages.slice(0, 4), ...messages.slice(-16)];
  }

  const formatted = history
    .map(
      (m) =>
        `<message role="${m.role}">\n${m.content}\n</message>`,
    )
    .join("\n\n");

  return `${base}\n\nHere is the conversation so far:\n<conversation>\n${formatted}\n</conversation>\n\nContinue the conversation naturally. Do not repeat yourself or reference the conversation tags.`;
}

export function ChatView() {
  const { settings, loading: loadingSettings } = useUserSettings();

  const API = useMemo(() => {
    if (loadingSettings) return null;
    return new denizApi(settings.apiKey);
  }, [settings, loadingSettings]);

  const { streamContent, isStreaming, streamResponse, abort } =
    useChatStream(API);
  const now = useClock();
  const suggestion = useSuggestion();

  const [input, setInput] = useState("");
  const [model, setModel] = useState("claude-haiku-4-5");
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
      if (scrollTop < lastScrollTop.current && scrollHeight - scrollTop - clientHeight > 100) {
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
  }, [streamContent, messages]);

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
    setMessages(result.conversation.messages);
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

  const handleSend = async () => {
    if (!input.trim() || !API || isStreaming) return;

    const userMessage: IChatMessage = {
      role: "user",
      content: input.trim(),
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
        userMessage.content.length > 50
          ? userMessage.content.slice(0, 50) + "..."
          : userMessage.content;
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

    const systemPrompt = buildSystemPrompt(messages);

    const streamResult = await streamResponse({
      prompt: userMessage.content,
      systemPrompt,
      model,
      source: "dashboard-chat",
    });

    if (streamResult) {
      const assistantMessage: IChatMessage = {
        role: "assistant",
        content: streamResult.content,
        tokenUsage: streamResult.usage,
        createdAt: new Date().toISOString(),
      };

      const updatedMessages = [...currentMessages, assistantMessage];
      setMessages(updatedMessages);

      await API.PATCH({
        endpoint: `conversations/${currentConversationId}`,
        body: { messages: updatedMessages },
      });
    } else {
      toast.error("Failed to get response");
    }
  };

  if (!isActive) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] px-4">
        <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
          <div className="flex flex-col items-center gap-1">
            <p className="text-3xl font-light text-foreground/80 tabular-nums tracking-tight">
              {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-xs text-muted-foreground/50">
              {now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
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
          />
          {conversations.length > 0 && (
            <div className="w-full max-w-md mt-4">
              <p className="text-xs text-muted-foreground/50 mb-2 px-1">
                Recent
              </p>
              <div className="flex flex-col gap-0.5">
                {conversations.slice(0, 8).map((conv) => (
                  <div
                    key={conv._id}
                    onClick={() => loadConversation(conv)}
                    className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface transition-colors text-left cursor-pointer"
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
        <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
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
                streamContent={isLastAssistant ? streamContent : undefined}
              />
            );
          })}
          {isStreaming &&
            (messages.length === 0 ||
              messages[messages.length - 1].role === "user") && (
              <ChatMessage
                message={{
                  role: "assistant",
                  content: streamContent,
                  createdAt: new Date().toISOString(),
                }}
                isStreaming
                streamContent={streamContent}
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
      />
    </div>
  );
}
