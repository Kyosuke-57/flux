import React from "react";
import { View, Text, TouchableOpacity, Modal, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Template } from "../../../src/types";
import { INDUSTRY_TEMPLATES } from "../../../src/data/industry-templates";
import { useThemeColors } from "../../../src/hooks/useThemeColors";
import { styles } from "../styles/minuteStyles";

interface TemplatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  templates: Template[];
  onApply: (template: { name: string; content: string }) => void;
  onPreview: (template: { name: string; content: string }) => void;
}

type TemplateItem =
  | { type: "user"; data: Template }
  | { type: "industry"; data: (typeof INDUSTRY_TEMPLATES)[number] };

/**
 * テンプレート選択モーダル。
 * マイテンプレート + 業種別テンプレートを一覧表示する。
 */
export function TemplatePickerModal({
  visible,
  onClose,
  templates,
  onApply,
  onPreview,
}: TemplatePickerModalProps) {
  const c = useThemeColors();

  const data: TemplateItem[] = [
    ...templates.map((t) => ({ type: "user" as const, data: t })),
    ...INDUSTRY_TEMPLATES.map((p) => ({ type: "industry" as const, data: p })),
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
        <View style={[styles.modalContent, { backgroundColor: c.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: c.divider }]}>
            <Text style={[styles.modalTitle, { color: c.textPrimary }]}>テンプレートを適用</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.modalClose, { color: c.primary }]}>閉じる</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            contentContainerStyle={styles.templateList}
            ListHeaderComponent={
              templates.length > 0 ? (
                <Text style={[styles.templateSectionLabel, { color: c.textMuted }]}>マイテンプレート</Text>
              ) : null
            }
            data={data}
            keyExtractor={(item) =>
              item.type === "user" ? item.data.id : `preset_${item.data.id}`
            }
            renderItem={({ item, index }) => {
              const isFirstIndustry =
                item.type === "industry" &&
                (index === templates.length || (templates.length === 0 && index === 0));
              return (
                <>
                  {isFirstIndustry && (
                    <Text style={[styles.templateSectionLabel, { color: c.textMuted, marginTop: 16 }]}>
                      業種別テンプレート
                    </Text>
                  )}
                  <TouchableOpacity
                    style={[styles.templateCard, { backgroundColor: c.background, borderColor: c.cardBorder }]}
                    onPress={() => onApply(item.data)}
                    onLongPress={() => onPreview(item.data)}
                  >
                    <View style={styles.templateCardHeader}>
                      {item.type === "industry" && (
                        <View style={[styles.templateCategoryBadge, { backgroundColor: c.primaryBg }]}>
                          <Text style={[styles.templateCategoryText, { color: c.primary }]}>
                            {(item.data as (typeof INDUSTRY_TEMPLATES)[number]).category}
                          </Text>
                        </View>
                      )}
                      <Text style={[styles.templateCardName, { color: c.textPrimary }]}>
                        {item.data.name}
                      </Text>
                      {item.type === "user" && (item.data as Template).is_default && (
                        <View style={[styles.defaultBadge, { backgroundColor: c.primaryBg }]}>
                          <Text style={[styles.defaultBadgeText, { color: c.primary }]}>デフォルト</Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[styles.templateCardPreview, { color: c.textSecondary }]}
                      numberOfLines={3}
                    >
                      {item.data.content.replace(/[#*`\[\]]/g, "").trim() || "（空）"}
                    </Text>
                  </TouchableOpacity>
                </>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
