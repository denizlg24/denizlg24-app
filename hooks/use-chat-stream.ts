import { useCallback, useRef, useState } from "react";
import type { denizApi } from "@/lib/api-wrapper";
import type {
  IChatContentSegment,
  IChatPendingAction,
  IChatToolCall,
} from "@/lib/data-types";

export interface StreamResult {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    iterations?: number;
  };
  segments: IChatContentSegment[];
  pendingActions: IChatPendingAction[];
  paused?: boolean;
}

export interface StreamError {
  error: string;
}

export interface BackoffState {
  active: boolean;
  retryAfterMs: number;
  attempt: number;
  maxAttempts: number;
}

export interface MaxIterationsState {
  active: boolean;
  iterations: number;
  hasUnansweredTools: boolean;
}

export function useChatStream(API: denizApi | null) {
  const [streamSegments, setStreamSegments] = useState<IChatContentSegment[]>(
    [],
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingConfirmations, setPendingConfirmations] = useState<
    IChatPendingAction[]
  >([]);
  const [backoff, setBackoff] = useState<BackoffState>({
    active: false,
    retryAfterMs: 0,
    attempt: 0,
    maxAttempts: 0,
  });
  const [maxIterations, setMaxIterations] = useState<MaxIterationsState>({
    active: false,
    iterations: 0,
    hasUnansweredTools: false,
  });
  const abortRef = useRef<(() => void) | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const streamChat = useCallback(
    async (body: {
      conversationId?: string;
      message?: string | unknown[];
      model: string;
      toolsEnabled?: boolean;
      webSearchEnabled?: boolean;
      toolApprovals?: Record<string, boolean>;
    }): Promise<StreamResult | StreamError | null> => {
      if (!API) return null;

      setIsStreaming(true);
      setStreamSegments([]);
      setPendingConfirmations([]);
      setMaxIterations({
        active: false,
        iterations: 0,
        hasUnansweredTools: false,
      });

      let aborted = false;
      const controller = new AbortController();
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      abortRef.current = () => {
        aborted = true;
        controller.abort();
        reader?.cancel().catch(() => {});
      };
      const segments: IChatContentSegment[] = [];
      const pendingActions: IChatPendingAction[] = [];
      let accumulated = "";

      const pushUpdate = () => setStreamSegments([...segments]);

      const appendText = (text: string) => {
        const last = segments[segments.length - 1];
        if (last?.type === "text") {
          last.text += text;
        } else {
          segments.push({ type: "text", text });
        }
        accumulated += text;
        pushUpdate();
      };

      const addToolCall = (tc: IChatToolCall) => {
        const last = segments[segments.length - 1];
        if (last?.type === "tool_group") {
          last.calls.push(tc);
        } else {
          segments.push({ type: "tool_group", calls: [tc] });
        }
        pushUpdate();
      };

      const updateToolCall = (
        toolId: string,
        update: Partial<IChatToolCall>,
      ) => {
        for (const seg of segments) {
          if (seg.type !== "tool_group") continue;
          const tc = seg.calls.find((c) => c.toolId === toolId);
          if (tc) {
            Object.assign(tc, update);
            pushUpdate();
            return;
          }
        }
      };

      try {
        const result = await API.POST_STREAM({
          endpoint: "chat",
          body,
          signal: controller.signal,
        });

        if ("code" in result) {
          setIsStreaming(false);
          return { error: result.message ?? "Request failed" };
        }

        reader = result.body?.getReader();
        if (!reader) {
          setIsStreaming(false);
          return { error: "No response body received" };
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          if (aborted) {
            await reader.cancel();
            break;
          }

          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6);
            let event: { type: string; [k: string]: unknown };
            try {
              event = JSON.parse(json);
            } catch (err) {
              console.warn("Failed to parse SSE event:", err, json);
              continue;
            }

            if (event.type === "delta") {
              appendText(event.text as string);
            } else if (event.type === "tool_call") {
              addToolCall({
                toolId: event.toolId as string,
                toolName: event.toolName as string,
                input: event.input as Record<string, unknown>,
                status: "calling",
              });
            } else if (event.type === "tool_result") {
              updateToolCall(event.toolId as string, {
                result: event.result as string,
                isError: event.isError as boolean,
                status: event.isError ? "error" : "done",
              });
            } else if (event.type === "tool_confirmation_required") {
              updateToolCall(event.toolId as string, {
                status: "pending_approval",
              });
              const pa: IChatPendingAction = {
                toolId: event.toolId as string,
                toolName: event.toolName as string,
                input: event.input as Record<string, unknown>,
                status: "pending",
              };
              pendingActions.push(pa);
              setPendingConfirmations([...pendingActions]);
            } else if (event.type === "rate_limit_backoff") {
              const retryAfterMs = event.retryAfterMs as number;
              setBackoff({
                active: true,
                retryAfterMs,
                attempt: event.attempt as number,
                maxAttempts: event.maxAttempts as number,
              });
              setTimeout(() => {
                setBackoff((prev) => ({ ...prev, active: false }));
              }, retryAfterMs);
            } else if (event.type === "max_iterations_reached") {
              setMaxIterations({
                active: true,
                iterations: event.iterations as number,
                hasUnansweredTools: Boolean(event.hasUnansweredTools),
              });
            } else if (event.type === "persist_warning") {
              console.warn("Persist warning from server:", event.error);
            } else if (event.type === "paused") {
              setIsStreaming(false);
              return {
                content: accumulated,
                usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
                segments: [...segments],
                pendingActions,
                paused: true,
              };
            } else if (event.type === "done") {
              setIsStreaming(false);
              return {
                content: accumulated,
                usage: event.usage as StreamResult["usage"],
                segments: [...segments],
                pendingActions,
              };
            } else if (event.type === "error") {
              setIsStreaming(false);
              return {
                error: (event.error as string) ?? "An unknown error occurred",
              };
            }
          }
        }

        setIsStreaming(false);
        return aborted
          ? null
          : {
              content: accumulated,
              usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
              segments: [...segments],
              pendingActions,
            };
      } catch (e) {
        setIsStreaming(false);
        if (aborted) return null;
        return {
          error:
            e instanceof Error ? e.message : "An unexpected error occurred",
        };
      }
    },
    [API],
  );

  return {
    streamSegments,
    isStreaming,
    streamChat,
    abort,
    pendingConfirmations,
    setPendingConfirmations,
    backoff,
    maxIterations,
    setMaxIterations,
  };
}
