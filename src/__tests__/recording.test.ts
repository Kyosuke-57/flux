import { describe, it, expect, vi, beforeEach } from "vitest";


// ---- Mock external packages (same pattern as removeHallucinations.test.ts) ----

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
  })),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock("react-native-url-polyfill/auto", () => ({}));

// ---- Mock expo-audio ----

const { mockRecorderInstance, mockPlayerInstance } = vi.hoisted(() => ({
  mockRecorderInstance: {
    currentTime: 0,
    uri: "file:///mock/recording.m4a",
    prepareToRecordAsync: vi.fn().mockResolvedValue(undefined),
    record: vi.fn(),
    stop: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    getStatus: vi.fn().mockResolvedValue({ metering: -20 }),
    remove: vi.fn(),
  },
  mockPlayerInstance: {
    isLoaded: true,
    duration: 10,
    remove: vi.fn(),
  },
}));

vi.mock("expo-audio", () => ({
  AudioModule: {
    requestRecordingPermissionsAsync: vi
      .fn()
      .mockResolvedValue({
        granted: true,
        status: "granted" as PermissionStatus,
        expires: "never" as const,
        canAskAgain: true,
      }),
    AudioRecorder: vi.fn(function () { return mockRecorderInstance; }),
  },
  RecordingPresets: {
    HIGH_QUALITY: {
      bitRate: 192000,
      isMeteringEnabled: true,
      android: { audioSource: "mic" as const },
    } as const,
  },
  setAudioModeAsync: vi.fn(),
  createAudioPlayer: vi.fn(() => mockPlayerInstance),
}));

// ---- Mock expo-document-picker ----

vi.mock("expo-document-picker", () => ({
  getDocumentAsync: vi.fn(),
}));

// ---- Imports under test ----

import { AudioModule, setAudioModeAsync } from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import type { RecordingResult, RecordingState } from "../services/recording-types";
import type { PermissionStatus } from "expo-modules-core";

type RecordingModule = typeof import("../services/recording");
let recording: RecordingModule;

beforeEach(async () => {
  vi.clearAllMocks();
  mockRecorderInstance.currentTime = 0;
  mockRecorderInstance.uri = "file:///mock/recording.m4a";
  vi.resetModules();
  recording = await import("../services/recording");
});

// ---- Tests ----

describe("startRecording", () => {
  it("既に録音中の場合は何もせずに戻る", async () => {
    await recording.startRecording();
    await expect(recording.startRecording()).resolves.toBeUndefined();
  });

  it("一時停止中は何もせずに戻る", async () => {
    await recording.startRecording();
    await recording.pauseRecording();
    await expect(recording.startRecording()).resolves.toBeUndefined();
  });

  it("マイク許可がない場合はエラーを投げる", async () => {
    vi.mocked(
      AudioModule.requestRecordingPermissionsAsync,
    ).mockResolvedValueOnce({
      granted: false,
      status: "denied" as PermissionStatus,
      expires: "never" as const,
      canAskAgain: true,
    });
    await expect(recording.startRecording()).rejects.toThrow(
      "Microphone permission was denied",
    );
  });

  it("正常に録音を開始する", async () => {
    await recording.startRecording();

    expect(
      AudioModule.requestRecordingPermissionsAsync,
    ).toHaveBeenCalledOnce();
    expect(setAudioModeAsync).toHaveBeenCalledWith({
      playsInSilentMode: true,
      allowsRecording: true,
    });
    expect(AudioModule.AudioRecorder).toHaveBeenCalledOnce();
    expect(mockRecorderInstance.prepareToRecordAsync).toHaveBeenCalledOnce();
    expect(mockRecorderInstance.record).toHaveBeenCalledOnce();
  });
});

describe("stopRecording", () => {
  it("録音中でない場合はエラーを投げる", async () => {
    await expect(recording.stopRecording()).rejects.toThrow(
      "No recording in progress",
    );
  });

  it("正常に録音を停止して結果を返す", async () => {
    mockRecorderInstance.currentTime = 12.5;
    await recording.startRecording();

    const result = await recording.stopRecording();

    expect(result).toEqual({
      uri: "file:///mock/recording.m4a",
      durationMs: 12500,
    });
    expect(mockRecorderInstance.stop).toHaveBeenCalledOnce();
    expect(setAudioModeAsync).toHaveBeenLastCalledWith({
      playsInSilentMode: false,
      allowsRecording: false,
    });
  });

  it("URI が空の場合はエラーを投げる", async () => {
    await recording.startRecording();
    mockRecorderInstance.uri = "";

    await expect(recording.stopRecording()).rejects.toThrow(
      "Recording finished but no URI was produced.",
    );
  });
});

