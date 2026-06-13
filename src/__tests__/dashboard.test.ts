import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mock all 6 service modules that dashboard.ts depends on ----
// (Actual service modules are never executed, so supabase/react-native mocks are unnecessary.)

const { mockGetSubscriptionStatus, mockGetAllMinutes, mockGetAllRecordings, mockGetAllFolders, mockGetAllTags, mockGetAllTemplates } = vi.hoisted(() => ({
  mockGetSubscriptionStatus: vi.fn(),
  mockGetAllMinutes: vi.fn(),
  mockGetAllRecordings: vi.fn(),
  mockGetAllFolders: vi.fn(),
  mockGetAllTags: vi.fn(),
  mockGetAllTemplates: vi.fn(),
}));

vi.mock("../services/subscription", () => ({
  getSubscriptionStatus: mockGetSubscriptionStatus,
}));
vi.mock("../services/minutes", () => ({
  getAllMinutes: mockGetAllMinutes,
}));
vi.mock("../services/recordings", () => ({
  getAllRecordings: mockGetAllRecordings,
}));
vi.mock("../services/folders", () => ({
  getAllFolders: mockGetAllFolders,
}));
vi.mock("../services/tags", () => ({
  getAllTags: mockGetAllTags,
}));
vi.mock("../services/templates", () => ({
  getAllTemplates: mockGetAllTemplates,
}));

// ---- Import under test ----

import { getDashboardData } from "../services/dashboard";

// ---- Test data ----

const mockSubscriptionData = {
  data: {
    plan: "pro" as const,
    usageSeconds: 300,
    limitSeconds: 600,
  },
  error: null,
};

const mockMinute1 = {
  id: "m1",
  user_id: "u1",
  title: "ミーティング1",
  content: "内容1",
  tags: [],
  recording_id: "r1",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-05T00:00:00.000Z",
};

const mockMinute2 = {
  id: "m2",
  user_id: "u1",
  title: "ミーティング2",
  content: "内容2",
  tags: ["tag1"],
  created_at: "2024-01-02T00:00:00.000Z",
  updated_at: "2024-01-04T00:00:00.000Z",
};

const mockMinute3 = {
  id: "m3",
  user_id: "u1",
  title: "ミーティング3",
  content: "内容3",
  tags: [],
  created_at: "2024-01-03T00:00:00.000Z",
  updated_at: "2024-01-03T00:00:00.000Z",
};

const mockRecording1 = {
  id: "r1",
  user_id: "u1",
  title: "録音1",
  file_path: "/recordings/r1.mp3",
  duration_seconds: 120,
  created_at: "2024-01-03T00:00:00.000Z",
  transcribed: true,
};

const mockRecording2 = {
  id: "r2",
  user_id: "u1",
  title: "録音2",
  file_path: "/recordings/r2.mp3",
  duration_seconds: 60,
  created_at: "2024-01-02T00:00:00.000Z",
  transcribed: false,
};

