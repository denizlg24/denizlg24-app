"use client";

import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useUserSettings } from "@/context/user-context";
import { useWhiteboardCanvas } from "@/hooks/use-whiteboard-canvas";
import { useWhiteboardHistory } from "@/hooks/use-whiteboard-history";
import { denizApi } from "@/lib/api-wrapper";
import type { IWhiteboard, IWhiteboardElement } from "@/lib/data-types";
import { cn } from "@/lib/utils";
import type {
  DrawingData,
  ShapeData,
  TextData,
  WhiteboardTool,
} from "@/lib/whiteboard-types";
import { WhiteboardBottomBar } from "./whiteboard-bottom-bar";
import {
  getElementBoundsForCanvas,
  WhiteboardCanvas,
} from "./whiteboard-canvas";
import { WhiteboardTopBar } from "./whiteboard-top-bar";

function elementToSVGString(el: IWhiteboardElement): string {
  const data = el.data as Record<string, unknown>;

  if (data.points) {
    const d = data as unknown as DrawingData;
    if (!d.points || d.points.length < 2) return "";
    let pathD = `M ${d.points[0].x} ${d.points[0].y}`;
    for (let i = 1; i < d.points.length; i++) {
      const prev = d.points[i - 1];
      const curr = d.points[i];
      const mx = (prev.x + curr.x) / 2;
      const my = (prev.y + curr.y) / 2;
      pathD += ` Q ${prev.x} ${prev.y} ${mx} ${my}`;
    }
    const last = d.points[d.points.length - 1];
    pathD += ` L ${last.x} ${last.y}`;
    return `<g transform="translate(${el.x}, ${el.y})"><path d="${pathD}" fill="none" stroke="${d.color}" stroke-width="${d.thickness}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  }

  if (data.shapeType) {
    const d = data as unknown as ShapeData;
    const w = el.width ?? 0;
    const h = el.height ?? 0;

    if (d.shapeType === "arrow") {
      const x2 = d.x2 ?? 0;
      const y2 = d.y2 ?? 0;
      const angle = Math.atan2(y2, x2);
      const headLen = Math.min(16, Math.sqrt(x2 * x2 + y2 * y2) * 0.3);
      const a1x = x2 - headLen * Math.cos(angle - Math.PI / 6);
      const a1y = y2 - headLen * Math.sin(angle - Math.PI / 6);
      const a2x = x2 - headLen * Math.cos(angle + Math.PI / 6);
      const a2y = y2 - headLen * Math.sin(angle + Math.PI / 6);
      return `<g transform="translate(${el.x}, ${el.y})"><line x1="0" y1="0" x2="${x2}" y2="${y2}" stroke="${d.color}" stroke-width="${d.thickness}" stroke-linecap="round"/><polygon points="${x2},${y2} ${a1x},${a1y} ${a2x},${a2y}" fill="${d.color}"/></g>`;
    }

    if (d.shapeType === "circle") {
      const rx = w / 2;
      const ry = h / 2;
      return `<ellipse cx="${el.x + rx}" cy="${el.y + ry}" rx="${rx}" ry="${ry}" fill="none" stroke="${d.color}" stroke-width="${d.thickness}"/>`;
    }

    const cornerR = d.shapeType === "square" ? 0 : 2;
    return `<rect x="${el.x}" y="${el.y}" width="${w}" height="${h}" fill="none" stroke="${d.color}" stroke-width="${d.thickness}" rx="${cornerR}"/>`;
  }

  if (data.text !== undefined) {
    const d = data as unknown as TextData;
    const w = el.width ?? 100;
    const h = el.height ?? 40;
    const fontSize = d.fontSize ?? 16;
    const escaped = d.text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<foreignObject x="${el.x}" y="${el.y}" width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;color:${d.color};font-size:${fontSize}px;line-height:1.3;font-family:sans-serif;word-wrap:break-word;overflow-wrap:break-word;overflow:hidden;white-space:pre-wrap;padding:2px">${escaped}</div></foreignObject>`;
  }

  return "";
}

const CURSOR_MAP: Record<WhiteboardTool, string> = {
  pen: "cursor-[url(/assets/drawing-cursor.png),_pointer]",
  square: "cursor-[url(/assets/shape-cursor.png),_pointer]",
  rectangle: "cursor-[url(/assets/shape-cursor.png),_pointer]",
  circle: "cursor-[url(/assets/shape-cursor.png),_pointer]",
  arrow: "cursor-[url(/assets/shape-cursor.png),_pointer]",
  select: "cursor-[url(/assets/shape-cursor.png),_pointer]",
  text: "cursor-[url(/assets/text-cursor.png),_pointer]",
  eraser: "cursor-[url(/assets/eraser-cursor.png),_pointer]",
  hand: "cursor-grab",
  pointer: "cursor-auto",
};

interface WhiteboardEditorProps {
  id: string;
  onBack: () => void;
}

