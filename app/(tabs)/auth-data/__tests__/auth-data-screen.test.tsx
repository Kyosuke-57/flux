/**
 * auth-data 画面のテスト
 * - ユーティリティ関数の単体テスト
 * - フレームワークの動作確認
 */

import { describe, it, expect } from "vitest";
import { formatDate, maskApiKey, getProviderLabel, PROVIDER_OPTIONS, sortItems } from "../hooks/utils";
import type { AuthData } from "../../../../src/types";

// ─── フレームワーク動作確認 ───────────────────────────────

describe("vitest フレームワーク", () => {
  it("基本的なアサーションが動作する", () => {
    expect(1 + 1).toBe(2);
    expect({ a: 1 }).toEqual({ a: 1 });
    expect("hello").toContain("ell");
  });
});

// ─── formatDate ──────────────────────────────────────────────

describe("formatDate", () => {
  it("ISO 日付を日本語ロケールでフォーマットする", () => {
    // UTC 12:00 = JST 21:00 なので日付またぎが起きない
    const result = formatDate("2026-06-13T12:00:00.000Z");
    expect(result).toContain("2026");
    expect(result).toContain("6月");
    expect(result).toContain("13");
    expect(result).toContain("21:00");
  });

  it("異なる日付でも正しくフォーマットされる", () => {
    const result = formatDate("2025-01-01T00:00:00.000Z");
    expect(result).toContain("2025");
    expect(result).toContain("1月");
    expect(result).toContain("1");
  });
});

// ─── maskApiKey ──────────────────────────────────────────────

describe("maskApiKey", () => {
  it("長い API キーは最初の4文字と最後の4文字を残してマスクする", () => {
    const result = maskApiKey("sk-proj-abcdefghijklmnopqrstuvwxyz");
    expect(result).toBe("sk-p****wxyz");
  });

  it("8文字以下のキーは全て **** にする", () => {
    const result = maskApiKey("short");
    expect(result).toBe("****");
  });

  it("空文字列の場合は **** を返す", () => {
    const result = maskApiKey("");
    expect(result).toBe("****");
  });

  it("ちょうど8文字のキーも **** を返す", () => {
    const result = maskApiKey("12345678");
    expect(result).toBe("****");
  });
});

// ─── getProviderLabel ────────────────────────────────────────

describe("getProviderLabel", () => {
  it("既知のプロバイダー名に対応するラベルを返す", () => {
    expect(getProviderLabel("openai")).toBe("OpenAI");
    expect(getProviderLabel("anthropic")).toBe("Anthropic");
    expect(getProviderLabel("google")).toBe("Google AI");
    expect(getProviderLabel("groq")).toBe("Groq");
    expect(getProviderLabel("custom")).toBe("カスタム");
  });

  it("未知のプロバイダー名はそのまま返す", () => {
    expect(getProviderLabel("unknown-provider")).toBe("unknown-provider");
    expect(getProviderLabel("")).toBe("");
  });
});

// ─── PROVIDER_OPTIONS ────────────────────────────────────────

describe("PROVIDER_OPTIONS", () => {
  it("5つのプロバイダーオプションが定義されている", () => {
    expect(PROVIDER_OPTIONS).toHaveLength(5);
  });

  it("各オプションに value, label, icon がある", () => {
    for (const opt of PROVIDER_OPTIONS) {
      expect(opt).toHaveProperty("value");
      expect(opt).toHaveProperty("label");
      expect(opt).toHaveProperty("icon");
    }
  });

  it("openai が先頭にある", () => {
    expect(PROVIDER_OPTIONS[0].value).toBe("openai");
  });
});

// ─── sortItems ──────────────────────────────────────────────

function makeItem(overrides: Partial<AuthData> = {}): AuthData {
  const base: AuthData = {
    id: "id-1",
    user_id: "user-1",
    provider: "openai",
    label: "Test",
    api_key: "sk-test",
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
  return { ...base, ...overrides };
}

describe("sortItems", () => {
  describe("date ソート", () => {
    it("昇順: 古い順に並べる", () => {
      const items = [
        makeItem({ id: "1", created_at: "2026-03-01T00:00:00.000Z" }),
        makeItem({ id: "2", created_at: "2026-01-01T00:00:00.000Z" }),
        makeItem({ id: "3", created_at: "2026-02-01T00:00:00.000Z" }),
      ];
      const result = sortItems(items, "date", "asc");
      expect(result.map((i) => i.id)).toEqual(["2", "3", "1"]);
    });

    it("降順: 新しい順に並べる", () => {
      const items = [
        makeItem({ id: "1", created_at: "2026-01-01T00:00:00.000Z" }),
        makeItem({ id: "2", created_at: "2026-03-01T00:00:00.000Z" }),
        makeItem({ id: "3", created_at: "2026-02-01T00:00:00.000Z" }),
      ];
      const result = sortItems(items, "date", "desc");
      expect(result.map((i) => i.id)).toEqual(["2", "3", "1"]);
    });
  });

  describe("name ソート", () => {
    it("昇順: あいうえお順", () => {
      const items = [
        makeItem({ id: "1", label: "XYZ" }),
        makeItem({ id: "2", label: "ABC" }),
        makeItem({ id: "3", label: "あいう" }),
      ];
      const result = sortItems(items, "name", "asc");
      // ABC → XYZ → あいう (localeCompare("ja") の順序)
      expect(result[0].id).toBe("2");
      expect(result[1].id).toBe("1");
      expect(result[2].id).toBe("3");
    });

    it("降順: 逆順", () => {
      const items = [
        makeItem({ id: "1", label: "ABC" }),
        makeItem({ id: "2", label: "XYZ" }),
      ];
      const result = sortItems(items, "name", "desc");
      expect(result.map((i) => i.id)).toEqual(["2", "1"]);
    });
  });

  describe("status ソート", () => {
    it("昇順: 非活性 → 活性", () => {
      const items = [
        makeItem({ id: "1", is_active: true }),
        makeItem({ id: "2", is_active: false }),
        makeItem({ id: "3", is_active: true }),
      ];
      const result = sortItems(items, "status", "asc");
      expect(result[0].id).toBe("2");
      expect(result[1].is_active).toBe(true);
      expect(result[2].is_active).toBe(true);
    });

    it("降順: 活性 → 非活性", () => {
      const items = [
        makeItem({ id: "1", is_active: false }),
        makeItem({ id: "2", is_active: true }),
        makeItem({ id: "3", is_active: false }),
      ];
      const result = sortItems(items, "status", "desc");
      expect(result[0].id).toBe("2");
      expect(result[1].is_active).toBe(false);
      expect(result[2].is_active).toBe(false);
    });
  });

  it("元の配列を変更しない", () => {
    const items = [
      makeItem({ id: "1", created_at: "2026-02-01T00:00:00.000Z" }),
      makeItem({ id: "2", created_at: "2026-01-01T00:00:00.000Z" }),
    ];
    const originalIds = items.map((i) => i.id).join();
    sortItems(items, "date", "desc");
    expect(items.map((i) => i.id).join()).toBe(originalIds);
  });
});
