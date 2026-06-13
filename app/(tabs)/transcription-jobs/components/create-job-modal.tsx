import React, { useState } from "react";
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
import type { Recording } from "../../../../src/types";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  visible: boolean;
  recordings: Recording[];
  onClose: () => void;
  onCreate: (input: {
    recording_id: string;
    r2_key: string;
    file_name: string;
    file_size: number;
  }) => void;
  color: typeof ColorsLight;
};

export function CreateJobModal({
  visible,
  recordings,
  onClose,
  onCreate,
  color,
}: Props) {
  const [selectedRecordingId, setSelectedRecordingId] = useState<string>("");
  const [r2Key, setR2Key] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");

  const handleRecordingSelect = (recording: Recording) => {
    setSelectedRecordingId(recording.id);
    if (!fileName) setFileName(recording.title || recording.file_path.split("/").pop() || "");
    setFileSize("");
  };

  const handleSubmit = () => {
    if (!selectedRecordingId || !r2Key.trim() || !fileName.trim()) return;
    onCreate({
      recording_id: selectedRecordingId,
      r2_key: r2Key.trim(),
      file_name: fileName.trim(),
      file_size: parseInt(fileSize, 10) || 0,
    });
    resetForm();
  };

  const resetForm = () => {
    setSelectedRecordingId("");
    setR2Key("");
    setFileName("");
    setFileSize("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.overlay, { backgroundColor: color.overlay }]}
      >
        <View style={[styles.modal, { backgroundColor: color.surface }]}>
          <View style={[styles.header, { borderBottomColor: color.divider }]}>
            <Text style={[styles.title, { color: color.textPrimary }]}>
              新規文字起こしジョブ
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={22} color={color.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.form}>
            {/* 録音選択 */}
            <Text style={[styles.label, { color: color.textMuted }]}>録音データ</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recordingList}>
              {recordings.map((rec) => (
                <TouchableOpacity
                  key={rec.id}
                  style={[
                    styles.recordingChip,
                    {
                      backgroundColor: color.surfaceSecondary,
                      borderColor: selectedRecordingId === rec.id ? color.primary : color.border,
                    },
                  ]}
                  onPress={() => handleRecordingSelect(rec)}
                >
                  <Ionicons
                    name="musical-note"
                    size={14}
                    color={selectedRecordingId === rec.id ? color.primary : color.textMuted}
                  />
                  <Text
                    style={[
                      styles.recordingChipText,
                      { color: selectedRecordingId === rec.id ? color.primary : color.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {rec.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* R2 Key */}
            <Text style={[styles.label, { color: color.textMuted }]}>R2 Key</Text>
            <TextInput
              style={[styles.input, { color: color.textPrimary, borderColor: color.border, backgroundColor: color.background }]}
              value={r2Key}
              onChangeText={setR2Key}
              placeholder="例: recordings/uuid/file.mp3"
              placeholderTextColor={color.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* ファイル名 */}
            <Text style={[styles.label, { color: color.textMuted }]}>ファイル名</Text>
            <TextInput
              style={[styles.input, { color: color.textPrimary, borderColor: color.border, backgroundColor: color.background }]}
              value={fileName}
              onChangeText={setFileName}
              placeholder="ファイル名"
              placeholderTextColor={color.textMuted}
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
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: color.divider }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: color.surfaceSecondary }]}
              onPress={handleClose}
            >
              <Text style={[styles.cancelText, { color: color.textSecondary }]}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: color.primary },
                (!selectedRecordingId || !r2Key.trim() || !fileName.trim()) && { opacity: 0.5 },
              ]}
              onPress={handleSubmit}
              disabled={!selectedRecordingId || !r2Key.trim() || !fileName.trim()}
            >
              <Text style={[styles.submitText, { color: color.textInverse }]}>作成</Text>
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
  recordingList: {
    marginBottom: 4,
  },
  recordingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 8,
  },
  recordingChipText: {
    fontSize: 13,
    fontWeight: "500",
    maxWidth: 120,
  },
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
  submitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitText: { fontSize: 14, fontWeight: "600" },
});
