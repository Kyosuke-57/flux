import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mock external packages (same pattern as templates.test.ts) ----

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
  getAllExports,
  getExport,
  createExport,
  updateExport,
  deleteExport,
} from "../../src/services/exports";

// ---- Test data ----

const mockExportItem = {
  id: "export-1",
  user_id: "user-1",
  minute_id: "minute-1",
  title: "会議録 2024-01",
  format: "pdf",
  created_at: "2024-01-01T00:00:00.000Z",
};

const mockExportItem2 = {
  id: "export-2",
  user_id: "user-1",
  minute_id: undefined,
  title: "議事メモ",
  format: "txt",
  created_at: "2024-01-02T00:00:00.000Z",
};

const mockError = new Error("Supabase error");

// ---- Tests ----

describe("exports service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルト: 認証済みユーザー
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" }, error: null });
  });

  describe("getAllExports", () => {
    it("returns exports sorted by created_at descending", async () => {
      const expected = { data: [mockExportItem2, mockExportItem], error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await getAllExports();

      expect(result).toEqual(expected);
      expect(mockFrom).toHaveBeenCalledWith("exports");
    });

    it("returns error when not authenticated", async () => {
      const authError = new Error("Not authenticated");
      mockRequireUser.mockResolvedValue({ user: null, error: authError });

      const result = await getAllExports();

      expect(result).toEqual({ data: null, error: authError });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns error when query fails", async () => {
      const expected = { data: null, error: mockError };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await getAllExports();

      expect(result).toEqual(expected);
    });
  });

  describe("getExport", () => {
    it("returns a single export by id", async () => {
      const expected = { data: mockExportItem, error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await getExport("export-1");

      expect(result).toEqual(expected);
      expect(mockFrom).toHaveBeenCalledWith("exports");
    });

    it("returns error when not authenticated", async () => {
      const authError = new Error("Not authenticated");
      mockRequireUser.mockResolvedValue({ user: null, error: authError });

      const result = await getExport("export-1");

      expect(result).toEqual({ data: null, error: authError });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns error when query fails", async () => {
      const expected = { data: null, error: mockError };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await getExport("export-1");

      expect(result).toEqual(expected);
    });

    it("returns null when export not found", async () => {
      const expected = { data: null, error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await getExport("nonexistent");

      expect(result).toEqual(expected);
    });
  });

  describe("createExport", () => {
    it("creates and returns a new export with all fields", async () => {
      const expected = { data: mockExportItem, error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await createExport("会議録 2024-01", "pdf", "minute-1");

      expect(result).toEqual(expected);
      expect(mockFrom).toHaveBeenCalledWith("exports");
    });

    it("creates an export without minute_id", async () => {
      const expected = { data: mockExportItem2, error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await createExport("議事メモ", "txt");

      expect(result).toEqual(expected);
      expect(mockFrom).toHaveBeenCalledWith("exports");
    });

    it("creates an export with md format", async () => {
      const mdExport = { ...mockExportItem, format: "md" };
      const expected = { data: mdExport, error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await createExport("MD Export", "md", "minute-2");

      expect(result).toEqual(expected);
    });

    it("returns error when not authenticated", async () => {
      const authError = new Error("Not authenticated");
      mockRequireUser.mockResolvedValue({ user: null, error: authError });

      const result = await createExport("会議録", "pdf");

      expect(result).toEqual({ data: null, error: authError });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns error when insert fails", async () => {
      const expected = { data: null, error: mockError };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await createExport("会議録", "pdf");

      expect(result).toEqual(expected);
    });
  });

  describe("updateExport", () => {
    it("updates and returns the export", async () => {
      const updated = { ...mockExportItem, title: "更新後のタイトル" };
      const expected = { data: updated, error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await updateExport("export-1", { title: "更新後のタイトル" });

      expect(result).toEqual(expected);
      expect(mockFrom).toHaveBeenCalledWith("exports");
    });

    it("updates format only", async () => {
      const updated = { ...mockExportItem, format: "md" };
      const expected = { data: updated, error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await updateExport("export-1", { format: "md" });

      expect(result).toEqual(expected);
    });

    it("updates minute_id only", async () => {
      const updated = { ...mockExportItem2, minute_id: "new-minute-id" };
      const expected = { data: updated, error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await updateExport("export-2", { minute_id: "new-minute-id" });

      expect(result).toEqual(expected);
    });

    it("returns error when not authenticated", async () => {
      const authError = new Error("Not authenticated");
      mockRequireUser.mockResolvedValue({ user: null, error: authError });

      const result = await updateExport("export-1", { title: "test" });

      expect(result).toEqual({ data: null, error: authError });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns error when update fails", async () => {
      const expected = { data: null, error: mockError };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await updateExport("export-1", { title: "test" });

      expect(result).toEqual(expected);
    });
  });

  describe("deleteExport", () => {
    it("deletes and returns the deleted export", async () => {
      const expected = { data: mockExportItem, error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await deleteExport("export-1");

      expect(result).toEqual(expected);
      expect(mockFrom).toHaveBeenCalledWith("exports");
    });

    it("returns error when not authenticated", async () => {
      const authError = new Error("Not authenticated");
      mockRequireUser.mockResolvedValue({ user: null, error: authError });

      const result = await deleteExport("export-1");

      expect(result).toEqual({ data: null, error: authError });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns error when delete fails", async () => {
      const expected = { data: null, error: mockError };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await deleteExport("export-1");

      expect(result).toEqual(expected);
    });
  });
});
