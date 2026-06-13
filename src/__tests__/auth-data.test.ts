import { describe, it, expect, vi, beforeEach } from "vitest";

// ----- hoisted mock functions -----
const mockGetUser = vi.hoisted(() => vi.fn());

// Supabaseクエリチェーンの結果をテストごとに差し替えられるようにする共有オブジェクト
const mockFromResult = vi.hoisted(() => ({ data: null, error: null }));

// ----- module mocks -----
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(mockFromResult),
      then: (onFulfilled: any) =>
        Promise.resolve(mockFromResult).then(onFulfilled),
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

// ----- imports (after vi.mock — vitest hoists them) -----
import {
  getAllAuthData,
  getAuthData,
  createAuthData,
  updateAuthData,
  deleteAuthData,
} from "../services/auth-data";
import type { AuthData } from "../types";

// テスト用のAuthDataモック値
const mockAuthDataItem: AuthData = {
  id: "data-1",
  user_id: "test-user-id",
  provider: "openai",
  label: "OpenAI API",
  api_key: "sk-test123",
  is_active: true,
  created_at: "2024-06-01T00:00:00Z",
  updated_at: "2024-06-01T00:00:00Z",
};

const mockAuthDataList: AuthData[] = [
  mockAuthDataItem,
  {
    ...mockAuthDataItem,
    id: "data-2",
    provider: "anthropic",
    label: "Claude API",
    api_key: "sk-test456",
    is_active: false,
  },
];

describe("auth-data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // テストごとにmockFromResultの状態をリセット
    mockFromResult.data = null;
    mockFromResult.error = null;
  });

  // 認証済み状態をセットアップするヘルパー
  const setupAuthenticated = () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "test-user-id" } },
      error: null,
    });
  };

  // 未認証状態をセットアップするヘルパー
  const setupUnauthenticated = () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error("Not authenticated"),
    });
  };

  // ---------------------------------------------------------------
  // getAllAuthData
  // ---------------------------------------------------------------
  describe("getAllAuthData", () => {
    it("認証済みの場合、全auth_dataを返す", async () => {
      setupAuthenticated();
      mockFromResult.data = mockAuthDataList;

      const result = await getAllAuthData();

      expect(result.data).toEqual(mockAuthDataList);
      expect(result.error).toBeNull();
    });

    it("Supabaseクエリがエラーを返した場合、エラーを伝搬する", async () => {
      setupAuthenticated();
      const dbError = new Error("Database error");
      mockFromResult.error = dbError;

      const result = await getAllAuthData();

      expect(result.data).toBeNull();
      expect(result.error).toBe(dbError);
    });

    it("未認証の場合、認証エラーを返す", async () => {
      setupUnauthenticated();

      const result = await getAllAuthData();

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error!.message).toBe("Not authenticated");
    });
  });

  // ---------------------------------------------------------------
  // getAuthData
  // ---------------------------------------------------------------
  describe("getAuthData", () => {
    it("認証済みの場合、指定したidのauth_dataを返す", async () => {
      setupAuthenticated();
      mockFromResult.data = mockAuthDataItem;

      const result = await getAuthData("data-1");

      expect(result.data).toEqual(mockAuthDataItem);
      expect(result.error).toBeNull();
    });

    it("Supabaseクエリがエラーを返した場合、エラーを伝搬する", async () => {
      setupAuthenticated();
      const dbError = new Error("Not found");
      mockFromResult.error = dbError;

      const result = await getAuthData("nonexistent");

      expect(result.data).toBeNull();
      expect(result.error).toBe(dbError);
    });

    it("未認証の場合、認証エラーを返す", async () => {
      setupUnauthenticated();

      const result = await getAuthData("data-1");

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error!.message).toBe("Not authenticated");
    });
  });

  // ---------------------------------------------------------------
  // createAuthData
  // ---------------------------------------------------------------
  describe("createAuthData", () => {
    it("認証済みの場合、新規auth_dataを作成して返す", async () => {
      setupAuthenticated();
      const newData: AuthData = {
        ...mockAuthDataItem,
        id: "data-new",
        provider: "groq",
        label: "Groq Cloud",
        api_key: "gsk-test789",
      };
      mockFromResult.data = newData;

      const result = await createAuthData("groq", "Groq Cloud", "gsk-test789");

      expect(result.data).toEqual(newData);
      expect(result.error).toBeNull();
    });

    it("Supabaseクエリがエラーを返した場合、エラーを伝搬する", async () => {
      setupAuthenticated();
      const dbError = new Error("Insert failed");
      mockFromResult.error = dbError;

      const result = await createAuthData("groq", "Groq", "key123");

      expect(result.data).toBeNull();
      expect(result.error).toBe(dbError);
    });

    it("未認証の場合、認証エラーを返す", async () => {
      setupUnauthenticated();

      const result = await createAuthData("groq", "Groq", "key123");

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error!.message).toBe("Not authenticated");
    });
  });

  // ---------------------------------------------------------------
  // updateAuthData
  // ---------------------------------------------------------------
  describe("updateAuthData", () => {
    it("認証済みの場合、auth_dataを更新して返す", async () => {
      setupAuthenticated();
      const updatedData: AuthData = {
        ...mockAuthDataItem,
        label: "OpenAI API (Updated)",
        is_active: false,
      };
      mockFromResult.data = updatedData;

      const result = await updateAuthData("data-1", {
        label: "OpenAI API (Updated)",
        is_active: false,
      });

      expect(result.data).toEqual(updatedData);
      expect(result.error).toBeNull();
    });

    it("Supabaseクエリがエラーを返した場合、エラーを伝搬する", async () => {
      setupAuthenticated();
      const dbError = new Error("Update failed");
      mockFromResult.error = dbError;

      const result = await updateAuthData("data-1", {
        label: "New Label",
      });

      expect(result.data).toBeNull();
      expect(result.error).toBe(dbError);
    });

    it("未認証の場合、認証エラーを返す", async () => {
      setupUnauthenticated();

      const result = await updateAuthData("data-1", {
        label: "New Label",
      });

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error!.message).toBe("Not authenticated");
    });
  });

  // ---------------------------------------------------------------
  // deleteAuthData
  // ---------------------------------------------------------------
  describe("deleteAuthData", () => {
    it("認証済みの場合、auth_dataを削除してerror: nullを返す", async () => {
      setupAuthenticated();
      mockFromResult.error = null;

      const result = await deleteAuthData("data-1");

      expect(result.error).toBeNull();
    });

    it("Supabaseクエリがエラーを返した場合、エラーを伝搬する", async () => {
      setupAuthenticated();
      const dbError = new Error("Delete failed");
      mockFromResult.error = dbError;

      const result = await deleteAuthData("data-1");

      expect(result.error).toBe(dbError);
    });

    it("未認証の場合、認証エラーを返す", async () => {
      setupUnauthenticated();

      const result = await deleteAuthData("data-1");

      expect(result.error).toBeInstanceOf(Error);
      expect(result.error!.message).toBe("Not authenticated");
    });
  });
});
