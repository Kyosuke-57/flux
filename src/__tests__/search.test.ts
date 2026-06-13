import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mock the three search service modules ----

const { mockSearchMinutes, mockSearchRecordings, mockSearchTranscriptionJobs } =
  vi.hoisted(() => ({
    mockSearchMinutes: vi.fn(),
    mockSearchRecordings: vi.fn(),
    mockSearchTranscriptionJobs: vi.fn(),
  }));

vi.mock("../services/minutes", () => ({
  searchMinutes: mockSearchMinutes,
}));

vi.mock("../services/recordings", () => ({
  searchRecordings: mockSearchRecordings,
}));

vi.mock("../services/transcription-jobs", () => ({
  searchTranscriptionJobs: mockSearchTranscriptionJobs,
}));

// ---- Import under test ----

import { globalSearch, SearchResultType } from "../services/search";
import type { Minute, Recording, TranscriptionJob } from "../types";

// ---- Test data ----

const mockMinute: Minute = {
  id: "minute-1",
  user_id: "user-1",
  title: "ミーティング議事録",
  content: "これは**テスト**の内容です。\n- アイテム1\n- アイテム2",
  tags: ["test"],
  created_at: "2024-02-01T00:00:00.000Z",
  updated_at: "2024-02-02T00:00:00.000Z",
};

const mockRecording: Recording = {
  id: "rec-1",
  user_id: "user-1",
  title: "打ち合わせ録音",
  file_path: "recordings/rec-1.mp3",
  duration_seconds: 3661,
  created_at: "2024-02-03T00:00:00.000Z",
  transcribed: true,
};

const mockJob: TranscriptionJob = {
  id: "job-1",
  user_id: "user-1",
  recording_id: "rec-1",
  r2_key: "r2/recordings/rec-1.mp3",
  file_name: "rec-1.mp3",
  file_size: 1024000,
  status: "completed",
  total_chunks: 10,
  completed_chunks: 10,
  created_at: "2024-02-04T00:00:00.000Z",
  updated_at: "2024-02-04T00:00:00.000Z",
  groq_retry_count: 0,
};

// ---- Tests ----

