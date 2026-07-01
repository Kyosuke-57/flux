import React from "react";
import { ActionSheet } from "../../../src/components/ActionSheet";

interface MinuteShareSheetProps {
  visible: boolean;
  onClose: () => void;
  onShare: (format: "txt" | "md" | "pdf" | "docx") => void;
}

/**
 * 共有形式選択の ActionSheet。
 */
export function MinuteShareSheet({ visible, onClose, onShare }: MinuteShareSheetProps) {
  return (
    <ActionSheet
      visible={visible}
      title="共有形式を選択"
      options={[
        { label: "テキスト (.txt)", onPress: () => onShare("txt") },
        { label: "Markdown (.md)", onPress: () => onShare("md") },
        { label: "PDF (.pdf)", onPress: () => onShare("pdf") },
        { label: "Word (.docx)", onPress: () => onShare("docx") },
      ]}
      onClose={onClose}
    />
  );
}
