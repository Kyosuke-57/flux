import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Switch,
} from "react-native";
import type { Recording } from "../../../../src/types";
import type { ColorsLight } from "../../../../src/theme";
import type { RecordingFormData } from "../hooks/use-recordings-data";

type Props = {
  visible: boolean;
  editingItem: Recording | null;
  formData: RecordingFormData;
  saving: boolean;
  onUpdateField: <K extends keyof RecordingFormData>(field: K, value: RecordingFormData[K]) => void;
  onSave: () => void;
  onClose: () => void;
  color: typeof ColorsLight;
};

export function RecordingFormModal({
  visible,
  editingItem,
  formData,
  saving,
  onUpdateField,
  onSave,
  onClose,
  color,
}: Props) {
  const isEditing = !!editingItem;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.backdrop, { backgroundColor: color.overlay }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
          />
        </View>
        <View style={[styles.content, { backgroundColor: color.surface }]}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={[styles.header, { borderBottomColor: color.divider }]}>
              <Text style={[styles.title, { color: color.textPrimary }]}>
                {isEditing ? "録音データを編集" : "録音データを追加"}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={[styles.close, { color: color.primary }]}>閉じる</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
              {/* タイトル */}
              <Text style={[styles.fieldLabel, { color: color.textMuted }]}>タイトル *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: color.background, borderColor: color.border, color: color.textPrimary }]}
                value={formData.title}
                onChangeText={(v) => onUpdateField("title", v)}
                placeholder="録音のタイトル"
                placeholderTextColor={color.textMuted}
                editable={!saving}
              />

              {/* ファイルパス */}
              <Text style={[styles.fieldLabel, { color: color.textMuted, marginTop: 12 }]}>ファイルパス</Text>
              <TextInput
                style={[styles.input, { backgroundColor: color.background, borderColor: color.border, color: color.textPrimary }]}
                value={formData.filePath}
                onChangeText={(v) => onUpdateField("filePath", v)}
                placeholder="録音ファイルのパス（任意）"
                placeholderTextColor={color.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!saving}
              />

              {/* 文字起こし状態 */}
              {isEditing && (
                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { color: color.textPrimary }]}>文字起こし完了</Text>
                  <Switch
                    value={formData.transcribed}
                    onValueChange={(v) => onUpdateField("transcribed", v)}
                    trackColor={{ false: color.toggleBg, true: color.primaryBg }}
                    thumbColor={formData.transcribed ? color.primary : "#fff"}
                    disabled={saving}
                  />
                </View>
              )}

              {/* 保存ボタン */}
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: color.primary }, saving && styles.disabled]}
                onPress={onSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.saveButtonText, { color: color.textInverse }]}>
                    {isEditing ? "更新する" : "作成する"}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  content: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: "600" },
  close: { fontSize: 16, fontWeight: "500" },
  form: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    fontSize: 15,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 4,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  saveButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  disabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
