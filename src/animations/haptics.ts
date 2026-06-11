// 触覚フィードバックモジュール
// expo-haptics を使用した触覚フィードバックのラッパー
import * as Haptics from "expo-haptics";

let hapticsEnabled = true;

/**
 * 触覚フィードバックの有効/無効を設定する
 * @param enabled - true で有効、false で無効
 */
export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled;
}

/**
 * 触覚フィードバックをトリガーする
 *
 * タイプのマッピング:
 * - light    → ImpactFeedbackStyle.Light
 * - medium   → ImpactFeedbackStyle.Medium
 * - heavy    → ImpactFeedbackStyle.Heavy
 * - success  → NotificationFeedbackType.Success
 * - warning  → NotificationFeedbackType.Warning
 * - error    → NotificationFeedbackType.Error
 * - 未指定    → ImpactFeedbackStyle.Light（デフォルト）
 *
 * @param type - 触覚の種類（省略時は "light"）
 */
export function triggerHaptic(
  type?: "light" | "medium" | "heavy" | "success" | "warning" | "error"
): void {
  if (!hapticsEnabled) return;

  switch (type) {
    case "light":
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case "medium":
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case "heavy":
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case "success":
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case "warning":
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case "error":
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
    default:
      // デフォルトは軽いインパクト
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}
