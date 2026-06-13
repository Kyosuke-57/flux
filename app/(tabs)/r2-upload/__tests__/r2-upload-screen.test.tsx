/**
 * r2-upload-screen のテスト
 * - フレームワークの動作確認
 * - ユーティリティ関数の単体テスト
 */

import { describe, it, expect } from "vitest";
import { formatDate, formatFileSize, getStatusLabel, sortJobsBy } from "../hooks/utils";
import type { SortField, SortOrder } from "../hooks/utils";
import type { TranscriptionJob } from "../../../../src/types";

// ─── フレームワーク動作確認 ───────────────────────────────

describe("vitest フレームワーク", () => {
  it("基本的なアサーションが動作する", () => {
    expect(1 + 1).toBe(2);
    expect({ a: 1 }).toEqual({ a: 1 });
    expect("hello").toContain("ell");
  });
});

// ─── getStatusLabel ─────────────────────────────────────────

describe("getStatusLabel", () => {
  it("各ステータスに対応する日本語ラベルを返す", () => {
    expect(getStatusLabel("queued")).toBe("待機中");
    expect(getStatusLabel("processing")).toBe("処理中");
    expect(getStatusLabel("completed")).toBe("完了");
    expect(getStatusLabel("failed")).toBe("失敗");
  });

  it("未知のステータスはそのまま返す", () => {
    expect(getStatusLabel("unknown" as any)).toBe("unknown");
  });
});

// ─── formatDate ─────────────────────────────────────────────

describe("formatDate", () => {
  it("ISO文字列を日本語形式でフォーマットする", () => {
    const result = formatDate("2026-06-12T10:30:00Z");
    expect(result).toContain("6月");
    expect(result).toContain("12日");
  });

  it("異なる日付でも正しくフォーマットされる", () => {
    const result = formatDate("2025-01-01T00:00:00Z");
    expect(result).toContain("1月");
    expect(result).toContain("1日");
  });
});

// ─── formatFileSize ─────────────────────────────────────────

describe("formatFileSize", () => {
  it("1024未満はB表記", () => {
    expect(formatFileSize(500)).toBe("500B");
  });

  it("1024以上はKB表記", () => {
    expect(formatFileSize(2048)).toBe("2.0KB");
  });

  it("1MB以上はMB表記", () => {
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2.0MB");
  });
});

// ─── sortJobsBy ─────────────────────────────────────────────

describe("sortJobsBy", () => {
  const sampleItems: TranscriptionJob[] = [
    {
      id: "1",
      user_id: "u1",
      file_name: "meeting_notes.m4a",
      r2_key: "audio/meeting-2026.m4a",
      recording_id: "rec1",
      file_size: 1024,
      status: "completed",
      total_chunks: 1,
      completed_chunks: 1,
      transcript: "",
      error_message: null,
      groq_retry_count: 0,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-01T00:00:00Z",
    },
    {
      id: "2",
      user_id: "u1",
      file_name: "interview_session.wav",
      r2_key: "audio/interview-2026.wav",
      recording_id: "rec2",
      file_size: 2048,
      status: "queued",
      total_chunks: 1,
      completed_chunks: 1,
      transcript: null,
      error_message: null,
      groq_retry_count: 0,
      created_at: "2026-06-02T00:00:00Z",
      updated_at: "2026-06-02T00:00:00Z",
    },
    {
      id: "3",
      user_id: "u1",
      file_name: "presentation.mp3",
      r2_key: "audio/presentation-2026.mp3",
      recording_id: "rec3",
      file_size: 4096,
      status: "failed",
      total_chunks: 5,
      completed_chunks: 2,
      transcript: null,
      error_message: "error",
      groq_retry_count: 2,
      created_at: "2026-06-03T00:00:00Z",
      updated_at: "2026-06-03T00:00:00Z",
    },
  ];

  it("日付昇順でソートする", () => {
    const sorted = sortJobsBy(sampleItems, "date", "asc");
    expect(sorted[0].id).toBe("1");
    expect(sorted[1].id).toBe("2");
    expect(sorted[2].id).toBe("3");
  });

  it("日付降順でソートする", () => {
    const sorted = sortJobsBy(sampleItems, "date", "desc");
    expect(sorted[0].id).toBe("3");
    expect(sorted[1].id).toBe("2");
    expect(sorted[2].id).toBe("1");
  });

  it("名前昇順でソートする", () => {
    const sorted = sortJobsBy(sampleItems, "name", "asc");
    expect(sorted[0].id).toBe("2"); // interview_session.wav
    expect(sorted[1].id).toBe("1"); // meeting_notes.m4a
    expect(sorted[2].id).toBe("3"); // presentation.mp3
  });

  it("名前降順でソートする", () => {
    const sorted = sortJobsBy(sampleItems, "name", "desc");
    expect(sorted[0].id).toBe("3"); // presentation.mp3
    expect(sorted[1].id).toBe("1"); // meeting_notes.m4a
    expect(sorted[2].id).toBe("2"); // interview_session.wav
  });

  it("ステータス昇順でソートする（queued→processing→completed→failed）", () => {
    const sorted = sortJobsBy(sampleItems, "status", "asc");
    expect(sorted[0].status).toBe("queued");  // id=2
    expect(sorted[1].status).toBe("completed"); // id=1
    expect(sorted[2].status).toBe("failed");   // id=3
  });

  it("元の配列は変更しない", () => {
    const original = [...sampleItems];
    sortJobsBy(sampleItems, "name", "asc");
    expect(sampleItems).toEqual(original);
  });
});

