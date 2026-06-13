import { supabase, requireUser } from "../lib/supabase";
import type { TranscriptionJob } from "../types";

/**
 * 現在のユーザーの文字起こしジョブ一覧を取得（作成日降順）
 */
export async function getAllTranscriptionJobs() {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: authError };

  const { data, error } = await supabase
    .from("transcription_jobs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return { data: data as TranscriptionJob[] | null, error };
}

/**
 * 単一の文字起こしジョブを取得
 */
export async function getTranscriptionJob(id: string) {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: authError };

  const { data, error } = await supabase
    .from("transcription_jobs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  return { data: data as TranscriptionJob | null, error };
}

/**
 * 文字起こしジョブを再実行（failed → queued に戻す）
 */
export async function retryTranscriptionJob(id: string) {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: authError };

  const { data, error } = await supabase
    .from("transcription_jobs")
    .update({
      status: "queued",
      error_message: null,
      completed_chunks: 0,
      groq_retry_count: 0,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  return { data: data as TranscriptionJob | null, error };
}

/**
 * 文字起こしジョブを削除
 */
export async function deleteTranscriptionJob(id: string) {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { error: authError };

  const { error } = await supabase
    .from("transcription_jobs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return { error };
}
