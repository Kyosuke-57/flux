/**
 * pipeline-manager のテスト
 * - ユーティリティ関数の単体テスト
 */

import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatFileSize,
  getProgressLabel,
  getStatusLabel,
  sortJobs,
  STATUS_LABELS,
} from "../hooks/utils";
import type { TranscriptionJob } from "../../../../src/types";

// ─── vitest フレームワーク動作確認 ───────────────────────────

describe("vitest フレームワーク", () => {
  it("基本的なアサーションが動作する", () => {
    expect(1 + 1).toBe(2);
    expect({ a: 1 }).toEqual({ a: 1 });
    expect("hello").toContain("ell");
  });
});

// ─── getStatusLabel ──────────────────────────────────────────

describe("getStatusLabel", () => {
  it("すべてのステータスに対応するラベルが存在する", () => {
    for (const [key, label] of Object.entries(STATUS_LABELS)) {
      expect(getStatusLabel(key as any)).toBe(label);
    }
  });

  it("未知のステータスはそのまま返す", () => {
    expect(getStatusLabel("unknown" as any)).toBe("unknown");
  });
});

// ─── formatDate ──────────────────────────────────────────────

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

// ─── formatFileSize ──────────────────────────────────────────

describe("formatFileSize", () => {
  it("1KB未満はバイト単位で表示する", () => {
    expect(formatFileSize(500)).toBe("500B");
  });

  it("1KB以上1MB未満はKB単位で表示する", () => {
    expect(formatFileSize(2048)).toBe("2.0KB");
  });

  it("1MB以上はMB単位で表示する", () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0MB");
  });

  it("0バイトを正しく処理する", () => {
    expect(formatFileSize(0)).toBe("0B");
  });
});

// ─── getProgressLabel ────────────────────────────────────────

describe("getProgressLabel", () => {
  it("正しい進捗文字列を返す", () => {
    expect(getProgressLabel(3, 10)).toBe("3/10");
  });

  it("totalが0の場合は — を返す", () => {
    expect(getProgressLabel(0, 0)).toBe("—");
  });

  it("totalが負の値の場合も — を返す", () => {
    const result = getProgressLabel(0, -1);
    expect(result).toBe("—");
  });
});

// ─── sortJobs ──────────────────────────────────────────────────

const mockJobs: TranscriptionJob[] = [
  {
    id: "1",
    user_id: "u1",
    recording_id: "r1",
    r2_key: "k1",
    file_name: "打ち合わせ_2026年6月",
    file_size: 1024,
    status: "completed",
    total_chunks: 10,
    completed_chunks: 10,
    groq_retry_count: 0,
    created_at: "2026-06-14T10:00:00Z",
    updated_at: "2026-06-14T10:30:00Z",
  },
  {
    id: "2",
    user_id: "u1",
    recording_id: "r2",
    r2_key: "k2",
    file_name: "定例会議_2026年6月",
    file_size: 2048,
    status: "processing",
    total_chunks: 5,
    completed_chunks: 2,
    groq_retry_count: 0,
    created_at: "2026-06-15T10:00:00Z",
    updated_at: "2026-06-15T10:05:00Z",
  },
  {
    id: "3",
    user_id: "u1",
    recording_id: "r3",
    r2_key: "k3",
    file_name: "AWS勉強会",
    file_size: 512,
    status: "failed",
    total_chunks: 8,
    completed_chunks: 3,
    groq_retry_count: 2,
    error_message: "timeout",
    created_at: "2026-06-13T10:00:00Z",
    updated_at: "2026-06-13T10:20:00Z",
  },
  {
    id: "4",
    user_id: "u1",
    recording_id: "r4",
    r2_key: "k4",
    file_name: "朝会",
    file_size: 300,
    status: "queued",
    total_chunks: 6,
    completed_chunks: 0,
    groq_retry_count: 0,
    created_at: "2026-06-16T10:00:00Z",
    updated_at: "2026-06-16T10:00:00Z",
  },
];

describe("sortJobs", () => {
  it("デフォルトは日付降順（新しい順）", () => {
    const result = sortJobs(mockJobs);
    expect(result[0].id).toBe("4"); // 6/16
    expect(result[1].id).toBe("2"); // 6/15
    expect(result[2].id).toBe("1"); // 6/14
    expect(result[3].id).toBe("3"); // 6/13
  });

  it("日付昇順（古い順）", () => {
    const result = sortJobs(mockJobs, "date", "asc");
    expect(result[0].id).toBe("3"); // 6/13
    expect(result[1].id).toBe("1"); // 6/14
    expect(result[2].id).toBe("2"); // 6/15
    expect(result[3].id).toBe("4"); // 6/16
  });

  it("名前昇順（ASCII → JIS X 0208 順）", () => {
    const result = sortJobs(mockJobs, "name", "asc");
    // localeCompare("ja") は ASCII → JIS X 0208 順
    expect(result[0].file_name).toBe("AWS勉強会");
    expect(result[1].file_name).toBe("打ち合わせ_2026年6月");
    expect(result[2].file_name).toBe("朝会");
    expect(result[3].file_name).toBe("定例会議_2026年6月");
  });

  it("名前降順", () => {
    const result = sortJobs(mockJobs, "name", "desc");
    expect(result[0].file_name).toBe("定例会議_2026年6月");
    expect(result[3].file_name).toBe("AWS勉強会");
  });

  it("ステータス昇順（queued→processing→completed→failed）", () => {
    const result = sortJobs(mockJobs, "status", "asc");
    expect(result[0].status).toBe("queued");
    expect(result[1].status).toBe("processing");
    expect(result[2].status).toBe("completed");
    expect(result[3].status).toBe("failed");
  });

  it("ステータス降順", () => {
    const result = sortJobs(mockJobs, "status", "desc");
    expect(result[0].status).toBe("failed");
    expect(result[3].status).toBe("queued");
  });

  it("元のリストを変更しない", () => {
    const originalIds = mockJobs.map((j) => j.id);
    sortJobs(mockJobs, "name", "asc");
    expect(mockJobs.map((j) => j.id)).toEqual(originalIds);
  });
});
