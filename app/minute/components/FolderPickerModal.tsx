import React from "react";
import { View, Text, TouchableOpacity, Modal, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Folder } from "../../../src/types";
import { useThemeColors } from "../../../src/hooks/useThemeColors";
import { styles } from "../styles/minuteStyles";

interface FolderPickerModalProps {
  visible: boolean;
  onClose: () => void;
  folders: Folder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

/**
 * フォルダ選択モーダル。
 */
export function FolderPickerModal({
  visible,
  onClose,
  folders,
  selectedFolderId,
  onSelectFolder,
}: FolderPickerModalProps) {
  const c = useThemeColors();

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
            <Text style={[styles.modalTitle, { color: c.textPrimary }]}>フォルダを選択</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.modalClose, { color: c.primary }]}>閉じる</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            contentContainerStyle={styles.folderList}
            data={folders}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: c.textMuted }]}>
                フォルダがありません
              </Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.folderItem,
                  { backgroundColor: c.background, borderColor: c.cardBorder },
                  selectedFolderId === item.id && { borderColor: c.primary, borderWidth: 2 },
                ]}
                onPress={() => {
                  onSelectFolder(selectedFolderId === item.id ? null : item.id);
                  onClose();
                }}
              >
                <Ionicons name="folder" size={22} color={item.color ?? c.primary} />
                <Text style={[styles.folderItemName, { color: c.textPrimary }]}>
                  {item.name}
                </Text>
                {selectedFolderId === item.id && (
                  <Ionicons name="checkmark-circle" size={20} color={c.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}
