import { describe, it, expect, vi } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
  })),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock("react-native-url-polyfill/auto", () => ({}));

import { formatDate, getPreview } from "../../app/(tabs)/minutes/hooks/utils";

describe("formatDate", () => {
  it("無効なISO文字列でもthrowしない", () => {
    expect(() => formatDate("not-a-date")).not.toThrow();
    // Invalid Date の場合 toLocaleDateString は "Invalid Date" を返す
    const result = formatDate("not-a-date");
    expect(typeof result).toBe("string");
  });

  it("Unixタイムスタンプ（数値）を文字列で渡してもエラーにならない", () => {
    // 1704067200000 = 2024-01-01T00:00:00.000Z
    const result = formatDate("1704067200000");
    expect(typeof result).toBe("string");
    expect(result).toBeTruthy();
  });

  it("月末の日付を正しく処理する（1月31日→2月1日）", () => {
    const jan31 = formatDate("2025-01-31T12:00:00.000Z");
    const feb1 = formatDate("2025-02-01T12:00:00.000Z");
    // 別々の日として表示されること
    expect(jan31).not.toBe(feb1);
  });

  it("年跨ぎ（12月31日→1月1日）を正しく処理する", () => {
    const dec31 = formatDate("2025-12-31T23:59:00.000Z");
    const jan1 = formatDate("2026-01-01T00:00:00.000Z");
    // 年が変わってもエラーにならず別々の日付として表示されること
    expect(dec31).not.toBe(jan1);
    expect(typeof dec31).toBe("string");
    expect(typeof jan1).toBe("string");
  });

  it("異なるタイムゾーンの時刻を渡してもエラーにならない", () => {
    // UTC 00:00 と JST 09:00 では表示が異なる可能性があるが、エラーにならない
    const utcMidnight = formatDate("2025-06-15T00:00:00.000Z");
    const jstMorning = formatDate("2025-06-15T09:00:00.000Z");
    expect(typeof utcMidnight).toBe("string");
    expect(typeof jstMorning).toBe("string");
  });
});

describe("getPreview", () => {
  it("ちょうど100文字では省略記号（…）が付かない", () => {
    const input = "a".repeat(100);
    const result = getPreview(input);
    expect(result).toBe(input);
    expect(result.length).toBe(100);
  });

  it("101文字以上で省略記号（…）が付く", () => {
    const input = "a".repeat(101);
    const result = getPreview(input);
    expect(result).toBe("a".repeat(100) + "…");
    expect(result.length).toBe(101); // 100文字 + 省略記号1文字
  });

  it("空白のみのコンテンツは空文字列になる", () => {
    expect(getPreview("   ")).toBe("");
    expect(getPreview("\n\n\t")).toBe("");
    expect(getPreview("  \n  ")).toBe("");
  });

  it("前後の改行がトリムされる", () => {
    const result = getPreview("\n\nHello World\n\n");
    expect(result).toBe("Hello World");
  });

  it("null/undefined では TypeError が発生する（現状は防御的でない）", () => {
    expect(() => getPreview(null as unknown as string)).toThrow(TypeError);
    expect(() => getPreview(undefined as unknown as string)).toThrow(TypeError);
  });
});
