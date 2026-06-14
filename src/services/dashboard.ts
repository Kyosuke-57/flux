import { getSubscriptionStatus } from "./subscription";
import { getAllMinutes } from "./minutes";
import { getAllRecordings } from "./recordings";
import { getAllFolders } from "./folders";
import { getAllTags } from "./tags";
import { getAllTemplates } from "./templates";
import type { Minute, Recording, Folder, Tag, Template } from "../types";

export interface DashboardData {
  usage: {
    plan: string;
    usageSeconds: number;
    limitSeconds: number;
    remainingSeconds: number;
  };
  stats: {
    totalMinutes: number;
    totalRecordings: number;
    totalFolders: number;
    totalTags: number;
    totalTemplates: number;
  };
  recentActivity: Array<{
    id: string;
    type: "minute" | "recording" | "transcription";
    title: string;
    timestamp: string;
    status?: string;
  }>;
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Promise.allSettled の結果から .value.data を取り出す。
 * rejected または data が存在しない場合は null を返す。
 */
function getFulfilledData<T>(
  result: PromiseSettledResult<{ data: T }>,
): T | null {
  return result.status === "fulfilled" ? result.value.data : null;
}

/** サブスクリプション情報から usage セクションを抽出する。 */
function extractUsage(
  result: PromiseSettledResult<
    Awaited<ReturnType<typeof getSubscriptionStatus>>
  >,
): DashboardData["usage"] {
  if (result.status === "fulfilled" && result.value.data) {
    const { plan, usageSeconds, limitSeconds } = result.value.data;
    return {
      plan,
      usageSeconds,
      limitSeconds,
      remainingSeconds: Math.max(0, limitSeconds - usageSeconds),
    };
  }
  return { plan: "free", usageSeconds: 0, limitSeconds: 0, remainingSeconds: 0 };
}

/** 各データ配列から stats セクションを構築する。 */
function buildStats(
  minutes: Minute[] | null,
  recordings: Recording[] | null,
  folders: Folder[] | null,
  tags: Tag[] | null,
  templates: Template[] | null,
): DashboardData["stats"] {
  return {
    totalMinutes: minutes?.length ?? 0,
    totalRecordings: recordings?.length ?? 0,
    totalFolders: folders?.length ?? 0,
    totalTags: tags?.length ?? 0,
    totalTemplates: templates?.length ?? 0,
  };
}

/** minutes と recordings から recentActivity を構築する。 */
function buildRecentActivity(
  minutesData: Minute[] | null,
  recordingsData: Recording[] | null,
): DashboardData["recentActivity"] {
  const minuteActivities = (minutesData?.slice(0, 5) ?? []).map((m) => ({
    id: m.id,
    type: "minute" as const,
    title: m.title,
    timestamp: m.updated_at,
  }));

  const recordingActivities = (recordingsData?.slice(0, 3) ?? []).map((r) => ({
    id: r.id,
    type: "recording" as const,
    title: r.title,
    timestamp: r.created_at,
    status: r.transcribed ? "transcribed" : "pending",
  }));

  return [...minuteActivities, ...recordingActivities]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 8);
}

/** すべての API が失敗した場合のデフォルト値を返す。 */
function getDefaultDashboardData(): DashboardData {
  return {
    usage: {
      plan: "free",
      usageSeconds: 0,
      limitSeconds: 0,
      remainingSeconds: 0,
    },
    stats: {
      totalMinutes: 0,
      totalRecordings: 0,
      totalFolders: 0,
      totalTags: 0,
      totalTemplates: 0,
    },
    recentActivity: [],
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * ダッシュボードに表示する集計データを並列で取得する。
 * Promise.allSettled により、いずれかの取得が失敗しても他のデータは正常に返す。
 * 例外は一切スローせず、エラー時はデフォルト値（0 / 空配列）を返す。
 */
export async function getDashboardData(): Promise<DashboardData> {
  try {
    const [
      subscriptionResult,
      minutesResult,
      recordingsResult,
      foldersResult,
      tagsResult,
      templatesResult,
    ] = await Promise.allSettled([
      getSubscriptionStatus(),
      getAllMinutes(),
      getAllRecordings(),
      getAllFolders(),
      getAllTags(),
      getAllTemplates(),
    ]);

    const usage = extractUsage(subscriptionResult);
    const minutesData = getFulfilledData(minutesResult);
    const recordingsData = getFulfilledData(recordingsResult);
    const foldersData = getFulfilledData(foldersResult);
    const tagsData = getFulfilledData(tagsResult);
    const templatesData = getFulfilledData(templatesResult);

    const stats = buildStats(
      minutesData,
      recordingsData,
      foldersData,
      tagsData,
      templatesData,
    );
    const recentActivity = buildRecentActivity(minutesData, recordingsData);

    return { usage, stats, recentActivity };
  } catch {
    return getDefaultDashboardData();
  }
}
