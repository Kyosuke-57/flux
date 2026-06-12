/**
 * minutes-screen のテスト
 * - フレームワークの動作確認
 * - ユーティリティ関数の単体テスト
 */

import { describe, it, expect } from "vitest";
import { formatDate, getPreview } from "../hooks/utils";

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

// ─── getPreview ─────────────────────────────────────────────

describe("getPreview", () => {
  it("100文字以内のコンテンツはそのまま返す", () => {
    const short = "これは短い議事録です";
    expect(getPreview(short)).toBe(short);
  });

  it("100文字を超えるコンテンツは切り詰めて…を付加する", () => {
    const long = "あ".repeat(150);
    const preview = getPreview(long);
    expect(preview).toHaveLength(101);
    expect(preview).toMatch(/…$/);
  });

  it("マークダウン記号を除去する", () => {
    const md = "# 見出し\n## サブ見出し\n本文**太字**";
    const preview = getPreview(md);
    expect(preview).not.toContain("#");
    expect(preview).not.toContain("*");
    expect(preview).not.toContain("[");
    expect(preview).not.toContain("]");
  });

  it("空文字列を渡すと空文字列が返る", () => {
    expect(getPreview("")).toBe("");
  });
});
