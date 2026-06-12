import React, { createContext, useContext, useState, useCallback } from "react";

export type RecordingEffect = "ripple" | "waveform" | "pulse";
export type MinutesGenerationMode = "auto" | "manual";

export interface Settings {
  isDarkMode: boolean;
  recordingEffect: RecordingEffect;
  hapticsEnabled: boolean;
  minutesGenerationMode: MinutesGenerationMode;
}

interface SettingsContextType {
  settings: Settings;
  updateSetting: (key: string, value: any) => void;
}

const DEFAULT_SETTINGS: Settings = {
  isDarkMode: false,
  recordingEffect: "ripple",
  hapticsEnabled: true,
  minutesGenerationMode: "manual",
};

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  updateSetting: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  const updateSetting = useCallback((key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  return useContext(SettingsContext);
}
