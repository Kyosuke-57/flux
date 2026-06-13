import { Tabs } from "expo-router";
import { StyleSheet, Animated, View } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useRef } from "react";
import { theme } from "../../src/theme";
import { useSettings } from "../../src/contexts/SettingsContext";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function TabIcon({ icon, focused, c }: { icon: IoniconName; focused: boolean; c: ReturnType<typeof theme> }) {
  const scale = useRef(new Animated.Value(focused ? 1 : 0.85)).current;
  const translateY = useRef(new Animated.Value(focused ? -4 : 0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1 : 0.85,
      damping: 8,
      stiffness: 200,
      mass: 0.4,
      useNativeDriver: true,
    }).start();
    Animated.spring(translateY, {
      toValue: focused ? -4 : 0,
      damping: 10,
      stiffness: 220,
      mass: 0.5,
      useNativeDriver: true,
    }).start();
  }, [focused, scale, translateY]);

  return (
    <Animated.View
      style={[
        styles.tabIcon,
        focused && {
          backgroundColor: c.primaryBg,
          shadowColor: c.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
        },
        { transform: [{ scale }, { translateY }] },
      ]}
    >
      <Ionicons
        name={focused ? icon : (`${icon}-outline` as IoniconName)}
        size={22}
        color={focused ? c.primary : c.tabInactive}
      />
    </Animated.View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const c = theme(settings.isDarkMode);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.tabActive,
        tabBarInactiveTintColor: c.tabInactive,
        tabBarStyle: {
          backgroundColor: settings.isDarkMode ? "#1e293b" : "#fff",
          borderTopWidth: 0,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          height: 65 + insets.bottom,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={50}
            tint={settings.isDarkMode ? "dark" : "light"}
            style={{
              ...StyleSheet.absoluteFillObject,
              borderTopWidth: 1,
              borderTopColor: settings.isDarkMode
                ? "rgba(148, 163, 184, 0.12)"
                : "rgba(255, 255, 255, 0.6)",
            }}
          />
        ),
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "録音",
          tabBarIcon: ({ focused }) => <TabIcon icon="mic" focused={focused} c={c} />,
        }}
      />
      <Tabs.Screen
        name="minutes"
        options={{
          title: "議事録",
          tabBarIcon: ({ focused }) => <TabIcon icon="document-text" focused={focused} c={c} />,
        }}
      />
      <Tabs.Screen
        name="pipeline-manager"
        options={{
          title: "パイプライン",
          tabBarIcon: ({ focused }) => <TabIcon icon="git-network" focused={focused} c={c} />,
        }}
      />
      <Tabs.Screen
        name="auth"
        options={{
          title: "認証",
          tabBarIcon: ({ focused }) => <TabIcon icon="key" focused={focused} c={c} />,
        }}
      />
      <Tabs.Screen
        name="storage"
        options={{
          title: "ストレージ",
          tabBarIcon: ({ focused }) => <TabIcon icon="server" focused={focused} c={c} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "設定",
          tabBarIcon: ({ focused }) => <TabIcon icon="settings" focused={focused} c={c} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    width: 40,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
