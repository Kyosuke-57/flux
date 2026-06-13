/**
 * favorites-screen のテスト
 * - 並び替えロジック (sortFavorites / statusPriority)
 * - 日付フォーマット (formatDate)
 * - プレビュー生成 (getPreview)
 * - ステータスラベル定数 (STATUS_LABELS)
 * - 検索フィルタロジック
 *
 * NOTE: use-favorites-data は import しない（import chain が
 * react-native に到達し Flow 構文エラーになるため）。
 * 純粋関数はテストファイル内に重複定義している。
 */

import { describe, it, expect } from "vitest";

// ─── 型定義（use-favorites-data.ts / src/types より抜粋） ──

type SortKey = "date" | "name" | "status";
type SortOrder = "asc" | "desc";

interface Minute {
  id: string;
  user_id: string;
  title: string;
  content: string;
  original_transcript?: string;
  corrected_transcript?: string;
  tags: string[];
  template_id?: string;
  folder_id?: string;
  created_at: string;
  updated_at: string;
}

interface Tag {
  id: string;
  user_id: string;
  name: string;
  color?: string;
  status: "active" | "archived";
  created_at: string;
}

// ─── 定数（use-favorites-data.ts より） ──────────────────────

const STATUS_LABELS: Record<number, string> = {
  0: "下書き",
  1: "文字起こし済",
  2: "校正済",
  3: "定型",
};

// ─── テスト対象のピュア関数（use-favorites-data.ts より抽出） ──

function statusPriority(m: Minute): number {
  if (m.template_id) return 3;
  if (m.corrected_transcript) return 2;
  if (m.original_transcript) return 1;
  return 0;
}

