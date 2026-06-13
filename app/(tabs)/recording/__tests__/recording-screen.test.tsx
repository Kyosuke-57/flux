/**
 * recording-screen のテスト
 * - フレームワークの動作確認
 * - ユーティリティ関数の単体テスト
 */

import { describe, it, expect } from "vitest";
import { formatDate, formatDuration, formatFileSize } from "../hooks/utils";

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
