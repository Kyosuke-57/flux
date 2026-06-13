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
import type { ExportItem } from "../../../../src/types";

type Props = {
  visible: boolean;
  editingExport: ExportItem | null;
  onClose: () => void;
  onSave: (title: string, format: "txt" | "md" | "pdf", minute_id?: string) => void;
  color: typeof ColorsLight;
};

const FORMATS: { key: "txt" | "md" | "pdf"; label: string }[] = [
  { key: "txt", label: "テキスト" },
  { key: "md", label: "Markdown" },
  { key: "pdf", label: "PDF" },
];

export function ExportFormModal({
  visible,
  editingExport,
  onClose,
  onSave,
  color,
}: Props) {
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<"txt" | "md" | "pdf">("txt");
  const [minuteId, setMinuteId] = useState("");

  useEffect(() => {
    if (editingExport) {
      setTitle(editingExport.title);
      setFormat(editingExport.format);
      setMinuteId(editingExport.minute_id ?? "");
    } else {
      setTitle("");
      setFormat("txt");
      setMinuteId("");
    }
  }, [editingExport, visible]);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave(title.trim(), format, minuteId.trim() || undefined);
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
            {editingExport ? "エクスポートを編集" : "新しいエクスポート"}
          </Text>

          {/* タイトル */}
          <Text style={[styles.label, { color: color.textSecondary }]}>
            タイトル
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
            value={title}
            onChangeText={setTitle}
            placeholder="エクスポートのタイトル"
            placeholderTextColor={color.textMuted}
            autoFocus
          />

          {/* 形式 */}
          <Text style={[styles.label, { color: color.textSecondary }]}>
            形式
          </Text>
          <View style={styles.formatRow}>
            {FORMATS.map((fmt) => {
              const selected = format === fmt.key;
              return (
                <TouchableOpacity
                  key={fmt.key}
                  style={[
                    styles.formatChip,
                    {
                      borderColor: selected ? color.primary : color.border,
                      backgroundColor: selected ? color.primaryBg : color.background,
                    },
                  ]}
                  onPress={() => setFormat(fmt.key)}
                >
                  <Text
                    style={[
                      styles.formatChipText,
                      { color: selected ? color.primary : color.textSecondary },
                    ]}
                  >
                    {fmt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 議事録ID (任意) */}
          <Text style={[styles.label, { color: color.textSecondary }]}>
            議事録ID (任意)
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
            value={minuteId}
            onChangeText={setMinuteId}
            placeholder="議事録のIDを入力"
            placeholderTextColor={color.textMuted}
          />

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
                { backgroundColor: color.primary, opacity: title.trim() ? 1 : 0.5 },
              ]}
              onPress={handleSave}
              disabled={!title.trim()}
            >
              <Text style={[styles.confirmText, { color: color.textInverse }]}>
                {editingExport ? "保存" : "作成"}
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
    width: "85%",
    maxHeight: "80%",
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
  formatRow: {
    flexDirection: "row",
    gap: 10,
  },
  formatChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  formatChipText: {
    fontSize: 13,
    fontWeight: "600",
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
