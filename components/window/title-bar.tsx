"use client";

import { useEffect, useState } from "react";
import { Minus, Square, Copy, X } from "lucide-react";
import { usePathname } from "next/navigation";

const PATHNAME_TITLE_MAP = {
  "/": "home",
}


export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [appWindow, setAppWindow] = useState<{
    minimize: () => Promise<void>;
    toggleMaximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
    onResized: (
      handler: () => void,
    ) => Promise<() => void>;
  } | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    (async () => {
      const {WebviewWindow} = await import("@tauri-apps/api/webviewWindow");
      const appWindow = WebviewWindow.getCurrent();
      setAppWindow(appWindow);
      setIsMaximized(await appWindow.isMaximized());

      unlisten = await appWindow.onResized(async () => {
        setIsMaximized(await appWindow.isMaximized());
      });
    })();

    return () => {
      unlisten?.();
    };
  }, []);
  
  const pathname = usePathname();
  const title = PATHNAME_TITLE_MAP[pathname as keyof typeof PATHNAME_TITLE_MAP] || "denizlg24";

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

      <div className="flex h-full flex-row items-center gap-2">
        <button
          type="button"
          onClick={() => appWindow?.minimize()}
          className="inline-flex h-8 w-8 items-center justify-center text-foreground hover:bg-accent/50"
          aria-label="Minimize"
        >
          <Minus className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => appWindow?.toggleMaximize()}
          className="inline-flex h-8 w-8 items-center justify-center text-foreground hover:bg-accent/50"
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
          className="inline-flex h-8 w-8 items-center justify-center text-foreground hover:bg-[#c42b1c] hover:text-white"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>
    </header>
  );
}
