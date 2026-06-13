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
    maybeSingle: vi.fn().mockResolvedValue(result),
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
  getAllTemplates,
  getDefaultTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "../../src/services/templates";

// ---- Test data ----

const mockTemplate = {
  id: "tpl-1",
  user_id: "user-1",
  name: "Test Template",
  content: "Sample content",
  is_default: false,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
};

const mockDefaultTemplate = {
  ...mockTemplate,
  id: "tpl-default",
  name: "Default Template",
  is_default: true,
};

const mockError = new Error("Supabase error");

// ---- Tests ----

describe("templates service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルト: 認証済みユーザー
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" }, error: null });
  });

  describe("getAllTemplates", () => {
    it("returns templates on success", async () => {
      const expected = { data: [mockTemplate], error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await getAllTemplates();

      expect(result).toEqual(expected);
      expect(mockFrom).toHaveBeenCalledWith("templates");
    });

    it("returns error when not authenticated", async () => {
      const authError = new Error("Not authenticated");
      mockRequireUser.mockResolvedValue({ user: null, error: authError });

      const result = await getAllTemplates();

      expect(result).toEqual({ data: null, error: authError });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns error when query fails", async () => {
      const expected = { data: null, error: mockError };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await getAllTemplates();

      expect(result).toEqual(expected);
    });
  });

  describe("getDefaultTemplate", () => {
    it("returns default template on success", async () => {
      const expected = { data: mockDefaultTemplate, error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await getDefaultTemplate();

      expect(result).toEqual(expected);
      expect(mockFrom).toHaveBeenCalledWith("templates");
    });

    it("returns null when no default template exists", async () => {
      const expected = { data: null, error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await getDefaultTemplate();

      expect(result).toEqual(expected);
    });

    it("returns error when not authenticated", async () => {
      const authError = new Error("Not authenticated");
      mockRequireUser.mockResolvedValue({ user: null, error: authError });

      const result = await getDefaultTemplate();

      expect(result).toEqual({ data: null, error: authError });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns error when query fails", async () => {
      const expected = { data: null, error: mockError };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await getDefaultTemplate();

      expect(result).toEqual(expected);
    });
  });

  describe("createTemplate", () => {
    it("creates and returns a new template", async () => {
      const expected = { data: mockTemplate, error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await createTemplate("Test Template", "Sample content");

      expect(result).toEqual(expected);
      expect(mockFrom).toHaveBeenCalledWith("templates");
    });

    it("creates a default template when is_default is true", async () => {
      const defaultTpl = { ...mockTemplate, is_default: true };
      const expected = { data: defaultTpl, error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await createTemplate("Default", "Content", true);

      expect(result).toEqual(expected);
    });

    it("returns error when not authenticated", async () => {
      const authError = new Error("Not authenticated");
      mockRequireUser.mockResolvedValue({ user: null, error: authError });

      const result = await createTemplate("Test", "Content");

      expect(result).toEqual({ data: null, error: authError });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns error when insert fails", async () => {
      const expected = { data: null, error: mockError };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await createTemplate("Test", "Content");

      expect(result).toEqual(expected);
    });
  });

  describe("updateTemplate", () => {
    it("updates and returns the template", async () => {
      const updated = { ...mockTemplate, name: "Updated Name" };
      const expected = { data: updated, error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await updateTemplate("tpl-1", { name: "Updated Name" });

      expect(result).toEqual(expected);
      expect(mockFrom).toHaveBeenCalledWith("templates");
    });

    it("returns error when not authenticated", async () => {
      const authError = new Error("Not authenticated");
      mockRequireUser.mockResolvedValue({ user: null, error: authError });

      const result = await updateTemplate("tpl-1", { name: "Updated" });

      expect(result).toEqual({ data: null, error: authError });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns error when update fails", async () => {
      const expected = { data: null, error: mockError };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await updateTemplate("tpl-1", { name: "Updated" });

      expect(result).toEqual(expected);
    });
  });

  describe("deleteTemplate", () => {
    it("deletes and returns the deleted template", async () => {
      const expected = { data: mockTemplate, error: null };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await deleteTemplate("tpl-1");

      expect(result).toEqual(expected);
      expect(mockFrom).toHaveBeenCalledWith("templates");
    });

    it("returns error when not authenticated", async () => {
      const authError = new Error("Not authenticated");
      mockRequireUser.mockResolvedValue({ user: null, error: authError });

      const result = await deleteTemplate("tpl-1");

      expect(result).toEqual({ data: null, error: authError });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns error when delete fails", async () => {
      const expected = { data: null, error: mockError };
      mockFrom.mockReturnValue(createMockQueryBuilder(expected));

      const result = await deleteTemplate("tpl-1");

      expect(result).toEqual(expected);
    });
  });
});
