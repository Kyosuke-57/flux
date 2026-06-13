import { describe, it, expect, vi, beforeEach } from "vitest";

// ----- hoisted mock functions (available to vi.mock factories) -----
const channelCallbacks = vi.hoisted(() => ({
  onCallback: null as ((payload: any) => void) | null,
  subscribeCallback: null as ((status: string) => void) | null,
  lastChannelMock: null as {
    on: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
    unsubscribe: ReturnType<typeof vi.fn>;
  } | null,
}));

// ----- module mocks (same pattern as removeHallucinations.test.ts) -----
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    channel: vi.fn(() => {
      const channelMock = {
        on: vi.fn(
          (_event: string, _config: any, callback: (payload: any) => void) => {
            channelCallbacks.onCallback = callback;
            return channelMock;
          },
        ),
        subscribe: vi.fn((callback?: (status: string) => void) => {
          if (callback) {
            channelCallbacks.subscribeCallback = callback;
          }
          return channelMock;
        }),
        unsubscribe: vi.fn(),
      };
      channelCallbacks.lastChannelMock = channelMock;
      return channelMock;
    }),
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

// ----- imports (after vi.mock — vitest hoists them) -----
import {
  startTranscription,
  subscribeToTranscription,
  removeHallucinations,
} from "../services/transcription";
import { supabase } from "../lib/supabase";

