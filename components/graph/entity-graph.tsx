"use client";

import { useMemo } from "react";
import {
  KnowledgeGraph,
  type KnowledgeGraphLinkData,
  type KnowledgeGraphNodeData,
} from "@/components/graph/knowledge-graph";
import { classColor } from "@/lib/bookmark-color";

function themeScheme(): "dark" | "light" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export interface EntityGraphGroup {
  _id: string;
  name: string;
  color?: string | null;
  parentId?: string | null;
}

export interface EntityGraphEdge {
  from: string;
  to: string;
  strength: number;
}

interface Props<
  TItem extends { _id: string },
  TGroup extends EntityGraphGroup,
> {
  items: TItem[];
  groups: TGroup[];
  edges: EntityGraphEdge[];
  getItemLabel: (item: TItem) => string;
  getItemGroupIds: (item: TItem) => string[];
  getItemColor: (item: TItem, scheme: "dark" | "light") => string;
  itemValBase?: number;
  itemValPerConnection?: number;
  onSelectItem: (item: TItem) => void;
  onSelectGroup: (group: TGroup) => void;
}

export function EntityGraph<
  TItem extends { _id: string },
  TGroup extends EntityGraphGroup,
>({
  items,
  groups,
  edges,
  getItemLabel,
  getItemGroupIds,
  getItemColor,
  itemValBase = 0.75,
  itemValPerConnection = 0.28,
  onSelectItem,
  onSelectGroup,
}: Props<TItem, TGroup>) {
  const data = useMemo(() => {
    const scheme = themeScheme();
    const visibleItemIds = new Set(items.map((item) => item._id));
    const groupMemberCount = new Map<string, number>();

    for (const item of items) {
      for (const groupId of getItemGroupIds(item)) {
        groupMemberCount.set(groupId, (groupMemberCount.get(groupId) ?? 0) + 1);
      }
    }

    const edgeCount = new Map<string, number>();
    for (const edge of edges) {
      if (visibleItemIds.has(edge.from) && visibleItemIds.has(edge.to)) {
        edgeCount.set(edge.from, (edgeCount.get(edge.from) ?? 0) + 1);
        edgeCount.set(edge.to, (edgeCount.get(edge.to) ?? 0) + 1);
      }
    }

    const nodes: KnowledgeGraphNodeData<TItem, TGroup>[] = [
      ...items.map((item) => {
        const connections =
          (edgeCount.get(item._id) ?? 0) + getItemGroupIds(item).length;
        return {
          id: item._id,
          label: getItemLabel(item),
          type: "item" as const,
          val: itemValBase + connections * itemValPerConnection,
          color: getItemColor(item, scheme),
          item,
        };
      }),
      ...groups.map((group) => ({
        id: `group:${group._id}`,
        label: group.name,
        type: "group" as const,
        val: 4 + (groupMemberCount.get(group._id) ?? 0) * 1.2,
        color: group.color ?? classColor(group.name, scheme),
        group,
      })),
    ];

    const links: KnowledgeGraphLinkData[] = [];

    for (const item of items) {
      for (const groupId of getItemGroupIds(item)) {
        if (groups.some((group) => group._id === groupId)) {
          links.push({
            source: item._id,
            target: `group:${groupId}`,
            type: "membership",
            strength: 1,
          });
        }
      }
    }

    for (const group of groups) {
      if (
        group.parentId &&
        groups.some((parent) => parent._id === group.parentId)
      ) {
        links.push({
          source: `group:${group._id}`,
          target: `group:${group.parentId}`,
          type: "membership",
          strength: 1,
        });
      }
    }

    for (const edge of edges) {
      if (visibleItemIds.has(edge.from) && visibleItemIds.has(edge.to)) {
        links.push({
          source: edge.from,
          target: edge.to,
          type: "relation",
          strength: edge.strength,
        });
      }
    }

    return { nodes, links };
  }, [
    items,
    groups,
    edges,
    getItemLabel,
    getItemGroupIds,
    getItemColor,
    itemValBase,
    itemValPerConnection,
  ]);

  return (
    <KnowledgeGraph
      nodes={data.nodes}
      links={data.links}
      onSelectItem={onSelectItem}
      onSelectGroup={onSelectGroup}
      onRelationClick={(sourceId) => {
        const item = items.find((candidate) => candidate._id === sourceId);
        if (item) onSelectItem(item);
      }}
    />
  );
}
