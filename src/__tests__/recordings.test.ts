import { describe, it, expect, vi, beforeEach } from "vitest";

// ----- hoisted mock functions -----
const mockGetUser = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());

const { MockPostgrestError } = vi.hoisted(() => {
  class MockPostgrestError extends Error {
    details: string;
    hint: string;
    code: string;
    constructor(context: {
      message: string;
      details: string;
      hint: string;
      code: string;
    }) {
      super(context.message);
      this.name = "PostgrestError";
      this.details = context.details;
      this.hint = context.hint;
      this.code = context.code;
    }
  }
  return { MockPostgrestError };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
  PostgrestError: MockPostgrestError,
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
  getAllRecordings,
  getRecording,
  createRecording,
  updateRecording,
  deleteRecording,
  searchRecordings,
} from "../services/recordings";

// ----- test helpers -----

/**
 * チェーン可能な Thenable モッククエリビルダーを作成する。
 * 各チェーンメソッドは自身を返し、await すると `_result` を解決する。
 */
function createMockQueryBuilder() {
  const builder = {
    _result: { data: null, error: null } as { data: any; error: any },
    /** Thenable — await すると _result で解決する */
    then: function (onFulfilled: any) {
      return Promise.resolve(this._result).then(onFulfilled);
    },
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
    or: vi.fn(),
  };
  builder.select.mockReturnValue(builder);
  builder.insert.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  builder.delete.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.single.mockReturnValue(builder);
  builder.or.mockReturnValue(builder);
  return builder;
}

let currentBuilder: ReturnType<typeof createMockQueryBuilder>;

// ----- sample data -----
const mockUser = { id: "u1", email: "test@example.com" };
const mockRecording = {
  id: "rec1",
  user_id: "u1",
  title: "会議録音",
  file_path: "recordings/test.m4a",
  duration_seconds: 120,
  created_at: "2026-06-13T00:00:00Z",
  transcribed: false,
};
const mockRecordings = [mockRecording];

// ----- tests -----
describe("recordings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentBuilder = createMockQueryBuilder();
    mockFrom.mockReturnValue(currentBuilder);
  });

  describe("getAllRecordings", () => {
    it("認証済みユーザーの録音一覧を返す", async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      currentBuilder._result = { data: mockRecordings, error: null };

      const result = await getAllRecordings();

      expect(mockFrom).toHaveBeenCalledWith("recordings");
      expect(currentBuilder.select).toHaveBeenCalledWith("*");
      expect(currentBuilder.eq).toHaveBeenCalledWith("user_id", mockUser.id);
      expect(currentBuilder.order).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
      expect(result).toEqual({ data: mockRecordings, error: null });
    });

    it("認証エラーの場合は null とエラーを返す", async () => {
      const authError = new Error("Not authenticated");
      mockGetUser.mockResolvedValue({ data: { user: null }, error: authError });

      const result = await getAllRecordings();

      expect(mockFrom).not.toHaveBeenCalled();
      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(MockPostgrestError);
      expect(result.error?.message).toBe("Not authenticated");
    });
  });

  describe("getRecording", () => {
    it("単一の録音データを返す", async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      currentBuilder._result = { data: mockRecording, error: null };

      const result = await getRecording("rec1");

      expect(mockFrom).toHaveBeenCalledWith("recordings");
      expect(currentBuilder.select).toHaveBeenCalledWith("*");
      expect(currentBuilder.eq).toHaveBeenCalledTimes(2);
      expect(currentBuilder.eq).toHaveBeenNthCalledWith(1, "id", "rec1");
      expect(currentBuilder.eq).toHaveBeenNthCalledWith(2, "user_id", mockUser.id);
      expect(currentBuilder.single).toHaveBeenCalledOnce();
      expect(result).toEqual({ data: mockRecording, error: null });
    });

    it("認証エラーの場合は null とエラーを返す", async () => {
      const authError = new Error("Not authenticated");
      mockGetUser.mockResolvedValue({ data: { user: null }, error: authError });

      const result = await getRecording("rec1");

      expect(mockFrom).not.toHaveBeenCalled();
      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(MockPostgrestError);
      expect(result.error?.message).toBe("Not authenticated");
    });
  });

  describe("createRecording", () => {
    const input = {
      title: "新規録音",
      file_path: "recordings/new.m4a",
      duration_seconds: 60,
      transcribed: false,
    };

    it("新しい録音データを作成する", async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      const created = { id: "rec2", user_id: "u1", ...input, created_at: "2026-06-13T00:00:00Z" };
      currentBuilder._result = { data: created, error: null };

      const result = await createRecording(input);

      expect(mockFrom).toHaveBeenCalledWith("recordings");
      expect(currentBuilder.insert).toHaveBeenCalledWith({
        user_id: mockUser.id,
        title: input.title,
        file_path: input.file_path,
        duration_seconds: input.duration_seconds,
        transcribed: input.transcribed,
      });
      expect(currentBuilder.select).toHaveBeenCalledOnce();
      expect(currentBuilder.single).toHaveBeenCalledOnce();
      expect(result).toEqual({ data: created, error: null });
    });

    it("認証エラーの場合は null とエラーを返す", async () => {
      const authError = new Error("Not authenticated");
      mockGetUser.mockResolvedValue({ data: { user: null }, error: authError });

      const result = await createRecording(input);

      expect(mockFrom).not.toHaveBeenCalled();
      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(MockPostgrestError);
      expect(result.error?.message).toBe("Not authenticated");
    });
  });

  describe("updateRecording", () => {
    const updates = { title: "更新されたタイトル" };

    it("録音データを更新する", async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      const updated = { ...mockRecording, ...updates };
      currentBuilder._result = { data: updated, error: null };

      const result = await updateRecording("rec1", updates);

      expect(mockFrom).toHaveBeenCalledWith("recordings");
      expect(currentBuilder.update).toHaveBeenCalledWith(updates);
      expect(currentBuilder.eq).toHaveBeenCalledTimes(2);
      expect(currentBuilder.eq).toHaveBeenNthCalledWith(1, "id", "rec1");
      expect(currentBuilder.eq).toHaveBeenNthCalledWith(2, "user_id", mockUser.id);
      expect(currentBuilder.select).toHaveBeenCalledOnce();
      expect(currentBuilder.single).toHaveBeenCalledOnce();
      expect(result).toEqual({ data: updated, error: null });
    });

    it("認証エラーの場合は null とエラーを返す", async () => {
      const authError = new Error("Not authenticated");
      mockGetUser.mockResolvedValue({ data: { user: null }, error: authError });

      const result = await updateRecording("rec1", updates);

      expect(mockFrom).not.toHaveBeenCalled();
      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(MockPostgrestError);
      expect(result.error?.message).toBe("Not authenticated");
    });
  });

  describe("deleteRecording", () => {
    it("録音データを削除する", async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      currentBuilder._result = { data: null, error: null };

      const result = await deleteRecording("rec1");

      expect(mockFrom).toHaveBeenCalledWith("recordings");
      expect(currentBuilder.delete).toHaveBeenCalledOnce();
      expect(currentBuilder.eq).toHaveBeenCalledTimes(2);
      expect(currentBuilder.eq).toHaveBeenNthCalledWith(1, "id", "rec1");
      expect(currentBuilder.eq).toHaveBeenNthCalledWith(2, "user_id", mockUser.id);
      expect(result).toEqual({ error: null });
    });

    it("認証エラーの場合はエラーを返す", async () => {
      const authError = new Error("Not authenticated");
      mockGetUser.mockResolvedValue({ data: { user: null }, error: authError });

      const result = await deleteRecording("rec1");

      expect(mockFrom).not.toHaveBeenCalled();
      expect(result.error).toBeInstanceOf(MockPostgrestError);
      expect(result.error?.message).toBe("Not authenticated");
    });
  });

  describe("searchRecordings", () => {
    it("タイトルとファイルパスを部分一致検索する", async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      currentBuilder._result = { data: mockRecordings, error: null };

      const result = await searchRecordings("会議");

      expect(mockFrom).toHaveBeenCalledWith("recordings");
      expect(currentBuilder.select).toHaveBeenCalledWith("*");
      expect(currentBuilder.eq).toHaveBeenCalledWith("user_id", mockUser.id);
      expect(currentBuilder.or).toHaveBeenCalledWith(
        "title.ilike.%会議%,file_path.ilike.%会議%",
      );
      expect(currentBuilder.order).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
      expect(result).toEqual({ data: mockRecordings, error: null });
    });

    it("認証エラーの場合は null とエラーを返す", async () => {
      const authError = new Error("Not authenticated");
      mockGetUser.mockResolvedValue({ data: { user: null }, error: authError });

      const result = await searchRecordings("会議");

      expect(mockFrom).not.toHaveBeenCalled();
      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(MockPostgrestError);
      expect(result.error?.message).toBe("Not authenticated");
    });
  });
});
