import React, { useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, GestureResponderEvent } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SwipeableRow } from "../../../../src/animations/gestures";
import { HighlightedText } from "../../../../src/components/HighlightedText";
import { GlassCard } from "../../../../src/components/Glass";
import { Spacing, BorderRadius } from "../../../../src/theme";
import { useFavorites } from "../../../../src/contexts/FavoritesContext";
import type { Minute } from "../../../../src/types";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  item: Minute;
  search: string;
  selectMode: boolean;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onDelete: () => void;
  onExport: () => void;
  formatDate: (iso: string) => string;
  getTagName: (tagId: string) => string;
  getPreview: (content: string) => string;
  color: typeof ColorsLight;
};

export function MinuteCard({
  item,
  search,
  selectMode,
  isSelected,
  onPress,
  onLongPress,
  onDelete,
  onExport,
  formatDate,
  getTagName,
  getPreview,
  color,
}: Props) {
  const { isFavorited, toggle } = useFavorites();
  const favorited = isFavorited(item.id);

  const handleToggleFavorite = useCallback(
    (e: GestureResponderEvent) => {
      e.stopPropagation();
      toggle(item.id);
    },
    [item.id, toggle]
  );

  const handleExport = useCallback(
    (e: GestureResponderEvent) => {
      e.stopPropagation();
      onExport();
    },
    [onExport]
  );

  return (
    <SwipeableRow onDelete={onDelete}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={500}
      >
        <GlassCard
          intensity={25}
          style={isSelected ? { ...styles.card, borderColor: color.primary, borderWidth: 2 } : styles.card}
        >
          <View style={styles.cardTop}>
            {selectMode && (
              <Ionicons
                name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                size={22}
                color={isSelected ? color.primary : color.textMuted}
                style={{ marginRight: 6 }}
              />
            )}
            <HighlightedText
              text={item.title}
              highlight={search}
              style={{ ...styles.cardTitle, color: color.textPrimary }}
            />
            {!selectMode && (
              <>
                <TouchableOpacity
                  onPress={handleExport}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="share-outline"
                    size={18}
                    color={color.textMuted}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleToggleFavorite}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={favorited ? "heart" : "heart-outline"}
                    size={18}
                    color={favorited ? color.primary : color.textMuted}
                  />
                </TouchableOpacity>
              </>
            )}
            <Text style={[styles.cardDate, { color: color.textMuted }]}>
              {formatDate(item.created_at)}
            </Text>
          </View>
          <HighlightedText
            text={getPreview(item.content)}
            highlight={search}
            style={{ ...styles.cardPreview, color: color.textSecondary }}
          />
          {item.tags && item.tags.length > 0 && (
            <View style={styles.cardTags}>
              {item.tags.map((tagId) => (
                <View
                  key={tagId}
                  style={[styles.cardTag, { backgroundColor: color.primaryBg }]}
                >
                  <Text style={[styles.cardTagText, { color: color.primary }]}>
                    {getTagName(tagId)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </GlassCard>
      </TouchableOpacity>
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 24,
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: "600", flexShrink: 1 },
  cardDate: { fontSize: 12 },
  cardPreview: {
    fontSize: 13,
    marginTop: 6,
    lineHeight: 19,
  },
  cardTags: { flexDirection: "row", marginTop: 8, gap: 5 },
  cardTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  cardTagText: { fontSize: 10, fontWeight: "500" },
});
