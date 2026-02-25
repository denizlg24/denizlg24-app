import type React from "react";
import { useCallback } from "react";

const INDENT = "  ";

const CLOSING_PAIRS: Record<string, string> = {
  "(": ")",
  "[": "]",
  "{": "}",
  "`": "`",
  '"': '"',
  "'": "'",
};

const LIST_MARKER_RE = /^(\s*)([-*+])\s/;
const ORDERED_LIST_RE = /^(\s*)(\d+)\.\s/;

function getLineInfo(text: string, cursorPos: number) {
  const lineStart = text.lastIndexOf("\n", cursorPos - 1) + 1;
  let lineEnd = text.indexOf("\n", cursorPos);
  if (lineEnd === -1) lineEnd = text.length;
  const lineText = text.slice(lineStart, lineEnd);
  const indent = lineText.match(/^(\s*)/)?.[1] ?? "";
  return { lineStart, lineEnd, lineText, indent };
}

function getSelectedLineRange(text: string, selStart: number, selEnd: number) {
  const blockStart = text.lastIndexOf("\n", selStart - 1) + 1;
  let blockEnd = text.indexOf("\n", selEnd);
  if (blockEnd === -1) blockEnd = text.length;
  return { blockStart, blockEnd };
}

function applyEdit(
  textarea: HTMLTextAreaElement,
  newValue: string,
  cursorStart: number,
  cursorEnd?: number,
) {
  textarea.value = newValue;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.setSelectionRange(cursorStart, cursorEnd ?? cursorStart);
}

