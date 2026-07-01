import React from "react";
import { View, Text, TextInput, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Tag } from "../../../src/types";
import { useThemeColors } from "../../../src/hooks/useThemeColors";
import { styles } from "../styles/minuteStyles";

interface TagPickerModalProps {
  tagCreateModalVisible: boolean;
  newTagName: string;
  onChangeNewTagName: (text: string) => void;
  onCancelCreateTag: () => void;
  onConfirmCreateTag: () => void;
}

/**
 * タグ作成モーダル。
 * 新しいタグ名を入力して作成する。
 */
export function TagPickerModal({
  tagCreateModalVisible,
  newTagName,
  onChangeNewTagName,
  onCancelCreateTag,
  onConfirmCreateTag,
}: TagPickerModalProps) {
  const c = useThemeColors();

  return (
    <Modal
      visible={tagCreateModalVisible}
      transparent
      animationType="fade"
      onRequestClose={onCancelCreateTag}
    >
      <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
        <View style={[styles.tagCreateModal, { backgroundColor: c.surface }]}>
          <Text style={[styles.tagCreateTitle, { color: c.textPrimary }]}>新しいタグを作成</Text>
          <TextInput
            style={[
              styles.tagCreateInput,
              { color: c.textPrimary, borderColor: c.border, backgroundColor: c.background },
            ]}
            value={newTagName}
            onChangeText={onChangeNewTagName}
            placeholder="タグ名"
            placeholderTextColor={c.textMuted}
            autoFocus
          />
          <View style={styles.tagCreateActions}>
            <TouchableOpacity
              style={[styles.tagCreateCancel, { backgroundColor: c.surfaceSecondary }]}
              onPress={onCancelCreateTag}
            >
              <Text style={[styles.tagCreateCancelText, { color: c.textSecondary }]}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tagCreateConfirm, { backgroundColor: c.primary }]}
              onPress={onConfirmCreateTag}
            >
              <Text style={[styles.tagCreateConfirmText, { color: c.textInverse }]}>作成</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
