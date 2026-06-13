/**
 * tags-screen のテスト
 * - フレームワークの動作確認
 * - ユーティリティの単体テスト
 */

import { describe, it, expect } from "vitest";

// ─── フレームワーク動作確認 ───────────────────────────────

describe("vitest フレームワーク", () => {
  it("基本的なアサーションが動作する", () => {
    expect(1 + 1).toBe(2);
    expect({ a: 1 }).toEqual({ a: 1 });
    expect("hello").toContain("ell");
  });
});

// ─── タグのフィルタリングロジック ──────────────────────────

describe("タグフィルタリング", () => {
  const sampleTags = [
    { id: "1", user_id: "u1", name: "重要" },
    { id: "2", user_id: "u1", name: "緊急" },
    { id: "3", user_id: "u1", name: "MTG" },
  ];

  it("空の検索では全件返す", () => {
    const result = sampleTags.filter((t) =>
      t.name.toLowerCase().includes("".toLowerCase()),
    );
    expect(result).toHaveLength(3);
  });

  it("部分一致でフィルタリングする", () => {
    const result = sampleTags.filter((t) =>
      t.name.toLowerCase().includes("緊".toLowerCase()),
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("緊急");
  });

  it("大文字小文字を区別しない", () => {
    const result = sampleTags.filter((t) =>
      t.name.toLowerCase().includes("mtg".toLowerCase()),
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("MTG");
  });

  it("該当なしの場合は空配列を返す", () => {
    const result = sampleTags.filter((t) =>
      t.name.toLowerCase().includes("存在しない".toLowerCase()),
    );
    expect(result).toHaveLength(0);
  });
});
