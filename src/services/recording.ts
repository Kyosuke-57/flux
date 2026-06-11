/**
 * Recording service — expo-audio ベースの録音機能（ネイティブ用）
 */
import { AudioModule, RecordingPresets, setAudioModeAsync } from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import type { RecordingState, RecordingResult } from "./recording-types";
export type { RecordingState, RecordingResult };

/**
 * 録音オプション
 * prepareToRecordAsync() に渡すことで createRecordingOptions による
 * プラットフォーム固有設定のフラット化が行われ、高音質で録音される
 */
const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  bitRate: 192000,
  isMeteringEnabled: true,
  android: {
    ...RecordingPresets.HIGH_QUALITY.android,
    audioSource: "mic" as const,
  },
};

type AudioRecorderInstance = InstanceType<typeof AudioModule.AudioRecorder>;
let _recorder: AudioRecorderInstance | null = null;
let _state: RecordingState = "idle";

async function ensurePermissions(): Promise<boolean> {
  const { granted } = await AudioModule.requestRecordingPermissionsAsync();
  return granted;
}

export async function startRecording(): Promise<void> {
  if (_state === "recording") {
    console.warn("[recording] Already recording — ignoring startRecording()");
    return;
  }
  if (_state === "paused") {
    console.warn("[recording] Recording is paused — call resumeRecording() instead");
    return;
  }

  const hasPermission = await ensurePermissions();
  if (!hasPermission) {
    throw new Error("Microphone permission was denied. Cannot start recording.");
  }

  await setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: true,
  });

  const AudioRecorderCtor = AudioModule.AudioRecorder!;
  _recorder = new AudioRecorderCtor(RECORDING_OPTIONS);
  // prepareToRecordAsync にオプションを渡すことで
  // expo-audio の createRecordingOptions が iOS/Android 設定をフラット化する
  await _recorder.prepareToRecordAsync(RECORDING_OPTIONS);
  _recorder.record();
  _state = "recording";
}

export async function stopRecording(): Promise<RecordingResult> {
  if (!_recorder) {
    throw new Error("No recording in progress. Call startRecording() first.");
  }

  const durationMs = Math.round(_recorder.currentTime * 1000);
  await _recorder.stop();
  const uri = _recorder.uri;

  _recorder = null;
  _state = "idle";

  await setAudioModeAsync({
    playsInSilentMode: false,
    allowsRecording: false,
  });

  if (!uri) {
    throw new Error("Recording finished but no URI was produced.");
  }

  return { uri, durationMs };
}

export async function pauseRecording(): Promise<void> {
  if (!_recorder || _state !== "recording") {
    throw new Error("Cannot pause — no active recording.");
  }
  _recorder.pause();
  _state = "paused";
}

export async function resumeRecording(): Promise<void> {
  if (!_recorder || _state !== "paused") {
    throw new Error("Cannot resume — recording is not paused.");
  }
  _recorder.record();
  _state = "recording";
}

export async function getRecordingStatus() {
  if (!_recorder) return null;
  return _recorder.getStatus();
}

/**
 * 録音中の音量メータリングをポーリングで取得
 * @param callback 音量レベル（dB）を受け取るコールバック。録音中は定期的に呼ばれる
 * @param intervalMs ポーリング間隔（ms）
 * @returns 購読解除関数
 */
export function startMeteringPolling(
  callback: (metering: number) => void,
  intervalMs: number = 100,
): () => void {
  const timer = setInterval(async () => {
    if (!_recorder) return;
    try {
      const status = await _recorder.getStatus();
      if (status && typeof status.metering === "number") {
        callback(status.metering);
      }
    } catch {
      // ポーリングエラーは無視
    }
  }, intervalMs);

  return () => clearInterval(timer);
}

export async function importAudio(): Promise<DocumentPicker.DocumentPickerResult | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "audio/*",
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  return result;
}

export async function getDuration(uri: string): Promise<number> {
  const { createAudioPlayer } = await import("expo-audio");
  const player = createAudioPlayer({ uri });
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setInterval(() => {
        if (player.isLoaded) {
          clearInterval(timer);
          resolve();
        }
      }, 50);
      setTimeout(() => {
        clearInterval(timer);
        reject(new Error("Timeout loading audio"));
      }, 10000);
    });
    return Math.round(player.duration * 1000);
  } finally {
    player.remove();
  }
}
