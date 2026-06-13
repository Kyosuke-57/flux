/**
 * tags-screen のテスト
 * - フレームワークの動作確認
 * - ユーティリティの単体テスト
 * - ソートロジックのテスト
 */

import { describe, it, expect } from "vitest";
import type { Tag, TagStatus } from "../../../../src/types";
import type { SortBy, SortOrder } from "../components/sort-controls";

// ─── フレームワーク動作確認 ───────────────────────────────

describe("vitest フレームワーク", () => {
  it("基本的なアサーションが動作する", () => {
    expect(1 + 1).toBe(2);
    expect({ a: 1 }).toEqual({ a: 1 });
    expect("hello").toContain("ell");
  });
});

// ─── タグのフィルタリングロジック ──────────────────────────

describe("タグフィルタリング", () => {
  const sampleTags: Tag[] = [
    { id: "1", user_id: "u1", name: "重要", status: "active", created_at: "2026-01-01T00:00:00Z" },
    { id: "2", user_id: "u1", name: "緊急", status: "active", created_at: "2026-01-02T00:00:00Z" },
    { id: "3", user_id: "u1", name: "MTG", status: "active", created_at: "2026-01-03T00:00:00Z" },
  ];

  it("空の検索では全件返す", () => {
    const result = sampleTags.filter((t) =>
      t.name.toLowerCase().includes("".toLowerCase()),
    );
    expect(result).toHaveLength(3);
  });

  it("部分一致でフィルタリングする", () => {
    const result = sampleTags.filter((t) =>
      t.name.toLowerCase().includes("緊".toLowerCase()),
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("緊急");
  });

  it("大文字小文字を区別しない", () => {
    const result = sampleTags.filter((t) =>
      t.name.toLowerCase().includes("mtg".toLowerCase()),
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("MTG");
  });

  it("該当なしの場合は空配列を返す", () => {
    const result = sampleTags.filter((t) =>
      t.name.toLowerCase().includes("存在しない".toLowerCase()),
    );
    expect(result).toHaveLength(0);
  });
});

// ─── タグのソートロジック ────────────────────────────────

describe("タグソート", () => {
  const sampleTags: Tag[] = [
    { id: "1", user_id: "u1", name: "業務連絡", status: "active", created_at: "2026-06-10T00:00:00Z" },
    { id: "2", user_id: "u1", name: "MTG", status: "archived", created_at: "2026-06-12T00:00:00Z" },
    { id: "3", user_id: "u1", name: "重要", status: "active", created_at: "2026-06-11T00:00:00Z" },
  ];

  function sortTags(tags: Tag[], sortBy: SortBy, sortOrder: SortOrder): Tag[] {
    const statusOrder: Record<TagStatus, number> = { active: 0, archived: 1 };
    const sorted = [...tags];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "date":
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "name":
          cmp = a.name.localeCompare(b.name, "ja");
          break;
        case "status":
          cmp = statusOrder[a.status] - statusOrder[b.status];
          break;
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return sorted;
  }

  it("名前昇順でソートする", () => {
    const result = sortTags(sampleTags, "name", "asc");
    expect(result[0].name).toBe("MTG");
    expect(result[1].name).toBe("業務連絡");
    expect(result[2].name).toBe("重要");
  });

  it("名前降順でソートする", () => {
    const result = sortTags(sampleTags, "name", "desc");
    expect(result[0].name).toBe("重要");
    expect(result[1].name).toBe("業務連絡");
    expect(result[2].name).toBe("MTG");
  });

  it("日付昇順でソートする", () => {
    const result = sortTags(sampleTags, "date", "asc");
    expect(result[0].name).toBe("業務連絡");
    expect(result[1].name).toBe("重要");
    expect(result[2].name).toBe("MTG");
  });

  it("日付降順でソートする", () => {
    const result = sortTags(sampleTags, "date", "desc");
    expect(result[0].name).toBe("MTG");
    expect(result[1].name).toBe("重要");
    expect(result[2].name).toBe("業務連絡");
  });

  it("ステータス昇順でソートする（active → archived）", () => {
    const result = sortTags(sampleTags, "status", "asc");
    expect(result[0].status).toBe("active");
    expect(result[1].status).toBe("active");
    expect(result[2].status).toBe("archived");
  });

  it("ステータス降順でソートする（archived → active）", () => {
    const result = sortTags(sampleTags, "status", "desc");
    expect(result[0].status).toBe("archived");
    expect(result[1].status).toBe("active");
    expect(result[2].status).toBe("active");
  });
});
