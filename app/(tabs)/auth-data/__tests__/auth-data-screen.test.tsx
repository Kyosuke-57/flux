/**
 * auth-data 画面のテスト
 * - ユーティリティ関数の単体テスト
 * - フレームワークの動作確認
 */

import { describe, it, expect } from "vitest";
import { formatDate, maskApiKey, getProviderLabel, PROVIDER_OPTIONS } from "../hooks/utils";

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
