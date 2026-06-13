import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mock external packages (same pattern as minutes.test.ts) ----

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

// ---- Shared mock state (hoisted so vi.mock factory can reference them) ----

const { mockRequireUser, mockFrom, createMockQueryBuilder } = vi.hoisted(() => ({
  mockRequireUser: vi.fn(),
  mockFrom: vi.fn(),
  createMockQueryBuilder: (result: unknown) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    or: vi.fn().mockReturnThis(),
  }),
}));

// ---- Mock our own supabase lib module ----

vi.mock("../../src/lib/supabase", () => ({
  supabase: {
    from: mockFrom,
  },
  requireUser: mockRequireUser,
}));

// ---- Imports under test ----

import {
  getActivityLabel,
  getActivityStatusLabel,
  getAllActivities,
  filterActivities,
  sortActivities,
  type ActivityItem,
  type ActivityType,
} from "../services/history";

// ---- Test data ----

const baseActivity: ActivityItem = {
  id: "test-1",
  type: "minute_created",
  title: "月次ミーティング",
  description: "議事録を作成しました",
  timestamp: "2024-06-01T10:00:00.000Z",
  targetId: "minute-1",
  targetRoute: "/minute/minute-1",
};

const mockActivities: ActivityItem[] = [
  {
    ...baseActivity,
    id: "act-1",
    type: "minute_created",
    title: "Alpha",
    timestamp: "2024-06-01T10:00:00.000Z",
  },
  {
    ...baseActivity,
    id: "act-2",
    type: "minute_edited",
    title: "Beta",
    timestamp: "2024-06-02T10:00:00.000Z",
  },
  {
    ...baseActivity,
    id: "act-3",
    type: "recording_uploaded",
    title: "Gamma",
    description: "録音をアップロードしました",
    timestamp: "2024-06-03T10:00:00.000Z",
    status: "transcribed",
  },
  {
    ...baseActivity,
    id: "act-4",
    type: "transcription_job",
    title: "Delta",
    description: "文字起こしジョブ",
    timestamp: "2024-06-04T10:00:00.000Z",
    status: "completed",
    targetRoute: "/(tabs)/transcription-jobs",
  },
  {
    ...baseActivity,
    id: "act-5",
    type: "exported",
    title: "Epsilon",
    description: "PDF 形式でエクスポート",
    timestamp: "2024-06-05T10:00:00.000Z",
    targetRoute: "/(tabs)/exports",
  },
];

const mockMinute1 = {
  id: "minute-1",
  title: "月次MTG",
  created_at: "2024-06-01T00:00:00.000Z",
  updated_at: "2024-06-01T00:00:00.000Z", // same as created → no edit event
};

const mockMinute2 = {
  id: "minute-2",
  title: "週次MTG",
  created_at: "2024-06-02T00:00:00.000Z",
  updated_at: "2024-06-03T00:00:00.000Z", // different → edit event emitted
};

const mockRecording1 = {
  id: "rec-1",
  title: "会議録音_001",
  created_at: "2024-06-04T00:00:00.000Z",
  transcribed: true,
};

const mockJob1 = {
  id: "job-1",
  file_name: "audio001.mp3",
  status: "completed",
  created_at: "2024-06-05T00:00:00.000Z",
};

const mockExport1 = {
  id: "exp-1",
  title: "月次MTG_議事録",
  format: "pdf",
  created_at: "2024-06-06T00:00:00.000Z",
};

// ---- Tests ----

