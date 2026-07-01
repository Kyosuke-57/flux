import React from "react";
import { ActionSheet } from "../../../src/components/ActionSheet";

interface ConfirmDeleteDialogProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * 削除確認の ActionSheet。
 */
export function ConfirmDeleteDialog({ visible, onCancel, onConfirm }: ConfirmDeleteDialogProps) {
  return (
    <ActionSheet
      visible={visible}
      title="議事録を削除"
      options={[
        { label: "削除する", onPress: onConfirm, destructive: true },
      ]}
      onClose={onCancel}
    />
  );
}
