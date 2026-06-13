import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from "react-native";
import type { ColorsLight } from "../../../../src/theme";
import type { Tag } from "../../../../src/types";

const PRESET_COLORS = [
  "#7C3AED", // violet
  "#3B82F6", // blue
  "#06B6D4", // cyan
  "#22C55E", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#EC4899", // pink
  "#8B5CF6", // purple
];

type Props = {
  visible: boolean;
  editingTag: Tag | null;
  onClose: () => void;
  onSave: (name: string, color?: string) => void;
  color: typeof ColorsLight;
};

export function TagFormModal({
  visible,
  editingTag,
  onClose,
  onSave,
  color,
}: Props) {
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(PRESET_COLORS[0]);

  // 編集時は既存の値をセット
  useEffect(() => {
    if (editingTag) {
      setName(editingTag.name);
      setSelectedColor(editingTag.color ?? PRESET_COLORS[0]);
    } else {
      setName("");
      setSelectedColor(PRESET_COLORS[0]);
    }
  }, [editingTag, visible]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), selectedColor);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: color.overlay }]}>
        <View style={[styles.modal, { backgroundColor: color.surface }]}>
          <Text style={[styles.title, { color: color.textPrimary }]}>
            {editingTag ? "タグを編集" : "新しいタグ"}
          </Text>

          {/* タグ名入力 */}
          <Text style={[styles.label, { color: color.textSecondary }]}>
            タグ名
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: color.textPrimary,
                borderColor: color.border,
                backgroundColor: color.background,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="タグ名を入力"
            placeholderTextColor={color.textMuted}
            autoFocus
          />

          {/* カラー選択 */}
          <Text style={[styles.label, { color: color.textSecondary }]}>
            カラー
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.colorRow}>
              {PRESET_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorOption,
                    { backgroundColor: c },
                    selectedColor === c && {
                      borderColor: color.textPrimary,
                      borderWidth: 3,
                    },
                  ]}
                  onPress={() => setSelectedColor(c)}
                />
              ))}
            </View>
          </ScrollView>

          {/* アクションボタン */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                { backgroundColor: color.surfaceSecondary },
              ]}
              onPress={onClose}
            >
              <Text style={[styles.cancelText, { color: color.textSecondary }]}>
                キャンセル
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: color.primary, opacity: name.trim() ? 1 : 0.5 },
              ]}
              onPress={handleSave}
              disabled={!name.trim()}
            >
              <Text style={[styles.confirmText, { color: color.textInverse }]}>
                {editingTag ? "保存" : "作成"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    marginHorizontal: 40,
    borderRadius: 16,
    padding: 24,
    gap: 12,
    width: "80%",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 15,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  colorRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 4,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelText: { fontSize: 14, fontWeight: "500" },
  confirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmText: { fontSize: 14, fontWeight: "600" },
});
