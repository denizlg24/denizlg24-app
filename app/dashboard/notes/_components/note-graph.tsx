"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import type {
  ForceGraphProps,
  LinkObject,
  NodeObject,
} from "react-force-graph-2d";
import { classColor } from "@/lib/bookmark-color";
import type { INote, INoteEdge, INoteGroup } from "@/lib/data-types";

type GraphNodeData = {
  id: string;
  label: string;
  type: "note" | "group";
  val: number;
  color: string;
  note?: INote;
  group?: INoteGroup;
};

type GraphLinkData = {
  source: string;
  target: string;
  type: "membership" | "relation";
  strength: number;
};

type GraphNode = NodeObject<GraphNodeData>;
type GraphLink = LinkObject<GraphNodeData, GraphLinkData>;

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
}) as ComponentType<ForceGraphProps<GraphNodeData, GraphLinkData>>;

interface Props {
  notes: INote[];
  groups: INoteGroup[];
  edges: INoteEdge[];
  onSelectNote: (note: INote) => void;
  onSelectGroup: (group: INoteGroup) => void;
}

interface Theme {
  background: string;
  foreground: string;
  mutedForeground: string;
  scheme: "dark" | "light";
}

function readTheme(element: HTMLElement): Theme {
  const styles = getComputedStyle(element);
  const get = (value: string, fallback: string) =>
    styles.getPropertyValue(value).trim() || fallback;
  const isDark = document.documentElement.classList.contains("dark");

  return {
    background: get("--background", isDark ? "#0b0d10" : "#f9f8f6"),
    foreground: get("--foreground", isDark ? "#e6e7ea" : "#2a2b2c"),
    mutedForeground: get("--muted-foreground", isDark ? "#8a8d93" : "#4f5a4a"),
    scheme: isDark ? "dark" : "light",
  };
}

function resolveNodeId(
  value: string | number | GraphNode | null | undefined,
): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return typeof value.id === "string" ? value.id : null;
}

const NODE_REL_SIZE = 3;
const LABEL_ZOOM_THRESHOLD = 2.8;

