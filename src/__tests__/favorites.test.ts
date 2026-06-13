import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mock external packages (same pattern as folders.test.ts) ----

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
  createMockQueryBuilder: (result: unknown) => {
    const resultObj = result as Record<string, unknown>;
    const builder = {
      select: vi.fn(() => builderWithData),
      insert: vi.fn(() => builderWithData),
      update: vi.fn(() => builderWithData),
      delete: vi.fn(() => builderWithData),
      eq: vi.fn(() => builderWithData),
      order: vi.fn(() => Promise.resolve(resultObj)),
      single: vi.fn(() => Promise.resolve(resultObj)),
      maybeSingle: vi.fn(() => Promise.resolve(resultObj)),
      or: vi.fn(() => builderWithData),
    };
    const builderWithData = { ...builder, ...resultObj };
    return builderWithData;
  },
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
  getAllFavorites,
  getFavoriteIds,
  toggleFavorite,
  isFavorited,
} from "../../src/services/favorites";

// ---- Test data ----

const mockFavorite1 = {
  id: "fav-1",
  user_id: "user-1",
  minute_id: "minute-1",
  created_at: "2024-01-02T00:00:00.000Z",
};

const mockFavorite2 = {
  id: "fav-2",
  user_id: "user-1",
  minute_id: "minute-2",
  created_at: "2024-01-01T00:00:00.000Z",
};

const mockError = new Error("Supabase error");

// ---- Tests ----

describe("favorites service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルト: 認証済みユーザー
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" }, error: null });
  });

  describe("getAllFavorites", () => {
    it("returns all favorites for the authenticated user sorted by created_at desc", async () => {
      const expected = { data: [mockFavorite1, mockFavorite2], error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await getAllFavorites();

      expect(result).toEqual(expected);
      expect(mockFrom).toHaveBeenCalledWith("favorites");
    });

    it("returns error when Supabase query fails", async () => {
      const expected = { data: null, error: mockError };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await getAllFavorites();

      expect(result).toEqual(expected);
    });

    it("returns auth error when not authenticated", async () => {
      const authError = new Error("Not authenticated");
      mockRequireUser.mockResolvedValue({ user: null, error: authError });

      const result = await getAllFavorites();

      expect(result).toEqual({ data: null, error: authError });
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe("getFavoriteIds", () => {
    it("returns a Set of minute_ids for the authenticated user", async () => {
      mockFrom.mockReturnValue(
        createMockQueryBuilder({
          data: [{ minute_id: "minute-1" }, { minute_id: "minute-2" }],
          error: null,
        }),
      );

      const result = await getFavoriteIds();

      expect(result).toEqual({
        data: new Set(["minute-1", "minute-2"]),
        error: null,
      });
      expect(mockFrom).toHaveBeenCalledWith("favorites");
    });

    it("returns null/error when Supabase query fails", async () => {
      mockFrom.mockReturnValue(
        createMockQueryBuilder({ data: null, error: mockError }),
      );

      const result = await getFavoriteIds();

      expect(result).toEqual({ data: null, error: mockError });
    });

    it("returns auth error when not authenticated", async () => {
      const authError = new Error("Not authenticated");
      mockRequireUser.mockResolvedValue({ user: null, error: authError });

      const result = await getFavoriteIds();

      expect(result).toEqual({ data: null, error: authError });
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe("toggleFavorite", () => {
    it("removes favorite when already favorited and returns false", async () => {
      mockFrom.mockReturnValue(
        createMockQueryBuilder({ data: { id: "fav-1" }, error: null }),
      );

      const result = await toggleFavorite("minute-1");

      expect(result).toEqual({ data: false, error: null });
      // 2 calls: one for the existence check, one for the delete
      expect(mockFrom).toHaveBeenCalledTimes(2);
      expect(mockFrom).toHaveBeenCalledWith("favorites");
    });

    it("inserts favorite when not favorited and returns true", async () => {
      mockFrom.mockReturnValue(
        createMockQueryBuilder({ data: null, error: null }),
      );

      const result = await toggleFavorite("minute-1");

      expect(result).toEqual({ data: true, error: null });
      // 2 calls: one for the existence check, one for the insert
      expect(mockFrom).toHaveBeenCalledTimes(2);
      expect(mockFrom).toHaveBeenCalledWith("favorites");
    });

    it("returns auth error when not authenticated", async () => {
      const authError = new Error("Not authenticated");
      mockRequireUser.mockResolvedValue({ user: null, error: authError });

      const result = await toggleFavorite("minute-1");

      expect(result).toEqual({ data: false, error: authError });
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe("isFavorited", () => {
    it("returns true when the minute is favorited", async () => {
      mockFrom.mockReturnValue(
        createMockQueryBuilder({ data: { id: "fav-1" }, error: null }),
      );

      const result = await isFavorited("minute-1");

      expect(result).toEqual({ data: true, error: null });
      expect(mockFrom).toHaveBeenCalledWith("favorites");
    });

    it("returns false when the minute is not favorited", async () => {
      mockFrom.mockReturnValue(
        createMockQueryBuilder({ data: null, error: null }),
      );

      const result = await isFavorited("minute-1");

      expect(result).toEqual({ data: false, error: null });
    });

    it("returns false/error when Supabase query fails", async () => {
      mockFrom.mockReturnValue(
        createMockQueryBuilder({ data: null, error: mockError }),
      );

      const result = await isFavorited("minute-1");

      expect(result).toEqual({ data: false, error: mockError });
    });

    it("returns auth error when not authenticated", async () => {
      const authError = new Error("Not authenticated");
      mockRequireUser.mockResolvedValue({ user: null, error: authError });

      const result = await isFavorited("minute-1");

      expect(result).toEqual({ data: false, error: authError });
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });
});
