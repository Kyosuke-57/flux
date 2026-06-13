import { describe, it, expect, vi } from "vitest";
import type {
  RecordingState,
  RecordingConfig,
  RecordingResult,
} from "../services/recording-types";

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

describe("recording-types", () => {
  describe("RecordingState", () => {
    it("idle 状態を許容する", () => {
      const state: RecordingState = "idle";
      expect(state).toBe("idle");
    });

    it("recording 状態を許容する", () => {
      const state: RecordingState = "recording";
      expect(state).toBe("recording");
    });

    it("paused 状態を許容する", () => {
      const state: RecordingState = "paused";
      expect(state).toBe("paused");
    });

    it("3つの状態を持つユニオン型として定義されている", () => {
      const validStates: RecordingState[] = ["idle", "recording", "paused"];
      expect(validStates).toHaveLength(3);
    });
  });

  describe("RecordingConfig", () => {
    it("空のオブジェクトとして生成できる（全てのフィールドが省略可能）", () => {
      const config: RecordingConfig = {};
      expect(config).toEqual({});
    });

    it("quality のみを設定できる", () => {
      const config: RecordingConfig = { quality: "high" };
      expect(config.quality).toBe("high");
    });

    it("bitRate のみを設定できる", () => {
      const config: RecordingConfig = { bitRate: 128000 };
      expect(config.bitRate).toBe(128000);
    });

    it("sampleRate のみを設定できる", () => {
      const config: RecordingConfig = { sampleRate: 44100 };
      expect(config.sampleRate).toBe(44100);
    });

    it("全てのフィールドを設定できる", () => {
      const config: RecordingConfig = {
        quality: "lossless",
        bitRate: 256000,
        sampleRate: 48000,
      };
      expect(config.quality).toBe("lossless");
      expect(config.bitRate).toBe(256000);
      expect(config.sampleRate).toBe(48000);
    });

    it("設定されていないフィールドは undefined になる", () => {
      const config: RecordingConfig = { quality: "low" };
      expect(config.bitRate).toBeUndefined();
      expect(config.sampleRate).toBeUndefined();
    });
  });

  describe("RecordingResult", () => {
    it("必須フィールド uri と durationMs を持つ", () => {
      const result: RecordingResult = {
        uri: "file:///recording.mp4",
        durationMs: 10000,
      };
      expect(result.uri).toBe("file:///recording.mp4");
      expect(result.durationMs).toBe(10000);
    });

    it("uri の型は string である", () => {
      const result: RecordingResult = {
        uri: "file:///test.m4a",
        durationMs: 5000,
      };
      expect(typeof result.uri).toBe("string");
    });

    it("durationMs の型は number である", () => {
      const result: RecordingResult = {
        uri: "file:///test.m4a",
        durationMs: 5000,
      };
      expect(typeof result.durationMs).toBe("number");
    });

    it("fileSize は省略可能で未設定時は undefined になる", () => {
      const result: RecordingResult = {
        uri: "file:///test.m4a",
        durationMs: 5000,
      };
      expect(result.fileSize).toBeUndefined();
    });

    it("fileSize を指定できる", () => {
      const result: RecordingResult = {
        uri: "file:///test.m4a",
        durationMs: 5000,
        fileSize: 2048576,
      };
      expect(result.fileSize).toBe(2048576);
    });

    it("fileSize の型は number である", () => {
      const result: RecordingResult = {
        uri: "file:///test.m4a",
        durationMs: 5000,
        fileSize: 1024,
      };
      expect(typeof result.fileSize).toBe("number");
    });
  });
});
