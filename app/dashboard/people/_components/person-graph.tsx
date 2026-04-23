"use client";

import { useMemo } from "react";
import {
  KnowledgeGraph,
  type KnowledgeGraphLinkData,
  type KnowledgeGraphNodeData,
} from "@/components/graph/knowledge-graph";
import { classColor } from "@/lib/bookmark-color";
import type { IPerson, IPersonEdge, IPersonGroup } from "@/lib/data-types";

interface Props {
  people: IPerson[];
  groups: IPersonGroup[];
  edges: IPersonEdge[];
  onSelectPerson: (person: IPerson) => void;
  onSelectGroup: (group: IPersonGroup) => void;
}

function themeScheme() {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function PersonGraph({
  people,
  groups,
  edges,
  onSelectPerson,
  onSelectGroup,
}: Props) {
  const data = useMemo(() => {
    const scheme = themeScheme();
    const visiblePersonIds = new Set(people.map((person) => person._id));
    const groupMemberCount = new Map<string, number>();

    for (const person of people) {
      for (const groupId of person.groupIds) {
        groupMemberCount.set(groupId, (groupMemberCount.get(groupId) ?? 0) + 1);
      }
    }

    const edgeCount = new Map<string, number>();
    for (const edge of edges) {
      if (visiblePersonIds.has(edge.from) && visiblePersonIds.has(edge.to)) {
        edgeCount.set(edge.from, (edgeCount.get(edge.from) ?? 0) + 1);
        edgeCount.set(edge.to, (edgeCount.get(edge.to) ?? 0) + 1);
      }
    }

    const nodes: KnowledgeGraphNodeData<IPerson, IPersonGroup>[] = [
      ...people.map((person) => {
        const connections =
          (edgeCount.get(person._id) ?? 0) + person.groupIds.length;
        return {
          id: person._id,
          label: person.name,
          type: "item" as const,
          val: 0.9 + connections * 0.34,
          color: classColor(person.placeMet ?? person.name, scheme),
          item: person,
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
    for (const person of people) {
      for (const groupId of person.groupIds) {
        if (groups.some((group) => group._id === groupId)) {
          links.push({
            source: person._id,
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
      if (visiblePersonIds.has(edge.from) && visiblePersonIds.has(edge.to)) {
        links.push({
          source: edge.from,
          target: edge.to,
          type: "relation",
          strength: edge.strength,
        });
      }
    }

    return { nodes, links };
  }, [people, groups, edges]);

  return (
    <KnowledgeGraph
      nodes={data.nodes}
      links={data.links}
      onSelectItem={onSelectPerson}
      onSelectGroup={onSelectGroup}
      onRelationClick={(sourceId) => {
        const person = people.find((candidate) => candidate._id === sourceId);
        if (person) onSelectPerson(person);
      }}
    />
  );
}
