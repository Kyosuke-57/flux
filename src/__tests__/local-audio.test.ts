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

// ---- Mock expo-file-system ----

const { mockFileInstance, mockDirectoryInstance } = vi.hoisted(() => ({
  mockFileInstance: {
    exists: false,
    create: vi.fn(),
    bytes: vi.fn(),
    write: vi.fn(),
    uri: "file:///mock/recordings/test.m4a",
  },
  mockDirectoryInstance: {
    exists: false,
    create: vi.fn(),
    uri: "file:///mock/recordings",
  },
}));

vi.mock("expo-file-system", () => ({
  File: vi.fn(function () { return mockFileInstance; }),
  Directory: vi.fn(function () { return mockDirectoryInstance; }),
  Paths: {
    document: "file:///mock/document",
    join: vi.fn((...parts: string[]) => parts.join("/")),
  },
}));

// ---- Imports under test ----

import { saveRecordingLocally } from "../services/local-audio";

// ---- Tests ----

describe("saveRecordingLocally", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDirectoryInstance.exists = false;
    mockFileInstance.exists = false;
  });

  it("creates directory and file, reads source bytes, writes to dest, returns URI", async () => {
    const sourceBytes = new Uint8Array([1, 2, 3]);
    mockFileInstance.bytes.mockResolvedValue(sourceBytes);

    const result = await saveRecordingLocally("file:///source/record.m4a", "test");

    expect(mockDirectoryInstance.create).toHaveBeenCalledWith({
      intermediates: true,
    });
    expect(mockFileInstance.create).toHaveBeenCalledOnce();
    expect(mockFileInstance.bytes).toHaveBeenCalledOnce();
    expect(mockFileInstance.write).toHaveBeenCalledWith(sourceBytes);
    expect(result).toBe("file:///mock/recordings/test.m4a");
  });

  it("skips directory creation when it already exists", async () => {
    mockDirectoryInstance.exists = true;
    mockFileInstance.bytes.mockResolvedValue(new Uint8Array([]));

    await saveRecordingLocally("file:///source/record.m4a", "test");

    expect(mockDirectoryInstance.create).not.toHaveBeenCalled();
    expect(mockFileInstance.create).toHaveBeenCalledOnce();
    expect(mockFileInstance.bytes).toHaveBeenCalledOnce();
    expect(mockFileInstance.write).toHaveBeenCalled();
  });

  it("skips file creation when it already exists", async () => {
    mockFileInstance.exists = true;
    mockFileInstance.bytes.mockResolvedValue(new Uint8Array([]));

    await saveRecordingLocally("file:///source/record.m4a", "test");

    expect(mockFileInstance.create).not.toHaveBeenCalled();
    expect(mockFileInstance.bytes).toHaveBeenCalledOnce();
    expect(mockFileInstance.write).toHaveBeenCalled();
  });

  it("preserves source bytes through write", async () => {
    const sourceBytes = new Uint8Array([10, 20, 30]);
    mockFileInstance.bytes.mockResolvedValue(sourceBytes);

    await saveRecordingLocally("file:///source/input.wav", "output");

    expect(mockFileInstance.bytes).toHaveBeenCalledOnce();
    expect(mockFileInstance.write).toHaveBeenCalledWith(sourceBytes);
  });
});