describe("getActivityLabel", () => {
  it("returns '議事録を作成' for minute_created", () => {
    expect(getActivityLabel("minute_created")).toBe("議事録を作成");
  });

  it("returns '議事録を編集' for minute_edited", () => {
    expect(getActivityLabel("minute_edited")).toBe("議事録を編集");
  });

  it("returns '録音をアップロード' for recording_uploaded", () => {
    expect(getActivityLabel("recording_uploaded")).toBe("録音をアップロード");
  });

  it("returns '文字起こし' for transcription_job", () => {
    expect(getActivityLabel("transcription_job")).toBe("文字起こし");
  });

  it("returns 'エクスポート' for exported", () => {
    expect(getActivityLabel("exported")).toBe("エクスポート");
  });

  it("covers all ActivityType values exhaustively", () => {
    const types: ActivityType[] = [
      "minute_created",
      "minute_edited",
      "recording_uploaded",
      "transcription_job",
      "exported",
    ];
    for (const t of types) {
      expect(getActivityLabel(t)).toEqual(expect.any(String));
    }
  });
});

describe("getActivityStatusLabel", () => {
  it("returns '完了' for 'completed'", () => {
    expect(getActivityStatusLabel("completed")).toBe("完了");
  });

  it("returns '処理中' for 'processing'", () => {
    expect(getActivityStatusLabel("processing")).toBe("処理中");
  });

  it("returns '処理中' for 'queued'", () => {
    expect(getActivityStatusLabel("queued")).toBe("処理中");
  });

  it("returns 'エラー' for 'failed'", () => {
    expect(getActivityStatusLabel("failed")).toBe("エラー");
  });

  it("returns '文字起こし済' for 'transcribed'", () => {
    expect(getActivityStatusLabel("transcribed")).toBe("文字起こし済");
  });

  it("returns '未処理' for 'pending'", () => {
    expect(getActivityStatusLabel("pending")).toBe("未処理");
  });

  it("returns the raw value for an unknown status", () => {
    expect(getActivityStatusLabel("unknown_status")).toBe("unknown_status");
  });

  it("returns empty string for undefined", () => {
    expect(getActivityStatusLabel(undefined)).toBe("");
  });
});

