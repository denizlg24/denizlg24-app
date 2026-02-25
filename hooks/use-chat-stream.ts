import { useCallback, useRef, useState } from "react";
import type { denizApi } from "@/lib/api-wrapper";

export interface StreamResult {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  };
}

export function useChatStream(API: denizApi | null) {
  const [streamContent, setStreamContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<(() => void) | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const streamResponse = useCallback(
    (body: {
      prompt: string;
      systemPrompt: string;
      model: string;
      source: string;
    }): Promise<StreamResult | null> => {
      if (!API) return Promise.resolve(null);

      return new Promise(async (resolve) => {
        setIsStreaming(true);
        setStreamContent("");

        let aborted = false;
        abortRef.current = () => {
          aborted = true;
        };

        try {
          const result = await API.POST_STREAM({
            endpoint: "llm",
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
          let accumulated = "";
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
                  accumulated += event.text;
                  setStreamContent(accumulated);
                } else if (event.type === "done") {
                  setIsStreaming(false);
                  resolve({
                    content: accumulated,
                    usage: event.usage,
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
          resolve(aborted ? null : { content: accumulated, usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 } });
        } catch {
          setIsStreaming(false);
          resolve(null);
        }
      });
    },
    [API],
  );

  return { streamContent, isStreaming, streamResponse, abort };
}
