import { describe, it, expect, vi, beforeEach } from "vitest";

// ----- hoisted mock functions (available to vi.mock factories) -----
const mockReadAsStringAsync = vi.hoisted(() => vi.fn());
const mockUpload = vi.hoisted(() => vi.fn());
const mockGetPublicUrl = vi.hoisted(() => vi.fn());
const mockRemove = vi.hoisted(() => vi.fn());

// ----- module mocks (same pattern as removeHallucinations.test.ts) -----
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
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
        remove: mockRemove,
      })),
    },
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

vi.mock("expo-file-system/legacy", () => ({
  readAsStringAsync: mockReadAsStringAsync,
  EncodingType: { Base64: "base64" },
}));

// ----- imports (after vi.mock — vitest hoists them) -----
import { uploadAudio, getAudioUrl, deleteAudio } from "../services/storage";

// ----- tests -----
describe("storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("uploadAudio", () => {
    const userId = "user-1";
    const recordingId = "rec-abc";
    const uri = "file:///audio.m4a";
    const ext = "m4a";
    const expectedPath = `recordings/${userId}/${recordingId}.${ext}`;
    const mockBase64 = "dGVzdCBhdWRpbw==";

    it("成功時にパスを返し、エラーはnull", async () => {
      mockReadAsStringAsync.mockResolvedValue(mockBase64);
      mockUpload.mockResolvedValue({
        data: { path: expectedPath },
        error: null,
      });

      const result = await uploadAudio(userId, recordingId, uri);

      expect(result).toEqual({ path: expectedPath, error: null });
      expect(mockReadAsStringAsync).toHaveBeenCalledWith(uri, {
        encoding: "base64",
      });
      expect(mockUpload).toHaveBeenCalledWith(
        expectedPath,
        expect.any(ArrayBuffer),
        { contentType: `audio/${ext}`, upsert: true },
      );
    });

    it("Supabaseエラー時にnullパスとエラーを返す", async () => {
      const uploadError = new Error("Upload failed");
      mockReadAsStringAsync.mockResolvedValue(mockBase64);
      mockUpload.mockResolvedValue({ data: null, error: uploadError });

      const result = await uploadAudio(userId, recordingId, uri);

      expect(result).toEqual({ path: null, error: uploadError });
    });

    it("ファイル読み込み例外時にnullパスとエラーを返す", async () => {
      const fileError = new Error("File not found");
      mockReadAsStringAsync.mockRejectedValue(fileError);

      const result = await uploadAudio(userId, recordingId, uri);

      expect(result).toEqual({ path: null, error: fileError });
    });
  });

  describe("getAudioUrl", () => {
    it("公開URLを返す", () => {
      const storagePath = "recordings/user-1/rec-abc.m4a";
      const publicUrl =
        "https://example.com/storage/v1/object/public/recordings/user-1/rec-abc.m4a";
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl },
      });

      const result = getAudioUrl(storagePath);

      expect(result).toBe(publicUrl);
      expect(mockGetPublicUrl).toHaveBeenCalledWith(storagePath);
    });
  });

  describe("deleteAudio", () => {
    it("削除成功時にerrorがnull", async () => {
      mockRemove.mockResolvedValue({ error: null });

      const result = await deleteAudio("recordings/user-1/rec-abc.m4a");

      expect(result).toEqual({ error: null });
      expect(mockRemove).toHaveBeenCalledWith(["recordings/user-1/rec-abc.m4a"]);
    });

    it("削除失敗時にエラーを返す", async () => {
      const deleteError = new Error("Delete failed");
      mockRemove.mockResolvedValue({ error: deleteError });

      const result = await deleteAudio("recordings/user-1/rec-abc.m4a");

      expect(result).toEqual({ error: deleteError });
    });
  });
});
