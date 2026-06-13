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

import { removeHallucinations } from "../../src/services/transcription";

describe("removeHallucinations", () => {
  it("末尾の「ご視聴ありがとうございました。」を除去する", () => {
    const input = "今日の会議の内容を報告します。\nご視聴ありがとうございました。";
    const result = removeHallucinations(input);
    expect(result).toBe("今日の会議の内容を報告します。");
  });

  it("複数の幻覚パターンを全て除去する", () => {
    const input =
      "こんにちは。\nご視聴ありがとうございました。\nチャンネル登録お願いします。";
    const result = removeHallucinations(input);
    expect(result).toBe("こんにちは。");
  });

  it("幻覚を含まないテキストは変更されない", () => {
    const input = "これは正常なテキストです。特に問題はありません。";
    const result = removeHallucinations(input);
    expect(result).toBe(input);
  });

  it("空文字列を渡すと空文字列が返る", () => {
    const result = removeHallucinations("");
    expect(result).toBe("");
  });

  it("幻覚フレーズのみのテキストは空文字列になる", () => {
    const input = "ご視聴ありがとうございました。\nThanks for watching.";
    const result = removeHallucinations(input);
    expect(result).toBe("");
  });
});
