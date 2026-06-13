import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../../../src/contexts/AuthContext";
import { useFavorites } from "../../../../src/contexts/FavoritesContext";
import { getAllMinutes } from "../../../../src/services/minutes";
import { getAllTags } from "../../../../src/services/tags";
import type { Minute, Tag } from "../../../../src/types";

export function useFavoritesData() {
  const { user } = useAuth();
  const { favoriteIds, refresh } = useFavorites();

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

  const formatDate = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleDateString("ja-JP", {
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
    tags,
    loading,
    refreshing,
    onRefresh,
    formatDate,
    getPreview,
    getTagName,
  };
}
