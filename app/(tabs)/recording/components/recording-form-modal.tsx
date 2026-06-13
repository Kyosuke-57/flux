import React from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Spacing, BorderRadius } from "../../../../src/theme";
import type { ColorsLight } from "../../../../src/theme";
import type { Recording } from "../../../../src/types";
import type { RecordingFormData } from "../hooks/use-recording-data";

type Props = {
  visible: boolean;
  editingItem: Recording | null;
  formData: RecordingFormData;
  onClose: () => void;
  onUpdateField: <K extends keyof RecordingFormData>(
    field: K,
    value: RecordingFormData[K],
  ) => void;
  onSubmit: () => void;
  color: typeof ColorsLight;
};

export function RecordingFormModal({
  visible,
  editingItem,
  formData,
  onClose,
  onUpdateField,
  onSubmit,
  color,
}: Props) {
  const isEditing = editingItem !== null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.container, { backgroundColor: color.background }]}
      >
        {/* ヘッダー */}
        <View style={[styles.header, { borderBottomColor: color.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={color.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: color.textPrimary }]}>
            {isEditing ? "編集" : "新規作成"}
          </Text>
          <TouchableOpacity onPress={onSubmit}>
            <Text style={[styles.submitBtn, { color: color.primary }]}>
              {isEditing ? "更新" : "作成"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* フォーム */}
        <ScrollView
          style={styles.form}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* タイトル */}
          <Text style={[styles.label, { color: color.textSecondary }]}>
            タイトル *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: color.textPrimary,
                backgroundColor: color.surface,
                borderColor: color.border,
              },
            ]}
            value={formData.title}
            onChangeText={(v) => onUpdateField("title", v)}
            placeholder="例: 2026年6月 定例MTG"
            placeholderTextColor={color.textMuted}
          />

          {/* ファイルパス */}
          <Text style={[styles.label, { color: color.textSecondary }]}>
            ファイルパス *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: color.textPrimary,
                backgroundColor: color.surface,
                borderColor: color.border,
              },
            ]}
            value={formData.file_path}
            onChangeText={(v) => onUpdateField("file_path", v)}
            placeholder="例: recordings/abc123.m4a"
            placeholderTextColor={color.textMuted}
            autoCapitalize="none"
          />

          {/* 録音時間（秒） */}
          <Text style={[styles.label, { color: color.textSecondary }]}>
            録音時間 (秒)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: color.textPrimary,
                backgroundColor: color.surface,
                borderColor: color.border,
              },
            ]}
            value={formData.duration_seconds}
            onChangeText={(v) => onUpdateField("duration_seconds", v)}
            placeholder="0"
            placeholderTextColor={color.textMuted}
            keyboardType="numeric"
          />

          {/* 文字起こし済みトグル */}
          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: color.textSecondary }]}>
              文字起こし済み
            </Text>
            <Switch
              value={formData.transcribed}
              onValueChange={(v) => onUpdateField("transcribed", v)}
              trackColor={{ false: color.toggleBg, true: color.primaryBg }}
              thumbColor={formData.transcribed ? color.primary : color.textMuted}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  submitBtn: {
    fontSize: 16,
    fontWeight: "600",
  },
  form: { flex: 1 },
  formContent: {
    padding: Spacing.lg,
    gap: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
});
