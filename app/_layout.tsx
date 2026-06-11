import { Stack } from "expo-router";
import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../src/contexts/AuthContext";
import { SettingsProvider, useSettings } from "../src/contexts/SettingsContext";
import { ToastProvider } from "../src/contexts/ToastContext";
import { setHapticsEnabled } from "../src/animations/haptics";

/** Syncs settings to global module state (haptics flag, etc.) */
function SettingsSync() {
  const { settings } = useSettings();

  useEffect(() => {
    setHapticsEnabled(settings.hapticsEnabled);
  }, [settings.hapticsEnabled]);

  return null;
}

function StatusBarManager() {
  const { settings } = useSettings();
  return <StatusBar style={settings.isDarkMode ? "light" : "dark"} />;
}

function NavigationBackground() {
  const { settings } = useSettings();
  const c = settings.isDarkMode ? "#0F172A" : "#FAFAFA";
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={{ flex: 1, backgroundColor: c }} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <SettingsSync />
        <AuthProvider>
          <StatusBarManager />
          <ToastProvider>
            <View style={{ flex: 1 }}>
              <NavigationBackground />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }} />
            </View>
          </ToastProvider>
        </AuthProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
