"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ArrowDownToLine, X } from "lucide-react";
import type { Update } from "@tauri-apps/plugin-updater";

function UpdateToastContent({
  update,
  toastId,
}: { update: Update; toastId: string | number }) {
  const [installing, setInstalling] = useState(false);

  const handleUpdate = async () => {
    setInstalling(true);
    try {
      await update.downloadAndInstall();
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch {
      setInstalling(false);
    }
  };

  return (
    <Card className="w-full py-0 shadow-md">
      <CardContent className="flex items-start gap-3 p-4">
        {installing ? (
          <div className="flex items-center gap-3">
            <Spinner className="size-5 text-accent-strong" />
            <span className="text-sm text-muted-foreground">
              Installing update...
            </span>
          </div>
        ) : (
          <>
            <ArrowDownToLine className="size-5 text-accent-strong mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-accent-strong font-semibold">
                Update {update.version} available
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                A new version is ready to install.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Button size="sm" onClick={handleUpdate}>
                  Update now
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toast.dismiss(toastId)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              onClick={() => toast.dismiss(toastId)}
            >
              <X className="size-4" />
            </button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function UpdateNotifier() {
  useEffect(() => {
    (async () => {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (!update) return;

        toast.custom(
          (id) => <UpdateToastContent update={update} toastId={id} />,
          { duration: Number.POSITIVE_INFINITY },
        );
      } catch {
        // Silently fail outside Tauri context
      }
    })();
  }, []);

  return null;
}
