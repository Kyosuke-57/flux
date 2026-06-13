/**
 * transcription-jobs-screen のテスト
 * - フレームワークの動作確認
 * - ユーティリティ関数の単体テスト
 */

import { describe, it, expect } from "vitest";
import { formatDate, formatFileSize, statusLabel, statusColor, sortJobs } from "../hooks/utils";
import type { TranscriptionJob } from "../../../../src/types";

// ─── フレームワーク動作確認 ───────────────────────────────

describe("vitest フレームワーク", () => {
  it("基本的なアサーションが動作する", () => {
    expect(1 + 1).toBe(2);
    expect({ a: 1 }).toEqual({ a: 1 });
    expect("hello").toContain("ell");
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
  it("0 bytes を返す", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });

  it("bytes を正しくフォーマットする", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("KB を正しくフォーマットする", () => {
    expect(formatFileSize(2048)).toBe("2.0 KB");
  });

  it("MB を正しくフォーマットする", () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("GB を正しくフォーマットする", () => {
    expect(formatFileSize(3 * 1024 * 1024 * 1024)).toBe("3.0 GB");
  });
});

// ─── statusLabel ────────────────────────────────────────────

describe("statusLabel", () => {
  it("queued → 待機中", () => {
    expect(statusLabel("queued")).toBe("待機中");
  });

  it("processing → 処理中", () => {
    expect(statusLabel("processing")).toBe("処理中");
  });

  it("completed → 完了", () => {
    expect(statusLabel("completed")).toBe("完了");
  });

  it("failed → 失敗", () => {
    expect(statusLabel("failed")).toBe("失敗");
  });

  it("不明なステータスはそのまま返す", () => {
    expect(statusLabel("unknown")).toBe("unknown");
  });
});

// ─── sortJobs ─────────────────────────────────────────────

function makeJob(overrides: Partial<TranscriptionJob>): TranscriptionJob {
  return {
    id: "test-id",
    user_id: "user-1",
    recording_id: "rec-1",
    r2_key: "key",
    file_name: "test.mp3",
    file_size: 1000,
    status: "completed",
    total_chunks: 1,
    completed_chunks: 1,
    groq_retry_count: 0,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

describe("sortJobs", () => {
  const a = makeJob({ id: "1", file_name: "Aファイル.mp3", created_at: "2026-06-01T00:00:00Z", status: "queued" });
  const b = makeJob({ id: "2", file_name: "Bファイル.mp3", created_at: "2026-06-10T00:00:00Z", status: "processing" });
  const c = makeJob({ id: "3", file_name: "Cファイル.mp3", created_at: "2026-06-20T00:00:00Z", status: "completed" });
  const d = makeJob({ id: "4", file_name: "Dファイル.mp3", created_at: "2026-06-15T00:00:00Z", status: "failed" });

  it("日付昇順でソートする", () => {
    const result = sortJobs([c, a, d, b], "date", "asc");
    expect(result.map((j) => j.id)).toEqual(["1", "2", "4", "3"]);
  });

  it("日付降順でソートする", () => {
    const result = sortJobs([a, b, c, d], "date", "desc");
    expect(result.map((j) => j.id)).toEqual(["3", "4", "2", "1"]);
  });

  it("名前昇順でソートする", () => {
    const result = sortJobs([c, a, d, b], "name", "asc");
    expect(result.map((j) => j.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("名前降順でソートする", () => {
    const result = sortJobs([a, b, c, d], "name", "desc");
    expect(result.map((j) => j.id)).toEqual(["4", "3", "2", "1"]);
  });

  it("ステータス昇順でソートする (queued→processing→completed→failed)", () => {
    const result = sortJobs([c, a, d, b], "status", "asc");
    expect(result.map((j) => j.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("ステータス降順でソートする (failed→completed→processing→queued)", () => {
    const result = sortJobs([a, b, c, d], "status", "desc");
    expect(result.map((j) => j.id)).toEqual(["4", "3", "2", "1"]);
  });

  it("元の配列を変更しない（イミュータブル）", () => {
    const original = [c, a, d, b];
    const originalIds = original.map((j) => j.id);
    sortJobs(original, "date", "asc");
    expect(original.map((j) => j.id)).toEqual(originalIds);
  });
});

// ─── statusColor ────────────────────────────────────────────

describe("statusColor", () => {
  it("queued は黄色を返す", () => {
    expect(statusColor("queued")).toBe("#F59E0B");
  });

  it("processing は青を返す", () => {
    expect(statusColor("processing")).toBe("#3B82F6");
  });

  it("completed は緑を返す", () => {
    expect(statusColor("completed")).toBe("#22C55E");
  });

  it("failed は赤を返す", () => {
    expect(statusColor("failed")).toBe("#EF4444");
  });

  it("不明なステータスはグレーを返す", () => {
    expect(statusColor("unknown")).toBe("#94A3B8");
  });
});
