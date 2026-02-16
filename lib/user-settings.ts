import { z } from "zod";

const STORE_FILENAME = "settings.json";

const userSettingsSchema = z.object({
  apiKey: z.string(),
  sidebarOpen: z.boolean(),
  defaultNoteDownloadPath: z.string(),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;

const defaultSettings: UserSettings = {
  apiKey: "",
  sidebarOpen: true,
  defaultNoteDownloadPath: "",
};

async function getStore() {
  const { load } = await import("@tauri-apps/plugin-store");
  return load(STORE_FILENAME, { defaults: defaultSettings, autoSave: true });
}

export async function loadSettings(): Promise<UserSettings> {
  if (typeof window === "undefined") {
    return defaultSettings;
  }
  try {
    const store = await getStore();
    const apiKey = ((await store.get<string>("apiKey"))) ?? defaultSettings.apiKey;
    const sidebarOpen = ((await store.get<boolean>("sidebarOpen"))) ?? defaultSettings.sidebarOpen;
    const defaultNoteDownloadPath =
      ((await store.get<string>("defaultNoteDownloadPath"))) ?? defaultSettings.defaultNoteDownloadPath;

    const result = userSettingsSchema.safeParse({
      apiKey,
      sidebarOpen,
      defaultNoteDownloadPath,
    });

    if (!result.success) {
      return defaultSettings;
    }
    return result.data;
  } catch (error) {
    console.error("Error loading settings:", error);
    return defaultSettings;
  }
}

export async function updateSettings(
  newSettings: Partial<UserSettings>,
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const store = await getStore();
    for (const [key, value] of Object.entries(newSettings)) {
      await store.set(key, value);
    }
  } catch (error) {
    console.error("Error updating settings:", error);
  }
}
