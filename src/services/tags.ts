import { supabase, requireUser } from "../lib/supabase";
import type { Tag } from "../types";

/**
 * Fetch all tags for the currently authenticated user.
 * Returns tags sorted alphabetically by name.
 */
export async function getAllTags() {
  try {
    const { user, error: authError } = await requireUser();
    if (authError || !user) return { data: null, error: authError };

    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (error) return { data: null, error };
    return { data: data as Tag[] | null, error: null };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "予期しないエラーが発生しました";
    return { data: null, error: new Error(`タグの取得に失敗しました: ${message}`) };
  }
}

/**
 * Create a new tag for the currently authenticated user.
 * @param name  Tag name (required)
 * @param color Optional hex colour string (e.g. "#ff0000")
 */
export async function createTag(name: string, color?: string) {
  try {
    const { user, error: authError } = await requireUser();
    if (authError || !user) return { data: null, error: authError };

    const { data, error } = await supabase
      .from("tags")
      .insert({ name, color, user_id: user.id })
      .select()
      .single();

    if (error) return { data: null, error };
    return { data: data as Tag | null, error: null };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "予期しないエラーが発生しました";
    return { data: null, error: new Error(`タグの作成に失敗しました: ${message}`) };
  }
}

/**
 * Update an existing tag.
 * Only the owner (matching user_id) can update a tag.
 * @param id      Tag ID
 * @param updates Fields to update (name, color, or both)
 */
export async function updateTag(
  id: string,
  updates: Partial<Pick<Tag, "name" | "color">>,
) {
  try {
    const { user, error: authError } = await requireUser();
    if (authError || !user) return { data: null, error: authError };

    const { data, error } = await supabase
      .from("tags")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return { data: null, error };
    return { data: data as Tag | null, error: null };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "予期しないエラーが発生しました";
    return { data: null, error: new Error(`タグの更新に失敗しました: ${message}`) };
  }
}

/**
 * Delete a tag by ID.
 * Only the owner can delete their own tag.
 * @param id Tag ID
 */
export async function deleteTag(id: string) {
  try {
    const { user, error: authError } = await requireUser();
    if (authError || !user) return { error: authError };

    const { error } = await supabase
      .from("tags")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return { error };
    return { error: null };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "予期しないエラーが発生しました";
    return { error: new Error(`タグの削除に失敗しました: ${message}`) };
  }
}
