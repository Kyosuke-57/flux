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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AuthData } from "../../../../src/types";
import type { ColorsLight } from "../../../../src/theme";
import { PROVIDER_OPTIONS } from "../hooks/utils";

type Props = {
  visible: boolean;
  editingItem: AuthData | null;
  provider: string;
  label: string;
  apiKey: string;
  saving: boolean;
  onProviderChange: (v: string) => void;
  onLabelChange: (v: string) => void;
  onApiKeyChange: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
  color: typeof ColorsLight;
};

export function FormModal({
  visible,
  editingItem,
  provider,
  label,
  apiKey,
  saving,
  onProviderChange,
  onLabelChange,
  onApiKeyChange,
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
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
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
                {isEditing ? "認証データを編集" : "認証データを追加"}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={[styles.close, { color: color.primary }]}>閉じる</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
              {/* ラベル */}
              <Text style={[styles.fieldLabel, { color: color.textMuted }]}>ラベル</Text>
              <TextInput
                style={[styles.input, { backgroundColor: color.background, borderColor: color.border, color: color.textPrimary }]}
                value={label}
                onChangeText={onLabelChange}
                placeholder="例: OpenAI APIキー"
                placeholderTextColor={color.textMuted}
                editable={!saving}
              />

              {/* プロバイダ */}
              <Text style={[styles.fieldLabel, { color: color.textMuted, marginTop: 12 }]}>プロバイダ</Text>
              <View style={styles.providerGrid}>
                {PROVIDER_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.providerOption,
                      {
                        backgroundColor: provider === opt.value ? color.primaryBg : color.background,
                        borderColor: provider === opt.value ? color.primary : color.border,
                      },
                    ]}
                    onPress={() => onProviderChange(opt.value)}
                    disabled={saving}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={18}
                      color={provider === opt.value ? color.primary : color.textSecondary}
                    />
                    <Text
                      style={[
                        styles.providerLabel,
                        {
                          color: provider === opt.value ? color.primary : color.textSecondary,
                          fontWeight: provider === opt.value ? "600" : "400",
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* APIキー */}
              <Text style={[styles.fieldLabel, { color: color.textMuted, marginTop: 12 }]}>
                APIキー{isEditing ? "（空欄の場合は変更なし）" : ""}
              </Text>
              <TextInput
                style={[styles.input, styles.apiKeyInput, { backgroundColor: color.background, borderColor: color.border, color: color.textPrimary }]}
                value={apiKey}
                onChangeText={onApiKeyChange}
                placeholder={isEditing ? "新しいAPIキーを入力" : "sk-..."}
                placeholderTextColor={color.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                editable={!saving}
              />

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
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
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
  apiKeyInput: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 13,
  },
  providerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  providerOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  providerLabel: {
    fontSize: 13,
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