export function NoteGraph({
  notes,
  groups,
  edges,
  onSelectNote,
  onSelectGroup,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [theme, setTheme] = useState<Theme | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const element = containerRef.current;
    const resizeObserver = new ResizeObserver(() => {
      setSize({ width: element.clientWidth, height: element.clientHeight });
    });

    resizeObserver.observe(element);
    setSize({ width: element.clientWidth, height: element.clientHeight });
    setTheme(readTheme(element));

    const mutationObserver = new MutationObserver(() => {
      setTheme(readTheme(element));
    });

    mutationObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  const data = useMemo(() => {
    const scheme = theme?.scheme ?? "dark";
    const visibleNoteIds = new Set(notes.map((note) => note._id));
    const groupMemberCount = new Map<string, number>();

    for (const note of notes) {
      for (const groupId of note.groupIds) {
        groupMemberCount.set(groupId, (groupMemberCount.get(groupId) ?? 0) + 1);
      }
    }

    const noteEdgeCount = new Map<string, number>();
    for (const edge of edges) {
      if (visibleNoteIds.has(edge.from) && visibleNoteIds.has(edge.to)) {
        noteEdgeCount.set(edge.from, (noteEdgeCount.get(edge.from) ?? 0) + 1);
        noteEdgeCount.set(edge.to, (noteEdgeCount.get(edge.to) ?? 0) + 1);
      }
    }

    const nodes: GraphNode[] = [
      ...notes.map<GraphNode>((note) => {
        const connections =
          (noteEdgeCount.get(note._id) ?? 0) + note.groupIds.length;

        return {
          id: note._id,
          label: note.title,
          type: "note",
          val: 0.6 + connections * 0.24,
          color: note.class
            ? classColor(note.class, scheme)
            : classColor(note.siteName ?? note.title, scheme),
          note,
        };
      }),
      ...groups.map<GraphNode>((group) => ({
        id: `group:${group._id}`,
        label: group.name,
        type: "group",
        val: 4 + (groupMemberCount.get(group._id) ?? 0) * 1.2,
        color: group.color ?? classColor(group.name, scheme),
        group,
      })),
    ];

    const links: GraphLink[] = [];

    for (const note of notes) {
      for (const groupId of note.groupIds) {
        if (groups.some((group) => group._id === groupId)) {
          links.push({
            source: note._id,
            target: `group:${groupId}`,
            type: "membership",
            strength: 1,
          });
        }
      }
    }

    for (const group of groups) {
      if (group.parentId && groups.some((parent) => parent._id === group.parentId)) {
        links.push({
          source: `group:${group._id}`,
          target: `group:${group.parentId}`,
          type: "membership",
          strength: 1,
        });
      }
    }

    for (const edge of edges) {
      if (visibleNoteIds.has(edge.from) && visibleNoteIds.has(edge.to)) {
        links.push({
          source: edge.from,
          target: edge.to,
          type: "relation",
          strength: edge.strength,
        });
      }
    }

    return { nodes, links };
  }, [notes, groups, edges, theme?.scheme]);

  return (
    <div ref={containerRef} className="h-full w-full bg-background">
      {size.width > 0 && theme && (
        <ForceGraph2D
          graphData={data}
          width={size.width}
          height={size.height}
          backgroundColor={theme.background}
          nodeRelSize={NODE_REL_SIZE}
          nodeLabel={() => ""}
          nodeVal={(node: GraphNode) => node.val}
          linkColor={(link: GraphLink) =>
            link.type === "membership"
              ? `${theme.mutedForeground}44`
              : `${theme.mutedForeground}66`
          }
          linkWidth={(link: GraphLink) =>
            link.type === "relation" ? Math.max(0.9, link.strength * 1.8) : 0.5
          }
          cooldownTicks={180}
          onNodeHover={(node: GraphNode | null) => {
            setHoveredId(node ? node.id : null);
            if (containerRef.current) {
              containerRef.current.style.cursor = node ? "pointer" : "default";
            }
          }}
          onNodeClick={(node: GraphNode) => {
            if (node.type === "note" && node.note) onSelectNote(node.note);
            if (node.type === "group" && node.group) onSelectGroup(node.group);
          }}
          onLinkClick={(link: GraphLink) => {
            if (link.type !== "relation") return;

            const sourceId = resolveNodeId(link.source);
            const nextNote = notes.find((note) => note._id === sourceId);
            if (nextNote) onSelectNote(nextNote);
          }}
          nodeCanvasObjectMode={() => "replace"}
          nodeCanvasObject={(
            node: GraphNode & { x?: number; y?: number },
            context: CanvasRenderingContext2D,
            globalScale: number,
          ) => {
            if (node.x == null || node.y == null) return;

            const radius = Math.sqrt(node.val) * NODE_REL_SIZE;
            const isHovered = hoveredId === node.id;

            context.beginPath();
            context.arc(node.x, node.y, radius, 0, 2 * Math.PI);
            context.fillStyle = node.color;
            context.fill();

            const showLabel = isHovered || globalScale >= LABEL_ZOOM_THRESHOLD;
            if (!showLabel) return;

            const isGroup = node.type === "group";
            const fontSize = (isGroup ? 11 : 9) / globalScale;
            context.font = `${isGroup ? 600 : 500} ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
            context.textAlign = "center";
            context.textBaseline = "middle";

            const maxChars = isGroup ? 28 : 36;
            const label =
              node.label.length > maxChars
                ? `${node.label.slice(0, maxChars)}…`
                : node.label;

            const metrics = context.measureText(label);
            const padX = 4 / globalScale;
            const padY = 2 / globalScale;
            const boxWidth = metrics.width + padX * 2;
            const boxHeight = fontSize + padY * 2;
            const centerY = node.y + radius + boxHeight / 2 + 3 / globalScale;
            const centerX = node.x;
            const x = centerX - boxWidth / 2;
            const y = centerY - boxHeight / 2;
            const cornerRadius = 3 / globalScale;

            context.fillStyle = `${theme.background}ee`;
            context.beginPath();
            context.moveTo(x + cornerRadius, y);
            context.lineTo(x + boxWidth - cornerRadius, y);
            context.quadraticCurveTo(x + boxWidth, y, x + boxWidth, y + cornerRadius);
            context.lineTo(x + boxWidth, y + boxHeight - cornerRadius);
            context.quadraticCurveTo(
              x + boxWidth,
              y + boxHeight,
              x + boxWidth - cornerRadius,
              y + boxHeight,
            );
            context.lineTo(x + cornerRadius, y + boxHeight);
            context.quadraticCurveTo(x, y + boxHeight, x, y + boxHeight - cornerRadius);
            context.lineTo(x, y + cornerRadius);
            context.quadraticCurveTo(x, y, x + cornerRadius, y);
            context.closePath();
            context.fill();

            context.fillStyle = theme.foreground;
            context.fillText(label, centerX, centerY);
          }}
          nodePointerAreaPaint={(
            node: GraphNode & { x?: number; y?: number },
            color: string,
            context: CanvasRenderingContext2D,
          ) => {
            if (node.x == null || node.y == null) return;

            const radius = Math.sqrt(node.val) * NODE_REL_SIZE;
            context.fillStyle = color;
            context.beginPath();
            context.arc(node.x, node.y, radius + 2, 0, 2 * Math.PI);
            context.fill();
          }}
        />
      )}
    </div>
  );
}
