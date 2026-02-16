"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  loadSettings,
  updateSettings,
  type UserSettings,
} from "@/lib/user-settings";

type UserSettingsContextType = {
  settings: UserSettings;
  setSettings: (newSettings: Partial<UserSettings>) => void;
  loading: boolean;
};

const UserSettingsContext = createContext<UserSettingsContextType | null>(null);

export function UserSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettingsState] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    loadSettings().then((loaded) => {
      setSettingsState(loaded);
      setLoading(false);
      if (loaded.apiKey && pathname === "/") {
        router.replace("/dashboard");
      } else if (!loaded.apiKey && pathname.startsWith("/dashboard")) {
        router.replace("/");
      }
    });
  }, [router]);

  const setSettings = useCallback(
    (newSettings: Partial<UserSettings>) => {
      setSettingsState((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, ...newSettings };
        updateSettings(newSettings);
        return updated;
      });
    },
    []
  );

  if (!settings) {
    return null;
  }

  return (
    <UserSettingsContext value={{ settings, setSettings, loading }}>
      {children}
    </UserSettingsContext>
  );
}

export function useUserSettings() {
  const context = useContext(UserSettingsContext);
  if (!context) {
    throw new Error(
      "useUserSettings must be used within a UserSettingsProvider"
    );
  }
  return context;
}