export function WhiteboardEditor({ id, onBack }: WhiteboardEditorProps) {
  const { settings, loading: loadingSettings } = useUserSettings();

  const API = useMemo(() => {
    if (loadingSettings) return null;
    return new denizApi(settings.apiKey);
  }, [settings, loadingSettings]);

  const [loading, setLoading] = useState(true);
  const [whiteboard, setWhiteboard] = useState<IWhiteboard | null>(null);

  const [selectedTool, setSelectedTool] = useState<WhiteboardTool>("pen");
  const [selectedThickness, setSelectedThickness] = useState(4);
  const [selectedColor, setSelectedColor] = useState("#000000");

  const history = useWhiteboardHistory([]);

  const canvas = useWhiteboardCanvas(history);

  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const initialElementsRef = useRef<string>("");

  useEffect(() => {
    const current = JSON.stringify(history.elements);
    if (initialElementsRef.current && current !== initialElementsRef.current) {
      setHasChanges(true);
    } else {
      setHasChanges(false);
    }
  }, [history.elements, history.revision]);

  const fetchWhiteboard = useCallback(async () => {
    if (!API || !id) return;
    setLoading(true);
    try {
      const result = await API.GET<{ whiteboard: IWhiteboard }>({
        endpoint: `whiteboard/${id}`,
      });
      if ("code" in result) {
        console.error(result);
        setLoading(false);
        return;
      }
      setWhiteboard(result.whiteboard);
      history.replaceAll(result.whiteboard.elements);
      canvas.initializeView(result.whiteboard.viewState);
      initialElementsRef.current = JSON.stringify(result.whiteboard.elements);
      setLoading(false);
    } catch (_error) {
      setLoading(false);
    }
  }, [API, id, history, canvas]);

  useEffect(() => {
    if (!API || !id || !loading) return;
    fetchWhiteboard();
  }, [API, id, loading, fetchWhiteboard]);

  const handleSave = useCallback(async () => {
    if (!API || !whiteboard) return;
    setIsSaving(true);
    try {
      const result = await API.PUT<{ whiteboard: IWhiteboard }>({
        endpoint: `whiteboard/${whiteboard._id}`,
        body: {
          elements: history.elements,
          viewState: canvas.viewState,
        },
      });
      if (!("code" in result)) {
        initialElementsRef.current = JSON.stringify(history.elements);
        setHasChanges(false);
      }
    } catch (_error) {}
    setIsSaving(false);
  }, [API, whiteboard, history.elements, canvas.viewState]);

  const handleDiscard = useCallback(() => {
    if (!whiteboard) return;
    history.replaceAll(whiteboard.elements);
    canvas.initializeView(whiteboard.viewState);
    canvas.setSelectedElementIds(new Set());
    setHasChanges(false);
  }, [whiteboard, history, canvas]);

  const handleRename = useCallback(
    async (newName: string) => {
      if (!API || !whiteboard) return;
      try {
        const result = await API.PUT<{ whiteboard: IWhiteboard }>({
          endpoint: `whiteboard/${whiteboard._id}`,
          body: { name: newName },
        });
        if (!("code" in result)) {
          setWhiteboard((prev) => (prev ? { ...prev, name: newName } : prev));
        }
      } catch (_error) {}
    },
    [API, whiteboard],
  );

  const handleZoomIn = useCallback(() => {
    canvas.setViewState((prev) => ({
      ...prev,
      zoom: Math.min(5, prev.zoom * 1.25),
    }));
  }, [canvas]);

  const handleZoomOut = useCallback(() => {
    canvas.setViewState((prev) => ({
      ...prev,
      zoom: Math.max(0.1, prev.zoom / 1.25),
    }));
  }, [canvas]);

  const handleResetView = useCallback(() => {
    canvas.setViewState({ x: 0, y: 0, zoom: 1 });
  }, [canvas]);

  const handleExportPNG = useCallback(async () => {
    const targetElements =
      canvas.selectedElementIds.size > 0
        ? history.elements.filter((el) => canvas.selectedElementIds.has(el.id))
        : history.elements;

    if (targetElements.length === 0) return;

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const el of targetElements) {
      const b = getElementBoundsForCanvas(el);
      if (b.x < minX) minX = b.x;
      if (b.y < minY) minY = b.y;
      if (b.x + b.w > maxX) maxX = b.x + b.w;
      if (b.y + b.h > maxY) maxY = b.y + b.h;
    }
    if (minX === Number.POSITIVE_INFINITY) return;

    const padding = Math.max(maxX - minX, maxY - minY) * 0.05;
    const vx = minX - padding;
    const vy = minY - padding;
    const vw = maxX - minX + padding * 2;
    const vh = maxY - minY + padding * 2;

    const scale = 2;
    const canvasWidth = Math.ceil(vw * scale);
    const canvasHeight = Math.ceil(vh * scale);

    const sorted = [...targetElements].sort((a, b) => a.zIndex - b.zIndex);
    let svgContent = "";
    for (const el of sorted) {
      svgContent += elementToSVGString(el);
    }

    const svgString = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="${vx} ${vy} ${vw} ${vh}">`,
      `<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="white"/>`,
      svgContent,
      "</svg>",
    ].join("");

    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    try {
      const img = new Image();
      img.width = canvasWidth;
      img.height = canvasHeight;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load SVG for export"));
        img.src = url;
      });

      const offscreen = document.createElement("canvas");
      offscreen.width = canvasWidth;
      offscreen.height = canvasHeight;
      const ctx = offscreen.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

      const pngBlob = await new Promise<Blob | null>((resolve) =>
        offscreen.toBlob(resolve, "image/png"),
      );
      if (!pngBlob) return;

      const path = await save({
        filters: [{ name: "PNG Image", extensions: ["png"] }],
        defaultPath: `${whiteboard?.name ?? "whiteboard"}.png`,
      });
      if (!path) return;

      const arrayBuffer = await pngBlob.arrayBuffer();
      await writeFile(path, new Uint8Array(arrayBuffer));
    } finally {
      URL.revokeObjectURL(url);
    }
  }, [whiteboard, history.elements, canvas.selectedElementIds]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        canvas.textBox !== null
      ) {
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        canvas.deleteSelected();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        history.undo();
        return;
      }

      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") ||
        ((e.ctrlKey || e.metaKey) && e.key === "y")
      ) {
        e.preventDefault();
        history.redo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
        return;
      }

      switch (e.key) {
        case "p":
          setSelectedTool("pen");
          break;
        case "r":
          setSelectedTool("rectangle");
          break;
        case "c":
          setSelectedTool("circle");
          break;
        case "a":
          setSelectedTool("arrow");
          break;
        case "t":
          setSelectedTool("text");
          break;
        case "e":
          setSelectedTool("eraser");
          break;
        case "h":
          setSelectedTool("hand");
          break;
        case "v":
          setSelectedTool("pointer");
          break;
        case "s":
          if (!e.ctrlKey && !e.metaKey) setSelectedTool("select");
          break;
        case "Escape":
          canvas.setSelectedElementIds(new Set());
          canvas.setTextBox(null);
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canvas, history, handleSave]);

  const wrappedPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      canvas.onPointerDown(e, selectedTool, selectedColor, selectedThickness);
    },
    [canvas, selectedTool, selectedColor, selectedThickness],
  );

  const wrappedPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      canvas.onPointerMove(e, selectedTool);
    },
    [canvas, selectedTool],
  );

  const wrappedPointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      canvas.onPointerUp(e, selectedTool);
    },
    [canvas, selectedTool],
  );

  const handleTextCommit = useCallback(
    (text: string) => {
      canvas.commitText(
        text,
        selectedColor,
        Math.max(selectedThickness * 2, 16),
      );
    },
    [canvas, selectedColor, selectedThickness],
  );

  const handleTextCancel = useCallback(() => {
    canvas.setTextBox(null);
  }, [canvas]);

  if (loading || !whiteboard) {
    return (
      <div className="w-dvw h-[calc(100vh-2rem)] overflow-clip relative flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const selectedCursor = CURSOR_MAP[selectedTool];

  return (
    <div
      className={cn(
        "whiteboard-container w-dvw h-[calc(100vh-2rem)] overflow-clip relative",
        selectedCursor,
      )}
    >
      <WhiteboardCanvas
        elements={history.elements}
        viewState={canvas.viewState}
        selectedTool={selectedTool}
        selectedElementIds={canvas.selectedElementIds}
        selectionRect={canvas.selectionRect}
        activeDrawing={canvas.activeDrawing}
        textBox={canvas.textBox}
        selectedColor={selectedColor}
        selectedThickness={selectedThickness}
        onPointerDown={wrappedPointerDown}
        onPointerMove={wrappedPointerMove}
        onPointerUp={wrappedPointerUp}
        onWheel={canvas.onWheel}
        onTextCommit={handleTextCommit}
        onTextCancel={handleTextCancel}
        onDeleteSelected={canvas.deleteSelected}
      />

      <WhiteboardTopBar
        boardName={whiteboard.name}
        hasChanges={hasChanges}
        isSaving={isSaving}
        viewState={canvas.viewState}
        selectedCount={canvas.selectedElementIds.size}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onDeleteSelected={canvas.deleteSelected}
        onResetView={handleResetView}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onExportPNG={handleExportPNG}
        onRename={handleRename}
        onBack={onBack}
      />

      <WhiteboardBottomBar
        selectedTool={selectedTool}
        selectedThickness={selectedThickness}
        selectedColor={selectedColor}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onToolChange={setSelectedTool}
        onThicknessChange={setSelectedThickness}
        onColorChange={setSelectedColor}
        onUndo={history.undo}
        onRedo={history.redo}
      />
    </div>
  );
}
