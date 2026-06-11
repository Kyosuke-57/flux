import { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "../../src/contexts/AuthContext";
import { getAllMinutes, searchMinutes } from "../../src/services/minutes";
import { getAllTags } from "../../src/services/tags";
import type { Minute, Tag } from "../../src/types";
import { Colors, Spacing, BorderRadius, Shadows } from "../../src/theme";

export default function MinutesScreen() {
  const { user } = useAuth();
  const [minutes, setMinutes] = useState<Minute[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const [{ data: minutesData }, { data: tagsData }] = await Promise.all([
      getAllMinutes(),
      getAllTags(),
    ]);
    if (minutesData) setMinutes(minutesData);
    if (tagsData) setTags(tagsData);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleSearch = useCallback(async (query: string) => {
    setSearch(query);
    if (!query.trim()) {
      const { data } = await getAllMinutes();
      if (data) setMinutes(data);
      return;
    }
    const { data } = await searchMinutes(query);
    if (data) setMinutes(data);
  }, []);

  const filteredMinutes = selectedTag
    ? minutes.filter((m) => m.tags?.includes(selectedTag))
    : minutes;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getPreview = (content: string) => {
    const stripped = content.replace(/[#*`\[\]]/g, "").trim();
    return stripped.length > 100
      ? stripped.slice(0, 100) + "…"
      : stripped;
  };

  // Minute.tags はタグ名（string）の配列として保存される
  // タグ名をそのまま表示する
  const getTagName = (tagName: string) => tagName;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>議事録を読み込み中…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🔒</Text>
          <Text style={styles.emptyTitle}>サインインして議事録を見る</Text>
          <Text style={styles.emptySubtext}>
            議事録の表示・管理にはログインが必要です。
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Text style={styles.title}>OTOROKU</Text>

      <TextInput
        style={styles.search}
        placeholder="議事録を検索…"
        placeholderTextColor="#94a3b8"
        value={search}
        onChangeText={handleSearch}
      />

      {tags.length > 0 && (
        <View style={styles.tags}>
          {tags.map((tag) => (
            <TouchableOpacity
              key={tag.id}
              style={[
                styles.tag,
                selectedTag === tag.id && styles.tagActive,
              ]}
              onPress={() =>
                setSelectedTag(selectedTag === tag.id ? null : tag.id)
              }
            >
              <Text
                style={[
                  styles.tagText,
                  selectedTag === tag.id && styles.tagTextActive,
                ]}
              >
                {tag.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {filteredMinutes.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyTitle}>
            {search || selectedTag
              ? "該当する議事録がありません"
              : "まだ議事録がありません"}
          </Text>
          <Text style={styles.emptySubtext}>
            {search || selectedTag
              ? "別の検索キーワードやフィルターをお試しください。"
              : "最初の会議を録音して始めましょう。"}
          </Text>
          {!search && !selectedTag && (
            <TouchableOpacity
              style={styles.recordLink}
              onPress={() => router.push("/record")}
            >
              <Text style={styles.recordLinkText}>+ 会議を録音</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredMinutes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push(`/minute/${item.id}`)}
            >
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDate}>
                {formatDate(item.created_at)}
              </Text>
              <Text style={styles.cardPreview} numberOfLines={2}>
                {getPreview(item.content)}
              </Text>
              {item.tags && item.tags.length > 0 && (
                <View style={styles.cardTags}>
                  {item.tags.map((tagId) => (
                    <View key={tagId} style={styles.cardTag}>
                      <Text style={styles.cardTagText}>
                        {getTagName(tagId)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  loadingText: { marginTop: 12, color: "#64748b", fontSize: 15 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  search: {
    backgroundColor: "#fff",
    marginHorizontal: 24,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 15,
    color: "#0f172a",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  tags: {
    flexDirection: "row",
    paddingHorizontal: 24,
    marginTop: 12,
    gap: 8,
    flexWrap: "wrap",
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
  },
  tagActive: { backgroundColor: Colors.primary },
  tagText: { fontSize: 13, color: "#64748b" },
  tagTextActive: { color: "#fff", fontWeight: "600" },
  list: { paddingBottom: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  recordLink: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  recordLinkText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 24,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  cardDate: { fontSize: 12, color: "#94a3b8", marginTop: 4 },
  cardPreview: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 8,
    lineHeight: 20,
  },
  cardTags: { flexDirection: "row", marginTop: 10, gap: 6 },
  cardTag: {
    backgroundColor: "#eef2ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardTagText: { fontSize: 11, color: Colors.primary, fontWeight: "500" },
});
