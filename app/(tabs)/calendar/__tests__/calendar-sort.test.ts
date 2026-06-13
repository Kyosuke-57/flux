import { describe, it, expect } from "vitest";
import type { Minute } from "../../../../src/types";

/** カレンダー画面で使われているのと同じソートロジック */
function sortMinutes(
  minutes: Minute[],
  sortBy: "date" | "name" | "status",
  sortDirection: "asc" | "desc",
): Minute[] {
  const sorted = [...minutes];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "date":
        cmp =
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime();
        break;
      case "name":
        cmp = a.title.localeCompare(b.title);
        break;
      case "status":
        cmp = (a.tags?.length ?? 0) - (b.tags?.length ?? 0);
        break;
    }
    return sortDirection === "asc" ? cmp : -cmp;
  });
  return sorted;
}

function makeMinute(overrides: Partial<Minute>): Minute {
  return {
    id: "id-" + Math.random().toString(36).slice(2),
    user_id: "user1",
    title: "Test Minute",
    content: "Content",
    tags: [],
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
    ...overrides,
  };
}

describe("sortMinutes", () => {
  const minutes: Minute[] = [
    makeMinute({
      title: "B Meeting",
      created_at: "2026-01-15T12:00:00Z",
      tags: ["important"],
    }),
    makeMinute({
      title: "A Meeting",
      created_at: "2026-01-15T10:00:00Z",
      tags: ["urgent", "bug"],
    }),
    makeMinute({
      title: "C Meeting",
      created_at: "2026-01-15T11:00:00Z",
      tags: [],
    }),
  ];

  it("sorts by date ascending", () => {
    const result = sortMinutes(minutes, "date", "asc");
    expect(result[0].title).toBe("A Meeting");
    expect(result[1].title).toBe("C Meeting");
    expect(result[2].title).toBe("B Meeting");
  });

  it("sorts by date descending", () => {
    const result = sortMinutes(minutes, "date", "desc");
    expect(result[0].title).toBe("B Meeting");
    expect(result[1].title).toBe("C Meeting");
    expect(result[2].title).toBe("A Meeting");
  });

  it("sorts by name ascending", () => {
    const result = sortMinutes(minutes, "name", "asc");
    expect(result[0].title).toBe("A Meeting");
    expect(result[1].title).toBe("B Meeting");
    expect(result[2].title).toBe("C Meeting");
  });

  it("sorts by name descending", () => {
    const result = sortMinutes(minutes, "name", "desc");
    expect(result[0].title).toBe("C Meeting");
    expect(result[1].title).toBe("B Meeting");
    expect(result[2].title).toBe("A Meeting");
  });

  it("sorts by status (tags.length) ascending", () => {
    const result = sortMinutes(minutes, "status", "asc");
    // C Meeting (0 tags) < B Meeting (1 tag) < A Meeting (2 tags)
    expect(result[0].title).toBe("C Meeting");
    expect(result[1].title).toBe("B Meeting");
    expect(result[2].title).toBe("A Meeting");
  });

  it("sorts by status (tags.length) descending", () => {
    const result = sortMinutes(minutes, "status", "desc");
    expect(result[0].title).toBe("A Meeting");
    expect(result[1].title).toBe("B Meeting");
    expect(result[2].title).toBe("C Meeting");
  });

  it("handles empty list", () => {
    const result = sortMinutes([], "date", "asc");
    expect(result).toEqual([]);
  });

  it("handles single item", () => {
    const single = [minutes[0]];
    const result = sortMinutes(single, "name", "asc");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("B Meeting");
  });

  it("handles minutes with undefined tags (treated as 0)", () => {
    const withUndefined = [
      makeMinute({ title: "X", tags: ["tag"] }),
      makeMinute({ title: "Y", tags: undefined as unknown as string[] }),
    ];
    const result = sortMinutes(withUndefined, "status", "asc");
    expect(result[0].title).toBe("Y");
    expect(result[1].title).toBe("X");
  });

  it("handles same created_at dates (stable order not guaranteed)", () => {
    const sameDate = [
      makeMinute({ title: "First", created_at: "2026-06-14T10:00:00Z" }),
      makeMinute({ title: "Second", created_at: "2026-06-14T10:00:00Z" }),
    ];
    const result = sortMinutes(sameDate, "date", "asc");
    expect(result).toHaveLength(2);
    // 同値の場合は元の順序が維持されることを確認（挿入安定性）
    expect(result[0].title).toBe("First");
    expect(result[1].title).toBe("Second");
  });
});
