import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock setup – hoisted lazily; vars captured by closure are initialized by
// the time the mock factory runs (when the module is first imported).
// ---------------------------------------------------------------------------

const mockTranscriptionsCreate = vi.fn();

vi.mock("groq-sdk", () => ({
  default: vi.fn(function () {
    return {
      audio: {
        transcriptions: { create: mockTranscriptionsCreate },
      },
    };
  }),
}));

vi.mock("child_process", () => ({
  execFile: vi.fn(function (
    this: any,
    ...args: any[]
  ) {
    const cb = args[args.length - 1];
    if (typeof cb === "function") {
      cb(null, { stdout: "", stderr: "" });
    }
  }),
}));

vi.mock("fs", () => ({
  createReadStream: vi.fn(function () {
    return {} as any;
  }),
}));

vi.mock("fs/promises", () => ({
  default: {
    unlink: vi.fn().mockResolvedValue(undefined),
  },
  unlink: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/ffmpeg", () => ({
  getFfmpegPath: vi.fn().mockResolvedValue("/mock/ffmpeg"),
}));

// ---------------------------------------------------------------------------
// Module under test
// ---------------------------------------------------------------------------

import {
  transcribeWithGroq,
  transcribeWithRetry,
  refineJapaneseTranscript,
  generateMinutesFromTranscript,
} from "../lib/groq";

// ---------------------------------------------------------------------------
// transcribeWithGroq
// ---------------------------------------------------------------------------

describe("transcribeWithGroq", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns transcript on success", async () => {
    mockTranscriptionsCreate.mockResolvedValue({ text: "こんにちは" });

    const result = await transcribeWithGroq({ filePath: "/tmp/test.m4a" });

    expect(result).toBe("こんにちは");
    expect(mockTranscriptionsCreate).toHaveBeenCalledTimes(1);
  });

  it("throws on API error", async () => {
    mockTranscriptionsCreate.mockRejectedValue(new Error("API Error"));

    await expect(
      transcribeWithGroq({ filePath: "/tmp/test.m4a" }),
    ).rejects.toThrow("API Error");
  });
});

// ---------------------------------------------------------------------------
// transcribeWithRetry
// ---------------------------------------------------------------------------

describe("transcribeWithRetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("succeeds on first attempt", async () => {
    mockTranscriptionsCreate.mockResolvedValue({ text: "成功" });

    const result = await transcribeWithRetry("/tmp/test.m4a", undefined, 3);

    expect(result).toBe("成功");
    expect(mockTranscriptionsCreate).toHaveBeenCalledTimes(1);
  });

  it("succeeds after retry", async () => {
    mockTranscriptionsCreate
      .mockRejectedValueOnce({ status: 429, message: "rate_limit" })
      .mockResolvedValueOnce({ text: "リトライ成功" });

    const promise = transcribeWithRetry("/tmp/test.m4a", undefined, 3);
    await vi.advanceTimersByTimeAsync(100_000);
    const result = await promise;

    expect(result).toBe("リトライ成功");
    expect(mockTranscriptionsCreate).toHaveBeenCalledTimes(2);
  });

  it("throws after max retries", async () => {
    mockTranscriptionsCreate.mockRejectedValue({ status: 429, message: "rate_limit" });

    const promise = transcribeWithRetry("/tmp/test.m4a", undefined, 3);

    // Attach a noop catch handler BEFORE advancing timers to suppress
    // Node.js PromiseRejectionHandledWarning (expect().rejects does not
    // attach a handler early enough for fake-timer deferred rejections).
    promise.catch(() => {});

    // advance all timers (2+4+8 = 14s of exponential backoff)
    await vi.advanceTimersByTimeAsync(100_000);

    await expect(promise).rejects.toThrow("文字起こし失敗（リトライ上限到達）");
    expect(mockTranscriptionsCreate).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// refineJapaneseTranscript
// ---------------------------------------------------------------------------

describe("refineJapaneseTranscript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns refined text", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: "補正されたテキスト" } }],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await refineJapaneseTranscript("元のテキスト");

    expect(result).toBe("補正されたテキスト");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("throws on API error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      refineJapaneseTranscript("元のテキスト"),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// generateMinutesFromTranscript
// ---------------------------------------------------------------------------

describe("generateMinutesFromTranscript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns minutes structure", async () => {
    const mockContent = [
      "タイトル: 月次定例会",
      "",
      "# 議事録",
      "",
      "## 参加者（推定）",
      "- 佐藤さん",
      "- 鈴木さん",
      "",
      "## 議題",
      "1. 予算報告",
      "",
      "## 議論内容",
      "予算について議論しました。",
      "",
      "## 決定事項",
      "来月までに予算案を確定する。",
      "",
      "## 次のアクション",
      "- [ ] 予算案を作成する（担当者: 佐藤）",
      "- [ ] レビュー会を設定する（担当者: 鈴木）",
    ].join("\n");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: mockContent } }],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await generateMinutesFromTranscript(
      "本日の議題は予算についてです",
    );

    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("actionItems");
    expect(result.title).toBe("月次定例会");
    expect(result.actionItems).toHaveLength(2);
    expect(result.actionItems[0]).toBe("予算案を作成する（担当者: 佐藤）");
    expect(result.actionItems[1]).toBe("レビュー会を設定する（担当者: 鈴木）");
  });

  it("throws on API error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      generateMinutesFromTranscript("テスト文字起こし"),
    ).rejects.toThrow();
  });
});
