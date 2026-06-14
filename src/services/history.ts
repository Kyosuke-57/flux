/**
 * 履歴サービス
 *
 * minutes（議事録作成・編集）、recordings（録音アップロード）、
 * transcription_jobs（文字起こし）、exports（エクスポート）を
 * 統合し、時系列でソートしたアクティビティ一覧を提供する。
 */
import { supabase, requireUser } from "../lib/supabase";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Minute, Recording, TranscriptionJob, ExportItem } from "../types";

// ─── 型定義 ───────────────────────────────────────────────

export type ActivityType =
  | "minute_created"
  | "minute_edited"
  | "recording_uploaded"
  | "transcription_job"
  | "exported";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  targetId: string;
  targetRoute: string;
}

export type HistorySortField = "date" | "type" | "title";

export type HistorySortDirection = "asc" | "desc";

// ─── ラベル／アイコン用ヘルパー ───────────────────────────

export function getActivityLabel(type: ActivityType): string {
  switch (type) {
    case "minute_created":
      return "議事録を作成";
    case "minute_edited":
      return "議事録を編集";
    case "recording_uploaded":
      return "録音をアップロード";
    case "transcription_job":
      return "文字起こし";
    case "exported":
      return "エクスポート";
  }
}

export function getActivityStatusLabel(status: string | undefined): string {
  switch (status) {
    case "completed":
      return "完了";
    case "processing":
    case "queued":
      return "処理中";
    case "failed":
      return "エラー";
    case "transcribed":
      return "文字起こし済";
    case "pending":
      return "未処理";
    default:
      return status ?? "";
  }
}

// ─── プライベートヘルパー ─────────────────────────────────

type AuthenticateUserResult =
  | { user: { id: string } }
  | { error: Error | PostgrestError | null };

async function authenticateUser(): Promise<AuthenticateUserResult> {
  const { user, error: authError } = await requireUser();
  if (authError || !user)
    return { error: authError as unknown as PostgrestError | Error | null };
  return { user };
}

