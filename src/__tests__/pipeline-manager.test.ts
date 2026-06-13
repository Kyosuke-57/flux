import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const { mockUploadToR2, mockStartTranscription, mockSubscribeToTranscription } =
  vi.hoisted(() => ({
    mockUploadToR2: vi.fn(),
    mockStartTranscription: vi.fn(),
    mockSubscribeToTranscription: vi.fn(
      (_jobId: string, _onProgress: any, _onError?: any) => vi.fn(),
    ),
  }));

// expo-file-system は動的 import されるため、モックして即解決させる
vi.mock("expo-file-system", () => ({
  File: vi.fn(() => ({
    info: vi.fn(() => ({ size: 0 })),
  })),
  documentDirectory: null,
  cacheDirectory: null,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: { access_token: "test-token" } } }),
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
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

vi.mock("../services/r2-upload", () => ({
  uploadToR2: mockUploadToR2,
}));

vi.mock("../services/transcription", () => ({
  startTranscription: mockStartTranscription,
  subscribeToTranscription: mockSubscribeToTranscription,
}));

import { pipelineManager, subscribeToPipeline } from "../services/pipeline-manager";
import { supabase } from "../lib/supabase";

// ─── Helpers ────────────────────────────────────────────────────────────────

function triggerPostgresCallback(
  channel: any,
  payload: { new: Record<string, any> },
) {
  const call = channel.on.mock.calls.find(
    (c: any[]) => c[0] === "postgres_changes",
  );
  if (!call) throw new Error("No postgres_changes handler registered");
  call[2](payload);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // reset は _listeners をクリアしないので手動でクリア
  (pipelineManager as any)._listeners = [];
  pipelineManager.reset();
});

// ─── 1. Exports ─────────────────────────────────────────────────────────────

describe("exports", () => {
  it("pipelineManager がエクスポートされている", () => {
    expect(pipelineManager).toBeDefined();
    expect(typeof pipelineManager.startPipeline).toBe("function");
    expect(typeof pipelineManager.reset).toBe("function");
    expect(typeof pipelineManager.addListener).toBe("function");
  });

  it("subscribeToPipeline がエクスポートされている", () => {
    expect(subscribeToPipeline).toBeDefined();
    expect(typeof subscribeToPipeline).toBe("function");
  });
});

// ─── 2. pipelineManager ─────────────────────────────────────────────────────

