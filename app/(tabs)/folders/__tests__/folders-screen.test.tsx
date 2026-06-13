/**
 * folders-screen のテスト
 * - フレームワークの動作確認
 * - ユーティリティの単体テスト
 * - ソートロジックの検証
 */

import { describe, it, expect } from "vitest";
import type { Folder } from "../../../../src/types";

// ─── フレームワーク動作確認 ───────────────────────────────

describe("vitest フレームワーク", () => {
  it("基本的なアサーションが動作する", () => {
    expect(1 + 1).toBe(2);
    expect({ a: 1 }).toEqual({ a: 1 });
    expect("hello").toContain("ell");
  });
});

// ─── フォルダのフィルタリングロジック ──────────────────────────

describe("フォルダフィルタリング", () => {
  const sampleFolders = [
    { id: "1", user_id: "u1", name: "仕事" },
    { id: "2", user_id: "u1", name: "プライベート" },
    { id: "3", user_id: "u1", name: "MTG" },
  ];

  it("空の検索では全件返す", () => {
    const result = sampleFolders.filter((f) =>
      f.name.toLowerCase().includes("".toLowerCase()),
    );
    expect(result).toHaveLength(3);
  });

  it("部分一致でフィルタリングする", () => {
    const result = sampleFolders.filter((f) =>
      f.name.toLowerCase().includes("事".toLowerCase()),
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("仕事");
  });

  it("大文字小文字を区別しない", () => {
    const result = sampleFolders.filter((f) =>
      f.name.toLowerCase().includes("mtg".toLowerCase()),
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("MTG");
  });

  it("該当なしの場合は空配列を返す", () => {
    const result = sampleFolders.filter((f) =>
      f.name.toLowerCase().includes("存在しない".toLowerCase()),
    );
    expect(result).toHaveLength(0);
  });
});

// ─── フォルダのソートロジック ────────────────────────────

function sortFolders(
  folders: Folder[],
  sortBy: "date" | "name" | "status",
  sortOrder: "asc" | "desc",
): Folder[] {
  return [...folders].sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "date":
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case "name":
        cmp = a.name.localeCompare(b.name, "ja");
        break;
      case "status":
        cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        break;
    }
    return sortOrder === "desc" ? -cmp : cmp;
  });
}

describe("フォルダソート", () => {
  const sampleFolders: Folder[] = [
    { id: "1", user_id: "u1", name: "仕事", created_at: "2025-01-15T10:00:00Z", updated_at: "2025-06-01T10:00:00Z" },
    { id: "2", user_id: "u1", name: "プライベート", created_at: "2025-03-20T10:00:00Z", updated_at: "2025-05-15T10:00:00Z" },
    { id: "3", user_id: "u1", name: "MTG", created_at: "2025-02-10T10:00:00Z", updated_at: "2025-04-20T10:00:00Z" },
    { id: "4", user_id: "u1", name: "アーカイブ", created_at: "2025-06-01T10:00:00Z", updated_at: "2025-06-10T10:00:00Z" },
  ];

  it("日付昇順でソートする", () => {
    const result = sortFolders(sampleFolders, "date", "asc");
    expect(result[0].id).toBe("1");  // 2025-01-15
    expect(result[1].id).toBe("3");  // 2025-02-10
    expect(result[2].id).toBe("2");  // 2025-03-20
    expect(result[3].id).toBe("4");  // 2025-06-01
  });

  it("日付降順でソートする", () => {
    const result = sortFolders(sampleFolders, "date", "desc");
    expect(result[0].id).toBe("4");  // 2025-06-01
    expect(result[1].id).toBe("2");  // 2025-03-20
    expect(result[2].id).toBe("3");  // 2025-02-10
    expect(result[3].id).toBe("1");  // 2025-01-15
  });

  it("名前昇順でソートする", () => {
    const result = sortFolders(sampleFolders, "name", "asc");
    expect(result[0].name).toBe("MTG");
    expect(result[1].name).toBe("アーカイブ");
    expect(result[2].name).toBe("プライベート");
    expect(result[3].name).toBe("仕事");
  });

  it("名前降順でソートする", () => {
    const result = sortFolders(sampleFolders, "name", "desc");
    expect(result[0].name).toBe("仕事");
    expect(result[1].name).toBe("プライベート");
    expect(result[2].name).toBe("アーカイブ");
    expect(result[3].name).toBe("MTG");
  });

  it("ステータス（updated_at）昇順でソートする", () => {
    const result = sortFolders(sampleFolders, "status", "asc");
    expect(result[0].id).toBe("3");  // 2025-04-20
    expect(result[1].id).toBe("2");  // 2025-05-15
    expect(result[2].id).toBe("1");  // 2025-06-01
    expect(result[3].id).toBe("4");  // 2025-06-10
  });

  it("ステータス（updated_at）降順でソートする", () => {
    const result = sortFolders(sampleFolders, "status", "desc");
    expect(result[0].id).toBe("4");  // 2025-06-10
    expect(result[1].id).toBe("1");  // 2025-06-01
    expect(result[2].id).toBe("2");  // 2025-05-15
    expect(result[3].id).toBe("3");  // 2025-04-20
  });
});
