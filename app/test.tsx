import { View, Text, StyleSheet } from "react-native";

export default function TestScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>✅ Hermes Agent Test</Text>
      <Text style={styles.sub}>If you see this, Metro + Expo Go works!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  text: { fontSize: 24, fontWeight: "700", color: "#6366f1" },
  sub: { fontSize: 14, color: "#64748b", marginTop: 8 },
});
