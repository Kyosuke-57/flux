import { describe, it, expect, vi, beforeEach } from "vitest";

// ----- hoisted mock functions -----
const mockGetUser = vi.hoisted(() => vi.fn());

// Supabaseクエリチェーンの結果をテストごとに差し替えられるようにする共有オブジェクト
const mockFromResult = vi.hoisted(() => ({ data: null as any, error: null as any }));

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
      or: vi.fn().mockReturnThis(),
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
  getAllTranscriptionJobs,
  getTranscriptionJob,
  retryTranscriptionJob,
  createTranscriptionJob,
  updateTranscriptionJob,
  deleteTranscriptionJob,
  searchTranscriptionJobs,
} from "../services/transcription-jobs";
import type { TranscriptionJob } from "../types";

// テスト用のTranscriptionJobモック値
const mockJobItem: TranscriptionJob = {
  id: "job-1",
  user_id: "test-user-id",
  recording_id: "rec-1",
  r2_key: "audio/rec-1.mp3",
  file_name: "recording-1.mp3",
  file_size: 1048576,
  status: "completed",
  total_chunks: 10,
  completed_chunks: 10,
  transcript: "This is the full transcript.",
  error_message: undefined,
  groq_retry_count: 0,
  created_at: "2024-06-01T00:00:00Z",
  updated_at: "2024-06-01T01:00:00Z",
};

const mockJobList: TranscriptionJob[] = [
  mockJobItem,
  {
    ...mockJobItem,
    id: "job-2",
    recording_id: "rec-2",
    r2_key: "audio/rec-2.mp3",
    file_name: "recording-2.mp3",
    status: "queued",
    total_chunks: 0,
    completed_chunks: 0,
    transcript: undefined,
    groq_retry_count: 0,
  },
  {
    ...mockJobItem,
    id: "job-3",
    recording_id: "rec-3",
    r2_key: "audio/rec-3.mp3",
    file_name: "recording-3.mp3",
    status: "failed",
    total_chunks: 5,
    completed_chunks: 2,
    transcript: undefined,
    error_message: "Groq API error",
    groq_retry_count: 3,
  },
];

