import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mock external packages (same pattern as removeHallucinations.test.ts) ----

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

// ---- Shared mock state (hoisted so vi.mock factory can reference them) ----

const { mockRequireUser, mockFrom, createMockQueryBuilder } = vi.hoisted(() => ({
  mockRequireUser: vi.fn(),
  mockFrom: vi.fn(),
  createMockQueryBuilder: (result: unknown) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    or: vi.fn().mockReturnThis(),
  }),
}));

// ---- Mock our own supabase lib module ----

vi.mock("../../src/lib/supabase", () => ({
  supabase: {
    from: mockFrom,
  },
  requireUser: mockRequireUser,
}));

// ---- Imports under test ----

import {
  getAllMinutes,
  getMinute,
  createMinute,
  duplicateMinute,
  updateMinute,
  deleteMinute,
  searchMinutes,
} from "../../src/services/minutes";

// ---- Test data ----

const mockMinute1 = {
  id: "minute-1",
  user_id: "user-1",
  title: "テスト議事録1",
  content: "内容1",
  tags: ["tag1"],
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
};

const mockMinute2 = {
  id: "minute-2",
  user_id: "user-1",
  title: "テスト議事録2",
  content: "内容2",
  tags: [],
  created_at: "2024-01-03T00:00:00.000Z",
  updated_at: "2024-01-04T00:00:00.000Z",
};

const mockError = new Error("Supabase error");

// ---- Tests ----