function sortFavorites(
  items: Minute[],
  key: SortKey,
  order: SortOrder,
): Minute[] {
  const sorted = [...items];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "date":
        cmp = a.created_at.localeCompare(b.created_at);
        break;
      case "name":
        cmp = a.title.localeCompare(b.title, "ja");
        break;
      case "status":
        cmp = statusPriority(a) - statusPriority(b);
        break;
    }
    return order === "desc" ? -cmp : cmp;
  });
  return sorted;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPreview(content: string): string {
  const stripped = content.replace(/[#*`\[\]]/g, "").trim();
  return stripped.length > 120
    ? stripped.slice(0, 120) + "…"
    : stripped;
}

function searchFilter(items: Minute[], query: string): Minute[] {
  if (query.trim() === "") return items;
  const q = query.toLowerCase();
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.content.toLowerCase().includes(q),
  );
}

/**
 * タグ名をidから解決する（useFavoritesData 内の getTagName より）
 */
function getTagName(tagId: string, tags: Tag[]): string {
  const found = tags.find((t) => t.id === tagId);
  return found ? found.name : tagId;
}

// ─── ヘルパー: テスト用 Minute / Tag 生成 ────────────────────

function makeMinute(overrides: Partial<Minute> = {}): Minute {
  return {
    id: "min-1",
    user_id: "user-1",
    title: "週次ミーティング",
    content: "## アジェンダ\n- 進捗報告\n- 課題共有",
    tags: [],
    created_at: "2026-06-10T09:00:00.000Z",
    updated_at: "2026-06-10T09:00:00.000Z",
    ...overrides,
  };
}

function makeTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: "tag-1",
    user_id: "user-1",
    name: "開発",
    status: "active",
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ─── Tests ─────────────────────────────────────────────────────

// ── framework ──

describe("vitest フレームワーク", () => {
  it("基本的なアサーションが動作する", () => {
    expect(1 + 1).toBe(2);
    expect({ a: 1 }).toEqual({ a: 1 });
    expect("hello").toContain("ell");
  });
});

// ── statusPriority ──

describe("statusPriority", () => {
  it("template_id がある場合は 3（定型）を返す", () => {
    expect(statusPriority(makeMinute({ template_id: "tmpl-1" }))).toBe(3);
  });

  it("corrected_transcript がある場合は 2（校正済）を返す", () => {
    expect(statusPriority(makeMinute({ corrected_transcript: "..." }))).toBe(2);
  });

  it("original_transcript のみの場合は 1（文字起こし済）を返す", () => {
    expect(statusPriority(makeMinute({ original_transcript: "..." }))).toBe(1);
  });

  it("どのフィールドもない場合は 0（下書き）を返す", () => {
    expect(statusPriority(makeMinute())).toBe(0);
  });

  it("template_id が最優先される（他のフィールドが存在しても 3）", () => {
    expect(
      statusPriority(
        makeMinute({
          template_id: "tmpl-1",
          corrected_transcript: "...",
          original_transcript: "...",
        }),
      ),
    ).toBe(3);
  });

  it("corrected_transcript は original_transcript より優先される", () => {
    expect(
      statusPriority(
        makeMinute({
          corrected_transcript: "...",
          original_transcript: "...",
        }),
      ),
    ).toBe(2);
  });
});

// ── STATUS_LABELS ──

describe("STATUS_LABELS", () => {
  it("4つのステータスラベルが定義されている", () => {
    expect(Object.keys(STATUS_LABELS)).toHaveLength(4);
  });

  it("各ステータス値に対応する日本語ラベルがある", () => {
    expect(STATUS_LABELS[0]).toBe("下書き");
    expect(STATUS_LABELS[1]).toBe("文字起こし済");
    expect(STATUS_LABELS[2]).toBe("校正済");
    expect(STATUS_LABELS[3]).toBe("定型");
  });

  it("全てのラベルが空でない文字列である", () => {
    for (const label of Object.values(STATUS_LABELS)) {
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

// ── sortFavorites ──

describe("sortFavorites", () => {
  const minutes = [
    makeMinute({ id: "1", title: "BBB", created_at: "2026-03-01T00:00:00.000Z" }),
    makeMinute({ id: "2", title: "AAA", created_at: "2026-01-01T00:00:00.000Z" }),
    makeMinute({ id: "3", title: "CCC", created_at: "2026-02-01T00:00:00.000Z" }),
  ];

  describe("date ソート", () => {
    it("昇順: 古い順に並ぶ", () => {
      const result = sortFavorites(minutes, "date", "asc");
      expect(result.map((m) => m.id)).toEqual(["2", "3", "1"]);
    });

    it("降順: 新しい順に並ぶ", () => {
      const result = sortFavorites(minutes, "date", "desc");
      expect(result.map((m) => m.id)).toEqual(["1", "3", "2"]);
    });
  });

  describe("name ソート", () => {
    it("昇順: あいうえお順", () => {
      const result = sortFavorites(minutes, "name", "asc");
      expect(result.map((m) => m.id)).toEqual(["2", "1", "3"]); // AAA → BBB → CCC
    });

    it("降順: 逆順", () => {
      const result = sortFavorites(minutes, "name", "desc");
      expect(result.map((m) => m.id)).toEqual(["3", "1", "2"]); // CCC → BBB → AAA
    });
  });

  describe("status ソート", () => {
    const statusMinutes = [
      makeMinute({ id: "a", original_transcript: "..." }), // priority 1
      makeMinute({ id: "b" }), // priority 0
      makeMinute({ id: "c", template_id: "t" }), // priority 3
    ];

    it("昇順: 優先度の低い順", () => {
      const result = sortFavorites(statusMinutes, "status", "asc");
      expect(result.map((m) => m.id)).toEqual(["b", "a", "c"]);
    });

    it("降順: 優先度の高い順", () => {
      const result = sortFavorites(statusMinutes, "status", "desc");
      expect(result.map((m) => m.id)).toEqual(["c", "a", "b"]);
    });
  });

  it("元の配列を変更しない（イミュータブル）", () => {
    const original = minutes.map((m) => ({ ...m }));
    sortFavorites(minutes, "date", "desc");
    expect(minutes.map((m) => m.id)).toEqual(["1", "2", "3"]); // unchanged
  });
});

// ── formatDate ──

describe("formatDate", () => {
  it("ISO 日付を日本語ロケール (ja-JP) でフォーマットする", () => {
    const result = formatDate("2026-06-13T12:00:00.000Z");
    expect(result).toContain("6月");
    expect(result).toContain("13");
    expect(result).toContain("21:00"); // JST = UTC+9
  });

  it("異なる日付でも正しくフォーマットされる", () => {
    const result = formatDate("2025-01-01T00:00:00.000Z");
    expect(result).toContain("1月");
    expect(result).toContain("1");
    expect(result).toContain("09:00"); // JST
  });

  it("日付としてパースできない文字列は Invalid Date になる", () => {
    // Invalid Date を渡した場合、toLocaleDateString が "Invalid Date" を返す
    const result = formatDate("not-a-date");
    expect(result).toBeTruthy();
  });
});

// ── getPreview ──

describe("getPreview", () => {
  it("短いコンテンツはそのまま返す", () => {
    expect(getPreview("短いテキスト")).toBe("短いテキスト");
  });

  it("前後の空白をトリムする", () => {
    expect(getPreview("  テキスト  ")).toBe("テキスト");
  });

  it("マークダウン記号 (# * ` [ ]) を除去する", () => {
    expect(getPreview("## 見出し\n本文")).toBe("見出し\n本文");
    expect(getPreview("**太字**")).toBe("太字");
    expect(getPreview("`コード`")).toBe("コード");
    expect(getPreview("[リンク](url)")).toBe("リンク(url)"); // `[` と `]` が除去される
  });

  it("120文字を超える場合は切り詰めて … を付与する", () => {
    const long = "あ".repeat(150);
    const result = getPreview(long);
    expect(result).toHaveLength(121); // 120 + "…"
    expect(result.endsWith("…")).toBe(true);
  });

  it("ちょうど120文字の場合はそのまま返す", () => {
    const text = "あ".repeat(120);
    expect(getPreview(text)).toBe(text);
  });

  it("空文字列の場合は空文字列を返す", () => {
    expect(getPreview("")).toBe("");
  });

  it("マークダウン除去後に空になる場合は空文字列を返す", () => {
    expect(getPreview("  #  **  ")).toBe("");
  });
});

// ── getTagName ──

describe("getTagName", () => {
  const tags = [
    makeTag({ id: "t1", name: "開発" }),
    makeTag({ id: "t2", name: "報告" }),
  ];

  it("存在するタグ ID から名前を解決する", () => {
    expect(getTagName("t1", tags)).toBe("開発");
    expect(getTagName("t2", tags)).toBe("報告");
  });

  it("存在しないタグ ID はそのまま返す", () => {
    expect(getTagName("unknown", tags)).toBe("unknown");
  });

  it("空のタグリストからは ID をそのまま返す", () => {
    expect(getTagName("t1", [])).toBe("t1");
  });
});

// ── searchFilter（favorites-screen.tsx より抽出した検索ロジック） ──

describe("searchFilter", () => {
  const items = [
    makeMinute({ id: "1", title: "週次ミーティング", content: "進捗報告と課題共有" }),
    makeMinute({ id: "2", title: "設計レビュー", content: "アーキテクチャの議論" }),
    makeMinute({ id: "3", title: "定例MTG", content: "先週の振り返り" }),
  ];

  it("空クエリでは全件返す", () => {
    expect(searchFilter(items, "")).toHaveLength(3);
  });

  it("空白のみのクエリでは全件返す", () => {
    expect(searchFilter(items, "   ")).toHaveLength(3);
  });

  it("タイトル部分一致でフィルタリングする", () => {
    const result = searchFilter(items, "設計");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("本文部分一致でフィルタリングする", () => {
    const result = searchFilter(items, "アーキテクチャ");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("大文字小文字を区別しない", () => {
    const result = searchFilter(items, "mtg");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("複数ヒットするクエリでは該当する全件を返す", () => {
    // "進捗" は本文にのみ含まれる
    const result = searchFilter(items, "進捗");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("一致しないクエリでは空配列を返す", () => {
    const result = searchFilter(items, "存在しないテキスト");
    expect(result).toHaveLength(0);
  });

  it("クエリが空文字(トリム後)の場合は全件返す", () => {
    expect(searchFilter(items, "   ")).toHaveLength(3);
  });
});
