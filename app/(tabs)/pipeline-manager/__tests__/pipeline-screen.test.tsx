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
  STATUS_LABELS,
} from "../hooks/utils";

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
