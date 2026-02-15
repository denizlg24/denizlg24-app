"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { fetchLatestRelease, isNewerVersion } from "@/lib/update-checker";

export function UpdateNotifier() {
  useEffect(() => {
    (async () => {
      try {
        const { getVersion } = await import("@tauri-apps/api/app");
        const currentVersion = await getVersion();

        const release = await fetchLatestRelease();
        if (!release) return;

        if (isNewerVersion(currentVersion, release.tag_name)) {
          const { open } = await import("@tauri-apps/plugin-shell");

          toast.info(release.name || `Update ${release.tag_name} available`, {
            description: "A new version is available.",
            action: {
              label: "Download",
              onClick: () => {
                open(release.html_url);
              },
            },
            duration: 10000,
          });
        }
      } catch {
        // Silently fail outside Tauri context
      }
    })();
  }, []);

  return null;
}
