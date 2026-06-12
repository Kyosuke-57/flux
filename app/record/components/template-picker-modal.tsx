import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Template } from "../../../src/types";
import type { ColorsLight } from "../../../src/theme";

type Props = {
  visible: boolean;
  templates: Template[];
  templatesLoading: boolean;
  selectedTemplateId: string | null;
  onSelectTemplate: (id: string | null) => void;
  onStartTranscription: () => void;
  onClose: () => void;
  color: typeof ColorsLight;
};

export function TemplatePickerModal({
  visible,
  templates,
  templatesLoading,
  selectedTemplateId,
  onSelectTemplate,
  onStartTranscription,
  onClose,
  color,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={[styles.overlay, { backgroundColor: color.overlay }]}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={[styles.content, { backgroundColor: color.surface }]}
        >
          <View
            style={[
              styles.header,
              { borderBottomColor: color.divider },
            ]}
          >
            <Text style={[styles.title, { color: color.textPrimary }]}>
              テンプレートを選択
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.close, { color: color.primary }]}>
                閉じる
              </Text>
            </TouchableOpacity>
          </View>

          {templatesLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={color.primary} />
            </View>
          ) : (
            <ScrollView style={styles.list}>
              {/* テンプレートを使わない */}
              <TouchableOpacity
                style={[
                  styles.option,
                  { borderBottomColor: color.divider },
                  selectedTemplateId === null && {
                    backgroundColor: color.primaryBg,
                  },
                ]}
                onPress={() => onSelectTemplate(null)}
              >
                <Ionicons
                  name={
                    selectedTemplateId === null
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={20}
                  color={
                    selectedTemplateId === null
                      ? color.primary
                      : color.textMuted
                  }
                />
                <View style={styles.optionBody}>
                  <Text
                    style={[styles.optionName, { color: color.textPrimary }]}
                  >
                    テンプレートを使わない
                  </Text>
                  <Text style={[styles.optionDesc, { color: color.textMuted }]}>
                    素の文字起こし結果をそのまま議事録として作成
                  </Text>
                </View>
              </TouchableOpacity>

              {templates.length === 0 && (
                <View style={styles.empty}>
                  <Ionicons
                    name="document-text-outline"
                    size={40}
                    color={color.textMuted}
                  />
                  <Text style={[styles.emptyText, { color: color.textMuted }]}>
                    テンプレートがありません
                  </Text>
                  <Text style={[styles.emptySub, { color: color.textMuted }]}>
                    設定画面から作成できます
                  </Text>
                </View>
              )}

              {templates.map((tpl) => (
                <TouchableOpacity
                  key={tpl.id}
                  style={[
                    styles.option,
                    { borderBottomColor: color.divider },
                    selectedTemplateId === tpl.id && {
                      backgroundColor: color.primaryBg,
                    },
                  ]}
                  onPress={() => onSelectTemplate(tpl.id)}
                >
                  <Ionicons
                    name={
                      selectedTemplateId === tpl.id
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={20}
                    color={
                      selectedTemplateId === tpl.id
                        ? color.primary
                        : color.textMuted
                    }
                  />
                  <View style={styles.optionBody}>
                    <View style={styles.optionTitleRow}>
                      <Text
                        style={[
                          styles.optionName,
                          { color: color.textPrimary },
                        ]}
                        numberOfLines={1}
                      >
                        {tpl.name}
                      </Text>
                      {tpl.is_default && (
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: color.primaryBg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              { color: color.primary },
                            ]}
                          >
                            デフォルト
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.optionPreview,
                        { color: color.textSecondary },
                      ]}
                      numberOfLines={2}
                    >
                      {tpl.content}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View
            style={[styles.footer, { borderTopColor: color.divider }]}
          >
            <TouchableOpacity
              style={[
                styles.startBtn,
                {
                  backgroundColor: color.primary,
                  opacity: templatesLoading ? 0.5 : 1,
                },
              ]}
              onPress={onStartTranscription}
              disabled={templatesLoading}
            >
              <Ionicons name="mic-outline" size={18} color="#fff" />
              <Text style={styles.startBtnText}>文字起こしを開始</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
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
  loading: {
    paddingVertical: 48,
    alignItems: "center",
  },
  list: {
    maxHeight: 320,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  optionBody: {
    flex: 1,
    gap: 2,
  },
  optionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  optionName: {
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
  },
  optionDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  optionPreview: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 4,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
  },
  emptySub: {
    fontSize: 12,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  startBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
