import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("@/lib/api-auth", () => ({
  getUser: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  createServiceRoleClient: vi.fn(),
}));

import { getUser } from "@/lib/api-auth";
import { createServiceRoleClient } from "@/lib/supabase";
import { GET } from "@/app/api/flux-status/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createGetRequest(url: string): NextRequest {
  return new NextRequest(url);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("GET /api/flux-status", () => {
  let mockSupabaseSingle: ReturnType<typeof vi.fn>;
  let mockSupabaseEq: ReturnType<typeof vi.fn>;
  let mockSupabaseSelect: ReturnType<typeof vi.fn>;
  let mockSupabaseFrom: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseSingle = vi.fn();
    mockSupabaseEq = vi.fn(() => ({ eq: mockSupabaseEq, single: mockSupabaseSingle }));
    mockSupabaseSelect = vi.fn(() => ({ eq: mockSupabaseEq }));
    mockSupabaseFrom = vi.fn(() => ({ select: mockSupabaseSelect }));

    (createServiceRoleClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockSupabaseFrom,
    });
  });

  it("returns 200 with job status when job found", async () => {
    (getUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: "test-user-id" },
    });
    mockSupabaseSingle.mockResolvedValue({
      data: {
        id: "job-1",
        status: "completed",
        completed_chunks: 3,
        total_chunks: 3,
        transcript: "テスト文字起こし",
        error_message: null,
      },
      error: null,
    });

    const req = createGetRequest("http://localhost:3000/api/flux-status?jobId=job-1");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("completed");
    expect(body.progress).toBe("3/3");
    expect(body.completedChunks).toBe(3);
    expect(body.totalChunks).toBe(3);
    expect(body.transcript).toBe("テスト文字起こし");
    expect(body.errorMessage).toBeUndefined();
  });

  it("returns 200 with queued status when job pending", async () => {
    (getUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: "test-user-id" },
    });
    mockSupabaseSingle.mockResolvedValue({
      data: {
        id: "job-2",
        status: "queued",
        completed_chunks: 0,
        total_chunks: 1,
        transcript: null,
        error_message: null,
      },
      error: null,
    });

    const req = createGetRequest("http://localhost:3000/api/flux-status?jobId=job-2");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("queued");
    expect(body.transcript).toBeUndefined();
  });

  it("returns 401 when unauthorized", async () => {
    (getUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: null,
    });

    const req = createGetRequest("http://localhost:3000/api/flux-status?jobId=job-1");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("認証が必要です");
  });

  it("returns 400 when jobId missing", async () => {
    (getUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: "test-user-id" },
    });

    const req = createGetRequest("http://localhost:3000/api/flux-status");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("jobId は必須です");
  });

  it("returns 404 when job not found", async () => {
    (getUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: "test-user-id" },
    });
    mockSupabaseSingle.mockResolvedValue({
      data: null,
      error: { message: "Not found" },
    });

    const req = createGetRequest("http://localhost:3000/api/flux-status?jobId=nonexistent");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("ジョブが見つかりません");
  });

  it("returns 500 on unexpected error", async () => {
    (getUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: "test-user-id" },
    });
    mockSupabaseSingle.mockRejectedValue(new Error("DB connection failed"));

    const req = createGetRequest("http://localhost:3000/api/flux-status?jobId=job-1");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("ステータスの取得に失敗しました");
  });
});
