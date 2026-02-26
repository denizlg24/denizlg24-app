import { useCallback, useRef, useState } from "react";
import type { denizApi } from "@/lib/api-wrapper";
import type {
  IChatToolCall,
  IChatPendingAction,
  IChatContentSegment,
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
}

interface ConfirmedAction {
  toolId: string;
  toolName: string;
  input: unknown;
}

export function useChatStream(API: denizApi | null) {
  const [streamSegments, setStreamSegments] = useState<IChatContentSegment[]>(
    [],
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingConfirmations, setPendingConfirmations] = useState<
    IChatPendingAction[]
  >([]);
  const abortRef = useRef<(() => void) | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const streamChat = useCallback(
    (body: {
      conversationId?: string;
      message: string | unknown[];
      model: string;
      toolsEnabled?: boolean;
      webSearchEnabled?: boolean;
      confirmedActions?: ConfirmedAction[];
    }): Promise<StreamResult | null> => {
      if (!API) return Promise.resolve(null);

      return new Promise(async (resolve) => {
        setIsStreaming(true);
        setStreamSegments([]);
        setPendingConfirmations([]);

        let aborted = false;
        abortRef.current = () => {
          aborted = true;
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
          });

          if ("code" in result) {
            setIsStreaming(false);
            resolve(null);
            return;
          }

          const reader = result.body?.getReader();
          if (!reader) {
            setIsStreaming(false);
            resolve(null);
            return;
          }

          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            if (aborted) {
              reader.cancel();
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
              try {
                const event = JSON.parse(json);

                if (event.type === "delta") {
                  appendText(event.text);
                } else if (event.type === "tool_call") {
                  addToolCall({
                    toolId: event.toolId,
                    toolName: event.toolName,
                    input: event.input,
                    status: "calling",
                  });
                } else if (event.type === "tool_result") {
                  updateToolCall(event.toolId, {
                    result: event.result,
                    isError: event.isError,
                    status: event.isError ? "error" : "done",
                  });
                } else if (event.type === "tool_confirmation_required") {
                  updateToolCall(event.toolId, {
                    status: "pending_approval",
                  });

                  const pa: IChatPendingAction = {
                    toolId: event.toolId,
                    toolName: event.toolName,
                    input: event.input,
                    status: "pending",
                  };
                  pendingActions.push(pa);
                  setPendingConfirmations([...pendingActions]);
                } else if (event.type === "done") {
                  setIsStreaming(false);
                  resolve({
                    content: accumulated,
                    usage: event.usage,
                    segments: [...segments],
                    pendingActions,
                  });
                  return;
                } else if (event.type === "error") {
                  setIsStreaming(false);
                  resolve(null);
                  return;
                }
              } catch {}
            }
          }

          setIsStreaming(false);
          resolve(
            aborted
              ? null
              : {
                  content: accumulated,
                  usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
                  segments: [...segments],
                  pendingActions,
                },
          );
        } catch {
          setIsStreaming(false);
          resolve(null);
        }
      });
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
  };
}
