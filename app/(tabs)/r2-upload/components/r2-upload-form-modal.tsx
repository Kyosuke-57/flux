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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Spacing, BorderRadius } from "../../../../src/theme";
import type { ColorsLight } from "../../../../src/theme";
import type { TranscriptionJob } from "../../../../src/types";
import type { JobFormData } from "../hooks/use-r2-upload-data";
import { getStatusLabel } from "../hooks/utils";

type Props = {
  visible: boolean;
  editingItem: TranscriptionJob | null;
  formData: JobFormData;
  onClose: () => void;
  onUpdateField: <K extends keyof JobFormData>(
    field: K,
    value: JobFormData[K],
  ) => void;
  onSubmit: () => void;
  color: typeof ColorsLight;
};

const STATUS_OPTIONS: TranscriptionJob["status"][] = [
  "queued",
  "processing",
  "completed",
  "failed",
];

export function R2UploadFormModal({
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
        <View
          style={[
            styles.header,
            { borderBottomColor: color.border },
          ]}
        >
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
          {/* ファイル名 */}
          <Text style={[styles.label, { color: color.textSecondary }]}>
            ファイル名 *
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
            value={formData.file_name}
            onChangeText={(v) => onUpdateField("file_name", v)}
            placeholder="例: recording_20260613.m4a"
            placeholderTextColor={color.textMuted}
          />

          {/* R2キー */}
          <Text style={[styles.label, { color: color.textSecondary }]}>
            R2キー *
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
            value={formData.r2_key}
            onChangeText={(v) => onUpdateField("r2_key", v)}
            placeholder="例: uploads/abc123.m4a"
            placeholderTextColor={color.textMuted}
            autoCapitalize="none"
          />

          {/* ファイルサイズ */}
          <Text style={[styles.label, { color: color.textSecondary }]}>
            ファイルサイズ (bytes)
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
            value={formData.file_size}
            onChangeText={(v) => onUpdateField("file_size", v)}
            placeholder="0"
            placeholderTextColor={color.textMuted}
            keyboardType="numeric"
          />

          {/* ステータス */}
          <Text style={[styles.label, { color: color.textSecondary }]}>
            ステータス
          </Text>
          <View style={styles.statusOptions}>
            {STATUS_OPTIONS.map((s) => {
              const selected = formData.status === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.statusChip,
                    {
                      backgroundColor: selected
                        ? color.primary
                        : color.surface,
                      borderColor: selected ? color.primary : color.border,
                    },
                  ]}
                  onPress={() => onUpdateField("status", s)}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      { color: selected ? color.textInverse : color.textPrimary },
                    ]}
                  >
                    {getStatusLabel(s)}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
  statusOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
