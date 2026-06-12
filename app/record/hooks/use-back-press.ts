import { useEffect } from "react";
import { BackHandler, Alert } from "react-native";
import { router } from "expo-router";
import type { RecordingState } from "../../../src/services/recording-types";

/**
 * Android ハードウェア戻るボタンの処理フック
 * 録音中/一時停止中/処理中は確認ダイアログを表示する
 */
export function useBackPress(
  recState: RecordingState,
  isProcessing: boolean,
) {
  useEffect(() => {
    const onBackPress = () => {
      if (recState === "recording" || recState === "paused") {
        Alert.alert(
          "録音をキャンセルしますか？",
          "録音データは破棄されます。",
          [
            { text: "続けて録音", style: "cancel" },
            {
              text: "キャンセルする",
              style: "destructive",
              onPress: () => router.back(),
            },
          ],
        );
        return true;
      }
      if (isProcessing) {
        Alert.alert(
          "処理中です",
          "文字起こし処理を中断して戻りますか？",
          [
            { text: "待つ", style: "cancel" },
            {
              text: "中断する",
              style: "destructive",
              onPress: () => router.back(),
            },
          ],
        );
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );
    return () => subscription.remove();
  }, [recState, isProcessing]);
}