describe("globalSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty result for empty query without calling services", async () => {
    const result = await globalSearch("");

    expect(result).toEqual({ data: [], error: null });
    expect(mockSearchMinutes).not.toHaveBeenCalled();
    expect(mockSearchRecordings).not.toHaveBeenCalled();
    expect(mockSearchTranscriptionJobs).not.toHaveBeenCalled();
  });

  it("returns empty result for whitespace-only query", async () => {
    const result = await globalSearch("   ");

    expect(result).toEqual({ data: [], error: null });
    expect(mockSearchMinutes).not.toHaveBeenCalled();
    expect(mockSearchRecordings).not.toHaveBeenCalled();
    expect(mockSearchTranscriptionJobs).not.toHaveBeenCalled();
  });

  it("combines results from all three services", async () => {
    mockSearchMinutes.mockResolvedValue({ data: [mockMinute], error: null });
    mockSearchRecordings.mockResolvedValue({
      data: [mockRecording],
      error: null,
    });
    mockSearchTranscriptionJobs.mockResolvedValue({
      data: [mockJob],
      error: null,
    });

    const result = await globalSearch("テスト");

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(3);

    // minute
    expect(result.data[2]).toMatchObject({
      id: "minute-1",
      type: "minute" satisfies SearchResultType,
      title: "ミーティング議事録",
      subtitle: expect.stringContaining("テストの内容です"),
      created_at: "2024-02-01T00:00:00.000Z",
      original: mockMinute,
    });

    // recording
    expect(result.data[1]).toMatchObject({
      id: "rec-1",
      type: "recording" satisfies SearchResultType,
      title: "打ち合わせ録音",
      subtitle: expect.stringContaining("文字起こし済み"),
      created_at: "2024-02-03T00:00:00.000Z",
      original: mockRecording,
    });

    // transcription job
    expect(result.data[0]).toMatchObject({
      id: "job-1",
      type: "transcription_job" satisfies SearchResultType,
      title: "rec-1.mp3",
      subtitle: expect.stringContaining("完了"),
      created_at: "2024-02-04T00:00:00.000Z",
      original: mockJob,
    });
  });

  it("sorts results by created_at descending", async () => {
    // Provide records with out-of-order dates
    const earlyMinute: Minute = {
      ...mockMinute,
      id: "m1",
      created_at: "2024-01-01T00:00:00.000Z",
    };
    const midRecording: Recording = {
      ...mockRecording,
      id: "r1",
      created_at: "2024-06-01T00:00:00.000Z",
    };
    const lateJob: TranscriptionJob = {
      ...mockJob,
      id: "j1",
      created_at: "2024-12-01T00:00:00.000Z",
    };

    mockSearchMinutes.mockResolvedValue({ data: [earlyMinute], error: null });
    mockSearchRecordings.mockResolvedValue({
      data: [midRecording],
      error: null,
    });
    mockSearchTranscriptionJobs.mockResolvedValue({
      data: [lateJob],
      error: null,
    });

    const result = await globalSearch("sort");

    expect(result.data).toHaveLength(3);
    // Expect order: job (Dec) → recording (Jun) → minute (Jan)
    expect(result.data[0].id).toBe("j1");
    expect(result.data[1].id).toBe("r1");
    expect(result.data[2].id).toBe("m1");
  });

  it("returns partial results with aggregated error when one service fails", async () => {
    const minutesError = new Error("DB timeout");
    mockSearchMinutes.mockResolvedValue({
      data: null,
      error: minutesError,
    });
    mockSearchRecordings.mockResolvedValue({
      data: [mockRecording],
      error: null,
    });
    mockSearchTranscriptionJobs.mockResolvedValue({
      data: [mockJob],
      error: null,
    });

    const result = await globalSearch("partial");

    // Still gets recordings + jobs
    expect(result.data).toHaveLength(2);
    // Error is aggregated
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toContain("minutes");
    expect(result.error!.message).toContain("DB timeout");
  });

  it("returns aggregated errors when all services fail", async () => {
    mockSearchMinutes.mockResolvedValue({
      data: null,
      error: new Error("minutes error"),
    });
    mockSearchRecordings.mockResolvedValue({
      data: null,
      error: new Error("recordings error"),
    });
    mockSearchTranscriptionJobs.mockResolvedValue({
      data: null,
      error: new Error("jobs error"),
    });

    const result = await globalSearch("fail");

    expect(result.data).toHaveLength(0);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toContain("minutes");
    expect(result.error!.message).toContain("recordings");
    expect(result.error!.message).toContain("transcription_jobs");
  });

  it("returns empty data without error when no results match", async () => {
    mockSearchMinutes.mockResolvedValue({ data: [], error: null });
    mockSearchRecordings.mockResolvedValue({ data: [], error: null });
    mockSearchTranscriptionJobs.mockResolvedValue({ data: [], error: null });

    const result = await globalSearch("nonexistent");

    expect(result).toEqual({ data: [], error: null });
  });

  it("strips markdown syntax from minute subtitle preview", async () => {
    const minuteWithMarkdown: Minute = {
      ...mockMinute,
      content: "**太字** と `コード` と [リンク](url)",
    };

    mockSearchMinutes.mockResolvedValue({
      data: [minuteWithMarkdown],
      error: null,
    });
    mockSearchRecordings.mockResolvedValue({ data: [], error: null });
    mockSearchTranscriptionJobs.mockResolvedValue({ data: [], error: null });

    const result = await globalSearch("markdown");

    expect(result.data).toHaveLength(1);
    expect(result.data[0].subtitle).toBe(
      "太字 と コード と リンク(url)",
    );
  });

  it("handles empty minute content with fallback subtitle", async () => {
    const emptyContentMinute: Minute = {
      ...mockMinute,
      content: "",
    };

    mockSearchMinutes.mockResolvedValue({
      data: [emptyContentMinute],
      error: null,
    });
    mockSearchRecordings.mockResolvedValue({ data: [], error: null });
    mockSearchTranscriptionJobs.mockResolvedValue({ data: [], error: null });

    const result = await globalSearch("empty");

    expect(result.data).toHaveLength(1);
    expect(result.data[0].subtitle).toBe("（内容なし）");
  });
});
