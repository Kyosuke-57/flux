import { supabase } from "../lib/supabase";
import type { Minute } from "../types";

/**
 * Fetch all minutes for the current user, ordered by updated_at descending.
 */
export async function getAllMinutes(): Promise<{ data: Minute[] | null; error: any }> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: authError ?? new Error("Not authenticated") };
  }

  const { data, error } = await supabase
    .from("minutes")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return { data, error };
}

/**
 * Fetch a single minute by id, verifying it belongs to the current user.
 */
export async function getMinute(
  id: string
): Promise<{ data: Minute | null; error: any }> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: authError ?? new Error("Not authenticated") };
  }

  const { data, error } = await supabase
    .from("minutes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  return { data, error };
}

/**
 * Create a new minute for the current user.
 *
 * @param title       - The minute title.
 * @param content     - The minute content (markdown body).
 * @param tags        - Optional array of tag IDs/names.
 * @param template_id - Optional template id the minute was based on.
 */
export async function createMinute(
  title: string,
  content: string,
  tags?: string[],
  template_id?: string
): Promise<{ data: Minute | null; error: any }> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: authError ?? new Error("Not authenticated") };
  }

  const { data, error } = await supabase
    .from("minutes")
    .insert({
      user_id: user.id,
      title,
      content,
      tags: tags ?? [],
      template_id: template_id ?? null,
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Update an existing minute. Only the owner can update.
 *
 * Pass a partial `Minute` object with the fields you wish to change.
 * Fields like `id`, `user_id`, `created_at` are ignored for safety.
 */
export async function updateMinute(
  id: string,
  updates: Partial<Pick<Minute, "title" | "content" | "tags" | "template_id" | "original_transcript">>
): Promise<{ data: Minute | null; error: any }> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: authError ?? new Error("Not authenticated") };
  }

  const { data, error } = await supabase
    .from("minutes")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  return { data, error };
}

/**
 * Delete a minute by id. Only the owner can delete.
 */
export async function deleteMinute(
  id: string
): Promise<{ data: Minute | null; error: any }> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: authError ?? new Error("Not authenticated") };
  }

  const { data, error } = await supabase
    .from("minutes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  return { data, error };
}

/**
 * Search minutes by title and content using a case-insensitive ILIKE match.
 * Results are scoped to the current user and ordered by updated_at desc.
 */
export async function searchMinutes(
  query: string
): Promise<{ data: Minute[] | null; error: any }> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: authError ?? new Error("Not authenticated") };
  }

  const { data, error } = await supabase
    .from("minutes")
    .select("*")
    .eq("user_id", user.id)
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .order("updated_at", { ascending: false });

  return { data, error };
}
