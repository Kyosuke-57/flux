import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { TranscriptionJob } from "../../../../src/types";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  visible: boolean;
  job: TranscriptionJob | null;
  onClose: () => void;
  onSave: (id: string, updates: {
    file_name?: string;
    file_size?: number;
    r2_key?: string;
    recording_id?: string;
    status?: "queued" | "processing" | "completed" | "failed";
    error_message?: string;
  }) => void;
  color: typeof ColorsLight;
};

const STATUS_OPTIONS = ["queued", "processing", "completed", "failed"];

export function EditJobModal({
  visible,
  job,
  onClose,
  onSave,
  color,
}: Props) {
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [r2Key, setR2Key] = useState("");
  const [status, setStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (job) {
      setFileName(job.file_name);
      setFileSize(String(job.file_size));
      setR2Key(job.r2_key);
      setStatus(job.status);
      setErrorMessage(job.error_message ?? "");
    }
  }, [job]);

  const handleSave = () => {
    if (!job) return;
    const updates: {
      file_name?: string;
      file_size?: number;
      r2_key?: string;
      status?: "queued" | "processing" | "completed" | "failed";
      error_message?: string;
    } = {};
    if (fileName.trim()) updates.file_name = fileName.trim();
    if (r2Key.trim()) updates.r2_key = r2Key.trim();
    const parsedSize = parseInt(fileSize, 10);
    if (!isNaN(parsedSize)) updates.file_size = parsedSize;
    if (status) updates.status = status as "queued" | "processing" | "completed" | "failed";
    if (errorMessage.trim()) {
      updates.error_message = errorMessage.trim();
    } else {
      updates.error_message = undefined;
    }
    onSave(job.id, updates);
  };

  if (!job) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.overlay, { backgroundColor: color.overlay }]}
      >
        <View style={[styles.modal, { backgroundColor: color.surface }]}>
          <View style={[styles.header, { borderBottomColor: color.divider }]}>
            <Text style={[styles.title, { color: color.textPrimary }]}>
              文字起こしジョブを編集
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={color.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.form}>
            {/* ファイル名 */}
            <Text style={[styles.label, { color: color.textMuted }]}>ファイル名</Text>
            <TextInput
              style={[styles.input, { color: color.textPrimary, borderColor: color.border, backgroundColor: color.background }]}
              value={fileName}
              onChangeText={setFileName}
              placeholder="ファイル名"
              placeholderTextColor={color.textMuted}
            />

            {/* R2 Key */}
            <Text style={[styles.label, { color: color.textMuted }]}>R2 Key</Text>
            <TextInput
              style={[styles.input, { color: color.textPrimary, borderColor: color.border, backgroundColor: color.background }]}
              value={r2Key}
              onChangeText={setR2Key}
              placeholder="r2_key"
              placeholderTextColor={color.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* ファイルサイズ */}
            <Text style={[styles.label, { color: color.textMuted }]}>ファイルサイズ（bytes）</Text>
            <TextInput
              style={[styles.input, { color: color.textPrimary, borderColor: color.border, backgroundColor: color.background }]}
              value={fileSize}
              onChangeText={setFileSize}
              placeholder="0"
              placeholderTextColor={color.textMuted}
              keyboardType="numeric"
            />

            {/* ステータス */}
            <Text style={[styles.label, { color: color.textMuted }]}>ステータス</Text>
            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.statusChip,
                    { backgroundColor: color.surfaceSecondary, borderColor: color.border },
                    status === opt && { backgroundColor: color.primary, borderColor: color.primary },
                  ]}
                  onPress={() => setStatus(opt)}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      { color: color.textSecondary },
                      status === opt && { color: color.textInverse, fontWeight: "600" },
                    ]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* エラーメッセージ */}
            <Text style={[styles.label, { color: color.textMuted }]}>エラーメッセージ</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { color: color.textPrimary, borderColor: color.border, backgroundColor: color.background },
              ]}
              value={errorMessage}
              onChangeText={setErrorMessage}
              placeholder="エラーが発生した場合のメッセージ"
              placeholderTextColor={color.textMuted}
              multiline
              textAlignVertical="top"
            />
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: color.divider }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: color.surfaceSecondary }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelText, { color: color.textSecondary }]}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: color.primary }]}
              onPress={handleSave}
            >
              <Text style={[styles.saveText, { color: color.textInverse }]}>保存</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
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
  form: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  input: {
    fontSize: 15,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 80,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusChipText: { fontSize: 12, fontWeight: "500" },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelText: { fontSize: 14, fontWeight: "500" },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveText: { fontSize: 14, fontWeight: "600" },
});
