import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../../src/hooks/useThemeColors";
import { styles } from "../styles/minuteStyles";

interface MinuteHeaderProps {
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
  headerTitle: string;
}

/**
 * 議事録詳細画面のナビゲーションヘッダー。
 * 戻る / タイトル / 保存 を表示する。
 * ScrollView の外側に配置すること。
 */
export function MinuteHeader({ onBack, onSave, isSaving, headerTitle }: MinuteHeaderProps) {
  const c = useThemeColors();

  return (
    <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.divider }]}>
      <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
        <Ionicons name="chevron-back" size={22} color={c.primary} />
        <Text style={[styles.headerAction, { color: c.primary }]}>戻る</Text>
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: c.textPrimary }]}>{headerTitle}</Text>
      <TouchableOpacity onPress={onSave} disabled={isSaving}>
        <Text
          style={[
            styles.headerAction,
            styles.saveBtn,
            { color: c.primary },
            isSaving && styles.disabled,
          ]}
        >
          {isSaving ? "保存中…" : "保存"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