async function fetchAllActivityData(userId: string) {
  try {
    return await Promise.allSettled([
      supabase
        .from("minutes")
        .select("id, title, created_at, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("recordings")
        .select("id, title, created_at, transcribed")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("transcription_jobs")
        .select("id, file_name, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("exports")
        .select("id, title, format, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);
  } catch (err) {
    throw new Error(
      `アクティビティデータの並列取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

function buildMinuteActivities(
  minutes: Pick<Minute, "id" | "title" | "created_at" | "updated_at">[],
): ActivityItem[] {
  const activities: ActivityItem[] = [];
  for (const m of minutes) {
    activities.push({
      id: `minute-created-${m.id}`,
      type: "minute_created",
      title: m.title,
      description: "議事録を作成しました",
      timestamp: m.created_at,
      targetId: m.id,
      targetRoute: `/minute/${m.id}`,
    });
    // updated_at が created_at と異なる場合 → 編集イベントとして追加
    if (m.updated_at && m.created_at && m.updated_at !== m.created_at) {
      activities.push({
        id: `minute-edited-${m.id}`,
        type: "minute_edited",
        title: m.title,
        description: "議事録を編集しました",
        timestamp: m.updated_at,
        targetId: m.id,
        targetRoute: `/minute/${m.id}`,
      });
    }
  }
  return activities;
}

function buildRecordingActivities(
  recordings: Pick<Recording, "id" | "title" | "created_at" | "transcribed">[],
): ActivityItem[] {
  return recordings.map((r) => ({
    id: `recording-${r.id}`,
    type: "recording_uploaded",
    title: r.title,
    description: "録音をアップロードしました",
    timestamp: r.created_at,
    status: r.transcribed ? "transcribed" : "pending",
    targetId: r.id,
    targetRoute: `/recording/${r.id}`,
  }));
}

function buildTranscriptionActivities(
  jobs: Pick<TranscriptionJob, "id" | "file_name" | "status" | "created_at">[],
): ActivityItem[] {
  return jobs.map((j) => ({
    id: `transcription-${j.id}`,
    type: "transcription_job",
    title: j.file_name,
    description: "文字起こしジョブ",
    timestamp: j.created_at,
    status: j.status,
    targetId: j.id,
    targetRoute: "/(tabs)/transcription-jobs",
  }));
}

function buildExportActivities(
  exports: Pick<ExportItem, "id" | "title" | "format" | "created_at">[],
): ActivityItem[] {
  return exports.map((e) => ({
    id: `export-${e.id}`,
    type: "exported",
    title: e.title,
    description: `${e.format.toUpperCase()} 形式でエクスポート`,
    timestamp: e.created_at,
    targetId: e.id,
    targetRoute: "/(tabs)/exports",
  }));
}

// ─── メインサービス ───────────────────────────────────────

/**
 * 全アクティビティを統合し、日付降順でソートして返す。
 *
 * - minutes の created_at → minute_created
 * - minutes の updated_at（created_at と異なる場合）→ minute_edited
 * - recordings の created_at → recording_uploaded
 * - transcription_jobs の created_at → transcription_job
 * - exports の created_at → exported
 */
export async function getAllActivities(): Promise<{
  data: ActivityItem[];
  error: null;
} | {
  data: null;
  error: PostgrestError | Error | null;
}> {
  const authResult = await authenticateUser();
  if ("error" in authResult) return { data: null, error: authResult.error };

  try {
    const [minutesRes, recordingsRes, jobsRes, exportsRes] =
      await fetchAllActivityData(authResult.user.id);

    const activities: ActivityItem[] = [];

    if (minutesRes.status === "fulfilled" && minutesRes.value.data) {
      activities.push(
        ...buildMinuteActivities(minutesRes.value.data),
      );
    }
    if (recordingsRes.status === "fulfilled" && recordingsRes.value.data) {
      activities.push(
        ...buildRecordingActivities(recordingsRes.value.data),
      );
    }
    if (jobsRes.status === "fulfilled" && jobsRes.value.data) {
      activities.push(
        ...buildTranscriptionActivities(jobsRes.value.data),
      );
    }
    if (exportsRes.status === "fulfilled" && exportsRes.value.data) {
      activities.push(
        ...buildExportActivities(exportsRes.value.data),
      );
    }

    // 日付降順でソート
    activities.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return { data: activities, error: null };
  } catch (err) {
    const error =
      err instanceof Error
        ? err
        : new Error(
            `アクティビティ一覧の取得中に予期しないエラーが発生しました: ${String(err)}`,
          );
    return { data: null, error };
  }
}

/**
 * アクティビティ一覧をフィルタリングして返す（クライアントサイド）。
 */
export function filterActivities(
  activities: ActivityItem[],
  query: string,
): ActivityItem[] {
  if (!query.trim()) return activities;
  const q = query.toLowerCase();
  return activities.filter((a) => {
    const titleMatch = a.title.toLowerCase().includes(q);
    const descMatch = a.description.toLowerCase().includes(q);
    const labelMatch = getActivityLabel(a.type).toLowerCase().includes(q);
    const statusMatch = a.status?.toLowerCase().includes(q) ?? false;
    return titleMatch || descMatch || labelMatch || statusMatch;
  });
}

/**
 * アクティビティ一覧をソートして返す（クライアントサイド）。
 */
export function sortActivities(
  activities: ActivityItem[],
  field: HistorySortField,
  direction: HistorySortDirection,
): ActivityItem[] {
  const sorted = [...activities];
  const dir = direction === "asc" ? 1 : -1;
  sorted.sort((a, b) => {
    switch (field) {
      case "date":
        return (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) * dir;
      case "title":
        return a.title.localeCompare(b.title) * dir;
      case "type":
        return a.type.localeCompare(b.type) * dir;
      default:
        return 0;
    }
  });
  return sorted;
}
