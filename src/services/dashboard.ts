import { getSubscriptionStatus } from "./subscription";
import { getAllMinutes } from "./minutes";
import { getAllRecordings } from "./recordings";
import { getAllFolders } from "./folders";
import { getAllTags } from "./tags";
import { getAllTemplates } from "./templates";

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

    // --- usage ---
    const usage = (() => {
      if (
        subscriptionResult.status === "fulfilled" &&
        subscriptionResult.value.data
      ) {
        const { plan, usageSeconds, limitSeconds } =
          subscriptionResult.value.data;
        return {
          plan,
          usageSeconds,
          limitSeconds,
          remainingSeconds: Math.max(0, limitSeconds - usageSeconds),
        };
      }
      return {
        plan: "free",
        usageSeconds: 0,
        limitSeconds: 0,
        remainingSeconds: 0,
      };
    })();

    // --- stats ---
    const minutesData =
      minutesResult.status === "fulfilled" ? minutesResult.value.data : null;
    const recordingsData =
      recordingsResult.status === "fulfilled"
        ? recordingsResult.value.data
        : null;
    const foldersData =
      foldersResult.status === "fulfilled" ? foldersResult.value.data : null;
    const tagsData =
      tagsResult.status === "fulfilled" ? tagsResult.value.data : null;
    const templatesData =
      templatesResult.status === "fulfilled"
        ? templatesResult.value.data
        : null;

    const stats = {
      totalMinutes: minutesData?.length ?? 0,
      totalRecordings: recordingsData?.length ?? 0,
      totalFolders: foldersData?.length ?? 0,
      totalTags: tagsData?.length ?? 0,
      totalTemplates: templatesData?.length ?? 0,
    };

    // --- recentActivity ---
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

    const recentActivity = [...minuteActivities, ...recordingActivities]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 8);

    return { usage, stats, recentActivity };
  } catch {
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
}
