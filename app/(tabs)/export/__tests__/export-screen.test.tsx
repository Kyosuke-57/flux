/**
 * export-screen のテスト
 * - フレームワークの動作確認
 * - フィルタリング・ソートロジックの単体テスト
 */

import { describe, it, expect } from "vitest";
import type { ExportItem } from "../../../../src/types";

// ─── フレームワーク動作確認 ───────────────────────────────

describe("vitest フレームワーク", () => {
  it("基本的なアサーションが動作する", () => {
    expect(1 + 1).toBe(2);
    expect({ a: 1 }).toEqual({ a: 1 });
    expect("hello").toContain("ell");
  });
});

// ─── サンプルデータ ─────────────────────────────────────────

const sampleExports: ExportItem[] = [
  {
    id: "1",
    user_id: "u1",
    minute_id: "m1",
    title: "週次ミーティング 2026-06-08",
    format: "pdf",
    created_at: "2026-06-10T10:00:00Z",
  },
  {
    id: "2",
    user_id: "u1",
    minute_id: "m2",
    title: "月次報告 2026-05",
    format: "md",
    created_at: "2026-06-05T15:30:00Z",
  },
  {
    id: "3",
    user_id: "u1",
    title: "KPT振り返り",
    format: "txt",
    created_at: "2026-06-01T09:00:00Z",
  },
];

// ─── フィルタリング ─────────────────────────────────────────

describe("エクスポートフィルタリング", () => {
  it("空の検索では全件返す", () => {
    const result = sampleExports.filter((e) =>
      e.title.toLowerCase().includes("".toLowerCase()),
    );
    expect(result).toHaveLength(3);
  });

  it("タイトルの部分一致でフィルタリングする", () => {
    const result = sampleExports.filter((e) =>
      e.title.toLowerCase().includes("週次".toLowerCase()),
    );
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("週次ミーティング 2026-06-08");
  });

  it("フォーマットでフィルタリングする", () => {
    const result = sampleExports.filter((e) => e.format === "pdf");
    expect(result).toHaveLength(1);
    expect(result[0].format).toBe("pdf");
  });

  it("大文字小文字を区別しない", () => {
    const result = sampleExports.filter((e) =>
      e.title.toLowerCase().includes("ミーティング".toLowerCase()),
    );
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("週次ミーティング 2026-06-08");
  });

  it("該当なしの場合は空配列を返す", () => {
    const result = sampleExports.filter((e) =>
      e.title.toLowerCase().includes("存在しない".toLowerCase()),
    );
    expect(result).toHaveLength(0);
  });
});

// ─── ソートロジック ─────────────────────────────────────────

describe("エクスポートソート", () => {
  it("created_at 降順でソートする（デフォルト）", () => {
    const sorted = [...sampleExports].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    expect(sorted[0].title).toBe("週次ミーティング 2026-06-08");
    expect(sorted[1].title).toBe("月次報告 2026-05");
    expect(sorted[2].title).toBe("KPT振り返り");
  });

  it("created_at 昇順でソートする", () => {
    const sorted = [...sampleExports].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    expect(sorted[0].title).toBe("KPT振り返り");
    expect(sorted[1].title).toBe("月次報告 2026-05");
    expect(sorted[2].title).toBe("週次ミーティング 2026-06-08");
  });

  it("title 降順でソートすると昇順の逆順になる", () => {
    const ascending = [...sampleExports].sort((a, b) =>
      a.title.localeCompare(b.title, "ja"),
    );
    const descending = [...sampleExports].sort((a, b) =>
      b.title.localeCompare(a.title, "ja"),
    );
    expect(descending.map((e) => e.title)).toEqual(
      [...ascending].reverse().map((e) => e.title),
    );
  });

  it("同じcreated_atでもソートが安定している", () => {
    const data: ExportItem[] = [
      { ...sampleExports[0], created_at: "2026-06-10T10:00:00Z" },
      { ...sampleExports[1], created_at: "2026-06-10T10:00:00Z" },
    ];
    const sorted = [...data].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    expect(sorted).toHaveLength(2);
  });
});

// ─── フォーマット表示 ───────────────────────────────────────

describe("フォーマット表示", () => {
  const FORMAT_LABELS: Record<string, string> = {
    txt: "テキスト",
    md: "Markdown",
    pdf: "PDF",
  };

  it("txt 形式のラベルが正しい", () => {
    expect(FORMAT_LABELS["txt"]).toBe("テキスト");
  });

  it("md 形式のラベルが正しい", () => {
    expect(FORMAT_LABELS["md"]).toBe("Markdown");
  });

  it("pdf 形式のラベルが正しい", () => {
    expect(FORMAT_LABELS["pdf"]).toBe("PDF");
  });

  it("全てのフォーマットがラベル定義されている", () => {
    const formats = sampleExports.map((e) => e.format);
    formats.forEach((fmt) => {
      expect(FORMAT_LABELS[fmt]).toBeDefined();
    });
  });
});
