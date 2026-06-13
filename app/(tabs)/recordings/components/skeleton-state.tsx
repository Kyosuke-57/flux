import React from "react";
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Skeleton } from "../../../../src/components/Skeleton";
import type { ColorsLight } from "../../../../src/theme";

export function LoadingSkeleton({ color }: { color: typeof ColorsLight }) {
  return (
    <View style={[styles.container, { backgroundColor: color.background }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Skeleton width="60%" height={24} borderRadius={8} />
        </View>
      </View>
      <View style={styles.list}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.skeletonCard}>
            <Skeleton width="100%" height={48} borderRadius={12} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function UnauthenticatedView({ color }: { color: typeof ColorsLight }) {
  return (
    <View style={[styles.container, styles.center]}>
      <Ionicons name="lock-closed-outline" size={64} color={color.textMuted} />
      <Text style={[styles.emptyTitle, { color: color.textPrimary }]}>
        サインインが必要です
      </Text>
      <Text style={[styles.emptySubtext, { color: color.textSecondary }]}>
        録音データを表示するには、サインインしてください。
      </Text>
      <TouchableOpacity
        style={[styles.signInButton, { backgroundColor: color.primary }]}
        onPress={() => router.push("/(auth)/login")}
        activeOpacity={0.8}
      >
        <Text style={[styles.signInText, { color: color.textInverse }]}>サインイン</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  list: {
    paddingHorizontal: 24,
    gap: 10,
    marginTop: 16,
  },
  skeletonCard: {
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 32,
  },
  signInButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  signInText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
