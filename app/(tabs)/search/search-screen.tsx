import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useThemeColors } from "../../../src/hooks/useThemeColors";
import {
  globalSearch,
  type SearchResultItem,
} from "../../../src/services/search";
import { SearchResultCard } from "./components/search-result-card";
import { EmptyState } from "./components/empty-state";
import { LoadingSkeleton, UnauthenticatedView } from "./components/skeleton-state";

export default function SearchScreen() {
  const c = useThemeColors();
  const { user } = useAuth();

  type SortField = "date" | "name" | "status";
  type SortDirection = "asc" | "desc";

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(false);

  // ── 検索実行（デバウンス付き） ──
  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setHasSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    abortRef.current = false;

    const { data } = await globalSearch(q);

    if (!abortRef.current) {
      setResults(data);
      setHasSearched(true);
      setLoading(false);
    }
  }, []);

  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        performSearch(text);
      }, 300);
    },
    [performSearch],
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  // ── プル・トゥ・リフレッシュ ──
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await performSearch(query);
    setRefreshing(false);
  }, [query, performSearch]);

  // ── クリーンアップ ──
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current = true;
    };
  }, []);

  // ── 結果タップ ──
  const handleResultPress = useCallback((item: SearchResultItem) => {
    switch (item.type) {
      case "minute":
        router.push(`/minute/${item.id}`);
        break;
      case "recording":
        router.push("/(tabs)/recordings");
        break;
      case "transcription_job":
        router.push("/(tabs)/transcription-jobs");
        break;
    }
  }, []);

  // ── ソート ──
  const sortedResults = useMemo(() => {
    const sorted = [...results];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date":
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "name":
          cmp = a.title.localeCompare(b.title, "ja");
          break;
        case "status":
          cmp = a.subtitle.localeCompare(b.subtitle, "ja");
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [results, sortField, sortDirection]);

  const handleSortFieldChange = useCallback((field: SortField) => {
    if (field === sortField) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  }, [sortField]);

  // ── 結果を種類でグループ化（ソート済み） ──
  const sections = useMemo(() => {
    const minuteItems = sortedResults.filter((r) => r.type === "minute");
    const recordingItems = sortedResults.filter((r) => r.type === "recording");
    const jobItems = sortedResults.filter((r) => r.type === "transcription_job");

    const out: { title: string; icon: React.ComponentProps<typeof Ionicons>["name"]; data: SearchResultItem[] }[] = [];
    if (minuteItems.length > 0) out.push({ title: "議事録", icon: "document-text", data: minuteItems });
    if (recordingItems.length > 0) out.push({ title: "録音", icon: "mic", data: recordingItems });
    if (jobItems.length > 0) out.push({ title: "文字起こし", icon: "hammer", data: jobItems });
    return out;
  }, [sortedResults]);

  // ── ローディング ──
  if (loading && !refreshing) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: c.background }]}
        edges={["top", "left", "right"]}
      >
        <SearchHeader
          query={query}
          onChangeText={handleQueryChange}
          onClear={handleClear}
          color={c}
        />
        <LoadingSkeleton color={c} />
      </SafeAreaView>
    );
  }

  // ── 未認証 ──
  if (!user) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: c.background }]}
        edges={["top", "left", "right"]}
      >
        <UnauthenticatedView color={c} />
      </SafeAreaView>
    );
  }

  const totalCount = results.length;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.background }]}
      edges={["top", "left", "right"]}
    >
      <FlatList
        data={sections}
        keyExtractor={(item) => item.title}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <SearchHeader
              query={query}
              onChangeText={handleQueryChange}
              onClear={handleClear}
              color={c}
            />
            {hasSearched && results.length > 0 && (
              <SortBar
                sortField={sortField}
                sortDirection={sortDirection}
                onFieldChange={handleSortFieldChange}
                color={c}
              />
            )}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              type={hasSearched ? "no-results" : "initial"}
              query={query}
              color={c}
            />
          ) : null
        }
        renderItem={({ item: section }) => (
          <View style={styles.section}>
            {/* セクションヘッダー */}
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionBadge, { backgroundColor: c.primaryBg }]}>
                <Ionicons name={section.icon} size={14} color={c.primary} />
                <Text style={[styles.sectionTitle, { color: c.primary }]}>
                  {section.title}
                </Text>
              </View>
              <Text style={[styles.sectionCount, { color: c.textMuted }]}>
                {section.data.length}件
              </Text>
            </View>

            {/* 結果カード */}
            {section.data.map((item) => (
              <SearchResultCard
                key={`${item.type}-${item.id}`}
                item={item}
                search={query}
                onPress={handleResultPress}
                color={c}
              />
            ))}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

// ─── 検索ヘッダー ─────────────────────────────────────────

function SearchHeader({
  query,
  onChangeText,
  onClear,
  color: c,
}: {
  query: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  color: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={[styles.searchWrapper, { backgroundColor: c.background }]}>
      <View
        style={[
          styles.searchBar,
          { backgroundColor: c.surface, borderColor: c.border },
        ]}
      >
        <Ionicons name="search" size={18} color={c.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: c.textPrimary }]}
          placeholder="議事録・録音・文字起こしを検索..."
          placeholderTextColor={c.textMuted}
          value={query}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={c.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── ソートバー ──────────────────────────────────────────

function SortBar({
  sortField,
  sortDirection,
  onFieldChange,
  color: c,
}: {
  sortField: "date" | "name" | "status";
  sortDirection: "asc" | "desc";
  onFieldChange: (field: "date" | "name" | "status") => void;
  color: ReturnType<typeof useThemeColors>;
}) {
  const fields: { key: "date" | "name" | "status"; label: string }[] = [
    { key: "date", label: "日付" },
    { key: "name", label: "名前" },
    { key: "status", label: "ステータス" },
  ];

  return (
    <View style={[styles.sortBar, { borderColor: c.border }]}>
      <View style={styles.sortFields}>
        {fields.map((f) => {
          const active = sortField === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => onFieldChange(f.key)}
              style={[
                styles.sortFieldButton,
                active && { backgroundColor: c.primaryBg },
              ]}
            >
              <Text
                style={[
                  styles.sortFieldLabel,
                  { color: active ? c.primary : c.textMuted },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity
        onPress={() => onFieldChange(sortField)}
        style={styles.sortDirectionButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={sortDirection === "asc" ? "arrow-up" : "arrow-down"}
          size={16}
          color={c.textMuted}
        />
      </TouchableOpacity>
    </View>
  );
}

// ─── スタイル ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingBottom: 32, flexGrow: 1 },

  // Search header
  searchWrapper: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },

  // Sort bar
  sortBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortFields: {
    flexDirection: "row",
    gap: 6,
  },
  sortFieldButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  sortFieldLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  sortDirectionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  // Section
  section: {
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionCount: {
    fontSize: 12,
  },
});
