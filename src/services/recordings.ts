import { supabase, requireUser } from "../lib/supabase";
import type { PostgrestError } from "@supabase/supabase-js";
import { asPostgrestError } from "../lib/service-utils";
import type { Recording } from "../types";

/**
 * 現在のユーザーの録音データ一覧を取得（作成日降順）
 */
export async function getAllRecordings(): Promise<{ data: Recording[] | null; error: PostgrestError | null }> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: asPostgrestError(authError, "Not authenticated") };

  const { data, error } = await supabase
    .from("recordings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return { data: data as Recording[] | null, error };
}

/**
 * 単一の録音データを取得
 */
export async function getRecording(
  id: string,
): Promise<{ data: Recording | null; error: PostgrestError | null }> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: asPostgrestError(authError, "Not authenticated") };

  const { data, error } = await supabase
    .from("recordings")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  return { data: data as Recording | null, error };
}

/**
 * 新しい録音データを作成
 */
export async function createRecording(
  input: Pick<Recording, "title" | "file_path" | "duration_seconds" | "transcribed">,
): Promise<{ data: Recording | null; error: PostgrestError | null }> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: asPostgrestError(authError, "Not authenticated") };

  const { data, error } = await supabase
    .from("recordings")
    .insert({
      user_id: user.id,
      title: input.title,
      file_path: input.file_path,
      duration_seconds: input.duration_seconds,
      transcribed: input.transcribed,
    })
    .select()
    .single();

  return { data: data as Recording | null, error };
}

/**
 * 録音データを更新
 */
export async function updateRecording(
  id: string,
  updates: Partial<Pick<Recording, "title" | "file_path" | "duration_seconds" | "transcribed">>,
): Promise<{ data: Recording | null; error: PostgrestError | null }> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: asPostgrestError(authError, "Not authenticated") };

  const { data, error } = await supabase
    .from("recordings")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  return { data: data as Recording | null, error };
}

/**
 * 録音データを削除
 */
export async function deleteRecording(
  id: string,
): Promise<{ error: PostgrestError | null }> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { error: asPostgrestError(authError, "Not authenticated") };

  const { error } = await supabase
    .from("recordings")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return { error };
}

/**
 * 録音データをタイトルで検索（ILike）
 */
export async function searchRecordings(
  query: string,
): Promise<{ data: Recording[] | null; error: PostgrestError | null }> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: asPostgrestError(authError, "Not authenticated") };

  const { data, error } = await supabase
    .from("recordings")
    .select("*")
    .eq("user_id", user.id)
    .or(`title.ilike.%${query}%,file_path.ilike.%${query}%`)
    .order("created_at", { ascending: false });

  return { data: data as Recording[] | null, error };
}
