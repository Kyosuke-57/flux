import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mock external packages (same pattern as minutes.test.ts) ----

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
      or: vi.fn(() => builderWithData),
    };
    // Chainable methods always return builderWithData so that
    // destructuring (e.g. { error }) on the awaited terminal object
    // works even when the chain ends with .eq() (as in deleteFolder).
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
  getAllFolders,
  createFolder,
  updateFolder,
  deleteFolder,
} from "../../src/services/folders";

// ---- Test data ----

const mockFolder1 = {
  id: "folder-1",
  user_id: "user-1",
  name: "フォルダA",
  color: "#FF0000",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
};

const mockFolder2 = {
  id: "folder-2",
  user_id: "user-1",
  name: "フォルダB",
  color: undefined,
  created_at: "2024-01-03T00:00:00.000Z",
  updated_at: "2024-01-04T00:00:00.000Z",
};

const mockError = new Error("Supabase error");

// ---- Tests ----

describe("folders service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルト: 認証済みユーザー
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" }, error: null });
  });

  describe("getAllFolders", () => {
    it("returns folders for a user sorted by name", async () => {
      const expected = { data: [mockFolder1, mockFolder2], error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await getAllFolders();

      expect(result).toEqual(expected);
      expect(mockFrom).toHaveBeenCalledWith("folders");
    });
  });

  describe("createFolder", () => {
    it("creates a new folder", async () => {
      const expected = { data: mockFolder1, error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await createFolder("フォルダA");

      expect(result).toEqual(expected);
      expect(mockFrom).toHaveBeenCalledWith("folders");
    });
  });

  describe("updateFolder", () => {
    it("updates folder name and color", async () => {
      const updated = { ...mockFolder1, name: "更新済み", color: "#0000FF" };
      const expected = { data: updated, error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await updateFolder("folder-1", {
        name: "更新済み",
        color: "#0000FF",
      });

      expect(result).toEqual(expected);
      expect(mockFrom).toHaveBeenCalledWith("folders");
    });

    it("updates folder name only", async () => {
      const updated = { ...mockFolder1, name: "更新済み" };
      const expected = { data: updated, error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await updateFolder("folder-1", {
        name: "更新済み",
      });

      expect(result).toEqual(expected);
      expect(mockFrom).toHaveBeenCalledWith("folders");
    });
  });

  describe("deleteFolder", () => {
    it("deletes a folder", async () => {
      const expected = { error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await deleteFolder("folder-1");

      expect(result).toEqual(expected);
      expect(mockFrom).toHaveBeenCalledWith("folders");
    });
  });

  describe("error handling", () => {
    it("returns error when Supabase query fails on getAllFolders", async () => {
      const expected = { data: null, error: mockError };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await getAllFolders();

      expect(result).toEqual(expected);
    });

    it("returns error when Supabase query fails on createFolder", async () => {
      const expected = { data: null, error: mockError };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await createFolder("フォルダA");

      expect(result).toEqual(expected);
    });

    it("returns error when Supabase query fails on updateFolder", async () => {
      const expected = { data: null, error: mockError };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await updateFolder("folder-1", { name: "test" });

      expect(result).toEqual(expected);
    });

    it("returns error when Supabase query fails on deleteFolder", async () => {
      const expected = { error: mockError };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await deleteFolder("folder-1");

      expect(result).toEqual(expected);
    });

    it("returns auth error when user is not authenticated", async () => {
      const authError = new Error("Not authenticated");
      mockRequireUser.mockResolvedValue({ user: null, error: authError });

      const result = await getAllFolders();

      expect(result).toEqual({ data: null, error: authError });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns auth error on createFolder when not authenticated", async () => {
      const authError = new Error("Not authenticated");
      mockRequireUser.mockResolvedValue({ user: null, error: authError });

      const result = await createFolder("フォルダA");

      expect(result).toEqual({ data: null, error: authError });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns auth error on updateFolder when not authenticated", async () => {
      const authError = new Error("Not authenticated");
      mockRequireUser.mockResolvedValue({ user: null, error: authError });

      const result = await updateFolder("folder-1", { name: "test" });

      expect(result).toEqual({ data: null, error: authError });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns auth error on deleteFolder when not authenticated", async () => {
      const authError = new Error("Not authenticated");
      mockRequireUser.mockResolvedValue({ user: null, error: authError });

      const result = await deleteFolder("folder-1");

      // deleteFolder returns { error } (no data field)
      expect(result).toEqual({ error: authError });
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });
});
