import { View, Text, StyleSheet } from "react-native";
import { useThemeColors } from "../src/hooks/useThemeColors";

export default function TestScreen() {
  const c = useThemeColors();
  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <Text style={[styles.text, { color: c.primary }]}>✅ Hermes Agent Test</Text>
      <Text style={[styles.sub, { color: c.textSecondary }]}>If you see this, Metro + Expo Go works!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 24, fontWeight: "700" },
  sub: { fontSize: 14, marginTop: 8 },
});
