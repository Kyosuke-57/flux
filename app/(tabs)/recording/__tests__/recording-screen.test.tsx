/**
 * recording-screen のテスト
 * - フレームワークの動作確認
 * - ユーティリティ関数の単体テスト
 */

import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatDuration,
  formatFileSize,
  filterRecordings,
  sortRecordings,
} from "../hooks/utils";
import type { SortConfig } from "../hooks/utils";
import type { Recording } from "../../../../src/types";

// ─── フレームワーク動作確認 ───────────────────────────────

describe("vitest フレームワーク", () => {
  it("基本的なアサーションが動作する", () => {
    expect(1 + 1).toBe(2);
    expect({ a: 1 }).toEqual({ a: 1 });
    expect("hello").toContain("ell");
  });
});

// ─── formatDuration ─────────────────────────────────────────

describe("formatDuration", () => {
  it("0秒は 00:00 を返す", () => {
    expect(formatDuration(0)).toBe("00:00");
  });

  it("30秒は 00:30 を返す", () => {
    expect(formatDuration(30)).toBe("00:30");
  });

  it("90秒は 01:30 を返す", () => {
    expect(formatDuration(90)).toBe("01:30");
  });

  it("3600秒は 60:00 を返す", () => {
    expect(formatDuration(3600)).toBe("60:00");
  });

  it("秒数を丸める（小数切り捨て）", () => {
    expect(formatDuration(65.7)).toBe("01:05");
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

// ─── filterRecordings ────────────────────────────────────────

const sampleRecordings: Recording[] = [
  {
    id: "1",
    user_id: "u1",
    title: "定例MTG 2026年6月",
    file_path: "recordings/june-meeting.m4a",
    duration_seconds: 1800,
    created_at: "2026-06-12T10:00:00Z",
    transcribed: true,
  },
  {
    id: "2",
    user_id: "u1",
    title: "打ち合わせ A",
    file_path: "recordings/meeting-a.m4a",
    duration_seconds: 900,
    created_at: "2026-06-11T14:00:00Z",
    transcribed: false,
  },
  {
    id: "3",
    user_id: "u1",
    title: "週次レビュー",
    file_path: "recordings/weekly-review.m4a",
    duration_seconds: 3600,
    created_at: "2026-06-10T09:00:00Z",
    transcribed: true,
  },
];

describe("filterRecordings", () => {
  it("空クエリは全件返す", () => {
    expect(filterRecordings(sampleRecordings, "")).toHaveLength(3);
    expect(filterRecordings(sampleRecordings, "   ")).toHaveLength(3);
  });

  it("title で部分一致フィルタ", () => {
    const result = filterRecordings(sampleRecordings, "MTG");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("file_path で部分一致フィルタ", () => {
    const result = filterRecordings(sampleRecordings, "weekly");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("大文字小文字を区別しない", () => {
    const result = filterRecordings(sampleRecordings, "mtg");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("一致しないクエリは空配列", () => {
    const result = filterRecordings(sampleRecordings, "存在しない");
    expect(result).toHaveLength(0);
  });

  it("空配列に対しては空配列を返す", () => {
    expect(filterRecordings([], "test")).toHaveLength(0);
  });
});

// ─── sortRecordings ─────────────────────────────────────────

describe("sortRecordings", () => {
  const unsorted: Recording[] = [
    {
      id: "1",
      user_id: "u1",
      title: "B定例",
      file_path: "b.m4a",
      duration_seconds: 100,
      created_at: "2026-06-12T10:00:00Z",
      transcribed: false,
    },
    {
      id: "2",
      user_id: "u1",
      title: "A打ち合わせ",
      file_path: "a.m4a",
      duration_seconds: 200,
      created_at: "2026-06-10T10:00:00Z",
      transcribed: true,
    },
    {
      id: "3",
      user_id: "u1",
      title: "Cレビュー",
      file_path: "c.m4a",
      duration_seconds: 300,
      created_at: "2026-06-11T10:00:00Z",
      transcribed: false,
    },
  ];

  it("date desc: 新しい日付が先頭", () => {
    const config: SortConfig = { field: "date", direction: "desc" };
    const result = sortRecordings(unsorted, config);
    expect(result[0].id).toBe("1");
    expect(result[1].id).toBe("3");
    expect(result[2].id).toBe("2");
  });

  it("date asc: 古い日付が先頭", () => {
    const config: SortConfig = { field: "date", direction: "asc" };
    const result = sortRecordings(unsorted, config);
    expect(result[0].id).toBe("2");
    expect(result[1].id).toBe("3");
    expect(result[2].id).toBe("1");
  });

  it("name asc: 辞書順昇順", () => {
    const config: SortConfig = { field: "name", direction: "asc" };
    const result = sortRecordings(unsorted, config);
    expect(result[0].title).toBe("A打ち合わせ");
    expect(result[1].title).toBe("B定例");
    expect(result[2].title).toBe("Cレビュー");
  });

  it("name desc: 辞書順降順", () => {
    const config: SortConfig = { field: "name", direction: "desc" };
    const result = sortRecordings(unsorted, config);
    expect(result[0].title).toBe("Cレビュー");
    expect(result[1].title).toBe("B定例");
    expect(result[2].title).toBe("A打ち合わせ");
  });

  it("status asc: false → true の順", () => {
    const config: SortConfig = { field: "status", direction: "asc" };
    const result = sortRecordings(unsorted, config);
    expect(result[0].transcribed).toBe(false);
    expect(result[1].transcribed).toBe(false);
    expect(result[2].transcribed).toBe(true);
  });

  it("status desc: true → false の順", () => {
    const config: SortConfig = { field: "status", direction: "desc" };
    const result = sortRecordings(unsorted, config);
    expect(result[0].transcribed).toBe(true);
    expect(result[1].transcribed).toBe(false);
    expect(result[2].transcribed).toBe(false);
  });

  it("空配列は空配列を返す", () => {
    const config: SortConfig = { field: "date", direction: "asc" };
    expect(sortRecordings([], config)).toEqual([]);
  });

  it("元の配列を変更しない（イミュータブル）", () => {
    const original = [...unsorted];
    sortRecordings(unsorted, { field: "name", direction: "asc" });
    expect(unsorted).toEqual(original);
  });
});
