import { useRef, useCallback } from "react";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

/**
 * 音声再生状態を管理するカスタムフック。
 *
 * 責務:
 * - useAudioPlayer / useAudioPlayerStatus のラッパー
 * - 時間フォーマット (fmt)
 * - seekBarWidth 参照
 */
export function useMinutePlayback(recordingPath: string | null) {
  const player = useAudioPlayer(recordingPath, { updateInterval: 250 });
  const playerStatus = useAudioPlayerStatus(player);
  const seekBarWidth = useRef(0);

  /**
   * 秒数を "MM:SS" 形式にフォーマット。
   * 非有限値の場合は "--:--" を返す。
   */
  const fmt = useCallback((s: number) => {
    if (!isFinite(s)) return "--:--";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }, []);

  return {
    player,
    playerStatus,
    fmt,
    seekBarWidth,
  };
}
