import { describe, it, expect } from "vitest";
import { formatDate, maskApiKey, getProviderLabel, sortAuthData, filterAuthData } from "../hooks/utils";
import type { AuthData } from "../../../../src/types";

describe("maskApiKey", () => {
  it("8文字以下のキーはすべて****でマスクする", () => {
    expect(maskApiKey("abc")).toBe("****");
    expect(maskApiKey("12345678")).toBe("****");
  });

  it("長いキーは先頭4文字+****+末尾4文字でマスクする", () => {
    expect(maskApiKey("sk-1234567890abcdef")).toBe("sk-1****cdef");
  });

  it("空文字列は****を返す", () => {
    expect(maskApiKey("")).toBe("****");
  });
});

describe("getProviderLabel", () => {
  it("既知のプロバイダに対応するラベルを返す", () => {
    expect(getProviderLabel("openai")).toBe("OpenAI");
    expect(getProviderLabel("anthropic")).toBe("Anthropic");
    expect(getProviderLabel("google")).toBe("Google AI");
    expect(getProviderLabel("groq")).toBe("Groq");
    expect(getProviderLabel("custom")).toBe("カスタム");
  });

  it("未知のプロバイダはそのまま返す", () => {
    expect(getProviderLabel("unknown")).toBe("unknown");
  });
});

describe("formatDate", () => {
  it("ISO文字列を日本語形式でフォーマットする", () => {
    const result = formatDate("2026-06-12T10:30:00Z");
    expect(result).toContain("2026");
    expect(result).toContain("6月");
    expect(result).toContain("12日");
  });
});

describe("sortAuthData", () => {
  it("新しい順にソートする", () => {
    const items = [
      { created_at: "2026-01-01T00:00:00Z" },
      { created_at: "2026-06-01T00:00:00Z" },
      { created_at: "2025-06-01T00:00:00Z" },
    ] as AuthData[];

    const sorted = sortAuthData(items);
    expect(sorted[0].created_at).toBe("2026-06-01T00:00:00Z");
    expect(sorted[1].created_at).toBe("2026-01-01T00:00:00Z");
    expect(sorted[2].created_at).toBe("2025-06-01T00:00:00Z");
  });

  it("元の配列を変更しない", () => {
    const items = [
      { created_at: "2026-06-01T00:00:00Z" },
      { created_at: "2025-01-01T00:00:00Z" },
    ] as AuthData[];
    const copy = [...items];
    sortAuthData(items);
    expect(items).toEqual(copy);
  });
});

describe("filterAuthData", () => {
  const items = [
    { id: "1", label: "OpenAI API Key", provider: "openai", api_key: "sk-xxx" },
    { id: "2", label: "Anthropic Claude", provider: "anthropic", api_key: "sk-ant-xxx" },
    { id: "3", label: "Gemini Keys", provider: "google", api_key: "AIza-xxx" },
    { id: "4", label: "カスタムAPI", provider: "custom", api_key: "cus-xxx" },
  ] as AuthData[];

  it("空クエリは全件返す", () => {
    expect(filterAuthData(items, "")).toHaveLength(4);
    expect(filterAuthData(items, "   ")).toHaveLength(4);
  });

  it("labelで絞り込む（部分一致・大文字小文字区別なし）", () => {
    const result = filterAuthData(items, "openai");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("providerのvalueで絞り込む", () => {
    const result = filterAuthData(items, "google");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("providerの表示ラベルで絞り込む（getProviderLabel経由）", () => {
    const result = filterAuthData(items, "Anthropic");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("カスタムのラベル「カスタム」で検索できる", () => {
    const result = filterAuthData(items, "カスタム");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("4");
  });

  it("部分一致で検索できる", () => {
    const result = filterAuthData(items, "API");
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id).sort()).toEqual(["1", "4"]);
  });

  it("api_keyの内容で絞り込む", () => {
    const result = filterAuthData(items, "sk-ant");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("api_keyの部分一致で絞り込む", () => {
    const result = filterAuthData(items, "AIza");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("該当なしの場合は空配列を返す", () => {
    const result = filterAuthData(items, "nonexistent");
    expect(result).toHaveLength(0);
  });
});
