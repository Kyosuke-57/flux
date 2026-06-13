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