export function useTextareaEditor(
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  content: string,
  setContent: (value: string) => void,
): { onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> } {
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { selectionStart: selStart, selectionEnd: selEnd } = textarea;
      const text = textarea.value;
      const hasSelection = selStart !== selEnd;

      if (e.key === "b" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        if (hasSelection) {
          const selected = text.slice(selStart, selEnd);
          const newText =
            text.slice(0, selStart) + `**${selected}**` + text.slice(selEnd);
          setContent(newText);
          requestAnimationFrame(() =>
            applyEdit(textarea, newText, selStart + 2, selEnd + 2),
          );
        } else {
          const newText = text.slice(0, selStart) + "****" + text.slice(selEnd);
          setContent(newText);
          requestAnimationFrame(() =>
            applyEdit(textarea, newText, selStart + 2),
          );
        }
        return;
      }

      if (e.key === "i" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        if (hasSelection) {
          const selected = text.slice(selStart, selEnd);
          const newText =
            text.slice(0, selStart) + `*${selected}*` + text.slice(selEnd);
          setContent(newText);
          requestAnimationFrame(() =>
            applyEdit(textarea, newText, selStart + 1, selEnd + 1),
          );
        } else {
          const newText = text.slice(0, selStart) + "**" + text.slice(selEnd);
          setContent(newText);
          requestAnimationFrame(() =>
            applyEdit(textarea, newText, selStart + 1),
          );
        }
        return;
      }

      if (e.key === "K" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        if (hasSelection) {
          const selected = text.slice(selStart, selEnd);
          const newText =
            text.slice(0, selStart) + `\`${selected}\`` + text.slice(selEnd);
          setContent(newText);
          requestAnimationFrame(() =>
            applyEdit(textarea, newText, selStart + 1, selEnd + 1),
          );
        } else {
          const newText = text.slice(0, selStart) + "``" + text.slice(selEnd);
          setContent(newText);
          requestAnimationFrame(() =>
            applyEdit(textarea, newText, selStart + 1),
          );
        }
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();

        if (hasSelection) {
          const { blockStart, blockEnd } = getSelectedLineRange(
            text,
            selStart,
            selEnd,
          );
          const block = text.slice(blockStart, blockEnd);
          const lines = block.split("\n");

          let newLines: string[];
          let deltaFirst = 0;
          let deltaTotal = 0;

          if (e.shiftKey) {
            newLines = lines.map((line, i) => {
              if (line.startsWith(INDENT)) {
                const removed = INDENT.length;
                if (i === 0) deltaFirst = -removed;
                deltaTotal -= removed;
                return line.slice(removed);
              }
              if (line.startsWith(" ")) {
                if (i === 0) deltaFirst = -1;
                deltaTotal -= 1;
                return line.slice(1);
              }
              return line;
            });
          } else {
            newLines = lines.map((line) => INDENT + line);
            deltaFirst = INDENT.length;
            deltaTotal = lines.length * INDENT.length;
          }

          const newBlock = newLines.join("\n");
          const newText =
            text.slice(0, blockStart) + newBlock + text.slice(blockEnd);
          setContent(newText);
          const newSelStart = Math.max(blockStart, selStart + deltaFirst);
          const newSelEnd = selEnd + deltaTotal;
          requestAnimationFrame(() =>
            applyEdit(textarea, newText, newSelStart, newSelEnd),
          );
        } else {
          const { lineStart, lineEnd, lineText } = getLineInfo(text, selStart);
          const isListLine =
            LIST_MARKER_RE.test(lineText) || ORDERED_LIST_RE.test(lineText);

          if (isListLine) {
            if (e.shiftKey) {
              if (lineText.startsWith(INDENT)) {
                const newLine = lineText.slice(INDENT.length);
                const newText =
                  text.slice(0, lineStart) + newLine + text.slice(lineEnd);
                setContent(newText);
                requestAnimationFrame(() =>
                  applyEdit(textarea, newText, selStart - INDENT.length),
                );
              } else if (lineText.startsWith(" ")) {
                const newLine = lineText.slice(1);
                const newText =
                  text.slice(0, lineStart) + newLine + text.slice(lineEnd);
                setContent(newText);
                requestAnimationFrame(() =>
                  applyEdit(textarea, newText, selStart - 1),
                );
              }
            } else {
              const newLine = INDENT + lineText;
              const newText =
                text.slice(0, lineStart) + newLine + text.slice(lineEnd);
              setContent(newText);
              requestAnimationFrame(() =>
                applyEdit(textarea, newText, selStart + INDENT.length),
              );
            }
          } else {
            if (e.shiftKey) {
              if (lineText.startsWith(INDENT)) {
                const newLine = lineText.slice(INDENT.length);
                const newText =
                  text.slice(0, lineStart) + newLine + text.slice(lineEnd);
                setContent(newText);
                requestAnimationFrame(() =>
                  applyEdit(
                    textarea,
                    newText,
                    Math.max(lineStart, selStart - INDENT.length),
                  ),
                );
              }
            } else {
              const newText =
                text.slice(0, selStart) + INDENT + text.slice(selEnd);
              setContent(newText);
              requestAnimationFrame(() =>
                applyEdit(textarea, newText, selStart + INDENT.length),
              );
            }
          }
        }
        return;
      }

      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const { lineText, indent } = getLineInfo(text, selStart);

        const unorderedMatch = lineText.match(LIST_MARKER_RE);
        if (unorderedMatch) {
          const [fullMatch, , marker] = unorderedMatch;
          const afterMarker = lineText.slice(fullMatch.length);

          if (afterMarker.trim() === "") {
            e.preventDefault();
            const { lineStart, lineEnd } = getLineInfo(text, selStart);
            const newText = text.slice(0, lineStart) + text.slice(lineEnd);
            const trimmedNewText = newText.startsWith("\n", lineStart)
              ? newText.slice(0, lineStart) + newText.slice(lineStart + 1)
              : newText;
            setContent(trimmedNewText);
            requestAnimationFrame(() =>
              applyEdit(textarea, trimmedNewText, lineStart),
            );
            return;
          }

          e.preventDefault();
          const continuation = `\n${indent}${marker} `;
          const newText =
            text.slice(0, selStart) + continuation + text.slice(selEnd);
          setContent(newText);
          requestAnimationFrame(() =>
            applyEdit(textarea, newText, selStart + continuation.length),
          );
          return;
        }

        const orderedMatch = lineText.match(ORDERED_LIST_RE);
        if (orderedMatch) {
          const [fullMatch, , numStr] = orderedMatch;
          const afterMarker = lineText.slice(fullMatch.length);

          if (afterMarker.trim() === "") {
            e.preventDefault();
            const { lineStart, lineEnd } = getLineInfo(text, selStart);
            const newText = text.slice(0, lineStart) + text.slice(lineEnd);
            const trimmedNewText = newText.startsWith("\n", lineStart)
              ? newText.slice(0, lineStart) + newText.slice(lineStart + 1)
              : newText;
            setContent(trimmedNewText);
            requestAnimationFrame(() =>
              applyEdit(textarea, trimmedNewText, lineStart),
            );
            return;
          }

          e.preventDefault();
          const nextNum = parseInt(numStr, 10) + 1;
          const continuation = `\n${indent}${nextNum}. `;
          const newText =
            text.slice(0, selStart) + continuation + text.slice(selEnd);
          setContent(newText);
          requestAnimationFrame(() =>
            applyEdit(textarea, newText, selStart + continuation.length),
          );
          return;
        }
      }

      if (e.key in CLOSING_PAIRS && !e.ctrlKey && !e.metaKey) {
        const closing = CLOSING_PAIRS[e.key];
        e.preventDefault();

        if (hasSelection) {
          const selected = text.slice(selStart, selEnd);
          const newText =
            text.slice(0, selStart) +
            e.key +
            selected +
            closing +
            text.slice(selEnd);
          setContent(newText);
          requestAnimationFrame(() =>
            applyEdit(textarea, newText, selStart + 1, selEnd + 1),
          );
        } else {
          const newText =
            text.slice(0, selStart) + e.key + closing + text.slice(selEnd);
          setContent(newText);
          requestAnimationFrame(() =>
            applyEdit(textarea, newText, selStart + 1),
          );
        }
        return;
      }
    },
    [content, setContent, textareaRef],
  );

  return { onKeyDown };
}
