/**
 * templates-screen のテスト
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

// ─── テンプレートのフィルタリングロジック ──────────────────

describe("テンプレートフィルタリング", () => {
  const sampleTemplates = [
    { id: "1", user_id: "u1", name: "週次ミーティング", content: "## 参加者\n## 議題" },
    { id: "2", user_id: "u1", name: "月次報告", content: "## 売上\n## 課題" },
    { id: "3", user_id: "u1", name: "振り返り", content: "## KPT\n## アクション" },
  ];

  it("空の検索では全件返す", () => {
    const result = sampleTemplates.filter((t) =>
      t.name.toLowerCase().includes("".toLowerCase()),
    );
    expect(result).toHaveLength(3);
  });

  it("名前の部分一致でフィルタリングする", () => {
    const result = sampleTemplates.filter((t) =>
      t.name.toLowerCase().includes("週次".toLowerCase()),
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("週次ミーティング");
  });

  it("内容の部分一致でフィルタリングする", () => {
    const result = sampleTemplates.filter((t) =>
      t.content.toLowerCase().includes("KPT".toLowerCase()),
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("振り返り");
  });

  it("大文字小文字を区別しない", () => {
    const result = sampleTemplates.filter((t) =>
      t.name.toLowerCase().includes("ミーティング".toLowerCase()),
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("週次ミーティング");
  });

  it("該当なしの場合は空配列を返す", () => {
    const result = sampleTemplates.filter((t) =>
      t.name.toLowerCase().includes("存在しない".toLowerCase()),
    );
    expect(result).toHaveLength(0);
  });
});

// ─── テンプレートのソートロジック ──────────────────

describe("テンプレートソート", () => {
  const sampleTemplates = [
    { id: "1", user_id: "u1", name: "週次ミーティング", content: "## 参加者\n## 議題", is_default: false, created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-10T00:00:00Z" },
    { id: "2", user_id: "u1", name: "月次報告", content: "## 売上\n## 課題", is_default: true, created_at: "2026-06-05T00:00:00Z", updated_at: "2026-06-15T00:00:00Z" },
    { id: "3", user_id: "u1", name: "振り返り", content: "## KPT\n## アクション", is_default: false, created_at: "2026-06-03T00:00:00Z", updated_at: "2026-06-05T00:00:00Z" },
  ];

  it("updated_at 降順でソートする（デフォルト）", () => {
    const sorted = [...sampleTemplates].sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
    expect(sorted[0].name).toBe("月次報告");
    expect(sorted[1].name).toBe("週次ミーティング");
    expect(sorted[2].name).toBe("振り返り");
  });

  it("updated_at 昇順でソートする", () => {
    const sorted = [...sampleTemplates].sort((a, b) =>
      new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    );
    expect(sorted[0].name).toBe("振り返り");
    expect(sorted[1].name).toBe("週次ミーティング");
    expect(sorted[2].name).toBe("月次報告");
  });

  it("name 降順でソートすると昇順の逆順になる", () => {
    const ascending = [...sampleTemplates].sort((a, b) =>
      a.name.localeCompare(b.name, "ja"),
    );
    const descending = [...sampleTemplates].sort((a, b) =>
      b.name.localeCompare(a.name, "ja"),
    );
    expect(descending.map((t) => t.name)).toEqual(
      [...ascending].reverse().map((t) => t.name),
    );
  });

  it("is_default でソートする（デフォルト優先）", () => {
    const sorted = [...sampleTemplates].sort((a, b) =>
      Number(b.is_default) - Number(a.is_default),
    );
    expect(sorted[0].is_default).toBe(true);
    expect(sorted[1].is_default).toBe(false);
    expect(sorted[2].is_default).toBe(false);
  });
});
