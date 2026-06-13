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

import { getAllMinutes, createMinute, updateMinute, deleteMinute } from "../../src/services/minutes";

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

  describe("fetchMinutes", () => {
    it("fetchMinutes returns formatted data", async () => {
      const expected = { data: [mockMinute1, mockMinute2], error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await getAllMinutes();

      expect(result).toEqual(expected);
      expect(mockFrom).toHaveBeenCalledWith("minutes");
    });
  });

  describe("createMinutes", () => {
    it("createMinutes creates a new minute entry", async () => {
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
  });

  describe("updateMinutes", () => {
    it("updateMinutes updates existing entry", async () => {
      const updated = { ...mockMinute1, title: "更新済みタイトル" };
      const expected = { data: updated, error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await updateMinute("minute-1", { title: "更新済みタイトル" });

      expect(result).toEqual(expected);
      expect(mockFrom).toHaveBeenCalledWith("minutes");
    });
  });

  describe("deleteMinutes", () => {
    it("deleteMinutes deletes", async () => {
      const expected = { data: mockMinute1, error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await deleteMinute("minute-1");

      expect(result).toEqual(expected);
      expect(mockFrom).toHaveBeenCalledWith("minutes");
    });
  });

  describe("error handling", () => {
    it("returns error when Supabase query fails", async () => {
      const expected = { data: null, error: mockError };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await getAllMinutes();

      expect(result).toEqual(expected);
    });

    it("returns auth error when user is not authenticated", async () => {
      const authError = new Error("Not authenticated");
      mockRequireUser.mockResolvedValue({ user: null, error: authError });

      const result = await getAllMinutes();

      expect(result).toEqual({ data: null, error: authError });
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });
});
