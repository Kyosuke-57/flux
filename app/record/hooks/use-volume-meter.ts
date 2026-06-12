import { useState, useEffect } from "react";
import { startMeteringPolling } from "../../../src/services/recording";
import type { RecordingState } from "../../../src/services/recording-types";

/**
 * 録音中の音量メータリングを取得するフック
 * @param recState 録音状態（"recording" のときのみポーリング）
 * @returns 0-1 に正規化された音量レベル
 */
export function useVolumeMeter(recState: RecordingState): number {
  const [audioVolume, setAudioVolume] = useState(0);

  useEffect(() => {
    if (recState !== "recording") {
      setAudioVolume(0);
      return;
    }

    const unsub = startMeteringPolling((metering: number) => {
      // 実用レンジ -50dB（無音）〜 -10dB（大声）を 0-1 にマッピング
      const clamped = Math.max(-50, Math.min(-10, metering));
      const normalized = (clamped + 50) / 40;
      const volume = Math.pow(normalized, 1.8);
      setAudioVolume(volume);
    }, 80);

    return () => {
      unsub();
      setAudioVolume(0);
    };
  }, [recState]);

  return audioVolume;
}
