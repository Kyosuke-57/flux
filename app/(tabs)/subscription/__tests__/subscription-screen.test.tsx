/**
 * subscription-screen のテスト
 * - フレームワークの動作確認
 * - ユーティリティの単体テスト
 */

import { describe, it, expect } from "vitest";
import { secondsToHms, getPlanColor, getPlanIcon } from "../hooks/utils";

// ─── フレームワーク動作確認 ───────────────────────────────

describe("vitest フレームワーク", () => {
  it("基本的なアサーションが動作する", () => {
    expect(1 + 1).toBe(2);
    expect({ a: 1 }).toEqual({ a: 1 });
    expect("hello").toContain("ell");
  });
});

// ─── secondsToHms ──────────────────────────────────────────

describe("secondsToHms", () => {
  it("0秒は0mを返す", () => {
    expect(secondsToHms(0)).toBe("0m");
  });

  it("負の値は0mを返す", () => {
    expect(secondsToHms(-100)).toBe("0m");
  });

  it("60秒は1mを返す", () => {
    expect(secondsToHms(60)).toBe("1m");
  });

  it("3600秒は1h 0mを返す", () => {
    expect(secondsToHms(3600)).toBe("1h 0m");
  });

  it("3660秒は1h 1mを返す", () => {
    expect(secondsToHms(3660)).toBe("1h 1m");
  });

  it("9000秒は2h 30mを返す", () => {
    expect(secondsToHms(9000)).toBe("2h 30m");
  });
});

// ─── getPlanColor ──────────────────────────────────────────

describe("getPlanColor", () => {
  it("proはライトモードで#7C3AEDを返す", () => {
    expect(getPlanColor("pro", false)).toBe("#7C3AED");
  });

  it("proはダークモードで#A78BFAを返す", () => {
    expect(getPlanColor("pro", true)).toBe("#A78BFA");
  });

  it("byokはライトモードで#D97706を返す", () => {
    expect(getPlanColor("byok", false)).toBe("#D97706");
  });

  it("byokはダークモードで#FBBF24を返す", () => {
    expect(getPlanColor("byok", true)).toBe("#FBBF24");
  });

  it("freeはライトモードでグレー系を返す", () => {
    expect(getPlanColor("free", false)).toBe("#6B7280");
  });

  it("freeはダークモードでグレー系を返す", () => {
    expect(getPlanColor("free", true)).toBe("#9CA3AF");
  });

  it("不明なプランIDはfreeと同じ色を返す", () => {
    expect(getPlanColor("unknown" as any, false)).toBe("#6B7280");
  });
});

// ─── getPlanIcon ───────────────────────────────────────────

describe("getPlanIcon", () => {
  it("proはstarを返す", () => {
    expect(getPlanIcon("pro")).toBe("star");
  });

  it("byokはkey-outlineを返す", () => {
    expect(getPlanIcon("byok")).toBe("key-outline");
  });

  it("freeはcafe-outlineを返す", () => {
    expect(getPlanIcon("free")).toBe("cafe-outline");
  });

  it("不明なプランIDはcafe-outlineを返す", () => {
    expect(getPlanIcon("unknown" as any)).toBe("cafe-outline");
  });
});