// ----- tests -----
describe("transcription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    channelCallbacks.onCallback = null;
    channelCallbacks.subscribeCallback = null;
    channelCallbacks.lastChannelMock = null;
  });

  describe("startTranscription", () => {
    const baseParams = {
      r2Key: "audio/test.mp3",
      recordingId: "rec-123",
      fileSize: 1024,
      fileName: "test.mp3",
    };

    it("認証トークンがない場合にエラーを投げる", async () => {
      await expect(startTranscription(baseParams)).rejects.toThrow(
        "認証されていません。ログインしてください。",
      );
    });

    it("認証済みの場合にAPIを呼び出してjobIdを返す", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ jobId: "job-456" }),
      });
      vi.stubGlobal("fetch", fetchMock);

      (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { session: { access_token: "test-token" } },
      });

      const jobId = await startTranscription(baseParams);

      expect(jobId).toBe("job-456");
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/flux-transcribe$/),
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(baseParams),
        }),
      );
    });

    it("APIエラー時にエラーメッセージを投げる", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      });
      vi.stubGlobal("fetch", fetchMock);

      (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { session: { access_token: "test-token" } },
      });

      await expect(startTranscription(baseParams)).rejects.toThrow(
        "文字起こし依頼に失敗しました: 500 Internal Server Error",
      );
    });

    it("APIエラー時にレスポンスボディが読めなくてもエラーを投げる", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.reject(new Error("empty")),
      });
      vi.stubGlobal("fetch", fetchMock);

      (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { session: { access_token: "test-token" } },
      });

      await expect(startTranscription(baseParams)).rejects.toThrow(
        "文字起こし依頼に失敗しました: 400 ",
      );
    });

    it("templateContentとgenerationModeを渡せる", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ jobId: "789" }),
      });
      vi.stubGlobal("fetch", fetchMock);

      (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { session: { access_token: "test-token" } },
      });

      const params = {
        ...baseParams,
        templateContent: "# 議事録\n\n{{text}}",
        generationMode: "auto" as const,
      };

      await startTranscription(params);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(params),
        }),
      );
    });
  });

  describe("subscribeToTranscription", () => {
    it("チャンネルを作成して購読し、unsubscribe関数を返す", () => {
      const onProgress = vi.fn();
      const unsubscribe = subscribeToTranscription("789", onProgress);

      expect(unsubscribe).toBeInstanceOf(Function);
      expect(supabase.channel).toHaveBeenCalledWith(
        "transcription-job-789",
      );
      expect(channelCallbacks.onCallback).not.toBeNull();
      expect(channelCallbacks.subscribeCallback).not.toBeNull();
    });

    it("UPDATEペイロードを受け取ったらonProgressを呼ぶ", () => {
      const onProgress = vi.fn();
      subscribeToTranscription("789", onProgress);

      channelCallbacks.onCallback!({
        new: {
          status: "processing",
          completed_chunks: 5,
          total_chunks: 18,
          progress_detail: "処理中...",
          minute_id: null,
          transcript: null,
          error_message: null,
        },
      });

      expect(onProgress).toHaveBeenCalledTimes(1);
      expect(onProgress).toHaveBeenCalledWith({
        status: "processing",
        completedChunks: 5,
        totalChunks: 18,
        progress: "5/18",
        progressDetail: "処理中...",
        minuteId: undefined,
        transcript: undefined,
        errorMessage: undefined,
      });
    });

    it("completedステータスで自動的に購読解除する", () => {
      const onProgress = vi.fn();
      subscribeToTranscription("789", onProgress);

      channelCallbacks.onCallback!({
        new: {
          status: "completed",
          completed_chunks: 18,
          total_chunks: 18,
          progress_detail: null,
          minute_id: "min-001",
          transcript: "完全な文字起こしテキスト",
          error_message: null,
        },
      });

      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({ status: "completed" }),
      );
      expect(
        channelCallbacks.lastChannelMock!.unsubscribe,
      ).toHaveBeenCalled();
    });

    it("failedステータスで自動的に購読解除する", () => {
      const onProgress = vi.fn();
      const onError = vi.fn();
      subscribeToTranscription("789", onProgress, onError);

      channelCallbacks.onCallback!({
        new: {
          status: "failed",
          completed_chunks: 3,
          total_chunks: 18,
          progress_detail: null,
          minute_id: null,
          transcript: null,
          error_message: "音声ファイルが破損しています",
        },
      });

      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "failed",
          errorMessage: "音声ファイルが破損しています",
        }),
      );
      expect(
        channelCallbacks.lastChannelMock!.unsubscribe,
      ).toHaveBeenCalled();
    });

    it("CHANNEL_ERRORでonErrorが呼ばれる", () => {
      const onProgress = vi.fn();
      const onError = vi.fn();
      subscribeToTranscription("789", onProgress, onError);

      channelCallbacks.subscribeCallback!("CHANNEL_ERROR");

      expect(onError).toHaveBeenCalledWith(
        "Realtime 接続エラー: CHANNEL_ERROR",
      );
    });

    it("TIMED_OUTでonErrorが呼ばれる", () => {
      const onProgress = vi.fn();
      const onError = vi.fn();
      subscribeToTranscription("789", onProgress, onError);

      channelCallbacks.subscribeCallback!("TIMED_OUT");

      expect(onError).toHaveBeenCalledWith(
        "Realtime 接続エラー: TIMED_OUT",
      );
    });

    it("onError未指定でもエラーステータスで例外を投げない", () => {
      const onProgress = vi.fn();
      subscribeToTranscription("789", onProgress);

      expect(() => {
        channelCallbacks.subscribeCallback!("CHANNEL_ERROR");
      }).not.toThrow();
    });

    it("返されたunsubscribe関数で購読解除できる", () => {
      const onProgress = vi.fn();
      const unsubscribe = subscribeToTranscription("789", onProgress);

      unsubscribe();

      expect(
        channelCallbacks.lastChannelMock!.unsubscribe,
      ).toHaveBeenCalled();
    });
  });

  describe("removeHallucinations (export check)", () => {
    it("関数がエクスポートされている", () => {
      expect(removeHallucinations).toBeInstanceOf(Function);
    });

    it("基本的な幻覚除去が機能する", () => {
      const result = removeHallucinations(
        "会議の内容です。\nご視聴ありがとうございました。",
      );
      expect(result).toBe("会議の内容です。");
    });
  });
});
