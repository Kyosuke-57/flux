import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import type { ColorsLight } from "../../../../src/theme";

type Props = {
  visible: boolean;
  newFolderName: string;
  onNewFolderNameChange: (text: string) => void;
  onClose: () => void;
  onCreate: () => void;
  color: typeof ColorsLight;
};

export function CreateFolderModal({
  visible,
  newFolderName,
  onNewFolderNameChange,
  onClose,
  onCreate,
  color,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: color.overlay }]}>
        <View style={[styles.modal, { backgroundColor: color.surface }]}>
          <Text style={[styles.title, { color: color.textPrimary }]}>
            新しいフォルダ
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: color.textPrimary,
                borderColor: color.border,
                backgroundColor: color.background,
              },
            ]}
            value={newFolderName}
            onChangeText={onNewFolderNameChange}
            placeholder="フォルダ名"
            placeholderTextColor={color.textMuted}
            autoFocus
          />
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                { backgroundColor: color.surfaceSecondary },
              ]}
              onPress={onClose}
            >
              <Text style={[styles.cancelText, { color: color.textSecondary }]}>
                キャンセル
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: color.primary }]}
              onPress={onCreate}
            >
              <Text style={[styles.confirmText, { color: color.textInverse }]}>
                作成
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    marginHorizontal: 40,
    borderRadius: 16,
    padding: 24,
    gap: 16,
    width: "80%",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  input: {
    fontSize: 15,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelText: { fontSize: 14, fontWeight: "500" },
  confirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmText: { fontSize: 14, fontWeight: "600" },
});
