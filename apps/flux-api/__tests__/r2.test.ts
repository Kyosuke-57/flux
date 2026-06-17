import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateUploadUrl,
  getObject,
  deleteObject,
  isValidAudioType,
} from "../lib/r2";

const { mockSend, mockGetSignedUrl, MockS3ServiceException, MockS3Client } = vi.hoisted(() => {
  class MockS3ServiceException extends Error {
    name = "S3ServiceException";
    constructor(message: string) {
      super(message);
      this.name = "S3ServiceException";
    }
  }
  return {
    mockSend: vi.fn(),
    mockGetSignedUrl: vi.fn(),
    MockS3ServiceException,
    MockS3Client: class {
      send = mockSend;
    },
  };
});

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: MockS3Client,
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  S3ServiceException: MockS3ServiceException,
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockGetSignedUrl,
}));

async function* asyncIterableFromBuffer(buf: Buffer): AsyncIterable<Uint8Array> {
  yield buf;
}

beforeEach(() => {
  vi.stubEnv("R2_ACCOUNT_ID", "test-account-id");
  vi.stubEnv("R2_ACCESS_KEY_ID", "test-access-key");
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "test-secret-key");
  vi.stubEnv("R2_BUCKET_NAME", "test-bucket");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("isValidAudioType", () => {
  it("valid audio/mpeg returns true", () => {
    expect(isValidAudioType("audio/mpeg")).toBe(true);
  });

  it("valid audio/wav returns true", () => {
    expect(isValidAudioType("audio/wav")).toBe(true);
  });

  it("valid audio/webm returns true", () => {
    expect(isValidAudioType("audio/webm")).toBe(true);
  });

  it("valid video/mp4 returns false (not an audio type)", () => {
    expect(isValidAudioType("video/mp4")).toBe(false);
  });

  it("invalid application/json returns false", () => {
    expect(isValidAudioType("application/json")).toBe(false);
  });

  it("invalid text/plain returns false", () => {
    expect(isValidAudioType("text/plain")).toBe(false);
  });
});

describe("generateUploadUrl", () => {
  it("returns uploadUrl and r2Key on success", async () => {
    const mockUrl = "https://signed-url.example.com/upload";
    mockGetSignedUrl.mockResolvedValue(mockUrl);

    const result = await generateUploadUrl({
      userId: "user-test-1",
      filename: "recording.m4a",
      mimeType: "audio/mpeg",
      fileSize: 4096,
    });

    expect(result).toHaveProperty("uploadUrl", mockUrl);
    expect(result).toHaveProperty("r2Key");
    expect(result.r2Key).toMatch(/^otoroku\/user-test-1\/\d+-[a-f0-9-]+\.m4a$/);
  });

  it("throws on env var missing", async () => {
    vi.unstubAllEnvs();

    await expect(
      generateUploadUrl({
        userId: "user-test-1",
        filename: "recording.m4a",
        mimeType: "audio/mpeg",
        fileSize: 4096,
      }),
    ).rejects.toThrow("R2_ACCOUNT_ID is not set");
  });
});

describe("getObject", () => {
  it("returns Buffer on success", async () => {
    const testData = Buffer.from("mock-audio-data");
    mockSend.mockResolvedValue({
      Body: asyncIterableFromBuffer(testData),
    });

    const result = await getObject("test-key");
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString()).toBe("mock-audio-data");
  });

  it("throws NoSuchKey S3ServiceException on missing key", async () => {
    const err = new MockS3ServiceException("The specified key does not exist.");
    err.name = "NoSuchKey";
    mockSend.mockRejectedValue(err);

    await expect(getObject("nonexistent-key")).rejects.toThrow(MockS3ServiceException);
  });
});

describe("deleteObject", () => {
  it("succeeds on valid key", async () => {
    mockSend.mockResolvedValue(undefined);

    await expect(deleteObject("valid-key")).resolves.toBeUndefined();
  });

  it("throws on non-existent key", async () => {
    const err = new MockS3ServiceException("The specified key does not exist.");
    err.name = "NoSuchKey";
    mockSend.mockRejectedValue(err);

    await expect(deleteObject("nonexistent-key")).rejects.toThrow(MockS3ServiceException);
  });
});
