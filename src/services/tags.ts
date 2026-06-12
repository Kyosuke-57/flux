import { supabase, requireUser } from "../lib/supabase";
import type { Tag } from "../types";

/**
 * Fetch all tags for the currently authenticated user.
 * Returns tags sorted alphabetically by name.
 */
export async function getAllTags() {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: authError };

  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("user_id", user.id)
    .order("name");

  return { data: data as Tag[] | null, error };
}

/**
 * Create a new tag for the currently authenticated user.
 * @param name  Tag name (required)
 * @param color Optional hex colour string (e.g. "#ff0000")
 */
export async function createTag(name: string, color?: string) {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: authError };

  const { data, error } = await supabase
    .from("tags")
    .insert({ name, color, user_id: user.id })
    .select()
    .single();

  return { data: data as Tag | null, error };
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
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: authError };

  const { data, error } = await supabase
    .from("tags")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  return { data: data as Tag | null, error };
}

/**
 * Delete a tag by ID.
 * Only the owner can delete their own tag.
 * @param id Tag ID
 */
export async function deleteTag(id: string) {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { error: authError };

  const { error } = await supabase
    .from("tags")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return { error };
}