describe("pauseRecording", () => {
  it("録音中でない場合はエラーを投げる", async () => {
    await expect(recording.pauseRecording()).rejects.toThrow(
      "Cannot pause — no active recording.",
    );
  });

  it("正常に一時停止する", async () => {
    await recording.startRecording();
    await recording.pauseRecording();

    expect(mockRecorderInstance.pause).toHaveBeenCalledOnce();
  });
});

describe("resumeRecording", () => {
  it("一時停止中でない場合はエラーを投げる", async () => {
    await expect(recording.resumeRecording()).rejects.toThrow(
      "Cannot resume — recording is not paused.",
    );
  });

  it("正常に再開する", async () => {
    await recording.startRecording();
    await recording.pauseRecording();
    await recording.resumeRecording();

    expect(mockRecorderInstance.record).toHaveBeenCalledTimes(2);
  });
});

describe("getRecordingStatus", () => {
  it("録音中でない場合は null を返す", async () => {
    await expect(recording.getRecordingStatus()).resolves.toBeNull();
  });

  it("録音中のステータスを返す", async () => {
    await recording.startRecording();

    const status = await recording.getRecordingStatus();

    expect(status).toEqual({ metering: -20 });
    expect(mockRecorderInstance.getStatus).toHaveBeenCalledOnce();
  });
});

describe("startMeteringPolling", () => {
  it("購読解除関数を返す", () => {
    const cleanup = recording.startMeteringPolling(vi.fn());
    expect(cleanup).toBeInstanceOf(Function);
    cleanup();
  });

  it("定期的に音量メータリングをコールバックに渡す", async () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    await recording.startRecording();
    const cleanup = recording.startMeteringPolling(callback, 100);

    await vi.advanceTimersByTimeAsync(300);

    expect(callback).toHaveBeenCalledWith(-20);
    expect(callback).toHaveBeenCalledTimes(3);

    cleanup();
    vi.useRealTimers();
  });

  it("録音中でない場合はコールバックを呼ばない", () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const cleanup = recording.startMeteringPolling(callback, 100);

    vi.advanceTimersByTime(500);

    expect(callback).not.toHaveBeenCalled();

    cleanup();
    vi.useRealTimers();
  });

  it("購読解除関数でポーリングを停止する", () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const cleanup = recording.startMeteringPolling(callback, 100);

    cleanup();
    vi.advanceTimersByTime(500);

    expect(callback).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe("importAudio", () => {
  it("キャンセル時は null を返す", async () => {
    vi.mocked(DocumentPicker.getDocumentAsync).mockResolvedValueOnce({
      canceled: true,
      assets: null,
    } as unknown as Awaited<
      ReturnType<typeof DocumentPicker.getDocumentAsync>
    >);

    const result = await recording.importAudio();

    expect(result).toBeNull();
  });

  it("正常にファイルを選択した場合は結果を返す", async () => {
    const pickerResult = {
      canceled: false,
      assets: [
        {
          uri: "file:///audio.m4a",
          name: "audio.m4a",
          mimeType: "audio/mp4",
        },
      ],
    } as unknown as Awaited<
      ReturnType<typeof DocumentPicker.getDocumentAsync>
    >;
    vi.mocked(DocumentPicker.getDocumentAsync).mockResolvedValueOnce(
      pickerResult,
    );

    const result = await recording.importAudio();

    expect(result).toEqual(pickerResult);
    expect(DocumentPicker.getDocumentAsync).toHaveBeenCalledWith({
      type: "audio/*",
      copyToCacheDirectory: true,
    });
  });
});

describe("getDuration", () => {
  it("音声ファイルの再生時間をミリ秒で返す", async () => {
    const duration = await recording.getDuration("file:///test.m4a");

    expect(duration).toBe(10000);
  });
});

describe("型の再エクスポート", () => {
  it("RecordingState と RecordingResult がエクスポートされている", () => {
    const state: RecordingState = "idle";
    expect(state).toBe("idle");
    const result: RecordingResult = { uri: "file:///test.m4a", durationMs: 0 };
    expect(result.uri).toBe("file:///test.m4a");
    expect(result.durationMs).toBe(0);
  });
});