const mockFolder = {
  id: "f1",
  user_id: "u1",
  name: "フォルダ1",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

const mockTag = {
  id: "t1",
  user_id: "u1",
  name: "タグ1",
  status: "active" as const,
  created_at: "2024-01-01T00:00:00.000Z",
};

const mockTemplate = {
  id: "tpl1",
  user_id: "u1",
  name: "テンプレート1",
  content: "テンプレート内容",
  is_default: false,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

// ---- Tests ----

describe("getDashboardData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("すべてのサービスが成功した場合、完全な DashboardData を返す", async () => {
    mockGetSubscriptionStatus.mockResolvedValue(mockSubscriptionData);
    mockGetAllMinutes.mockResolvedValue({ data: [mockMinute1, mockMinute2], error: null });
    mockGetAllRecordings.mockResolvedValue({ data: [mockRecording1], error: null });
    mockGetAllFolders.mockResolvedValue({ data: [mockFolder], error: null });
    mockGetAllTags.mockResolvedValue({ data: [mockTag], error: null });
    mockGetAllTemplates.mockResolvedValue({ data: [mockTemplate], error: null });

    const result = await getDashboardData();

    expect(result.usage).toEqual({
      plan: "pro",
      usageSeconds: 300,
      limitSeconds: 600,
      remainingSeconds: 300, // 600 - 300
    });

    expect(result.stats).toEqual({
      totalMinutes: 2,
      totalRecordings: 1,
      totalFolders: 1,
      totalTags: 1,
      totalTemplates: 1,
    });

    expect(result.recentActivity).toHaveLength(3);
    // sorted by timestamp desc: m1 (Jan 5), m2 (Jan 4), r1 (Jan 3)
    expect(result.recentActivity[0]).toMatchObject({
      id: "m1",
      type: "minute",
      title: "ミーティング1",
      timestamp: "2024-01-05T00:00:00.000Z",
    });
    expect(result.recentActivity[1]).toMatchObject({
      id: "m2",
      type: "minute",
      title: "ミーティング2",
      timestamp: "2024-01-04T00:00:00.000Z",
    });
    expect(result.recentActivity[2]).toMatchObject({
      id: "r1",
      type: "recording",
      title: "録音1",
      timestamp: "2024-01-03T00:00:00.000Z",
      status: "transcribed",
    });
  });

  it("サブスクリプションの取得が rejected になった場合、usage はデフォルト値になり他のデータは正常", async () => {
    mockGetSubscriptionStatus.mockRejectedValue(new Error("Network error"));
    mockGetAllMinutes.mockResolvedValue({ data: [mockMinute1], error: null });
    mockGetAllRecordings.mockResolvedValue({ data: [], error: null });
    mockGetAllFolders.mockResolvedValue({ data: [], error: null });
    mockGetAllTags.mockResolvedValue({ data: [], error: null });
    mockGetAllTemplates.mockResolvedValue({ data: [], error: null });

    const result = await getDashboardData();

    expect(result.usage).toEqual({
      plan: "free",
      usageSeconds: 0,
      limitSeconds: 0,
      remainingSeconds: 0,
    });
    expect(result.stats.totalMinutes).toBe(1);
    expect(result.recentActivity).toHaveLength(1); // minute only (recordings is empty)
  });

  it("サブスクリプションが { data: null } を返した場合、usage はデフォルト値になる", async () => {
    mockGetSubscriptionStatus.mockResolvedValue({ data: null, error: null });
    mockGetAllMinutes.mockResolvedValue({ data: [], error: null });
    mockGetAllRecordings.mockResolvedValue({ data: [], error: null });
    mockGetAllFolders.mockResolvedValue({ data: [], error: null });
    mockGetAllTags.mockResolvedValue({ data: [], error: null });
    mockGetAllTemplates.mockResolvedValue({ data: [], error: null });

    const result = await getDashboardData();

    expect(result.usage).toEqual({
      plan: "free",
      usageSeconds: 0,
      limitSeconds: 0,
      remainingSeconds: 0,
    });
  });

  it("すべてのサービスが rejected になった場合、すべてデフォルト値を返す", async () => {
    mockGetSubscriptionStatus.mockRejectedValue(new Error("E1"));
    mockGetAllMinutes.mockRejectedValue(new Error("E2"));
    mockGetAllRecordings.mockRejectedValue(new Error("E3"));
    mockGetAllFolders.mockRejectedValue(new Error("E4"));
    mockGetAllTags.mockRejectedValue(new Error("E5"));
    mockGetAllTemplates.mockRejectedValue(new Error("E6"));

    const result = await getDashboardData();

    expect(result).toEqual({
      usage: { plan: "free", usageSeconds: 0, limitSeconds: 0, remainingSeconds: 0 },
      stats: { totalMinutes: 0, totalRecordings: 0, totalFolders: 0, totalTags: 0, totalTemplates: 0 },
      recentActivity: [],
    });
  });

  it("すべてのデータが空配列の場合、0 件の stats と空の recentActivity を返す", async () => {
    mockGetSubscriptionStatus.mockResolvedValue(mockSubscriptionData);
    mockGetAllMinutes.mockResolvedValue({ data: [], error: null });
    mockGetAllRecordings.mockResolvedValue({ data: [], error: null });
    mockGetAllFolders.mockResolvedValue({ data: [], error: null });
    mockGetAllTags.mockResolvedValue({ data: [], error: null });
    mockGetAllTemplates.mockResolvedValue({ data: [], error: null });

    const result = await getDashboardData();

    expect(result.stats).toEqual({
      totalMinutes: 0,
      totalRecordings: 0,
      totalFolders: 0,
      totalTags: 0,
      totalTemplates: 0,
    });
    expect(result.recentActivity).toEqual([]);
  });

  it("recentActivity は minutes の `updated_at` と recordings の `created_at` を使う", async () => {
    mockGetSubscriptionStatus.mockResolvedValue(mockSubscriptionData);
    // minute: updated_at がタイムスタンプ source
    const minuteOldUpdated = { ...mockMinute1, id: "m-old", updated_at: "2023-01-01T00:00:00.000Z", created_at: "2023-06-01T00:00:00.000Z" };
    mockGetAllMinutes.mockResolvedValue({ data: [minuteOldUpdated], error: null });
    // recording: created_at がタイムスタンプ source
    mockGetAllRecordings.mockResolvedValue({ data: [mockRecording1], error: null });
    mockGetAllFolders.mockResolvedValue({ data: [], error: null });
    mockGetAllTags.mockResolvedValue({ data: [], error: null });
    mockGetAllTemplates.mockResolvedValue({ data: [], error: null });

    const result = await getDashboardData();

    // minute uses updated_at, recording uses created_at
    const minuteActivity = result.recentActivity.find((a) => a.type === "minute")!;
    expect(minuteActivity.timestamp).toBe("2023-01-01T00:00:00.000Z");

    const recordingActivity = result.recentActivity.find((a) => a.type === "recording")!;
    expect(recordingActivity.timestamp).toBe("2024-01-03T00:00:00.000Z");
  });

  it("recording の transcribed フラグによって status が変わる", async () => {
    mockGetSubscriptionStatus.mockResolvedValue(mockSubscriptionData);
    mockGetAllMinutes.mockResolvedValue({ data: [], error: null });
    mockGetAllRecordings.mockResolvedValue({
      data: [
        { ...mockRecording1, id: "r-transcribed", transcribed: true },
        { ...mockRecording2, id: "r-pending", transcribed: false },
      ],
      error: null,
    });
    mockGetAllFolders.mockResolvedValue({ data: [], error: null });
    mockGetAllTags.mockResolvedValue({ data: [], error: null });
    mockGetAllTemplates.mockResolvedValue({ data: [], error: null });

    const result = await getDashboardData();

    const transcribed = result.recentActivity.find((a) => a.id === "r-transcribed")!;
    expect(transcribed.status).toBe("transcribed");

    const pending = result.recentActivity.find((a) => a.id === "r-pending")!;
    expect(pending.status).toBe("pending");
  });

  it("recentActivity は最大8件、minutes は先頭5件、recordings は先頭3件まで含まれる", async () => {
    mockGetSubscriptionStatus.mockResolvedValue(mockSubscriptionData);

    // 7件の minute
    const manyMinutes = Array.from({ length: 7 }, (_, i) => ({
      ...mockMinute1,
      id: `m-${i}`,
      title: `Minute ${i}`,
      updated_at: `2024-01-${10 - i}T00:00:00.000Z`,
    }));
    // 5件の recording
    const manyRecordings = Array.from({ length: 5 }, (_, i) => ({
      ...mockRecording1,
      id: `r-${i}`,
      title: `Recording ${i}`,
      created_at: `2024-01-${15 - i}T00:00:00.000Z`,
      transcribed: false,
    }));

    mockGetAllMinutes.mockResolvedValue({ data: manyMinutes, error: null });
    mockGetAllRecordings.mockResolvedValue({ data: manyRecordings, error: null });
    mockGetAllFolders.mockResolvedValue({ data: [], error: null });
    mockGetAllTags.mockResolvedValue({ data: [], error: null });
    mockGetAllTemplates.mockResolvedValue({ data: [], error: null });

    const result = await getDashboardData();

    // recentActivity は最大8件
    expect(result.recentActivity).toHaveLength(8);
    // minute は先頭5件だけ使われる (m-0..m-4)
    const minuteIds = result.recentActivity.filter((a) => a.type === "minute").map((a) => a.id);
    expect(minuteIds).toEqual(["m-0", "m-1", "m-2", "m-3", "m-4"]);
    expect(minuteIds).not.toContain("m-5");
    expect(minuteIds).not.toContain("m-6");
    // recording は先頭3件だけ使われる (r-0..r-2)
    const recordingIds = result.recentActivity.filter((a) => a.type === "recording").map((a) => a.id);
    expect(recordingIds).toEqual(["r-0", "r-1", "r-2"]);
    expect(recordingIds).not.toContain("r-3");
    expect(recordingIds).not.toContain("r-4");
  });

  it("remainingSeconds は負数にならず最小0になる", async () => {
    mockGetSubscriptionStatus.mockResolvedValue({
      data: {
        plan: "free",
        usageSeconds: 500,
        limitSeconds: 300,
      },
      error: null,
    });
    mockGetAllMinutes.mockResolvedValue({ data: [], error: null });
    mockGetAllRecordings.mockResolvedValue({ data: [], error: null });
    mockGetAllFolders.mockResolvedValue({ data: [], error: null });
    mockGetAllTags.mockResolvedValue({ data: [], error: null });
    mockGetAllTemplates.mockResolvedValue({ data: [], error: null });

    const result = await getDashboardData();

    expect(result.usage.remainingSeconds).toBe(0);
  });

  it("特定のサービスが fulfilled でも data が null の場合、stats は 0 として扱う", async () => {
    mockGetSubscriptionStatus.mockResolvedValue(mockSubscriptionData);
    mockGetAllMinutes.mockResolvedValue({ data: null, error: new Error("DB error") });
    mockGetAllRecordings.mockResolvedValue({ data: null, error: null });
    mockGetAllFolders.mockResolvedValue({ data: null, error: null });
    mockGetAllTags.mockResolvedValue({ data: null, error: null });
    mockGetAllTemplates.mockResolvedValue({ data: null, error: null });

    const result = await getDashboardData();

    expect(result.stats).toEqual({
      totalMinutes: 0,
      totalRecordings: 0,
      totalFolders: 0,
      totalTags: 0,
      totalTemplates: 0,
    });
    expect(result.recentActivity).toEqual([]);
  });
});
