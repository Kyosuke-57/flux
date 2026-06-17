import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../app/api/flux-upload-url/route";

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

vi.mock("../lib/api-auth", () => ({
  getUser: vi.fn(),
}));

vi.mock("../lib/r2", () => ({
  generateUploadUrl: vi.fn(),
  isValidAudioType: vi.fn(),
}));

import { getUser } from "../lib/api-auth";
import { generateUploadUrl, isValidAudioType } from "../lib/r2";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockRequest(
  body?: Record<string, unknown>,
  authHeader?: string,
): any {
  return {
    json: vi.fn().mockResolvedValue(body ?? {}),
    headers: {
      get: (name: string) => {
        if (name === "Authorization") return authHeader ?? null;
        return null;
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/flux-upload-url", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST returns 200 with uploadUrl and r2Key", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockUploadUrl = "https://signed-url.example.com/upload";
    const mockR2Key = "otoroku/user-123/1234567890-abc.m4a";

    vi.mocked(getUser).mockResolvedValue({ user: mockUser });
    vi.mocked(isValidAudioType).mockReturnValue(true);
    vi.mocked(generateUploadUrl).mockResolvedValue({
      uploadUrl: mockUploadUrl,
      r2Key: mockR2Key,
    });

    const req = createMockRequest(
      { filename: "recording.m4a", mimeType: "audio/mpeg", fileSize: 4096 },
      "Bearer valid-jwt",
    );

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ uploadUrl: mockUploadUrl, r2Key: mockR2Key });
    expect(getUser).toHaveBeenCalledWith(req);
    expect(isValidAudioType).toHaveBeenCalledWith("audio/mpeg");
    expect(generateUploadUrl).toHaveBeenCalledWith({
      userId: mockUser.id,
      filename: "recording.m4a",
      mimeType: "audio/mpeg",
      fileSize: 4096,
    });
  });

  it("POST returns 400 when fileType missing", async () => {
    vi.mocked(getUser).mockResolvedValue({
      user: { id: "user-123", email: "test@example.com" },
    });

    // mimeType omitted → triggers the !mimeType guard
    const req = createMockRequest(
      { filename: "recording.m4a", fileSize: 4096 },
      "Bearer valid-jwt",
    );

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "filename, mimeType, fileSize は必須です" });
    expect(isValidAudioType).not.toHaveBeenCalled();
    expect(generateUploadUrl).not.toHaveBeenCalled();
  });

  it("POST returns 401 when unauthorized", async () => {
    vi.mocked(getUser).mockResolvedValue({ user: null });

    const req = createMockRequest(
      { filename: "recording.m4a", mimeType: "audio/mpeg", fileSize: 4096 },
    );

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "認証が必要です" });
    expect(generateUploadUrl).not.toHaveBeenCalled();
  });

  it("POST returns 500 on R2 error", async () => {
    vi.mocked(getUser).mockResolvedValue({
      user: { id: "user-123", email: "test@example.com" },
    });
    vi.mocked(isValidAudioType).mockReturnValue(true);
    vi.mocked(generateUploadUrl).mockRejectedValue(
      new Error("R2 service unavailable"),
    );

    const req = createMockRequest(
      { filename: "recording.m4a", mimeType: "audio/mpeg", fileSize: 4096 },
      "Bearer valid-jwt",
    );

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "署名付きURLの生成に失敗しました" });
  });
});