describe("getAllActivities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUser.mockResolvedValue({ user: { id: "user-1" }, error: null });
  });

  it("returns merged activities sorted by date desc when all queries succeed", async () => {
    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case "minutes":
          return createMockQueryBuilder({ data: [mockMinute1, mockMinute2], error: null });
        case "recordings":
          return createMockQueryBuilder({ data: [mockRecording1], error: null });
        case "transcription_jobs":
          return createMockQueryBuilder({ data: [mockJob1], error: null });
        case "exports":
          return createMockQueryBuilder({ data: [mockExport1], error: null });
        default:
          return createMockQueryBuilder({ data: [], error: null });
      }
    });

    const result = await getAllActivities();

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();

    const data = result.data!;

    // 5 base records + 1 minute_edited (mockMinute2 has updated_at !== created_at) = 6
    expect(data).toHaveLength(6);

    // Verify all activity types are present
    const types = data.map((a) => a.type);
    expect(types).toContain("minute_created");
    expect(types).toContain("minute_edited");
    expect(types).toContain("recording_uploaded");
    expect(types).toContain("transcription_job");
    expect(types).toContain("exported");

    // Verify sorted by date descending
    for (let i = 1; i < data.length; i++) {
      const prev = new Date(data[i - 1].timestamp).getTime();
      const curr = new Date(data[i].timestamp).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }

    // Verify supabase.from called for all 4 tables
    expect(mockFrom).toHaveBeenCalledWith("minutes");
    expect(mockFrom).toHaveBeenCalledWith("recordings");
    expect(mockFrom).toHaveBeenCalledWith("transcription_jobs");
    expect(mockFrom).toHaveBeenCalledWith("exports");
  });

  it("returns auth error when user is not authenticated", async () => {
    const authError = new Error("Not authenticated");
    mockRequireUser.mockResolvedValue({ user: null, error: authError });

    const result = await getAllActivities();

    expect(result).toEqual({ data: null, error: authError });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns partial data when some queries fail (rejected)", async () => {
    // minutes succeeds, recordings rejects, others succeed
    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case "minutes":
          return createMockQueryBuilder({ data: [mockMinute1], error: null });
        case "recordings": {
          // Return a builder whose order() rejects
          const builder = {
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockRejectedValue(new Error("DB error")),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            or: vi.fn().mockReturnThis(),
          };
          return builder;
        }
        case "transcription_jobs":
          return createMockQueryBuilder({ data: [mockJob1], error: null });
        case "exports":
          return createMockQueryBuilder({ data: [mockExport1], error: null });
        default:
          return createMockQueryBuilder({ data: [], error: null });
      }
    });

    const result = await getAllActivities();

    // Should still succeed with partial data
    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    // minute_created (1), transcription_job (1), exported (1) = 3
    // minute_edited not created since mockMinute1 has same created/updated
    expect(result.data).toHaveLength(3);
  });

  it("returns empty array when all queries reject", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockRejectedValue(new Error("DB error")),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      or: vi.fn().mockReturnThis(),
    });

    const result = await getAllActivities();

    // Promise.allSettled never throws, so it returns empty activities
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it("handles minute_edited when updated_at differs from created_at", async () => {
    const minuteWithEdit = {
      id: "minute-3",
      title: "編集あり",
      created_at: "2024-06-01T00:00:00.000Z",
      updated_at: "2024-06-10T00:00:00.000Z",
    };
    const minuteNoEdit = {
      id: "minute-4",
      title: "編集なし",
      created_at: "2024-06-05T00:00:00.000Z",
      updated_at: "2024-06-05T00:00:00.000Z", // same → no edit
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "minutes") {
        return createMockQueryBuilder({
          data: [minuteWithEdit, minuteNoEdit],
          error: null,
        });
      }
      return createMockQueryBuilder({ data: [], error: null });
    });

    const result = await getAllActivities();

    expect(result.error).toBeNull();
    const data = result.data!;

    const createdEvents = data.filter((a) => a.type === "minute_created");
    const editedEvents = data.filter((a) => a.type === "minute_edited");

    expect(createdEvents).toHaveLength(2); // both minutes
    expect(editedEvents).toHaveLength(1); // only the one with different dates
    expect(editedEvents[0].targetId).toBe("minute-3");
    expect(editedEvents[0].timestamp).toBe("2024-06-10T00:00:00.000Z");
  });

  it("creates recording_uploaded with correct status (transcribed vs pending)", async () => {
    const recTranscribed = {
      id: "rec-t",
      title: "録音_文字起こし済",
      created_at: "2024-06-01T00:00:00.000Z",
      transcribed: true,
    };
    const recPending = {
      id: "rec-p",
      title: "録音_未処理",
      created_at: "2024-06-02T00:00:00.000Z",
      transcribed: false,
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "recordings") {
        return createMockQueryBuilder({
          data: [recTranscribed, recPending],
          error: null,
        });
      }
      return createMockQueryBuilder({ data: [], error: null });
    });

    const result = await getAllActivities();

    expect(result.error).toBeNull();
    const recordings = result.data!.filter((a) => a.type === "recording_uploaded");
    expect(recordings).toHaveLength(2);

    const transcribed = recordings.find((r) => r.id === "recording-rec-t");
    const pending = recordings.find((r) => r.id === "recording-rec-p");
    expect(transcribed!.status).toBe("transcribed");
    expect(pending!.status).toBe("pending");
  });

  it("returns export with format-based description", async () => {
    const expPdf = {
      id: "exp-pdf",
      title: "PDF出力",
      format: "pdf",
      created_at: "2024-06-01T00:00:00.000Z",
    };
    const expMd = {
      id: "exp-md",
      title: "MD出力",
      format: "md",
      created_at: "2024-06-02T00:00:00.000Z",
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "exports") {
        return createMockQueryBuilder({ data: [expPdf, expMd], error: null });
      }
      return createMockQueryBuilder({ data: [], error: null });
    });

    const result = await getAllActivities();

    expect(result.error).toBeNull();
    const exports = result.data!.filter((a) => a.type === "exported");
    expect(exports).toHaveLength(2);

    expect(exports.find((e) => e.id === "export-exp-pdf")!.description).toBe("PDF 形式でエクスポート");
    expect(exports.find((e) => e.id === "export-exp-md")!.description).toBe("MD 形式でエクスポート");
  });
});

