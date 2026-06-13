import React, { useCallback } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useSettings } from "../../../src/contexts/SettingsContext";
import { useFavorites } from "../../../src/contexts/FavoritesContext";
import { theme, Spacing, BorderRadius } from "../../../src/theme";
import { GlassCard } from "../../../src/components/Glass";
import { useFavoritesData } from "./hooks/use-favorites-data";
import { EmptyState } from "./components/empty-state";
import { LoadingSkeleton, UnauthenticatedView } from "./components/skeleton-state";

export default function FavoritesScreen() {
  const { settings } = useSettings();
  const c = theme(settings.isDarkMode);
  const { user } = useAuth();

  const {
    favorites,
    loading,
    refreshing,
    onRefresh,
    tags,
    getPreview,
    formatDate,
    getTagName,
  } = useFavoritesData();

  // ── Loading ──
  if (loading) {
    return <LoadingSkeleton color={c} />;
  }

  // ── Not signed in ──
  if (!user) {
    return <UnauthenticatedView color={c} />;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.background }]}
      edges={["top", "left", "right"]}
    >
      {/* ヘッダー */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: c.textPrimary }]}>お気に入り</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            {favorites.length > 0
              ? `${favorites.length} 件の保存済み議事録`
              : "お気に入りの議事録がここに表示されます"}
          </Text>
        </View>
        <Ionicons name="heart" size={28} color={c.primary} />
      </View>

      {/* 一覧 / 空状態 */}
      {favorites.length === 0 ? (
        <EmptyState color={c} />
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.primary}
              colors={[c.primary]}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push(`/minute/${item.id}`)}
            >
              <GlassCard intensity={25} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text
                    style={[styles.cardTitle, { color: c.textPrimary }]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  <Text style={[styles.cardDate, { color: c.textMuted }]}>
                    {formatDate(item.created_at)}
                  </Text>
                </View>
                <Text
                  style={[styles.cardPreview, { color: c.textSecondary }]}
                  numberOfLines={3}
                >
                  {getPreview(item.content)}
                </Text>
                {item.tags && item.tags.length > 0 && (
                  <View style={styles.tagsRow}>
                    {item.tags.map((tagId) => (
                      <View
                        key={tagId}
                        style={[
                          styles.tag,
                          { backgroundColor: c.primaryBg },
                        ]}
                      >
                        <Text style={[styles.tagText, { color: c.primary }]}>
                          {getTagName(tagId)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </GlassCard>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 4 },
  list: { paddingBottom: 24, paddingHorizontal: Spacing.xxl },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: { fontSize: 15, fontWeight: "600", flexShrink: 1 },
  cardDate: { fontSize: 12 },
  cardPreview: { fontSize: 13, lineHeight: 19 },
  tagsRow: { flexDirection: "row", marginTop: 8, gap: 5 },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  tagText: { fontSize: 10, fontWeight: "500" },

});
