"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useUserSettings } from "@/context/user-context";
import { denizApi } from "@/lib/api-wrapper";
import { IWhiteboard } from "@/lib/data-types";
import { format } from "date-fns";
import { Edit3, PenTool, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function Page() {
  const { settings, loading: loadingSettings } = useUserSettings();

  const API = useMemo(() => {
    if (loadingSettings) return null;
    return new denizApi(settings.apiKey);
  }, [settings, loadingSettings]);

  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [whiteboards, setWhiteboards] = useState<IWhiteboard[]>([]);

  const [createOpen, setCreateOpen] = useState(false);

  const fetchWhiteboards = async () => {
    if (!API) return;
    setLoading(true);
    try {
      const result = await API.GET<{ whiteboards: IWhiteboard[] }>({
        endpoint: "whiteboard",
      });
      if ("code" in result) {
        console.error(result);
        setLoading(false);
        return;
      }
      setWhiteboards(result.whiteboards);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!API || !loading) return;
    fetchWhiteboards();
  }, [API, loading]);

  return (
    <div className="flex flex-col gap-2 pb-4">
      <div className="flex items-center gap-2 px-4 border-b h-12 shrink-0">
        <PenTool className="size-4 text-muted-foreground" />
        <span className="text-sm font-semibold flex-1">Whiteboards</span>
        <Button size={"sm"}>
          <Plus />
          Add Board
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-4">
        {loading && (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border bg-card overflow-hidden animate-pulse"
              >
                <div className="p-4 flex flex-col gap-2">
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-3 w-full bg-muted rounded" />
                  <div className="h-3 w-2/3 bg-muted rounded" />
                </div>
              </div>
            ))}
          </>
        )}
        {whiteboards.map((board) => (
          <div
            key={board._id}
            role="button"
            tabIndex={0}
            onClick={() =>
              router.push(`/dashboard/whiteboard/id?id=${board._id}`)
            }
            onKeyDown={(e) =>
              e.key === "Enter" &&
              router.push(`/dashboard/whiteboard/id?id=${board._id}`)
            }
            className="group rounded-2xl border bg-card overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="p-4 h-full w-full flex flex-col">
              <p className="text-sm font-semibold leading-snug line-clamp-1">
                {board.name}
              </p>
              {
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                  <span className="text-accent-strong font-semibold">
                    {board.elements?.length}
                  </span>{" "}
                  element{board.elements?.length !== 1 ? "s" : ""}{" "}
                </p>
              }
              <Separator className="mt-auto" />
              <div className="flex flex-row items-baseline justify-between">
                <span className="text-xs text-muted-foreground mt-2">
                  Updated: {format(new Date(board.updatedAt), "P p")}
                </span>
                <div className="flex items-center gap-2 mt-2">
                  <Button variant={"outline"} size={"icon-xs"}>
                    <Edit3 />
                  </Button>
                  <Button variant={"destructive"} size={"icon-xs"}>
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {!loading && (
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-2xl border-2 border-dashed bg-transparent hover:bg-muted/50 transition-colors h-full min-h-[116px] flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <div className="size-8 rounded-full border-2 border-dashed flex items-center justify-center">
              <Plus className="size-4" />
            </div>
            <span className="text-xs font-medium">New Board</span>
          </button>
        )}
      </div>
    </div>
  );
}