describe("filterActivities", () => {
  it("returns all activities when query is empty or whitespace", () => {
    expect(filterActivities(mockActivities, "")).toEqual(mockActivities);
    expect(filterActivities(mockActivities, "   ")).toEqual(mockActivities);
  });

  it("filters by title match (case insensitive)", () => {
    const result = filterActivities(mockActivities, "alpha");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("act-1");
  });

  it("filters by description match (case insensitive)", () => {
    const result = filterActivities(mockActivities, "文字起こし");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("act-4");
  });

  it("filters by label match via getActivityLabel (case insensitive)", () => {
    // "エクスポート" is the label for "exported"
    const result = filterActivities(mockActivities, "エクスポート");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("act-5");
  });

  it("filters by status match (case insensitive)", () => {
    const result = filterActivities(mockActivities, "transcribed");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("act-3");
  });

  it("returns empty array when no activities match", () => {
    const result = filterActivities(mockActivities, "nonexistentzzz");
    expect(result).toEqual([]);
  });

  it("matches multiple activities when query is broad", () => {
    const result = filterActivities(mockActivities, "議事録");
    // minute_created and minute_edited both have "議事録を作成しました" or "議事録を編集しました"
    // but wait: minute_edited's description is "議事録を編集しました" in the real function.
    // In our mock data, all activities have the base description.
    // Actually I used `...baseActivity` which has description "議事録を作成しました"
    // Let me check... yes, mockActivities spread baseActivity.
    // minute_edited has description "議事録を作成しました" because of spread.
    // But the actual function would set proper descriptions per type.
    // For test purposes, this still works because the description contains "議事録".
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});

describe("sortActivities", () => {
  it("does not mutate the original array", () => {
    const original = [...mockActivities];
    const sorted = sortActivities(mockActivities, "date", "asc");
    expect(sorted).not.toBe(mockActivities);
    expect(mockActivities).toEqual(original);
  });

  describe("by date", () => {
    it("sorts ascending", () => {
      const sorted = sortActivities(mockActivities, "date", "asc");
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1].timestamp).getTime();
        const curr = new Date(sorted[i].timestamp).getTime();
        expect(prev).toBeLessThanOrEqual(curr);
      }
    });

    it("sorts descending", () => {
      const sorted = sortActivities(mockActivities, "date", "desc");
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1].timestamp).getTime();
        const curr = new Date(sorted[i].timestamp).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });
  });

  describe("by title", () => {
    it("sorts ascending (A → Z)", () => {
      const sorted = sortActivities(mockActivities, "title", "asc");
      expect(sorted[0].title).toBe("Alpha");
      expect(sorted[sorted.length - 1].title).toBe("Gamma");
    });

    it("sorts descending (Z → A)", () => {
      const sorted = sortActivities(mockActivities, "title", "desc");
      expect(sorted[0].title).toBe("Gamma");
      expect(sorted[sorted.length - 1].title).toBe("Alpha");
    });
  });

  describe("by type", () => {
    it("sorts ascending (alphabetical by type string)", () => {
      const sorted = sortActivities(mockActivities, "type", "asc");
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i - 1].type.localeCompare(sorted[i].type)).toBeLessThanOrEqual(0);
      }
    });

    it("sorts descending", () => {
      const sorted = sortActivities(mockActivities, "type", "desc");
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i - 1].type.localeCompare(sorted[i].type)).toBeGreaterThanOrEqual(0);
      }
    });

    it("exported comes first alphabetically in asc order", () => {
      const sorted = sortActivities(mockActivities, "type", "asc");
      expect(sorted[0].type).toBe("exported");
    });
  });
});
