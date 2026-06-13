/**
 * グローバル検索サービス
 *
 * minutes / recordings / transcription_jobs を横断して検索し、
 * 統一された結果型にマッピングして返す。
 */

import { searchMinutes } from "./minutes";
import { searchRecordings } from "./recordings";
import { searchTranscriptionJobs } from "./transcription-jobs";
import type { Minute, Recording, TranscriptionJob } from "../types";

// ─── 検索結果の種類 ─────────────────────────────────────────

export type SearchResultType = "minute" | "recording" | "transcription_job";

/**
 * 統合検索結果アイテム
 * 各テーブルのレコードをこの型に正規化する
 */
export interface SearchResultItem {
  /** 元のレコードID */
  id: string;
  /** 検索結果の種類 */
  type: SearchResultType;
  /** 表示タイトル */
  title: string;
  /** プレビュー/説明文 */
  subtitle: string;
  /** 作成日 */
  created_at: string;
  /** 元データ（画面遷移などに使う） */
  original: Minute | Recording | TranscriptionJob;
}

// ─── 検索実行 ───────────────────────────────────────────────

/**
 * 全データタイプを横断して検索する
 *
 * 3種類のテーブルに並列でクエリを投げ、結果を統一フォーマットに変換して返す。
 * 結果は作成日の降順にソートされる。
 */
export async function globalSearch(
  query: string,
): Promise<{ data: SearchResultItem[]; error: Error | null }> {
  if (!query.trim()) {
    return { data: [], error: null };
  }

  const trimmed = query.trim();

  const [minutesResult, recordingsResult, jobsResult] = await Promise.all([
    searchMinutes(trimmed),
    searchRecordings(trimmed),
    searchTranscriptionJobs(trimmed),
  ]);

  const errors: string[] = [];

  if (minutesResult.error) errors.push(`minutes: ${minutesResult.error.message ?? minutesResult.error}`);
  if (recordingsResult.error) errors.push(`recordings: ${recordingsResult.error.message ?? recordingsResult.error}`);
  if (jobsResult.error) errors.push(`transcription_jobs: ${jobsResult.error.message ?? jobsResult.error}`);

  const items: SearchResultItem[] = [
    ...(minutesResult.data ?? []).map((m) => minuteToSearchItem(m)),
    ...(recordingsResult.data ?? []).map((r) => recordingToSearchItem(r)),
    ...(jobsResult.data ?? []).map((j) => jobToSearchItem(j)),
  ];

  // 作成日降順にソート
  items.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return {
    data: items,
    error: errors.length > 0 ? new Error(errors.join("; ")) : null,
  };
}

// ─── マッピング関数 ─────────────────────────────────────────

function minuteToSearchItem(m: Minute): SearchResultItem {
  const stripped = (m.content ?? "")
    .replace(/[#*`\[\]]/g, "")
    .trim();
  const preview = stripped.length > 120
    ? stripped.slice(0, 120) + "…"
    : stripped;

  return {
    id: m.id,
    type: "minute",
    title: m.title,
    subtitle: preview || "（内容なし）",
    created_at: m.created_at,
    original: m,
  };
}

function recordingToSearchItem(r: Recording): SearchResultItem {
  const dur = r.duration_seconds
    ? `${Math.floor(r.duration_seconds / 60)}:${String(r.duration_seconds % 60).padStart(2, "0")}`
    : "";
  const status = r.transcribed ? "文字起こし済み" : "未文字起こし";

  return {
    id: r.id,
    type: "recording",
    title: r.title,
    subtitle: `${status}${dur ? ` ・ ${dur}` : ""}`,
    created_at: r.created_at,
    original: r,
  };
}

function jobToSearchItem(j: TranscriptionJob): SearchResultItem {
  const statusLabels: Record<string, string> = {
    queued: "待機中",
    processing: "処理中",
    completed: "完了",
    failed: "失敗",
  };
  const statusLabel = statusLabels[j.status] ?? j.status;

  return {
    id: j.id,
    type: "transcription_job",
    title: j.file_name,
    subtitle: `ステータス: ${statusLabel}`,
    created_at: j.created_at,
    original: j,
  };
}
