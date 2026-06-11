import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Typography } from "../../src/theme";

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <View
      style={[
        styles.tabIcon,
        focused && styles.tabIconActive,
      ]}
    >
      <Text style={[styles.tabIconText, focused && styles.tabIconTextActive]}>
        {icon}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: {
          backgroundColor: Colors.tabBarBg,
          borderTopColor: Colors.tabBarBorder,
          borderTopWidth: 1,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
          height: 65 + insets.bottom,
        },
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
          tabBarIcon: ({ focused }) => <TabIcon icon="🎙️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="minutes"
        options={{
          title: "議事録",
          tabBarIcon: ({ focused }) => <TabIcon icon="📄" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "設定",
          tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconActive: {
    backgroundColor: Colors.primaryBg,
  },
  tabIconText: {
    fontSize: 18,
  },
  tabIconTextActive: {
    fontSize: 20,
  },
});
