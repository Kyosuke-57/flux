import { supabase, requireUser } from "../lib/supabase";
import { PostgrestError } from "@supabase/supabase-js";
import type { Minute } from "../types";

/**
 * Convert a generic Error to a PostgrestError for consistent return types.
 */
function toPostgrestError(err: Error | null, fallbackMessage: string): PostgrestError | null {
  if (!err) return null;
  return new PostgrestError({
    message: err.message ?? fallbackMessage,
    details: "",
    hint: "",
    code: "AUTH_ERROR",
  });
}

/**
 * Fetch all minutes for the current user, ordered by updated_at descending.
 */
export async function getAllMinutes(): Promise<{ data: Minute[] | null; error: PostgrestError | null }> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: toPostgrestError(authError, "Not authenticated") };

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
): Promise<{ data: Minute | null; error: PostgrestError | null }> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: toPostgrestError(authError, "Not authenticated") };

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
  template_id?: string,
  folder_id?: string,
  original_transcript?: string,
  corrected_transcript?: string,
  recording_path?: string,
): Promise<{ data: Minute | null; error: PostgrestError | null }> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: toPostgrestError(authError, "Not authenticated") };

  const { data, error } = await supabase
    .from("minutes")
    .insert({
      user_id: user.id,
      title,
      content,
      tags: tags ?? [],
      template_id: template_id ?? null,
      folder_id: folder_id ?? null,
      original_transcript: original_transcript ?? null,
      corrected_transcript: corrected_transcript ?? null,
      recording_path: recording_path ?? null,
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Duplicate a minute. Creates a new minute with "(コピー)" suffix in title.
 */
export async function duplicateMinute(
  id: string,
): Promise<{ data: Minute | null; error: PostgrestError | null }> {
  const { data: original, error: fetchError } = await getMinute(id);
  if (fetchError || !original) {
    return {
      data: null,
      error: fetchError ?? new PostgrestError({
        message: "Minute not found",
        details: "",
        hint: "",
        code: "NOT_FOUND",
      }),
    };
  }

  return createMinute(
    `${original.title} (コピー)`,
    original.content,
    original.tags,
    original.template_id,
    original.folder_id ?? undefined,
    original.original_transcript,
    original.corrected_transcript,
  );
}

/**
 * Update an existing minute. Only the owner can update.
 *
 * Pass a partial `Minute` object with the fields you wish to change.
 * Fields like `id`, `user_id`, `created_at` are ignored for safety.
 */
export async function updateMinute(
  id: string,
  updates: Partial<Pick<Minute, "title" | "content" | "tags" | "template_id" | "folder_id" | "original_transcript" | "corrected_transcript" | "recording_path">>
): Promise<{ data: Minute | null; error: PostgrestError | null }> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: toPostgrestError(authError, "Not authenticated") };

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
): Promise<{ data: Minute | null; error: PostgrestError | null }> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: toPostgrestError(authError, "Not authenticated") };

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
): Promise<{ data: Minute[] | null; error: PostgrestError | null }> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: toPostgrestError(authError, "Not authenticated") };

  const { data, error } = await supabase
    .from("minutes")
    .select("*")
    .eq("user_id", user.id)
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .order("updated_at", { ascending: false });

  return { data, error };
}
