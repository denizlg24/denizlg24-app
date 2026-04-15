"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  IBookmark,
  IBookmarkEdge,
  IBookmarkGroup,
} from "@/lib/data-types";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

type GraphNode = {
  id: string;
  label: string;
  type: "bookmark" | "group";
  val: number;
  bookmark?: IBookmark;
  group?: IBookmarkGroup;
};

type GraphLink = {
  source: string;
  target: string;
  type: "membership" | "relation";
  strength: number;
};

interface Props {
  bookmarks: IBookmark[];
  groups: IBookmarkGroup[];
  edges: IBookmarkEdge[];
  onSelectBookmark: (b: IBookmark) => void;
  onSelectGroup: (g: IBookmarkGroup) => void;
}

interface Theme {
  background: string;
  foreground: string;
  mutedForeground: string;
  accent: string;
  accentStrong: string;
  muted: string;
  border: string;
  surface: string;
}

function readTheme(el: HTMLElement): Theme {
  const cs = getComputedStyle(el);
  const get = (v: string, fallback: string) =>
    cs.getPropertyValue(v).trim() || fallback;
  return {
    background: get("--background", "#f9f8f6"),
    foreground: get("--foreground", "#647560"),
    mutedForeground: get("--muted-foreground", "#4f5a4a"),
    accent: get("--accent", "#a1bc98"),
    accentStrong: get("--accent-strong", "#303630"),
    muted: get("--muted", "#d2dcb6"),
    border: get("--border", "#d2dcb6"),
    surface: get("--surface", "#f1f3e0"),
  };
}

export function BookmarkGraph({
  bookmarks,
  groups,
  edges,
  onSelectBookmark,
  onSelectGroup,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => {
      setSize({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(el);
    setSize({ width: el.clientWidth, height: el.clientHeight });
    setTheme(readTheme(el));

    const mo = new MutationObserver(() => setTheme(readTheme(el)));
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  const data = useMemo(() => {
    const visibleBookmarkIds = new Set(bookmarks.map((b) => b._id));
    const groupMemberCount = new Map<string, number>();
    for (const b of bookmarks) {
      for (const gid of b.groupIds) {
        groupMemberCount.set(gid, (groupMemberCount.get(gid) ?? 0) + 1);
      }
    }
    const nodes: GraphNode[] = [
      ...bookmarks.map<GraphNode>((b) => ({
        id: b._id,
        label: b.title,
        type: "bookmark",
        val: 2,
        bookmark: b,
      })),
      ...groups.map<GraphNode>((g) => ({
        id: `group:${g._id}`,
        label: g.name,
        type: "group",
        val: 6 + (groupMemberCount.get(g._id) ?? 0) * 1.5,
        group: g,
      })),
    ];

    const links: GraphLink[] = [];
    for (const b of bookmarks) {
      for (const gid of b.groupIds) {
        if (groups.some((g) => g._id === gid)) {
          links.push({
            source: b._id,
            target: `group:${gid}`,
            type: "membership",
            strength: 1,
          });
        }
      }
    }
    for (const e of edges) {
      if (visibleBookmarkIds.has(e.from) && visibleBookmarkIds.has(e.to)) {
        links.push({
          source: e.from,
          target: e.to,
          type: "relation",
          strength: e.strength,
        });
      }
    }
    return { nodes, links };
  }, [bookmarks, groups, edges]);

  const NODE_REL_SIZE = 4;

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
          nodeVal={(n: GraphNode) => n.val}
          linkColor={(l: GraphLink) =>
            l.type === "membership"
              ? `${theme.mutedForeground}55`
              : `${theme.accentStrong}88`
          }
          linkWidth={(l: GraphLink) => (l.type === "relation" ? 1.4 : 0.8)}
          cooldownTicks={150}
          onNodeClick={(n: GraphNode) => {
            if (n.type === "bookmark" && n.bookmark) onSelectBookmark(n.bookmark);
            if (n.type === "group" && n.group) onSelectGroup(n.group);
          }}
          nodeCanvasObjectMode={() => "replace"}
          nodeCanvasObject={(
            node: GraphNode & { x?: number; y?: number },
            ctx: CanvasRenderingContext2D,
            globalScale: number,
          ) => {
            if (node.x == null || node.y == null) return;
            const radius = Math.sqrt(node.val) * NODE_REL_SIZE;

            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
            if (node.type === "group") {
              ctx.fillStyle = theme.accent;
              ctx.fill();
              ctx.lineWidth = 1.5 / globalScale;
              ctx.strokeStyle = theme.accentStrong;
              ctx.stroke();
            } else {
              ctx.fillStyle = theme.foreground;
              ctx.fill();
              ctx.lineWidth = 1 / globalScale;
              ctx.strokeStyle = theme.background;
              ctx.stroke();
            }

            const showLabel =
              node.type === "group" || globalScale >= 1.4;
            if (!showLabel) return;

            const isGroup = node.type === "group";
            const fontSize = isGroup
              ? Math.max(11, 12 / globalScale)
              : 10 / globalScale;
            ctx.font = `${isGroup ? 600 : 500} ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const raw = node.label;
            const maxChars = isGroup ? 28 : 36;
            const label =
              raw.length > maxChars ? `${raw.slice(0, maxChars)}…` : raw;

            const metrics = ctx.measureText(label);
            const padX = 4 / globalScale;
            const padY = 2 / globalScale;
            const boxW = metrics.width + padX * 2;
            const boxH = fontSize + padY * 2;
            const cy = node.y + radius + boxH / 2 + 3 / globalScale;
            const cx = node.x;

            ctx.fillStyle = `${theme.background}ee`;
            const r = 3 / globalScale;
            const x = cx - boxW / 2;
            const y = cy - boxH / 2;
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + boxW - r, y);
            ctx.quadraticCurveTo(x + boxW, y, x + boxW, y + r);
            ctx.lineTo(x + boxW, y + boxH - r);
            ctx.quadraticCurveTo(
              x + boxW,
              y + boxH,
              x + boxW - r,
              y + boxH,
            );
            ctx.lineTo(x + r, y + boxH);
            ctx.quadraticCurveTo(x, y + boxH, x, y + boxH - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = isGroup ? theme.accentStrong : theme.foreground;
            ctx.fillText(label, cx, cy);
          }}
          nodePointerAreaPaint={(
            node: GraphNode & { x?: number; y?: number },
            color: string,
            ctx: CanvasRenderingContext2D,
          ) => {
            if (node.x == null || node.y == null) return;
            const radius = Math.sqrt(node.val) * NODE_REL_SIZE;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + 2, 0, 2 * Math.PI);
            ctx.fill();
          }}
        />
      )}
    </div>
  );
}
