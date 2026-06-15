import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ColorsLight } from "../theme";

export type SortOption<T extends string = string> = {
  field: T;
  label: string;
};

type Props<T extends string = string> = {
  options: SortOption<T>[];
  selectedField: T;
  onFieldChange: (field: T) => void;
  color: typeof ColorsLight;
  /** Optional sort direction toggle */
  direction?: "asc" | "desc";
  onDirectionToggle?: () => void;
  /** Layout variant */
  layout?: "pill" | "chip" | "chip-slim";
};

/**
 * 共通 SortControls コンポーネント
 * ピル/チップ形式のソートUI + オプションの昇降順トグル
 */
export function SortControls<T extends string = string>({
  options,
  selectedField,
  onFieldChange,
  color,
  direction,
  onDirectionToggle,
  layout = "pill",
}: Props<T>) {
  if (layout === "chip-slim") {
    return (
      <View style={[styles.chipSlimContainer, { borderBottomColor: color.border }]}>
        <View style={styles.chipSlimInner}>
          <Text style={[styles.chipSlimLabel, { color: color.textMuted }]}>並び替え</Text>
          <View style={styles.chips}>
            {options.map(({ field, label }) => {
              const isActive = selectedField === field;
              return (
                <TouchableOpacity
                  key={field}
                  style={[
                    styles.chipSlim,
                    {
                      backgroundColor: isActive ? color.primaryBg : "transparent",
                      borderColor: isActive ? color.primary : color.border,
                    },
                  ]}
                  onPress={() => onFieldChange(field)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipSlimText,
                      { color: isActive ? color.primary : color.textSecondary },
                    ]}
                  >
                    {label}
                  </Text>
                  {isActive && direction && (
                    <Ionicons
                      name={direction === "asc" ? "arrow-up" : "arrow-down"}
                      size={12}
                      color={color.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  if (layout === "chip") {
    return (
      <View style={styles.chipContainer}>
        {options.map(({ field, label }) => {
          const isActive = selectedField === field;
          const iconName = direction === "asc" ? "arrow-up" : "arrow-down";
          return (
            <TouchableOpacity
              key={field}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? color.primaryBg : color.surfaceSecondary,
                  borderColor: isActive ? color.primary : color.border,
                },
              ]}
              onPress={() => onFieldChange(field)}
              accessibilityLabel={`${label}でソート`}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: isActive ? color.primary : color.textSecondary },
                ]}
              >
                {label}
              </Text>
              {isActive && direction && (
                <Ionicons
                  name={iconName}
                  size={12}
                  color={color.primary}
                  style={styles.chipArrow}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // "pill" layout (default)
  return (
    <View style={styles.pillContainer}>
      <View style={styles.pills}>
        {options.map((opt) => {
          const active = selectedField === opt.field;
          return (
            <TouchableOpacity
              key={opt.field}
              style={[
                styles.pill,
                {
                  backgroundColor: active ? color.primary : color.surfaceSecondary,
                  borderColor: active ? color.primary : color.border,
                },
              ]}
              onPress={() => onFieldChange(opt.field)}
              accessibilityLabel={`${opt.label}で並び替え`}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: active ? color.textInverse : color.textSecondary },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {onDirectionToggle && direction && (
        <TouchableOpacity
          style={[styles.orderButton, { backgroundColor: color.surfaceSecondary }]}
          onPress={onDirectionToggle}
          accessibilityLabel={`並び順を${direction === "asc" ? "昇順" : "降順"}に切り替え`}
        >
          <Ionicons
            name={direction === "asc" ? "arrow-up" : "arrow-down"}
            size={16}
            color={color.textPrimary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Pill layout (tags, folders)
  pillContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 8,
    gap: 8,
  },
  pills: {
    flexDirection: "row",
    gap: 6,
    flex: 1,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  orderButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  // Chip layout (export, exports, templates)
  chipContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  chipArrow: {
    marginLeft: 4,
  },

  // Chip-slim layout (storage, recording)
  chipSlimContainer: {
    borderBottomWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  chipSlimInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chipSlimLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginRight: 4,
  },
  chips: {
    flexDirection: "row",
    gap: 6,
  },
  chipSlim: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  chipSlimText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
