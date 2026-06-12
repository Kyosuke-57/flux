import { supabase, requireUser } from "../lib/supabase";
import type { Folder } from "../types";

/**
 * すべてのフォルダを取得（現在のユーザーのみ）
 * 名前順でソート
 */
export async function getAllFolders() {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: authError };

  const { data, error } = await supabase
    .from("folders")
    .select("*")
    .eq("user_id", user.id)
    .order("name");

  return { data: data as Folder[] | null, error };
}

/**
 * 新しいフォルダを作成
 * @param name フォルダ名（必須）
 */
export async function createFolder(name: string) {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: authError };

  const { data, error } = await supabase
    .from("folders")
    .insert({ name, user_id: user.id })
    .select()
    .single();

  return { data: data as Folder | null, error };
}

/**
 * フォルダを更新
 * オーナー（一致する user_id）のみ更新可能
 * @param id      フォルダID
 * @param updates 更新するフィールド（name, color）
 */
export async function updateFolder(
  id: string,
  updates: Partial<Pick<Folder, "name" | "color">>,
) {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: authError };

  const { data, error } = await supabase
    .from("folders")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  return { data: data as Folder | null, error };
}

/**
 * フォルダを削除
 * オーナーのみ削除可能
 * @param id フォルダID
 */
export async function deleteFolder(id: string) {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { error: authError };

  const { error } = await supabase
    .from("folders")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return { error };
}