describe("minutes service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルト: 認証済みユーザー
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" }, error: null });
  });

  describe("getAllMinutes", () => {
    it("returns all minutes ordered by updated_at desc", async () => {
      const expected = { data: [mockMinute1, mockMinute2], error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await getAllMinutes();

      expect(result).toEqual(expected);
      expect(mockFrom).toHaveBeenCalledWith("minutes");
    });

    it("returns auth error when user is not authenticated", async () => {
      const authError = new Error("Not authenticated");
      mockRequireUser.mockResolvedValue({ user: null, error: authError });

      const result = await getAllMinutes();

      expect(result).toEqual({ data: null, error: authError });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns error when Supabase query fails", async () => {
      const expected = { data: null, error: mockError };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await getAllMinutes();

      expect(result).toEqual(expected);
    });
  });

  describe("getMinute", () => {
    it("returns a single minute by id", async () => {
      const expected = { data: mockMinute1, error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await getMinute("minute-1");

      expect(result).toEqual(expected);
      expect(mockFrom).toHaveBeenCalledWith("minutes");
    });

    it("returns auth error when user is not authenticated", async () => {
      const authError = new Error("Not authenticated");
      mockRequireUser.mockResolvedValue({ user: null, error: authError });

      const result = await getMinute("minute-1");

      expect(result).toEqual({ data: null, error: authError });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns null data when minute not found", async () => {
      const expected = { data: null, error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await getMinute("nonexistent-id");

      expect(result).toEqual(expected);
    });

    it("returns error when Supabase query fails", async () => {
      const expected = { data: null, error: mockError };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await getMinute("minute-1");

      expect(result).toEqual(expected);
    });
  });

  describe("createMinute", () => {
    it("creates a new minute entry", async () => {
      const expected = { data: mockMinute1, error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await createMinute(
        "テスト議事録1",
        "内容1",
        ["tag1"],
        undefined,
        undefined,
        "original transcript",
        "corrected transcript",
        "recording/path",
      );

      expect(result).toEqual(expected);
      expect(mockFrom).toHaveBeenCalledWith("minutes");
    });

    it("returns auth error when user is not authenticated", async () => {
      const authError = new Error("Not authenticated");
      mockRequireUser.mockResolvedValue({ user: null, error: authError });

      const result = await createMinute("title", "content");

      expect(result).toEqual({ data: null, error: authError });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns error when Supabase insert fails", async () => {
      const expected = { data: null, error: mockError };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await createMinute("title", "content");

      expect(result).toEqual(expected);
    });
  });

  describe("duplicateMinute", () => {
    it("creates a copy with (コピー) suffix", async () => {
      const qb = createMockQueryBuilder({ data: mockMinute1, error: null });
      mockFrom.mockReturnValue(qb);

      const result = await duplicateMinute("minute-1");

      expect(result).toEqual({ data: mockMinute1, error: null });
      // getMinute と createMinute で2回 from が呼ばれる
      expect(mockFrom).toHaveBeenCalledTimes(2);
      expect(mockFrom).toHaveBeenCalledWith("minutes");
      // insert に (コピー) が付与されていることを確認
      expect(qb.insert).toHaveBeenCalledWith(
        expect.objectContaining({ title: "テスト議事録1 (コピー)" }),
      );
    });

    it("returns error when original minute is not found", async () => {
      mockFrom.mockReturnValue(
        createMockQueryBuilder({ data: null, error: null }),
      );

      const result = await duplicateMinute("nonexistent-id");

      expect(result).toEqual({
        data: null,
        error: new Error("Minute not found"),
      });
    });

    it("returns error when fetching original fails", async () => {
      mockFrom.mockReturnValue(
        createMockQueryBuilder({ data: null, error: mockError }),
      );

      const result = await duplicateMinute("minute-1");

      expect(result).toEqual({ data: null, error: mockError });
    });
  });

  describe("updateMinute", () => {
    it("updates existing entry", async () => {
      const updated = { ...mockMinute1, title: "更新済みタイトル" };
      const expected = { data: updated, error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await updateMinute("minute-1", {
        title: "更新済みタイトル",
      });

      expect(result).toEqual(expected);
      expect(mockFrom).toHaveBeenCalledWith("minutes");
    });

    it("returns auth error when user is not authenticated", async () => {
      const authError = new Error("Not authenticated");
      mockRequireUser.mockResolvedValue({ user: null, error: authError });

      const result = await updateMinute("minute-1", { title: "new title" });

      expect(result).toEqual({ data: null, error: authError });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns error when Supabase update fails", async () => {
      const expected = { data: null, error: mockError };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await updateMinute("minute-1", { title: "new title" });

      expect(result).toEqual(expected);
    });
  });

  describe("deleteMinute", () => {
    it("deletes a minute by id", async () => {
      const expected = { data: mockMinute1, error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await deleteMinute("minute-1");

      expect(result).toEqual(expected);
      expect(mockFrom).toHaveBeenCalledWith("minutes");
    });

    it("returns auth error when user is not authenticated", async () => {
      const authError = new Error("Not authenticated");
      mockRequireUser.mockResolvedValue({ user: null, error: authError });

      const result = await deleteMinute("minute-1");

      expect(result).toEqual({ data: null, error: authError });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns error when Supabase delete fails", async () => {
      const expected = { data: null, error: mockError };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await deleteMinute("minute-1");

      expect(result).toEqual(expected);
    });
  });

  describe("searchMinutes", () => {
    it("returns filtered results matching query", async () => {
      const expected = { data: [mockMinute1], error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await searchMinutes("テスト");

      expect(result).toEqual(expected);
      expect(mockFrom).toHaveBeenCalledWith("minutes");
    });

    it("returns auth error when user is not authenticated", async () => {
      const authError = new Error("Not authenticated");
      mockRequireUser.mockResolvedValue({ user: null, error: authError });

      const result = await searchMinutes("テスト");

      expect(result).toEqual({ data: null, error: authError });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns empty array when no minutes match", async () => {
      const expected = { data: [], error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await searchMinutes("存在しないクエリ");

      expect(result).toEqual(expected);
    });

    it("returns error when Supabase query fails", async () => {
      const expected = { data: null, error: mockError };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await searchMinutes("テスト");

      expect(result).toEqual(expected);
    });
  });
});