describe("transcription-jobs", () => {
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
  // getAllTranscriptionJobs
  // ---------------------------------------------------------------
  describe("getAllTranscriptionJobs", () => {
    it("認証済みの場合、全ジョブ一覧を返す", async () => {
      setupAuthenticated();
      mockFromResult.data = mockJobList;

      const result = await getAllTranscriptionJobs();

      expect(result.data).toEqual(mockJobList);
      expect(result.error).toBeNull();
    });

    it("Supabaseクエリがエラーを返した場合、エラーを伝搬する", async () => {
      setupAuthenticated();
      const dbError = new Error("Database error");
      mockFromResult.error = dbError;

      const result = await getAllTranscriptionJobs();

      expect(result.data).toBeNull();
      expect(result.error).toBe(dbError);
    });

    it("未認証の場合、認証エラーを返す", async () => {
      setupUnauthenticated();

      const result = await getAllTranscriptionJobs();

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error!.message).toBe("Not authenticated");
    });
  });

  // ---------------------------------------------------------------
  // getTranscriptionJob
  // ---------------------------------------------------------------
  describe("getTranscriptionJob", () => {
    it("認証済みの場合、指定したidのジョブを返す", async () => {
      setupAuthenticated();
      mockFromResult.data = mockJobItem;

      const result = await getTranscriptionJob("job-1");

      expect(result.data).toEqual(mockJobItem);
      expect(result.error).toBeNull();
    });

    it("Supabaseクエリがエラーを返した場合、エラーを伝搬する", async () => {
      setupAuthenticated();
      const dbError = new Error("Not found");
      mockFromResult.error = dbError;

      const result = await getTranscriptionJob("nonexistent");

      expect(result.data).toBeNull();
      expect(result.error).toBe(dbError);
    });

    it("未認証の場合、認証エラーを返す", async () => {
      setupUnauthenticated();

      const result = await getTranscriptionJob("job-1");

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error!.message).toBe("Not authenticated");
    });
  });

  // ---------------------------------------------------------------
  // retryTranscriptionJob
  // ---------------------------------------------------------------
  describe("retryTranscriptionJob", () => {
    it("認証済みの場合、ジョブをリトライ状態にリセットする", async () => {
      setupAuthenticated();
      const resetJob: TranscriptionJob = {
        ...mockJobItem,
        status: "queued",
        error_message: undefined,
        completed_chunks: 0,
        groq_retry_count: 0,
      };
      mockFromResult.data = resetJob;

      const result = await retryTranscriptionJob("job-3");

      expect(result.data).toEqual(resetJob);
      expect(result.error).toBeNull();
    });

    it("Supabaseクエリがエラーを返した場合、エラーを伝搬する", async () => {
      setupAuthenticated();
      const dbError = new Error("Update failed");
      mockFromResult.error = dbError;

      const result = await retryTranscriptionJob("job-3");

      expect(result.data).toBeNull();
      expect(result.error).toBe(dbError);
    });

    it("未認証の場合、認証エラーを返す", async () => {
      setupUnauthenticated();

      const result = await retryTranscriptionJob("job-3");

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error!.message).toBe("Not authenticated");
    });
  });

  // ---------------------------------------------------------------
  // createTranscriptionJob
  // ---------------------------------------------------------------
  describe("createTranscriptionJob", () => {
    it("認証済みの場合、新規ジョブを作成して返す", async () => {
      setupAuthenticated();
      const newJob: TranscriptionJob = {
        ...mockJobItem,
        id: "job-new",
        status: "queued",
        total_chunks: 0,
        completed_chunks: 0,
        groq_retry_count: 0,
        transcript: undefined,
      };
      mockFromResult.data = newJob;

      const result = await createTranscriptionJob({
        recording_id: "rec-new",
        r2_key: "audio/rec-new.mp3",
        file_name: "new-recording.mp3",
        file_size: 2048576,
        status: "queued",
      });

      expect(result.data).toEqual(newJob);
      expect(result.error).toBeNull();
    });

    it("Supabaseクエリがエラーを返した場合、エラーを伝搬する", async () => {
      setupAuthenticated();
      const dbError = new Error("Insert failed");
      mockFromResult.error = dbError;

      const result = await createTranscriptionJob({
        recording_id: "rec-new",
        r2_key: "audio/rec-new.mp3",
        file_name: "new-recording.mp3",
        file_size: 2048576,
        status: "queued",
      });

      expect(result.data).toBeNull();
      expect(result.error).toBe(dbError);
    });

    it("未認証の場合、認証エラーを返す", async () => {
      setupUnauthenticated();

      const result = await createTranscriptionJob({
        recording_id: "rec-new",
        r2_key: "audio/rec-new.mp3",
        file_name: "new-recording.mp3",
        file_size: 2048576,
        status: "queued",
      });

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error!.message).toBe("Not authenticated");
    });
  });

  // ---------------------------------------------------------------
  // updateTranscriptionJob
  // ---------------------------------------------------------------
  describe("updateTranscriptionJob", () => {
    it("認証済みの場合、ジョブを更新して返す", async () => {
      setupAuthenticated();
      const updatedJob: TranscriptionJob = {
        ...mockJobItem,
        file_name: "renamed-recording.mp3",
        status: "processing",
      };
      mockFromResult.data = updatedJob;

      const result = await updateTranscriptionJob("job-1", {
        file_name: "renamed-recording.mp3",
        status: "processing",
      });

      expect(result.data).toEqual(updatedJob);
      expect(result.error).toBeNull();
    });

    it("Supabaseクエリがエラーを返した場合、エラーを伝搬する", async () => {
      setupAuthenticated();
      const dbError = new Error("Update failed");
      mockFromResult.error = dbError;

      const result = await updateTranscriptionJob("job-1", {
        file_name: "new-name.mp3",
      });

      expect(result.data).toBeNull();
      expect(result.error).toBe(dbError);
    });

    it("未認証の場合、認証エラーを返す", async () => {
      setupUnauthenticated();

      const result = await updateTranscriptionJob("job-1", {
        file_name: "new-name.mp3",
      });

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error!.message).toBe("Not authenticated");
    });
  });

  // ---------------------------------------------------------------
  // deleteTranscriptionJob
  // ---------------------------------------------------------------
  describe("deleteTranscriptionJob", () => {
    it("認証済みの場合、ジョブを削除してerror: nullを返す", async () => {
      setupAuthenticated();
      mockFromResult.error = null;

      const result = await deleteTranscriptionJob("job-1");

      expect(result.error).toBeNull();
    });

    it("Supabaseクエリがエラーを返した場合、エラーを伝搬する", async () => {
      setupAuthenticated();
      const dbError = new Error("Delete failed");
      mockFromResult.error = dbError;

      const result = await deleteTranscriptionJob("job-1");

      expect(result.error).toBe(dbError);
    });

    it("未認証の場合、認証エラーを返す", async () => {
      setupUnauthenticated();

      const result = await deleteTranscriptionJob("job-1");

      expect(result.error).toBeInstanceOf(Error);
      expect(result.error!.message).toBe("Not authenticated");
    });
  });

  // ---------------------------------------------------------------
  // searchTranscriptionJobs
  // ---------------------------------------------------------------
  describe("searchTranscriptionJobs", () => {
    it("認証済み、検索クエリに一致するジョブを返す", async () => {
      setupAuthenticated();
      const matched = [
        mockJobList[0],
        mockJobList[1],
      ];
      mockFromResult.data = matched;

      const result = await searchTranscriptionJobs("recording");

      expect(result.data).toEqual(matched);
      expect(result.data).toHaveLength(2);
      expect(result.error).toBeNull();
    });

    it("認証済み、検索クエリに一致しない場合は空配列を返す", async () => {
      setupAuthenticated();
      mockFromResult.data = [];

      const result = await searchTranscriptionJobs("nonexistent");

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it("Supabaseクエリがエラーを返した場合、エラーを伝搬する", async () => {
      setupAuthenticated();
      const dbError = new Error("Search failed");
      mockFromResult.error = dbError;

      const result = await searchTranscriptionJobs("recording");

      expect(result.data).toBeNull();
      expect(result.error).toBe(dbError);
    });

    it("未認証の場合、認証エラーを返す", async () => {
      setupUnauthenticated();

      const result = await searchTranscriptionJobs("recording");

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error!.message).toBe("Not authenticated");
    });
  });
});