describe("pipelineManager", () => {
  describe("初期状態", () => {
    it("status は idle", () => {
      expect(pipelineManager.status).toBe("idle");
    });
    it("uploadProgress は 0", () => {
      expect(pipelineManager.uploadProgress).toBe(0);
    });
    it("transcriptionProgress は null", () => {
      expect(pipelineManager.transcriptionProgress).toBeNull();
    });
    it("errorMessage は null", () => {
      expect(pipelineManager.errorMessage).toBeNull();
    });
    it("minuteId は null", () => {
      expect(pipelineManager.minuteId).toBeNull();
    });
  });

  describe("addListener", () => {
    it("リスナーを登録し状態変化時に呼び出す", () => {
      const listener = vi.fn();
      pipelineManager.addListener(listener);

      (pipelineManager as any)._setStatus("uploading");

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("返された unsubscribe 関数でリスナーを解除できる", () => {
      const listener = vi.fn();
      const unsub = pipelineManager.addListener(listener);
      unsub();

      (pipelineManager as any)._setStatus("uploading");

      expect(listener).not.toHaveBeenCalled();
    });

    it("複数のリスナーを登録できる", () => {
      const a = vi.fn();
      const b = vi.fn();
      pipelineManager.addListener(a);
      pipelineManager.addListener(b);

      (pipelineManager as any)._setStatus("uploading");

      expect(a).toHaveBeenCalledTimes(1);
      expect(b).toHaveBeenCalledTimes(1);
    });
  });

  describe("startPipeline - 成功", () => {
    beforeEach(() => {
      mockUploadToR2.mockResolvedValue({ r2Key: "test-key" });
      mockStartTranscription.mockResolvedValue("job-123");
    });

    it("アップロード処理中は status が uploading になる", async () => {
      mockUploadToR2.mockImplementation(async (_params, _onProgress) => {
        // uploadToR2 が呼ばれた時点で status は既に uploading になっている
        expect(pipelineManager.status).toBe("uploading");
        return { r2Key: "test-key" };
      });

      await pipelineManager.startPipeline("file:///audio.m4a");

      // アップロード完了後は transcribing に進んでいる
      expect(pipelineManager.status).toBe("transcribing");
    });

    it("uploadToR2 に uri を渡す", async () => {
      await pipelineManager.startPipeline("file:///test.m4a");

      expect(mockUploadToR2).toHaveBeenCalledWith(
        expect.objectContaining({ uri: "file:///test.m4a" }),
        expect.any(Function),
      );
    });

    it("アップロード完了後 status が transcribing, uploadProgress が 100 になる", async () => {
      await pipelineManager.startPipeline("file:///test.m4a");

      expect(pipelineManager.status).toBe("transcribing");
      expect(pipelineManager.uploadProgress).toBe(100);
    });

    it("startTranscription に r2Key を渡す", async () => {
      await pipelineManager.startPipeline("file:///test.m4a");

      expect(mockStartTranscription).toHaveBeenCalledWith(
        expect.objectContaining({ r2Key: "test-key" }),
      );
    });

    it("subscribeToTranscription に jobId を渡す", async () => {
      await pipelineManager.startPipeline("file:///test.m4a");

      expect(mockSubscribeToTranscription).toHaveBeenCalledWith(
        "job-123",
        expect.any(Function),
        expect.any(Function),
      );
    });

    it("文字起こし完了で status が completed, minuteId が設定される", async () => {
      mockSubscribeToTranscription.mockImplementation((_id, onProgress) => {
        onProgress({
          status: "completed",
          completedChunks: 18,
          totalChunks: 18,
          progress: "18/18",
          minuteId: "minute-1",
        });
        return vi.fn();
      });

      await pipelineManager.startPipeline("file:///test.m4a");

      expect(pipelineManager.status).toBe("completed");
      expect(pipelineManager.transcriptionProgress?.status).toBe("completed");
      expect(pipelineManager.minuteId).toBe("minute-1");
    });

    it("templateContent があれば startTranscription に渡される", async () => {
      await pipelineManager.startPipeline(
        "file:///test.m4a",
        "議事録テンプレート",
      );

      expect(mockStartTranscription).toHaveBeenCalledWith(
        expect.objectContaining({ templateContent: "議事録テンプレート" }),
      );
    });

    it("進捗通知が transcriptionProgress に反映される", async () => {
      mockSubscribeToTranscription.mockImplementation((_id, onProgress) => {
        onProgress({
          status: "processing",
          completedChunks: 5,
          totalChunks: 18,
          progress: "5/18",
        });
        return vi.fn();
      });

      await pipelineManager.startPipeline("file:///test.m4a");

      expect(pipelineManager.transcriptionProgress).toEqual(
        expect.objectContaining({
          status: "processing",
          completedChunks: 5,
          totalChunks: 18,
        }),
      );
    });
  });

  describe("startPipeline - エラー系", () => {
    it("uploadToR2 が失敗すると status が failed になる", async () => {
      mockUploadToR2.mockRejectedValue(new Error("R2 upload error"));

      await expect(
        pipelineManager.startPipeline("file:///test.m4a"),
      ).rejects.toThrow("R2 upload error");

      expect(pipelineManager.status).toBe("failed");
      expect(pipelineManager.errorMessage).toBe("R2 upload error");
    });

    it("文字起こし失敗で status が failed になる", async () => {
      mockUploadToR2.mockResolvedValue({ r2Key: "test-key" });
      mockStartTranscription.mockResolvedValue("job-123");
      mockSubscribeToTranscription.mockImplementation((_id, onProgress) => {
        onProgress({
          status: "failed",
          completedChunks: 3,
          totalChunks: 18,
          progress: "3/18",
          errorMessage: "文字起こしエラー",
        });
        return vi.fn();
      });

      await pipelineManager.startPipeline("file:///test.m4a");

      expect(pipelineManager.status).toBe("failed");
      expect(pipelineManager.errorMessage).toBe("文字起こしエラー");
    });

    it("文字起こし失敗時に errorMessage が無い場合はデフォルトメッセージ", async () => {
      mockUploadToR2.mockResolvedValue({ r2Key: "test-key" });
      mockStartTranscription.mockResolvedValue("job-123");
      mockSubscribeToTranscription.mockImplementation((_id, onProgress) => {
        onProgress({
          status: "failed",
          completedChunks: 0,
          totalChunks: 0,
          progress: "0/0",
        });
        return vi.fn();
      });

      await pipelineManager.startPipeline("file:///test.m4a");

      expect(pipelineManager.status).toBe("failed");
      expect(pipelineManager.errorMessage).toBe("文字起こしに失敗しました");
    });

    it("Realtime 購読のエラーコールバックで status が failed になる", async () => {
      mockUploadToR2.mockResolvedValue({ r2Key: "test-key" });
      mockStartTranscription.mockResolvedValue("job-123");
      mockSubscribeToTranscription.mockImplementation(
        (_id, _onProgress, onError) => {
          onError?.("subscription connection lost");
          return vi.fn();
        },
      );

      await pipelineManager.startPipeline("file:///test.m4a");

      expect(pipelineManager.status).toBe("failed");
      expect(pipelineManager.errorMessage).toBe("subscription connection lost");
    });

    it("uploadToR2 が r2Key を返さない場合はエラーになる", async () => {
      mockUploadToR2.mockResolvedValue({ r2Key: "" });

      await expect(
        pipelineManager.startPipeline("file:///test.m4a"),
      ).rejects.toThrow("アップロードに失敗しました");

      expect(pipelineManager.status).toBe("failed");
    });

    it("予期しないエラーをキャッチして failed にする", async () => {
      mockUploadToR2.mockRejectedValue({});

      await expect(
        pipelineManager.startPipeline("file:///test.m4a"),
      ).rejects.toEqual({});

      expect(pipelineManager.status).toBe("failed");
      expect(pipelineManager.errorMessage).toBe(
        "パイプライン処理中にエラーが発生しました",
      );
    });
  });

  describe("reset", () => {
    it("全ての状態を初期値に戻す", async () => {
      // 一旦エラー状態を作る
      mockUploadToR2.mockRejectedValue(new Error("fail"));
      await expect(
        pipelineManager.startPipeline("file:///test.m4a"),
      ).rejects.toThrow();

      pipelineManager.reset();

      expect(pipelineManager.status).toBe("idle");
      expect(pipelineManager.uploadProgress).toBe(0);
      expect(pipelineManager.transcriptionProgress).toBeNull();
      expect(pipelineManager.errorMessage).toBeNull();
      expect(pipelineManager.minuteId).toBeNull();
    });

    it("reset がリスナーに通知する", () => {
      const listener = vi.fn();
      pipelineManager.addListener(listener);

      pipelineManager.reset();

      expect(listener).toHaveBeenCalled();
    });
  });
});

// ─── 3. subscribeToPipeline ─────────────────────────────────────────────────

describe("subscribeToPipeline", () => {
  const callbacks = {
    onProgress: vi.fn(),
    onComplete: vi.fn(),
    onError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("unsubscribe 関数を返す", () => {
    const unsub = subscribeToPipeline("minute-1", callbacks);
    expect(typeof unsub).toBe("function");
  });

  it("supabase.channel を正しい名前で作成する", () => {
    subscribeToPipeline("minute-1", callbacks);

    expect(supabase.channel).toHaveBeenCalledWith("pipeline-minute-1");
  });

  it("postgres_changes のフィルターが minute_id に設定される", () => {
    subscribeToPipeline("minute-1", callbacks);

    const channel = (supabase.channel as any).mock.results[0].value;
    const onCall = channel.on.mock.calls.find(
      (c: any[]) => c[0] === "postgres_changes",
    );
    expect(onCall).toBeDefined();
    expect(onCall[1]).toEqual(
      expect.objectContaining({
        event: "UPDATE",
        schema: "public",
        table: "transcription_jobs",
        filter: "minute_id=eq.minute-1",
      }),
    );
  });

  it("UPDATE で onProgress が呼ばれる", () => {
    subscribeToPipeline("minute-1", callbacks);
    const channel = (supabase.channel as any).mock.results[0].value;

    triggerPostgresCallback(channel, {
      new: {
        status: "processing",
        completed_chunks: 5,
        total_chunks: 18,
        minute_id: null,
        transcript: null,
        error_message: null,
        progress_detail: null,
      },
    });

    expect(callbacks.onProgress).toHaveBeenCalledTimes(1);
    expect(callbacks.onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ status: "processing" }),
    );
    expect(callbacks.onComplete).not.toHaveBeenCalled();
    expect(callbacks.onError).not.toHaveBeenCalled();
  });

  it("completed ステータスで onProgress + onComplete が呼ばれる", () => {
    subscribeToPipeline("minute-1", callbacks);
    const channel = (supabase.channel as any).mock.results[0].value;

    triggerPostgresCallback(channel, {
      new: {
        status: "completed",
        completed_chunks: 18,
        total_chunks: 18,
        minute_id: "minute-1",
        transcript: "全文テキスト",
        error_message: null,
        progress_detail: null,
      },
    });

    expect(callbacks.onProgress).toHaveBeenCalledTimes(1);
    expect(callbacks.onComplete).toHaveBeenCalledTimes(1);
    expect(callbacks.onError).not.toHaveBeenCalled();
  });

  it("completed 時にチャンネルの購読が解除される", () => {
    subscribeToPipeline("minute-1", callbacks);
    const channel = (supabase.channel as any).mock.results[0].value;

    triggerPostgresCallback(channel, {
      new: {
        status: "completed",
        completed_chunks: 18,
        total_chunks: 18,
        minute_id: "minute-1",
        transcript: null,
        error_message: null,
        progress_detail: null,
      },
    });

    expect(channel.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("failed ステータスで onProgress + onError が呼ばれる", () => {
    subscribeToPipeline("minute-1", callbacks);
    const channel = (supabase.channel as any).mock.results[0].value;

    triggerPostgresCallback(channel, {
      new: {
        status: "failed",
        completed_chunks: 3,
        total_chunks: 18,
        minute_id: "minute-1",
        transcript: null,
        error_message: "処理エラー",
        progress_detail: null,
      },
    });

    expect(callbacks.onProgress).toHaveBeenCalledTimes(1);
    expect(callbacks.onError).toHaveBeenCalledTimes(1);
    expect(callbacks.onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "処理エラー" }),
    );
    expect(callbacks.onComplete).not.toHaveBeenCalled();
  });

  it("failed 時に error_message が無い場合はデフォルトメッセージ", () => {
    subscribeToPipeline("minute-1", callbacks);
    const channel = (supabase.channel as any).mock.results[0].value;

    triggerPostgresCallback(channel, {
      new: {
        status: "failed",
        completed_chunks: 0,
        total_chunks: 0,
        minute_id: null,
        transcript: null,
        error_message: null,
        progress_detail: null,
      },
    });

    expect(callbacks.onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "文字起こしに失敗しました" }),
    );
  });

  it("failed 時にチャンネルの購読が解除される", () => {
    subscribeToPipeline("minute-1", callbacks);
    const channel = (supabase.channel as any).mock.results[0].value;

    triggerPostgresCallback(channel, {
      new: {
        status: "failed",
        completed_chunks: 0,
        total_chunks: 0,
        minute_id: null,
        transcript: null,
        error_message: "err",
        progress_detail: null,
      },
    });

    expect(channel.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("CHANNEL_ERROR で onError が呼ばれる", () => {
    subscribeToPipeline("minute-1", callbacks);
    const channel = (supabase.channel as any).mock.results[0].value;

    const subscribeCb = channel.subscribe.mock.calls[0][0];
    subscribeCb("CHANNEL_ERROR");

    expect(callbacks.onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Realtime 接続エラー: CHANNEL_ERROR" }),
    );
  });

  it("TIMED_OUT で onError が呼ばれる", () => {
    subscribeToPipeline("minute-1", callbacks);
    const channel = (supabase.channel as any).mock.results[0].value;

    const subscribeCb = channel.subscribe.mock.calls[0][0];
    subscribeCb("TIMED_OUT");

    expect(callbacks.onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Realtime 接続エラー: TIMED_OUT" }),
    );
  });

  it("unsubscribe 関数でチャンネル購読を解除できる", () => {
    const unsub = subscribeToPipeline("minute-1", callbacks);
    const channel = (supabase.channel as any).mock.results[0].value;

    unsub();

    expect(channel.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
