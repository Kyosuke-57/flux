import { describe, it, expect, vi } from "vitest";
import { getUser } from "../lib/api-auth";

// Mock Supabase module
vi.mock("../lib/supabase", () => ({
  createAnonClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: new Error("Invalid JWT"),
      }),
    },
  })),
}));

function createMockRequest(authHeader?: string): any {
  return {
    headers: {
      get: (name: string) => {
        if (name === "Authorization") return authHeader || null;
        return null;
      },
    },
  };
}

describe("api-auth", () => {
  it("getUser returns null user when no Authorization header", async () => {
    const req = createMockRequest();
    const result = await getUser(req);
    expect(result.user).toBeNull();
  });

  it("getUser returns null user with invalid JWT (no env vars)", async () => {
    const req = createMockRequest("Bearer invalid-token");
    const result = await getUser(req);
    expect(result.user).toBeNull();
  });
});
