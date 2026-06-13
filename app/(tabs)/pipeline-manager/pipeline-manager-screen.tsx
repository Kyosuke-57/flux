import React, { useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useSettings } from "../../../src/contexts/SettingsContext";
import { theme, Spacing } from "../../../src/theme";
import { usePipelineData } from "./hooks/use-pipeline-data";
import { PipelineCard } from "./components/pipeline-card";
import { EmptyState } from "./components/empty-state";
import { LoadingSkeleton, UnauthenticatedView } from "./components/skeleton-state";
import { getStatusLabel } from "./hooks/utils";

export default function PipelineManagerScreen() {
  const { settings } = useSettings();
  const c = theme(settings.isDarkMode);
  const { user } = useAuth();

  const {
    items,
    loading,
    refreshing,
    handleDelete,
    handleRetry,
    onRefresh,
  } = usePipelineData();

  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter((item) => {
      if (item.file_name.toLowerCase().includes(q)) return true;
      if (item.error_message?.toLowerCase().includes(q)) return true;
      if (getStatusLabel(item.status).toLowerCase().includes(q)) return true;
      return false;
    });
  }, [items, searchQuery]);

  if (loading) {
    return <LoadingSkeleton color={c} />;
  }

  if (!user) {
    return <UnauthenticatedView color={c} />;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.background }]}
      edges={["top", "left", "right"]}
    >
      {items.length === 0 ? (
        <EmptyState color={c} />
      ) : (
        <FlatList
          data={filteredItems}
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
          ListHeaderComponent={
            <View style={[styles.searchBar, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Ionicons name="search" size={18} color={c.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: c.textPrimary }]}
                placeholder="名前・エラー・ステータスで検索"
                placeholderTextColor={c.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={18} color={c.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          }
          ListEmptyComponent={
            searchQuery.trim() ? (
              <View style={styles.noResults}>
                <Ionicons name="search-outline" size={32} color={c.textMuted} />
                <Text style={[styles.noResultsText, { color: c.textSecondary }]}>
                  該当するジョブが見つかりません
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <PipelineCard
              item={item}
              onDelete={handleDelete}
              onRetry={handleRetry}
              color={c}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingBottom: 24 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
  },
  noResults: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 48,
    gap: 12,
  },
  noResultsText: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
