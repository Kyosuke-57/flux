import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  Text,
  TextInput,
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
import { useFavoritesData, type SortKey } from "./hooks/use-favorites-data";
import { EmptyState } from "./components/empty-state";
import { LoadingSkeleton, UnauthenticatedView } from "./components/skeleton-state";

export default function FavoritesScreen() {
  const { settings } = useSettings();
  const c = theme(settings.isDarkMode);
  const { user } = useAuth();

  const {
    favorites,
    sortedFavorites,
    loading,
    refreshing,
    onRefresh,
    tags,
    getPreview,
    formatDate,
    getTagName,
    sortKey,
    sortOrder,
    setSortKey,
    setSortOrder,
  } = useFavoritesData();

  const [searchQuery, setSearchQuery] = useState("");

  const filteredFavorites = useMemo(
    () =>
      searchQuery.trim() === ""
        ? sortedFavorites
        : sortedFavorites.filter((item) => {
            const q = searchQuery.toLowerCase();
            return (
              item.title.toLowerCase().includes(q) ||
              item.content.toLowerCase().includes(q)
            );
          }),
    [sortedFavorites, searchQuery],
  );

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

      {/* 検索バー */}
      {favorites.length > 0 && (
        <View style={[styles.searchContainer, { backgroundColor: c.background }]}>
          <View style={[styles.searchBar, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="search" size={18} color={c.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: c.textPrimary }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="名前または内容で検索..."
              placeholderTextColor={c.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.searchClear}>
                <Ionicons name="close-circle" size={18} color={c.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* 並び替え */}
      {favorites.length > 0 && (
        <View style={[styles.sortContainer, { borderColor: c.border }]}>
          <View style={styles.sortSegmentRow}>
            {(["date", "name", "status"] as SortKey[]).map((key) => {
              const labels: Record<SortKey, string> = {
                date: "日付",
                name: "名前",
                status: "ステータス",
              };
              const isActive = sortKey === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.sortSegment,
                    isActive && { backgroundColor: c.primary },
                    isActive && { borderColor: c.primary },
                  ]}
                  onPress={() => {
                    if (isActive) {
                      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                    } else {
                      setSortKey(key);
                      setSortOrder("desc");
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.sortSegmentText,
                      { color: isActive ? "#fff" : c.textSecondary },
                    ]}
                  >
                    {labels[key]}
                  </Text>
                  {isActive && (
                    <Ionicons
                      name={sortOrder === "desc" ? "chevron-down" : "chevron-up"}
                      size={14}
                      color="#fff"
                      style={{ marginLeft: 2 }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* 一覧 / 空状態 */}
      {favorites.length === 0 ? (
        <EmptyState color={c} />
      ) : filteredFavorites.length === 0 ? (
        <View style={styles.searchEmpty}>
          <Ionicons name="search-outline" size={40} color={c.textMuted} />
          <Text style={[styles.searchEmptyText, { color: c.textSecondary }]}>
            「{searchQuery}」に一致する議事録がありません
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredFavorites}
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

  searchContainer: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: 4,
    paddingBottom: 4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  searchClear: {
    marginLeft: 4,
    padding: 2,
  },
  searchEmpty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  searchEmptyText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 20,
  },

  sortContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xxl,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortSegmentRow: {
    flexDirection: "row",
    gap: 6,
  },
  sortSegment: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  sortSegmentText: {
    fontSize: 13,
    fontWeight: "500",
  },

});
