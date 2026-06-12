import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Folder, Tag } from "../../../../src/types";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  folders: Folder[];
  tags: Tag[];
  selectedFolderId: string | null;
  selectedTag: string | null;
  isShowingAll: boolean;
  onSelectFolder: (id: string | null) => void;
  onSelectTag: (id: string | null) => void;
  onShowAll: () => void;
  onAddFolder: () => void;
  color: typeof ColorsLight;
};

export function FilterBar({
  folders,
  tags,
  selectedFolderId,
  selectedTag,
  isShowingAll,
  onSelectFolder,
  onSelectTag,
  onShowAll,
  onAddFolder,
  color,
}: Props) {
  return (
    <View style={[styles.wrapper, { borderBottomColor: color.divider }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {/* 「すべて」チップ */}
        <TouchableOpacity
          style={[
            styles.chip,
            { backgroundColor: color.surfaceSecondary },
            isShowingAll && { backgroundColor: color.primary },
          ]}
          onPress={onShowAll}
        >
          <Text
            style={[
              styles.chipText,
              { color: color.textSecondary },
              isShowingAll && { color: color.textInverse, fontWeight: "600" },
            ]}
          >
            すべて
          </Text>
        </TouchableOpacity>

        {/* フォルダチップ */}
        {folders.map((folder) => (
          <TouchableOpacity
            key={folder.id}
            style={[
              styles.chip,
              { backgroundColor: color.surfaceSecondary },
              selectedFolderId === folder.id && { backgroundColor: color.primary },
            ]}
            onPress={() =>
              onSelectFolder(selectedFolderId === folder.id ? null : folder.id)
            }
          >
            <Ionicons
              name="folder"
              size={13}
              color={
                selectedFolderId === folder.id
                  ? color.textInverse
                  : folder.color ?? color.textSecondary
              }
            />
            <Text
              style={[
                styles.chipText,
                { color: color.textSecondary },
                selectedFolderId === folder.id && {
                  color: color.textInverse,
                  fontWeight: "600",
                },
              ]}
            >
              {folder.name}
            </Text>
          </TouchableOpacity>
        ))}

        {/* フォルダ追加ボタン */}
        <TouchableOpacity
          style={[styles.addChip, { borderColor: color.border }]}
          onPress={onAddFolder}
        >
          <Ionicons name="add" size={14} color={color.primary} />
          <Text style={[styles.addChipText, { color: color.primary }]}>フォルダ</Text>
        </TouchableOpacity>

        {/* 区切り線 */}
        <View style={[styles.divider, { backgroundColor: color.border }]} />

        {/* タグチップ */}
        {tags.map((tag) => (
          <TouchableOpacity
            key={tag.id}
            style={[
              styles.tagChip,
              { borderColor: color.border },
              selectedTag === tag.id && {
                borderColor: color.primary,
                backgroundColor: color.primaryBg,
              },
            ]}
            onPress={() => onSelectTag(selectedTag === tag.id ? null : tag.id)}
          >
            <Text
              style={[
                styles.tagChipText,
                { color: color.textSecondary },
                selectedTag === tag.id && { color: color.primary },
              ]}
            >
              #{tag.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
  },
  row: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
    alignItems: "center",
    minHeight: 52,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  chipText: { fontSize: 13, fontWeight: "500" },
  addChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: "dashed",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  addChipText: { fontSize: 12, fontWeight: "500" },
  divider: {
    width: 1,
    height: 20,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  tagChipText: { fontSize: 12, fontWeight: "400" },
});
