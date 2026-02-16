"use client";

import { useEffect, useState } from "react";
import { Minus, Square, Copy, X, Maximize2, Minimize2 } from "lucide-react";
import { usePathname } from "next/navigation";

const PATHNAME_TITLE_MAP = {
  "/": "home",
  "/dashboard/notes": "notes",
};

type AppWindow = {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  isFullscreen: () => Promise<boolean>;
  setFullscreen: (fullscreen: boolean) => Promise<void>;
  onResized: (handler: () => void) => Promise<() => void>;
};

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [osPlatform, setOsPlatform] = useState<string>("windows");
  const [appWindow, setAppWindow] = useState<AppWindow | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    (async () => {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const { platform } = await import("@tauri-apps/plugin-os");

      const win = WebviewWindow.getCurrent();
      const os = platform();
      setAppWindow(win);
      setOsPlatform(os);

      if (os === "macos") {
        setIsFullscreen(await win.isFullscreen());
      } else {
        setIsMaximized(await win.isMaximized());
      }

      unlisten = await win.onResized(async () => {
        if (os === "macos") {
          setIsFullscreen(await win.isFullscreen());
        } else {
          setIsMaximized(await win.isMaximized());
        }
      });
    })();

    return () => {
      unlisten?.();
    };
  }, []);

  const pathname = usePathname();
  const title =
    PATHNAME_TITLE_MAP[pathname as keyof typeof PATHNAME_TITLE_MAP] ||
    "denizlg24";
  const isMac = osPlatform === "macos";

  if (isMac) {
    return (
      <header
        data-tauri-drag-region
        className="fixed top-0 left-0 right-0 z-50 flex h-8 select-none items-center bg-background"
      >
        <div className="flex items-center gap-2 pl-3 group/traffic">
          <button
            type="button"
            onClick={() => appWindow?.close()}
            className="size-3 rounded-full bg-[#ff5f57] flex items-center justify-center transition-[filter] hover:brightness-90 active:brightness-75"
            aria-label="Close"
          >
            <X
              className="size-1.5 opacity-0 group-hover/traffic:opacity-100 transition-opacity text-[#4d0000]"
              strokeWidth={4}
            />
          </button>
          <button
            type="button"
            onClick={() => appWindow?.minimize()}
            className="size-3 rounded-full bg-[#febc2e] flex items-center justify-center transition-[filter] hover:brightness-90 active:brightness-75"
            aria-label="Minimize"
          >
            <Minus
              className="size-1.5 opacity-0 group-hover/traffic:opacity-100 transition-opacity text-[#995700]"
              strokeWidth={4}
            />
          </button>
          <button
            type="button"
            onClick={() => appWindow?.setFullscreen(!isFullscreen)}
            className="size-3 rounded-full bg-[#28c840] flex items-center justify-center transition-[filter] hover:brightness-90 active:brightness-75"
            aria-label={isFullscreen ? "Exit Full Screen" : "Full Screen"}
          >
            {isFullscreen ? (
              <Minimize2
                className="size-1.5 opacity-0 group-hover/traffic:opacity-100 transition-opacity text-[#006500]"
                strokeWidth={4}
              />
            ) : (
              <Maximize2
                className="size-1.5 opacity-0 group-hover/traffic:opacity-100 transition-opacity text-[#006500]"
                strokeWidth={4}
              />
            )}
          </button>
        </div>

        <span
          data-tauri-drag-region
          className="absolute left-1/2 -translate-x-1/2 text-xs text-foreground font-semibold"
        >
          {title}
        </span>
      </header>
    );
  }

  return (
    <header
      data-tauri-drag-region
      className="fixed top-0 left-0 right-0 z-50 flex h-8 select-none items-center justify-between bg-background"
    >
      <span
        data-tauri-drag-region
        className="pl-3 text-xs text-foreground font-semibold"
      >
        {title}
      </span>

      <div className="flex h-full flex-row items-center">
        <button
          type="button"
          onClick={() => appWindow?.minimize()}
          className="inline-flex h-8 w-10 items-center justify-center text-foreground hover:bg-accent/50"
          aria-label="Minimize"
        >
          <Minus className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => appWindow?.toggleMaximize()}
          className="inline-flex h-8 w-10 items-center justify-center text-foreground hover:bg-accent/50"
          aria-label={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <Copy className="size-3.5" />
          ) : (
            <Square className="size-3.5" />
          )}
        </button>

        <button
          type="button"
          onClick={() => appWindow?.close()}
          className="inline-flex h-8 w-10 items-center justify-center text-foreground hover:bg-[#c42b1c] hover:text-white"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>
    </header>
  );
}
