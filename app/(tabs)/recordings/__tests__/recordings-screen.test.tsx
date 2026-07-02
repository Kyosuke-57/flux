/**
 * Recordings screen tests
 * - Framework verification
 * - Utility function tests
 */

import { describe, it, expect } from "vitest";
import {
  formatDate,
  getDurationLabel,
  getTranscribedLabel,
  sortRecordings,
  formatDuration,
  formatFileSize,
  filterRecordings,
} from "../hooks/utils";
import type { Recording } from "../../../../src/types";

// ─── Framework ───────────────────────────────────────────────

describe("vitest framework", () => {
  it("basic assertions work", () => {
    expect(1 + 1).toBe(2);
    expect({ a: 1 }).toEqual({ a: 1 });
    expect("hello").toContain("ell");
  });
});

// ─── formatDate ─────────────────────────────────────────────

describe("formatDate", () => {
  it("formats ISO string to Japanese locale format", () => {
    const result = formatDate("2026-06-12T10:30:00Z");
    expect(result).toContain("6月");
    expect(result).toContain("12");
  });

  it("handles different dates", () => {
    const result = formatDate("2025-01-01T00:00:00Z");
    expect(result).toContain("1月");
    expect(result).toContain("1");
  });

  it("handles edge case dates", () => {
    const result = formatDate("2024-12-31T10:00:00Z");
    expect(result).toContain("12月");
    expect(result).toContain("31");
  });
});

// ─── getDurationLabel ─────────────────────────────────────────

describe("getDurationLabel", () => {
  it("returns '0秒' for zero or negative", () => {
    expect(getDurationLabel(0)).toBe("0秒");
    expect(getDurationLabel(-5)).toBe("0秒");
  });

  it("returns seconds only for under 60", () => {
    expect(getDurationLabel(45)).toBe("45秒");
    expect(getDurationLabel(1)).toBe("1秒");
    expect(getDurationLabel(59)).toBe("59秒");
  });

  it("returns minutes and seconds for under 3600", () => {
    expect(getDurationLabel(125)).toBe("2m 5s");
    expect(getDurationLabel(60)).toBe("1m 0s");
    expect(getDurationLabel(3660)).toContain("1h");
  });

  it("returns hours and minutes for 3600+", () => {
    expect(getDurationLabel(3661)).toBe("1h 1m");
    expect(getDurationLabel(7200)).toBe("2h 0m");
    expect(getDurationLabel(3660)).toBe("1h 1m");
  });
});

// ─── getTranscribedLabel ──────────────────────────────────────

describe("getTranscribedLabel", () => {
  it('returns "完了" for true', () => {
    expect(getTranscribedLabel(true)).toBe("完了");
  });

  it('returns "未" for false', () => {
    expect(getTranscribedLabel(false)).toBe("未");
  });
});

// ─── sortRecordings ───────────────────────────────────────────

function makeMockRecording(overrides: Partial<Recording>): Recording {
  return {
    id: "test-id",
    user_id: "user-1",
    title: "Test Recording",
    file_path: "/test/path.mp3",
    duration_seconds: 120,
    created_at: "2026-06-12T10:00:00Z",
    transcribed: false,
    ...overrides,
  };
}

describe("sortRecordings", () => {
  const items: Recording[] = [
    makeMockRecording({
      id: "1",
      title: "あお",
      created_at: "2026-06-10T00:00:00Z",
      transcribed: false,
    }),
    makeMockRecording({
      id: "2",
      title: "いし",
      created_at: "2026-06-12T00:00:00Z",
      transcribed: true,
    }),
    makeMockRecording({
      id: "3",
      title: "うみ",
      created_at: "2026-06-11T00:00:00Z",
      transcribed: false,
    }),
  ];

  describe("by date", () => {
    it("sorts ascending (oldest first)", () => {
      const result = sortRecordings(items, "date", "asc");
      expect(result[0].id).toBe("1");
      expect(result[1].id).toBe("3");
      expect(result[2].id).toBe("2");
    });

    it("sorts descending (newest first)", () => {
      const result = sortRecordings(items, "date", "desc");
      expect(result[0].id).toBe("2");
      expect(result[1].id).toBe("3");
      expect(result[2].id).toBe("1");
    });
  });

  describe("by name", () => {
    it("sorts ascending (あいうえお順)", () => {
      const result = sortRecordings(items, "name", "asc");
      expect(result[0].id).toBe("1"); // あお
      expect(result[1].id).toBe("2"); // いし
      expect(result[2].id).toBe("3"); // うみ
    });

    it("sorts descending", () => {
      const result = sortRecordings(items, "name", "desc");
      expect(result[0].id).toBe("3"); // うみ
      expect(result[1].id).toBe("2"); // いし
      expect(result[2].id).toBe("1"); // あお
    });
  });

  describe("by status", () => {
    it("sorts ascending (未完了 → 完了)", () => {
      const result = sortRecordings(items, "status", "asc");
      expect(result[0].transcribed).toBe(false);
      expect(result[1].transcribed).toBe(false);
      expect(result[2].transcribed).toBe(true);
    });

    it("sorts descending (完了 → 未完了)", () => {
      const result = sortRecordings(items, "status", "desc");
      expect(result[0].transcribed).toBe(true);
      expect(result[1].transcribed).toBe(false);
      expect(result[2].transcribed).toBe(false);
    });
  });

  it("does not mutate the original array", () => {
    const original = [...items];
    sortRecordings(items, "date", "asc");
    expect(items).toEqual(original);
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
  makeMockRecording({
    id: "1",
    title: "定例MTG 2026年6月",
    file_path: "recordings/june-meeting.m4a",
    duration_seconds: 1800,
    created_at: "2026-06-12T10:00:00Z",
    transcribed: true,
  }),
  makeMockRecording({
    id: "2",
    title: "打ち合わせ A",
    file_path: "recordings/meeting-a.m4a",
    duration_seconds: 900,
    created_at: "2026-06-11T14:00:00Z",
    transcribed: false,
  }),
  makeMockRecording({
    id: "3",
    title: "週次レビュー",
    file_path: "recordings/weekly-review.m4a",
    duration_seconds: 3600,
    created_at: "2026-06-10T09:00:00Z",
    transcribed: true,
  }),
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
