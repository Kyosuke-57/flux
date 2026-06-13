/**
 * storage-screen のテスト
 * - フレームワークの動作確認
 * - ユーティリティ関数の単体テスト
 */

import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatDuration,
  formatFileSize,
  sortRecordings,
  type SortField,
  type SortDirection,
} from "../hooks/utils";

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
  it("0秒は '0秒' を返す", () => {
    expect(formatDuration(0)).toBe("0秒");
  });

  it("60秒未満は秒表記", () => {
    expect(formatDuration(45)).toBe("45秒");
  });

  it("60秒以上は分秒表記", () => {
    expect(formatDuration(125)).toBe("2分5秒");
  });

  it("ちょうど60秒は '1分0秒' を返す", () => {
    expect(formatDuration(60)).toBe("1分0秒");
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

// ─── sortRecordings ──────────────────────────────────────────

function makeRecording(
  overrides: Partial<{
    id: string;
    title: string;
    created_at: string;
    transcribed: boolean;
  }>,
) {
  return {
    id: overrides.id ?? "rec_001",
    user_id: "user_1",
    title: overrides.title ?? "Test",
    file_path: "test.m4a",
    duration_seconds: 60,
    created_at: overrides.created_at ?? "2026-06-01T00:00:00Z",
    transcribed: overrides.transcribed ?? false,
  };
}

describe("sortRecordings", () => {
  const early = "2026-01-01T00:00:00Z";
  const middle = "2026-06-15T00:00:00Z";
  const late = "2026-12-31T00:00:00Z";

  it("デフォルトは日付降順（新しい順）", () => {
    const items = [
      makeRecording({ id: "a", created_at: early }),
      makeRecording({ id: "b", created_at: late }),
      makeRecording({ id: "c", created_at: middle }),
    ];
    const sorted = sortRecordings(items);
    expect(sorted.map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("日付昇順（古い順）", () => {
    const items = [
      makeRecording({ id: "a", created_at: late }),
      makeRecording({ id: "b", created_at: early }),
      makeRecording({ id: "c", created_at: middle }),
    ];
    const sorted = sortRecordings(items, "date", "asc");
    expect(sorted.map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("名前昇順（あいうえお順）", () => {
    const items = [
      makeRecording({ id: "a", title: "aaa" }),
      makeRecording({ id: "b", title: "ccc" }),
      makeRecording({ id: "c", title: "bbb" }),
    ];
    const sorted = sortRecordings(items, "name", "asc");
    expect(sorted.map((r) => r.id)).toEqual(["a", "c", "b"]);
  });

  it("名前降順", () => {
    const items = [
      makeRecording({ id: "a", title: "aaa" }),
      makeRecording({ id: "b", title: "ccc" }),
      makeRecording({ id: "c", title: "bbb" }),
    ];
    const sorted = sortRecordings(items, "name", "desc");
    expect(sorted.map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("ステータス昇順（未文字起こし→文字起こし済み）", () => {
    const items = [
      makeRecording({ id: "a", transcribed: true }),
      makeRecording({ id: "b", transcribed: false }),
    ];
    const sorted = sortRecordings(items, "status", "asc");
    expect(sorted.map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("ステータス降順（文字起こし済み→未文字起こし）", () => {
    const items = [
      makeRecording({ id: "a", transcribed: false }),
      makeRecording({ id: "b", transcribed: true }),
    ];
    const sorted = sortRecordings(items, "status", "desc");
    expect(sorted.map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("同じ値の場合は元の順序を維持する（安定ソート）", () => {
    const items = [
      makeRecording({ id: "a", title: "same", created_at: early }),
      makeRecording({ id: "b", title: "same", created_at: late }),
    ];
    const sorted = sortRecordings(items, "name", "asc");
    expect(sorted.map((r) => r.id)).toEqual(["a", "b"]);
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
