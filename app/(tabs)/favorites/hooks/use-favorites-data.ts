import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "../../../../src/contexts/AuthContext";
import { useFavorites } from "../../../../src/contexts/FavoritesContext";
import { getAllMinutes } from "../../../../src/services/minutes";
import { getAllTags } from "../../../../src/services/tags";
import type { Minute, Tag } from "../../../../src/types";

export type SortKey = "date" | "name" | "status";
export type SortOrder = "asc" | "desc";

/** Derive a status priority for the minute (higher = more processed). */
function statusPriority(m: Minute): number {
  if (m.template_id) return 3; // 定型
  if (m.corrected_transcript) return 2; // 校正済
  if (m.original_transcript) return 1; // 文字起こし済
  return 0; // 下書き
}

export const STATUS_LABELS: Record<number, string> = {
  0: "下書き",
  1: "文字起こし済",
  2: "校正済",
  3: "定型",
};

function sortFavorites(
  items: Minute[],
  key: SortKey,
  order: SortOrder,
): Minute[] {
  const sorted = [...items];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "date":
        cmp = a.created_at.localeCompare(b.created_at);
        break;
      case "name":
        cmp = a.title.localeCompare(b.title, "ja");
        break;
      case "status":
        cmp = statusPriority(a) - statusPriority(b);
        break;
    }
    return order === "desc" ? -cmp : cmp;
  });
  return sorted;
}

export function useFavoritesData() {
  const { user } = useAuth();
  const { favoriteIds, refresh } = useFavorites();

  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const [allMinutes, setAllMinutes] = useState<Minute[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fetchedRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const [minRes, tagRes] = await Promise.all([
      getAllMinutes(),
      getAllTags(),
    ]);
    if (minRes.data) setAllMinutes(minRes.data);
    if (tagRes.data) setTags(tagRes.data);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchData();
    }
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), fetchData()]);
  }, [refresh, fetchData]);

  // Filter minutes to only those that are favorited
  const favorites = allMinutes.filter((m) => favoriteIds.has(m.id));

  const sortedFavorites = useMemo(
    () => sortFavorites(favorites, sortKey, sortOrder),
    [favorites, sortKey, sortOrder],
  );

  const formatDate = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleDateString("ja-JP", {
      timeZone: "Asia/Tokyo",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPreview = (content: string): string => {
    const stripped = content.replace(/[#*`\[\]]/g, "").trim();
    return stripped.length > 120
      ? stripped.slice(0, 120) + "…"
      : stripped;
  };

  const getTagName = (tagId: string): string => {
    const found = tags.find((t) => t.id === tagId);
    return found ? found.name : tagId;
  };

  return {
    favorites,
    sortedFavorites,
    tags,
    loading,
    refreshing,
    onRefresh,
    formatDate,
    getPreview,
    getTagName,
    sortKey,
    sortOrder,
    setSortKey,
    setSortOrder,
  };
}
