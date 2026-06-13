import { describe, it, expect } from "vitest";
import { formatDate, maskApiKey, getProviderLabel, sortAuthData } from "../hooks/utils";
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
