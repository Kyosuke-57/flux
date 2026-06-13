import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn(),
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

import { supabase } from "../lib/supabase";
import { getAllTags, createTag, updateTag, deleteTag } from "../services/tags";
import type { Tag } from "../types";

const TEST_USER = { id: "user-1", email: "test@example.com" };

/** Create a fresh mock Supabase query builder with thenable support. */
function createQueryBuilder() {
  const builder: any = {};
  builder.select = vi.fn(() => builder);
  builder.insert = vi.fn(() => builder);
  builder.update = vi.fn(() => builder);
  builder.delete = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.single = vi.fn(() => builder);
  builder.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getAllTags
// ---------------------------------------------------------------------------
describe("getAllTags", () => {
  it("認証済みユーザーのタグ一覧をアルファベット順で返す", async () => {
    const tags: Tag[] = [
      { id: "1", user_id: TEST_USER.id, name: "important", color: "#ff0000" },
      { id: "2", user_id: TEST_USER.id, name: "meeting" },
    ];

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: TEST_USER },
      error: null,
    } as any);

    const builder = createQueryBuilder();
    vi.mocked(supabase.from).mockReturnValue(builder);
    builder.then.mockImplementation((resolve: any) =>
      resolve({ data: tags, error: null }),
    );

    const result = await getAllTags();

    expect(supabase.from).toHaveBeenCalledWith("tags");
    expect(builder.select).toHaveBeenCalledWith("*");
    expect(builder.eq).toHaveBeenCalledWith("user_id", TEST_USER.id);
    expect(builder.order).toHaveBeenCalledWith("name");
    expect(result.data).toEqual(tags);
    expect(result.error).toBeNull();
  });

  it("認証エラーのときは error を返す", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: new Error("Unauthorized"),
    } as any);

    const builder = createQueryBuilder();
    vi.mocked(supabase.from).mockReturnValue(builder);

    const result = await getAllTags();

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toBe("Unauthorized");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("未認証のときは Not authenticated エラーを返す", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    } as any);

    const builder = createQueryBuilder();
    vi.mocked(supabase.from).mockReturnValue(builder);

    const result = await getAllTags();

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toBe("Not authenticated");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("Supabase クエリがエラーを返したら error を伝播する", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: TEST_USER },
      error: null,
    } as any);

    const dbError = new Error("Database error");
    const builder = createQueryBuilder();
    vi.mocked(supabase.from).mockReturnValue(builder);
    builder.then.mockImplementation((resolve: any) =>
      resolve({ data: null, error: dbError }),
    );

    const result = await getAllTags();

    expect(result.data).toBeNull();
    expect(result.error).toBe(dbError);
  });
});

