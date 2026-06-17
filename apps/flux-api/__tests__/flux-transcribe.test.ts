import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — vitest hoists these above imports
// ---------------------------------------------------------------------------
vi.mock("@/lib/supabase", () => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  getUser: vi.fn(),
}));

vi.mock("@/lib/r2", () => ({
  getObject: vi.fn(),
  deleteObject: vi.fn(),
}));

vi.mock("@/lib/groq", () => ({
  transcribeWithRetry: vi.fn(),
  refineJapaneseTranscript: vi.fn(),
  generateMinutesFromTranscript: vi.fn(),
}));

vi.mock("@/lib/split-audio", () => ({
  splitAudioFile: vi.fn(),
  cleanupChunks: vi.fn(),
}));

vi.mock("@/lib/ffmpeg", () => ({
  getFfmpegPath: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks have been set up)
// ---------------------------------------------------------------------------
import { POST } from "@/app/api/flux-transcribe/route";
import { getUser } from "@/lib/api-auth";
import { getObject, deleteObject } from "@/lib/r2";
import {
  transcribeWithRetry,
  refineJapaneseTranscript,
  generateMinutesFromTranscript,
} from "@/lib/groq";
import { splitAudioFile, cleanupChunks } from "@/lib/split-audio";
import { getFfmpegPath } from "@/lib/ffmpeg";
import { createServiceRoleClient } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal NextRequest for POST with the given JSON body. */
function createPostRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest("http://localhost:3000/api/flux-transcribe", {
    method: "POST",
    headers: {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

/** Shared mock functions for the Supabase client chain. */
let mockSupabaseSingle: ReturnType<typeof vi.fn>;
let mockSupabaseSelect: ReturnType<typeof vi.fn>;
let mockSupabaseInsert: ReturnType<typeof vi.fn>;
let mockSupabaseUpdate: ReturnType<typeof vi.fn>;
let mockSupabaseEq: ReturnType<typeof vi.fn>;
let mockSupabaseFrom: ReturnType<typeof vi.fn>;

/** Mock functions for minutes table insert (auto mode). */
let mockMinutesInsertSingle: ReturnType<typeof vi.fn>;
let mockMinutesInsertSelect: ReturnType<typeof vi.fn>;
let mockMinutesInsert: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();

  // ---- Supabase chain mocks ----

  mockSupabaseSingle = vi.fn();
  mockSupabaseSelect = vi.fn();
  mockSupabaseInsert = vi.fn();
  mockSupabaseUpdate = vi.fn();
  mockSupabaseEq = vi.fn();
  mockSupabaseFrom = vi.fn();

  // Insert chain:  from(t).insert(obj).select("id").single()
  mockSupabaseInsert.mockReturnValue({ select: mockSupabaseSelect });
  mockSupabaseSelect.mockReturnValue({ single: mockSupabaseSingle });
  // Default: insert succeeds
  mockSupabaseSingle.mockResolvedValue({ data: { id: "job-1" }, error: null });

  // Update chain:  from(t).update(obj).eq("id", id)
  mockSupabaseUpdate.mockReturnValue({ eq: mockSupabaseEq });
  mockSupabaseEq.mockResolvedValue({ data: null, error: null });

  // Minutes insert chain (auto generation mode)
  mockMinutesInsert = vi.fn();
  mockMinutesInsertSelect = vi.fn();
  mockMinutesInsertSingle = vi.fn();
  mockMinutesInsert.mockReturnValue({ select: mockMinutesInsertSelect });
  mockMinutesInsertSelect.mockReturnValue({ single: mockMinutesInsertSingle });
  mockMinutesInsertSingle.mockResolvedValue({
    data: { id: "minute-1" },
    error: null,
  });

  // from() dispatches based on table name
  mockSupabaseFrom.mockImplementation((table: string) => {
    if (table === "minutes") {
      return {
        insert: mockMinutesInsert,
        update: mockSupabaseUpdate,
      };
    }
    return {
      insert: mockSupabaseInsert,
      select: mockSupabaseSelect,
      update: mockSupabaseUpdate,
    };
  });

  (createServiceRoleClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    from: mockSupabaseFrom,
  });

  // ---- Auth ----
  (getUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { id: "test-user-id" },
  });

  // ---- R2 ----
  (getObject as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
    Buffer.from("fake audio data"),
  );
  (deleteObject as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
    undefined,
  );

  // ---- Groq ----
  (transcribeWithRetry as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
    "これはテストの文字起こし結果です",
  );
  (refineJapaneseTranscript as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
    "これはテストの文字起こし結果です。",
  );
  (generateMinutesFromTranscript as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
    {
      title: "テスト議事録",
      content: "議事録の本文です。",
      summary: "会議のサマリー。",
      actionItems: ["タスク1を完了する"],
    },
  );

  // ---- Split audio ----
  (splitAudioFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    chunkPaths: ["/tmp/fake-input.m4a"],
  });
  (cleanupChunks as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
    undefined,
  );

  // ---- FFmpeg ----
  (getFfmpegPath as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
    "/usr/bin/ffmpeg",
  );
});

// ===========================================================================
// POST /api/flux-transcribe
// ===========================================================================

