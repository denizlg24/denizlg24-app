"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { useUserSettings } from "@/context/user-context";
import { denizApi } from "@/lib/api-wrapper";
import { IWhiteboard } from "@/lib/data-types";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  BoxSelectIcon,
  Circle,
  Eraser,
  Hand,
  LineSquiggle,
  MousePointer,
  Plus,
  RectangleHorizontal,
  Redo,
  Shapes,
  Square,
  TextCursorIcon,
  Undo,
} from "lucide-react";
import { use, useEffect, useMemo, useState } from "react";

export default function WhiteboardPage({
  searchParams,
}: {
  searchParams: Promise<{ id: string }>;
}) {
  const { id } = use(searchParams);

  const { settings, loading: loadingSettings } = useUserSettings();

  const API = useMemo(() => {
    if (loadingSettings) return null;
    return new denizApi(settings.apiKey);
  }, [settings, loadingSettings]);

  const [loading, setLoading] = useState(true);

  const [whiteboard, setWhiteboard] = useState<IWhiteboard | null>(null);

  const [selectedCursor, setSelectedCursor] = useState<
    | "cursor-[url(/assets/drawing-cursor.png),_pointer]"
    | "cursor-[url(/assets/shape-cursor.png),_pointer]"
    | "cursor-[url(/assets/text-cursor.png),_pointer]"
    | "cursor-[url(/assets/eraser-cursor.png),_pointer]"
    | "cursor-auto"
    | "cursor-grab"
  >("cursor-[url(/assets/drawing-cursor.png),_pointer]");

  //TOOLBAR
  const [selectedTool, setSelectedTool] = useState<
    | "pen"
    | "square"
    | "rectangle"
    | "circle"
    | "arrow"
    | "text"
    | "eraser"
    | "hand"
    | "pointer"
    | "select"
  >("pen");
  const [selectedThickness, setSelectedThickness] = useState(0);
  const [selectedColor, setSelectedColor] = useState("#000000");

  useEffect(() => {
    switch (selectedTool) {
      case "pen":
        setSelectedCursor("cursor-[url(/assets/drawing-cursor.png),_pointer]");
        break;
      case "square":
      case "rectangle":
      case "circle":
      case "arrow":
      case "select":
        setSelectedCursor("cursor-[url(/assets/shape-cursor.png),_pointer]");
        break;
      case "text":
        setSelectedCursor("cursor-[url(/assets/text-cursor.png),_pointer]");
        break;
      case "eraser":
        setSelectedCursor("cursor-[url(/assets/eraser-cursor.png),_pointer]");
        break;
      case "hand":
        setSelectedCursor("cursor-grab");
        break;
      default:
        setSelectedCursor("cursor-auto");
        break;
    }
  }, [selectedTool]);

  const fetchWhiteboard = async () => {
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
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!API || !id || !loading) return;
    fetchWhiteboard();
  }, [API, id, loading]);

  if (loading || !whiteboard)
    return (
      <div className="w-dvw h-[calc(100vh-2rem)] overflow-clip relative">
        <div className="mx-auto my-auto flex items-center justify-center">
          <Spinner />
        </div>
      </div>
    );

  return (
    <div
      className={cn(
        "w-dvw h-[calc(100vh-2rem)] overflow-clip relative ",
        selectedCursor,
      )}
    >
      <div className="absolute cursor-auto z-50 border bg-surface shadow-xs bottom-2 left-1/2 -translate-x-1/2 w-fit rounded-full py-2 px-3 flex flex-row items-center gap-2">
        <Popover>
          <PopoverTrigger
            onClick={() => {
              setSelectedTool("pen");
            }}
            asChild
          >
            <Button className={cn(selectedTool === "pen" && "border-2 border-primary")} size="icon-sm" variant={"outline"}>
              <LineSquiggle />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="center"
            className="border rounded-full w-fit! px-1 py-1.5 bg-muted flex flex-col gap-1 items-center z-99!"
          >
            <div className="w-3.5 h-3.5 bg-primary rounded-full"></div>

            <Slider
              orientation="vertical"
              min={2}
              max={24}
              value={[selectedThickness]}
              onValueChange={(e) => {
                setSelectedThickness(e[0]);
              }}
              thumbClassName="bg-primary"
              thumbSize={
                selectedThickness > 16
                  ? 16
                  : selectedThickness > 8
                    ? selectedThickness
                    : 8
              }
            />
            <div className="w-1 h-1 bg-primary rounded-full"></div>
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button className={cn((selectedTool === "square" || selectedTool === "rectangle" || selectedTool === "circle" || selectedTool === "arrow") && "border-2 border-primary")} size="icon-sm" variant={"outline"}>
              <Shapes />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="center"
            className="border rounded-full w-fit! px-1 py-1.5 bg-muted flex flex-col gap-2 items-center z-99!"
          >
            <Button
            className={cn(selectedTool === "square" && "border border-primary")}
              onClick={() => {
                setSelectedTool("square");
              }}
              variant={"outline"}
              size={"icon-xs"}
            >
              <Square />
            </Button>
            <Button
            className={cn(selectedTool === "rectangle" && "border border-primary")}
              onClick={() => {
                setSelectedTool("rectangle");
              }}
              variant={"outline"}
              size={"icon-xs"}
            >
              <RectangleHorizontal />
            </Button>
            <Button
            className={cn(selectedTool === "circle" && "border border-primary")}
              onClick={() => {
                setSelectedTool("circle");
              }}
              variant={"outline"}
              size={"icon-xs"}
            >
              <Circle />
            </Button>
            <Button
            className={cn(selectedTool === "arrow" && "border border-primary")}
              onClick={() => {
                setSelectedTool("arrow");
              }}
              variant={"outline"}
              size={"icon-xs"}
            >
              <ArrowUpRight />
            </Button>
          </PopoverContent>
        </Popover>
        <Button
        className={cn(selectedTool === "text" && "border-2 border-primary")}
          onClick={() => {
            setSelectedTool("text");
          }}
          size="icon-sm"
          variant={"outline"}
        >
          <TextCursorIcon />
        </Button>

        <Button
        className={cn(selectedTool === "eraser" && "border-2 border-primary")}
          onClick={() => {
            setSelectedTool("eraser");
          }}
          size="icon-sm"
          variant={"outline"}
        >
          <Eraser />
        </Button>
        <div className="w-px h-5 bg-primary"></div>
        <Button
        className={cn(selectedTool === "hand" && "border-2 border-primary")}
          onClick={() => {
            setSelectedTool("hand");
          }}
          size="icon-sm"
          variant={"outline"}
        >
          <Hand />
        </Button>
        <Button
        className={cn(selectedTool === "pointer" && "border-2 border-primary")}
          onClick={() => {
            setSelectedTool("pointer");
          }}
          size="icon-sm"
          variant={"outline"}
        >
          <MousePointer />
        </Button>
        <Button
        className={cn(selectedTool === "select" && "border-2 border-primary")}
          onClick={() => {
            setSelectedTool("select");
          }}
          size="icon-sm"
          variant={"outline"}
        >
          <BoxSelectIcon />
        </Button>
        <div className="w-px h-5 bg-primary"></div>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="icon-sm" variant={"outline"}>
              <svg
                style={{ backgroundColor: selectedColor }}
                className="w-full h-full rounded-full"
              ></svg>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="center"
            className="border rounded-full w-fit! px-1 py-1.5 bg-muted flex flex-col gap-2 items-center z-99!"
          >
            <button
              onClick={() => {
                setSelectedColor("#000000");
              }}
              className={cn(
                selectedColor == "#000000" && "border-primary!",
                "w-4 h-4 rounded-full bg-black hover:shadow-xs border border-transparent hover:border-primary transition-all",
              )}
            ></button>
            <button
              onClick={() => {
                setSelectedColor("#6366f1");
              }}
              className={cn(
                selectedColor == "#6366f1" && "border-primary!",
                "w-4 h-4 rounded-full bg-[#6366f1] hover:shadow-xs border border-transparent hover:border-primary transition-all",
              )}
            ></button>
            <button
              onClick={() => {
                setSelectedColor("#ec4899");
              }}
              className={cn(
                selectedColor == "#ec4899" && "border-primary!",
                "w-4 h-4 rounded-full bg-[#ec4899] hover:shadow-xs border border-transparent hover:border-primary transition-all",
              )}
            ></button>
            <button
              onClick={() => {
                setSelectedColor("#ef4444");
              }}
              className={cn(
                selectedColor == "#ef4444" && "border-primary!",
                "w-4 h-4 rounded-full bg-[#ef4444] hover:shadow-xs border border-transparent hover:border-primary transition-all",
              )}
            ></button>
            <button
              onClick={() => {
                setSelectedColor("#f97316");
              }}
              className={cn(
                selectedColor == "#f97316" && "border-primary!",
                "w-4 h-4 rounded-full bg-[#f97316] hover:shadow-xs border border-transparent hover:border-primary transition-all",
              )}
            ></button>
            <button
              onClick={() => {
                setSelectedColor("#eab308");
              }}
              className={cn(
                selectedColor == "#eab308" && "border-primary!",
                "w-4 h-4 rounded-full bg-[#eab308] hover:shadow-xs border border-transparent hover:border-primary transition-all",
              )}
            ></button>
            <button
              onClick={() => {
                setSelectedColor("#a1bc98");
              }}
              className={cn(
                selectedColor == "#a1bc98" && "border-primary!",
                "w-4 h-4 rounded-full bg-[#a1bc98] hover:shadow-xs border border-transparent hover:border-primary transition-all",
              )}
            ></button>
            <button
              onClick={() => {
                setSelectedColor("#14b8a6");
              }}
              className={cn(
                selectedColor == "#14b8a6" && "border-primary!",
                "w-4 h-4 rounded-full bg-[#14b8a6] hover:shadow-xs border border-transparent hover:border-primary transition-all",
              )}
            ></button>
            <button
              onClick={() => {
                setSelectedColor("#3b82f6");
              }}
              className={cn(
                selectedColor == "#3b82f6" && "border-primary!",
                "w-4 h-4 rounded-full bg-[#3b82f6] hover:shadow-xs border border-transparent hover:border-primary transition-all",
              )}
            ></button>
            <button
              onClick={() => {
                setSelectedColor("#64748b");
              }}
              className={cn(
                selectedColor == "#64748b" && "border-primary!",
                "w-4 h-4 rounded-full bg-[#64748b] hover:shadow-xs border border-transparent hover:border-primary transition-all",
              )}
            ></button>
          </PopoverContent>
        </Popover>
        <Button size="icon-sm" variant={"outline"}>
          <Undo />
        </Button>
        <Button size="icon-sm" variant={"outline"}>
          <Redo />
        </Button>
        <Button size="icon-sm" variant={"outline"}>
          <Plus />
        </Button>
      </div>
    </div>
  );
}
