"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Calendar,
  CalendarDays,
  ChevronRight,
  Clock,
  Folder,
  FolderGit2,
  HomeIcon,
  Inbox,
  Kanban,
  MessageCircle,
  NotebookPen,
  PenTool,
  Plus,
  UserSquare,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";

type NavChild = {
  label: string;
  href: string;
  icon: LucideIcon;
  kbd?: string[];
};

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  kbd?: string[];
  children?: NavChild[];
};

type NavGroup = {
  groupLabel: string;
  items: NavItem[];
};

const DASHBOARD_PREFIX = "/dashboard";

const GROUPS: NavGroup[] = [
  {
    groupLabel: "Portfolio",
    items: [
      {
        label: "Blog",
        href: "",
        icon: NotebookPen,
        children: [
          {
            label: "All Posts",
            href: "/blog",
            icon: HomeIcon,
            kbd: ["⌘", "B"],
          },
          {
            label: "New",
            href: "/blog/new",
            icon: Plus,
            kbd: ["⌘", "B", "N"],
          },
          {
            label: "Comments",
            href: "/blog/comments",
            icon: MessageCircle,
            kbd: ["⌘", "B", "C"],
          },
        ],
      },
      {
        label: "Projects",
        href: "",
        icon: FolderGit2,
        children: [
          {
            label: "All Projects",
            href: "/projects",
            icon: HomeIcon,
            kbd: ["⌘", "P"],
          },
          {
            label: "New",
            href: "/projects/new",
            icon: Plus,
            kbd: ["⌘", "P", "N"],
          },
        ],
      },
      {
        label: "Timeline",
        href: "/timeline",
        icon: Briefcase,
        kbd: ["⌘", "T"],
      },
      {
        label: "Now Page",
        href: "/now",
        icon: Clock,
        kbd: ["⌘", "N"],
      },
    ],
  },
  {
    groupLabel: "Contacts",
    items: [
      {
        label: "Contacts",
        href: "/contacts",
        icon: UserSquare,
        kbd: ["⌘", "M"],
      },
      {
        label: "Inbox",
        href: "/inbox",
        icon: Inbox,
        kbd: ["⌘", "I"],
      },
    ],
  },
  {
    groupLabel: "Schedule",
    items: [
      {
        label: "Calendar",
        href: "/calendar",
        icon: Calendar,
        kbd: ["⌘", "K"],
      },
      {
        label: "Timetable",
        href: "/timetable",
        icon: CalendarDays,
        kbd: ["⌘", "K", "T"],
      },
    ],
  },
  {
    groupLabel: "Personal",
    items: [
      {
        label: "Notes",
        href: "/notes",
        icon: Folder,
        kbd: ["⌘", "N"],
      },
      {
        label: "Whiteboard",
        href: "/whiteboard",
        icon: PenTool,
        kbd: ["⌘", "W"],
      },
      {
        label: "Kanban Board",
        href: "/kanban",
        icon: Kanban,
        kbd: ["⌘", "K"],
      }
    ],
  },
];

function buildShortcutMap(groups: NavGroup[]) {
  const map: { keys: string[]; href: string }[] = [];

  for (const group of groups) {
    for (const item of group.items) {
      if (item.kbd && item.href) {
        map.push({ keys: item.kbd, href: item.href });
      }
      if (item.children) {
        for (const child of item.children) {
          if (child.kbd && child.href) {
            map.push({ keys: child.kbd, href: child.href });
          }
        }
      }
    }
  }
  return map;
}

function KbdShortcut({ keys }: { keys: string[] }) {
  return (
    <KbdGroup>
      {keys.map((key, i) => (
        <Kbd key={`${key}-${i}`}>{key}</Kbd>
      ))}
    </KbdGroup>
  );
}

export function NavigationMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpen, open } = useSidebar();

  const sidebarRef = useRef({ setOpen, open });
  sidebarRef.current = { setOpen, open };

  useEffect(() => {
    const shortcuts = buildShortcutMap(GROUPS);

    let chordBuffer: string[] = [];
    let chordTimer: ReturnType<typeof setTimeout> | null = null;

    function resetChord() {
      chordBuffer = [];
      if (chordTimer) clearTimeout(chordTimer);
      chordTimer = null;
    }

    function handleKeyDown(e: KeyboardEvent) {
      const key = e.key.toUpperCase();

      if (chordBuffer.length > 0) {
        if (["CONTROL", "META", "SHIFT", "ALT"].includes(key)) return;

        chordBuffer.push(key);
      } else {
        if (!(e.metaKey || e.ctrlKey)) return;
        chordBuffer = ["⌘", key];
      }

      if (chordTimer) clearTimeout(chordTimer);

      const hasLongerMatch = shortcuts.some(
        (s) =>
          s.keys.length > chordBuffer.length &&
          chordBuffer.every((k, i) => k === s.keys[i]),
      );

      const exactMatch = shortcuts.find(
        (s) =>
          s.keys.length === chordBuffer.length &&
          s.keys.every((k, i) => k === chordBuffer[i]),
      );

      if (exactMatch && !hasLongerMatch) {
        e.preventDefault();
        e.stopPropagation();
        resetChord();
        router.push(DASHBOARD_PREFIX + exactMatch.href);
        return;
      }

      if (exactMatch && hasLongerMatch) {
        e.preventDefault();
        chordTimer = setTimeout(() => {
          const href = DASHBOARD_PREFIX + exactMatch.href;
          resetChord();
          router.push(href);
        }, 500);
        return;
      }

      if (hasLongerMatch) {
        e.preventDefault();
        e.stopPropagation();
        chordTimer = setTimeout(resetChord, 800);
        return;
      }

      resetChord();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      resetChord();
    };
  }, [router]);

  return (
    <Sidebar collapsible="icon" className="top-8 h-[calc(100vh-2rem)]!">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="Home">
              <Link href="/dashboard">
                <div className="size-8 aspect-square flex items-center justify-center">
                  <Image src="/favicon.ico" alt="Home" width={32} height={32} />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">denizlg24</span>
                  <span className="text-xs text-muted-foreground">Home</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {GROUPS.map((group) => (
          <SidebarGroup className="py-0!" key={group.groupLabel}>
            <SidebarGroupLabel>{group.groupLabel}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) =>
                  item.children ? (
                    <CollapsibleNavItem
                      key={item.label}
                      item={item}
                      pathname={pathname}
                    />
                  ) : (
                    <LeafNavItem
                      key={item.label}
                      item={item}
                      pathname={pathname}
                    />
                  ),
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}

function LeafNavItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href;
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
        <Link href={DASHBOARD_PREFIX + item.href}>
          <Icon />
          <span className="flex-1">{item.label}</span>
          {item.kbd && <KbdShortcut keys={item.kbd} />}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function CollapsibleNavItem({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const Icon = item.icon;
  const isChildActive = item.children?.some((c) => pathname === c.href);

  return (
    <Collapsible
      asChild
      defaultOpen={isChildActive}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.label} isActive={!!isChildActive}>
            <Icon />
            <span>{item.label}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children?.map((child) => {
              const isActive = pathname === child.href;
              const ChildIcon = child.icon;

              return (
                <SidebarMenuSubItem key={child.label}>
                  <SidebarMenuSubButton asChild isActive={isActive}>
                    <Link href={DASHBOARD_PREFIX + child.href}>
                      <ChildIcon />
                      <span className="flex-1">{child.label}</span>
                      {child.kbd && <KbdShortcut keys={child.kbd} />}
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