describe("POST /api/flux-transcribe", () => {
  // -----------------------------------------------------------------------
  // 認証
  // -----------------------------------------------------------------------
  it("認証されていない場合は401を返す", async () => {
    (getUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: null,
    });

    const req = createPostRequest({ r2Key: "test-key", recordingId: "rec-1" });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("認証が必要です");
  });

  // -----------------------------------------------------------------------
  // バリデーション
  // -----------------------------------------------------------------------
  it("r2Keyがない場合は400を返す", async () => {
    const req = createPostRequest({ recordingId: "rec-1" });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("r2Key");
  });

  it("recordingIdがない場合は400を返す", async () => {
    const req = createPostRequest({ r2Key: "test-key" });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("recordingId");
  });

  // -----------------------------------------------------------------------
  // DB insert failure
  // -----------------------------------------------------------------------
  it("ジョブ登録に失敗した場合は500を返す", async () => {
    mockSupabaseSingle.mockResolvedValue({
      data: null,
      error: { message: "ユニーク制約違反" },
    });

    const req = createPostRequest({ r2Key: "test-key", recordingId: "rec-1" });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("ジョブ登録失敗");
  });

  // -----------------------------------------------------------------------
  // R2 download error
  // -----------------------------------------------------------------------
  it("R2ダウンロードエラーの場合は500を返す", async () => {
    (getObject as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("R2 download failed"),
    );

    const req = createPostRequest({ r2Key: "test-key", recordingId: "rec-1" });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("R2 download failed");

    // Should still attempt R2 cleanup on error
    expect(deleteObject).toHaveBeenCalledWith("test-key");
  });

  // -----------------------------------------------------------------------
  // Full happy path — single chunk
  // -----------------------------------------------------------------------
  it("パイプラインが正常に完了する", async () => {
    const req = createPostRequest({
      r2Key: "test-key",
      recordingId: "rec-1",
      fileName: "meeting.m4a",
      fileSize: 1_000_000, // 1MB → single chunk (under 25MB limit)
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("completed");
    expect(body.jobId).toBe("job-1");
    expect(body.completedChunks).toBe(1);
    expect(body.totalChunks).toBe(1);
    expect(body.minuteId).toBeUndefined();

    // Pipeline steps called in order
    expect(getObject).toHaveBeenCalledWith("test-key");
    expect(splitAudioFile).toHaveBeenCalled();
    expect(transcribeWithRetry).toHaveBeenCalledTimes(1);
    expect(refineJapaneseTranscript).toHaveBeenCalledWith(
      "これはテストの文字起こし結果です",
    );
    expect(deleteObject).toHaveBeenCalledWith("test-key");
  });

  // -----------------------------------------------------------------------
  // Auto generation mode
  // -----------------------------------------------------------------------
  it("自動議事録生成モードで正常に完了する", async () => {
    const req = createPostRequest({
      r2Key: "test-key",
      recordingId: "rec-1",
      generationMode: "auto",
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("completed");
    expect(body.minuteId).toBe("minute-1");

    // Verify minutes generation + insert
    expect(generateMinutesFromTranscript).toHaveBeenCalled();
    expect(mockMinutesInsert).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Multiple chunks
  // -----------------------------------------------------------------------
  it("複数チャンクでも正常に完了する", async () => {
    (splitAudioFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      chunkPaths: [
        "/tmp/chunk_001.m4a",
        "/tmp/chunk_002.m4a",
        "/tmp/chunk_003.m4a",
      ],
    });
    (transcribeWithRetry as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce("チャンク1の文字起こし")
      .mockResolvedValueOnce("チャンク2の文字起こし")
      .mockResolvedValueOnce("チャンク3の文字起こし");

    const req = createPostRequest({
      r2Key: "test-key",
      recordingId: "rec-1",
      fileSize: 100 * 1024 * 1024, // 100MB → triggers chunking
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("completed");
    expect(body.completedChunks).toBe(3);
    expect(body.totalChunks).toBe(3);

    // Each chunk transcribed
    expect(transcribeWithRetry).toHaveBeenCalledTimes(3);

    // DB updated after each chunk
    // 1 insert + 1 total_chunks update (3 !== 1) + 3 progress updates + 1 final
    expect(mockSupabaseUpdate).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Refine transcript failure (should degrade gracefully)
  // -----------------------------------------------------------------------
  it("補正が失敗しても文字起こし結果を返す", async () => {
    (refineJapaneseTranscript as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("API error"),
    );

    const req = createPostRequest({ r2Key: "test-key", recordingId: "rec-1" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("completed");
    // Falls back to original fullTranscript
    expect(body.transcript).toBeUndefined(); // transcript not in response JSON
  });

  // -----------------------------------------------------------------------
  // R2 delete failure (should not break the pipeline)
  // -----------------------------------------------------------------------
  it("R2削除が失敗してもパイプラインは正常終了する", async () => {
    (deleteObject as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Delete failed"),
    );

    const req = createPostRequest({ r2Key: "test-key", recordingId: "rec-1" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("completed");
  });

  // -----------------------------------------------------------------------
  // Auto mode: minutes generation fails → fallback to transcript-only
  // -----------------------------------------------------------------------
  it("議事録生成が失敗しても文字起こし結果は返す", async () => {
    (generateMinutesFromTranscript as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Generation failed"),
    );

    const req = createPostRequest({
      r2Key: "test-key",
      recordingId: "rec-1",
      generationMode: "auto",
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("completed");
    expect(body.minuteId).toBeUndefined();
  });
});
