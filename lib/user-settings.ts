import { z } from "zod";

const SETTINGS_FILE_PATH = "denizlg24.json";

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

async function getTauriFs() {
  const { exists, BaseDirectory, readTextFile, create, writeTextFile } =
    await import("@tauri-apps/plugin-fs");
  return { exists, BaseDirectory, readTextFile, create, writeTextFile };
}

export async function createSettingsFile(): Promise<UserSettings> {
  try {
    const { create, writeTextFile, BaseDirectory } = await getTauriFs();
    await create(SETTINGS_FILE_PATH, {
      baseDir: BaseDirectory.AppLocalData,
    });
    await writeTextFile(SETTINGS_FILE_PATH, JSON.stringify(defaultSettings), {
      baseDir: BaseDirectory.AppLocalData,
    });
    return defaultSettings;
  } catch (error) {
    console.error("Error creating settings file:", error);
    return defaultSettings;
  }
}

export async function loadSettings(): Promise<UserSettings> {
  if (typeof window === "undefined") {
    return defaultSettings;
  }
  try {
    const { exists, readTextFile, BaseDirectory } = await getTauriFs();
    const settingsExists = await exists(SETTINGS_FILE_PATH, {
      baseDir: BaseDirectory.AppLocalData,
    });
    if (!settingsExists) {
      return await createSettingsFile();
    }
    const settingsText = await readTextFile(SETTINGS_FILE_PATH, {
      baseDir: BaseDirectory.AppLocalData,
    });
    const parsedSettings = JSON.parse(settingsText);
    const validatedSettings = userSettingsSchema.parse(parsedSettings);
    return validatedSettings;
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
    const { writeTextFile, BaseDirectory } = await getTauriFs();
    const currentSettings = await loadSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    await writeTextFile(SETTINGS_FILE_PATH, JSON.stringify(updatedSettings), {
      baseDir: BaseDirectory.AppLocalData,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
  }
}
