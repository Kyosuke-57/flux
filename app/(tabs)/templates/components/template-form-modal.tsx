import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Switch,
} from "react-native";
import type { ColorsLight } from "../../../../src/theme";
import type { Template } from "../../../../src/types";

type Props = {
  visible: boolean;
  editingTemplate: Template | null;
  onClose: () => void;
  onSave: (name: string, content: string, is_default?: boolean) => void;
  color: typeof ColorsLight;
};

export function TemplateFormModal({
  visible,
  editingTemplate,
  onClose,
  onSave,
  color,
}: Props) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  // 編集時は既存の値をセット
  useEffect(() => {
    if (editingTemplate) {
      setName(editingTemplate.name);
      setContent(editingTemplate.content);
      setIsDefault(editingTemplate.is_default);
    } else {
      setName("");
      setContent("");
      setIsDefault(false);
    }
  }, [editingTemplate, visible]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), content.trim(), isDefault);
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
            {editingTemplate ? "テンプレートを編集" : "新しいテンプレート"}
          </Text>

          {/* テンプレート名 */}
          <Text style={[styles.label, { color: color.textSecondary }]}>
            テンプレート名
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
            placeholder="例: 週次ミーティング"
            placeholderTextColor={color.textMuted}
            autoFocus
          />

          {/* テンプレート内容 */}
          <Text style={[styles.label, { color: color.textSecondary }]}>
            テンプレート内容（Markdown）
          </Text>
          <TextInput
            style={[
              styles.textArea,
              {
                color: color.textPrimary,
                borderColor: color.border,
                backgroundColor: color.background,
              },
            ]}
            value={content}
            onChangeText={setContent}
            placeholder="# タイトル\n\n## 参加者\n\n## 議題\n\n## メモ"
            placeholderTextColor={color.textMuted}
            multiline
            textAlignVertical="top"
          />

          {/* デフォルト設定 */}
          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: color.textPrimary }]}>
              デフォルトのテンプレートに設定
            </Text>
            <Switch
              value={isDefault}
              onValueChange={setIsDefault}
              trackColor={{ false: color.surfaceSecondary, true: color.primary }}
              thumbColor="#fff"
            />
          </View>

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
                {editingTemplate ? "保存" : "作成"}
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
  textArea: {
    fontSize: 15,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 140,
    maxHeight: 240,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
    marginRight: 12,
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
