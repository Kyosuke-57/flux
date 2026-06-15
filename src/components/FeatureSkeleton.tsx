import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Skeleton } from "./Skeleton";
import type { ColorsLight } from "../theme";

type Props = {
  title: string;
  color: typeof ColorsLight;
  variant?: "search" | "list" | "cards";
};

/**
 * 共通 LoadingSkeleton コンポーネント
 * SafeAreaView + title + バリアントに応じた skeleton レイアウト
 */
export function LoadingSkeleton({ title, color, variant = "search" }: Props) {
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: color.background }]}
      edges={["top", "left", "right"]}
    >
      <Text style={[styles.title, { color: color.textPrimary }]}>{title}</Text>
      {variant === "search" && <SearchSkeleton color={color} />}
      {variant === "list" && <ListSkeleton color={color} />}
      {variant === "cards" && <CardsSkeleton color={color} />}
    </SafeAreaView>
  );
}

/** Search variant: search placeholder + 5 list rows */
function SearchSkeleton({ color }: { color: typeof ColorsLight }) {
  return (
    <>
      <View
        style={[
          styles.searchPlaceholder,
          {
            backgroundColor: color.surface,
            borderColor: color.border,
            marginTop: 12,
            marginHorizontal: 24,
          },
        ]}
      >
        <Skeleton width={18} height={18} borderRadius={9} />
        <Skeleton width="100%" height={18} borderRadius={6} style={{ flex: 1 }} />
      </View>
      {Array.from({ length: 5 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.rowSkeleton,
            { backgroundColor: color.surface, marginHorizontal: 24, marginTop: 8 },
          ]}
        >
          <Skeleton width="65%" height={14} borderRadius={6} />
          <Skeleton width={50} height={12} borderRadius={4} />
        </View>
      ))}
    </>
  );
}

/** List variant: search placeholder + 6 icon+text rows */
function ListSkeleton({ color }: { color: typeof ColorsLight }) {
  return (
    <>
      <View
        style={[
          styles.searchPlaceholder,
          {
            backgroundColor: color.surface,
            borderColor: color.border,
            marginTop: 12,
            marginHorizontal: 24,
          },
        ]}
      >
        <Skeleton width={18} height={18} borderRadius={9} />
        <Skeleton width="100%" height={18} borderRadius={6} style={{ flex: 1 }} />
      </View>
      {Array.from({ length: 6 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.rowSkeleton,
            { backgroundColor: color.surface, marginHorizontal: 24, marginTop: 8 },
          ]}
        >
          <Skeleton width={16} height={16} borderRadius={8} />
          <Skeleton width="60%" height={14} borderRadius={6} />
        </View>
      ))}
    </>
  );
}

/** Cards variant: title + 3 card skeletons */
function CardsSkeleton({ color }: { color: typeof ColorsLight }) {
  return (
    <View style={styles.cardsContainer}>
      {Array.from({ length: 3 }).map((_, i) => (
        <View
          key={i}
          style={[styles.cardSkeleton, { backgroundColor: color.surface }]}
        >
          <Skeleton width="60%" height={18} borderRadius={6} />
          <Skeleton width="40%" height={14} borderRadius={6} style={{ marginTop: 8 }} />
          <Skeleton width="30%" height={12} borderRadius={6} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}

/** 未認証時の共通表示 */
type UnauthenticatedViewProps = {
  color: typeof ColorsLight;
  message: string;
};

export function UnauthenticatedView({ color, message }: UnauthenticatedViewProps) {
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: color.background }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.centered}>
        <Text style={[styles.emptyTitle, { color: color.textPrimary }]}>
          サインインしてください
        </Text>
        <Text style={[styles.emptySubtext, { color: color.textSecondary }]}>
          {message}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  searchPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  rowSkeleton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  cardsContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 8,
  },
  cardSkeleton: {
    padding: 16,
    borderRadius: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", textAlign: "center" },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