// ---------------------------------------------------------------------------
// createTag
// ---------------------------------------------------------------------------
describe("createTag", () => {
  const newTag: Tag = {
    id: "new-1",
    user_id: TEST_USER.id,
    name: "bug",
    color: "#ff0000",
  };

  it("名前のみでタグを作成する", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: TEST_USER },
      error: null,
    } as any);

    const tagNoColor: Tag = { id: "new-1", user_id: TEST_USER.id, name: "bug" };
    const builder = createQueryBuilder();
    vi.mocked(supabase.from).mockReturnValue(builder);
    builder.then.mockImplementation((resolve: any) =>
      resolve({ data: tagNoColor, error: null }),
    );

    const result = await createTag("bug");

    expect(supabase.from).toHaveBeenCalledWith("tags");
    expect(builder.insert).toHaveBeenCalledWith({
      name: "bug",
      user_id: TEST_USER.id,
    });
    expect(builder.select).toHaveBeenCalled();
    expect(builder.single).toHaveBeenCalled();
    expect(result.data).toEqual(tagNoColor);
    expect(result.error).toBeNull();
  });

  it("名前と色を指定してタグを作成する", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: TEST_USER },
      error: null,
    } as any);

    const builder = createQueryBuilder();
    vi.mocked(supabase.from).mockReturnValue(builder);
    builder.then.mockImplementation((resolve: any) =>
      resolve({ data: newTag, error: null }),
    );

    const result = await createTag("bug", "#ff0000");

    expect(builder.insert).toHaveBeenCalledWith({
      name: "bug",
      color: "#ff0000",
      user_id: TEST_USER.id,
    });
    expect(result.data).toEqual(newTag);
    expect(result.error).toBeNull();
  });

  it("認証エラーのときは error を返す", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: new Error("Unauthorized"),
    } as any);

    const builder = createQueryBuilder();
    vi.mocked(supabase.from).mockReturnValue(builder);

    const result = await createTag("bug");

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updateTag
// ---------------------------------------------------------------------------
describe("updateTag", () => {
  const updatedTag: Tag = {
    id: "tag-1",
    user_id: TEST_USER.id,
    name: "critical",
    color: "#ff0000",
  };

  it("名前を更新する", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: TEST_USER },
      error: null,
    } as any);

    const builder = createQueryBuilder();
    vi.mocked(supabase.from).mockReturnValue(builder);
    builder.then.mockImplementation((resolve: any) =>
      resolve({ data: updatedTag, error: null }),
    );

    const result = await updateTag("tag-1", { name: "critical" });

    expect(supabase.from).toHaveBeenCalledWith("tags");
    expect(builder.update).toHaveBeenCalledWith({ name: "critical" });
    expect(builder.eq).toHaveBeenCalledWith("id", "tag-1");
    expect(builder.eq).toHaveBeenCalledWith("user_id", TEST_USER.id);
    expect(builder.select).toHaveBeenCalled();
    expect(builder.single).toHaveBeenCalled();
    expect(result.data).toEqual(updatedTag);
    expect(result.error).toBeNull();
  });

  it("色を更新する", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: TEST_USER },
      error: null,
    } as any);

    const builder = createQueryBuilder();
    vi.mocked(supabase.from).mockReturnValue(builder);
    builder.then.mockImplementation((resolve: any) =>
      resolve({ data: updatedTag, error: null }),
    );

    const result = await updateTag("tag-1", { color: "#00ff00" });

    expect(builder.update).toHaveBeenCalledWith({ color: "#00ff00" });
    expect(result.data).toEqual(updatedTag);
    expect(result.error).toBeNull();
  });

  it("名前と色を同時に更新する", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: TEST_USER },
      error: null,
    } as any);

    const builder = createQueryBuilder();
    vi.mocked(supabase.from).mockReturnValue(builder);
    builder.then.mockImplementation((resolve: any) =>
      resolve({ data: updatedTag, error: null }),
    );

    const result = await updateTag("tag-1", {
      name: "critical",
      color: "#ff0000",
    });

    expect(builder.update).toHaveBeenCalledWith({
      name: "critical",
      color: "#ff0000",
    });
    expect(result.data).toEqual(updatedTag);
    expect(result.error).toBeNull();
  });

  it("認証エラーのときは error を返す", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: new Error("Unauthorized"),
    } as any);

    const builder = createQueryBuilder();
    vi.mocked(supabase.from).mockReturnValue(builder);

    const result = await updateTag("tag-1", { name: "critical" });

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deleteTag
// ---------------------------------------------------------------------------
describe("deleteTag", () => {
  it("タグを削除する", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: TEST_USER },
      error: null,
    } as any);

    const builder = createQueryBuilder();
    vi.mocked(supabase.from).mockReturnValue(builder);
    builder.then.mockImplementation((resolve: any) =>
      resolve({ error: null }),
    );

    const result = await deleteTag("tag-1");

    expect(supabase.from).toHaveBeenCalledWith("tags");
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("id", "tag-1");
    expect(builder.eq).toHaveBeenCalledWith("user_id", TEST_USER.id);
    expect(result.error).toBeNull();
  });

  it("認証エラーのときは error を返す", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: new Error("Unauthorized"),
    } as any);

    const builder = createQueryBuilder();
    vi.mocked(supabase.from).mockReturnValue(builder);

    const result = await deleteTag("tag-1");

    expect(result.error).toBeInstanceOf(Error);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