// ─── 検索フィルタリングロジック ────────────────────────────

describe("検索フィルタリング", () => {
  const sampleItems: TranscriptionJob[] = [
    {
      id: "1",
      user_id: "u1",
      file_name: "meeting_notes.m4a",
      r2_key: "audio/meeting-2026.m4a",
      recording_id: "rec1",
      file_size: 1024,
      status: "completed",
      total_chunks: 1,
      completed_chunks: 1,
      transcript: "",
      error_message: null,
      groq_retry_count: 0,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-01T00:00:00Z",
    },
    {
      id: "2",
      user_id: "u1",
      file_name: "interview_session.wav",
      r2_key: "audio/interview-2026.wav",
      recording_id: "rec2",
      file_size: 2048,
      status: "queued",
      total_chunks: 1,
      completed_chunks: 0,
      transcript: null,
      error_message: null,
      groq_retry_count: 0,
      created_at: "2026-06-02T00:00:00Z",
      updated_at: "2026-06-02T00:00:00Z",
    },
    {
      id: "3",
      user_id: "u1",
      file_name: "presentation.mp3",
      r2_key: "audio/presentation-2026.mp3",
      recording_id: "rec3",
      file_size: 4096,
      status: "failed",
      total_chunks: 5,
      completed_chunks: 2,
      transcript: null,
      error_message: "error",
      groq_retry_count: 2,
      created_at: "2026-06-03T00:00:00Z",
      updated_at: "2026-06-03T00:00:00Z",
    },
  ];

  it("空の検索クエリは全件返す", () => {
    const q = "";
    const result = sampleItems.filter(
      (item) =>
        item.file_name.toLowerCase().includes(q.toLowerCase()) ||
        item.r2_key.toLowerCase().includes(q.toLowerCase()),
    );
    expect(result).toHaveLength(3);
  });

  it("ファイル名で部分一致検索できる", () => {
    const q = "meeting";
    const result = sampleItems.filter(
      (item) =>
        item.file_name.toLowerCase().includes(q.toLowerCase()) ||
        item.r2_key.toLowerCase().includes(q.toLowerCase()),
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("R2キーで部分一致検索できる", () => {
    const q = "interview";
    const result = sampleItems.filter(
      (item) =>
        item.file_name.toLowerCase().includes(q.toLowerCase()) ||
        item.r2_key.toLowerCase().includes(q.toLowerCase()),
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("大文字小文字を区別しない", () => {
    const q = "PRESENTATION";
    const result = sampleItems.filter(
      (item) =>
        item.file_name.toLowerCase().includes(q.toLowerCase()) ||
        item.r2_key.toLowerCase().includes(q.toLowerCase()),
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("該当なしの場合は空配列を返す", () => {
    const q = "存在しない";
    const result = sampleItems.filter(
      (item) =>
        item.file_name.toLowerCase().includes(q.toLowerCase()) ||
        item.r2_key.toLowerCase().includes(q.toLowerCase()),
    );
    expect(result).toHaveLength(0);
  });

  it("R2キーでも部分一致検索できる（キーの一部）", () => {
    const q = "audio/";
    const result = sampleItems.filter(
      (item) =>
        item.file_name.toLowerCase().includes(q.toLowerCase()) ||
        item.r2_key.toLowerCase().includes(q.toLowerCase()),
    );
    expect(result).toHaveLength(3);
  });
});
