import { supabase, requireUser } from "../lib/supabase";
import type { PostgrestError } from "@supabase/supabase-js";
import { asPostgrestError } from "../lib/service-utils";
import type { Favorite } from "../types";

/**
 * Get all favorite records for the current user.
 */
export async function getAllFavorites(): Promise<{
  data: Favorite[] | null;
  error: PostgrestError | null;
}> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: asPostgrestError(authError, "Not authenticated") };

  const { data, error } = await supabase
    .from("favorites")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return { data, error };
}

/**
 * Get the set of favorite minute IDs for the current user.
 * Useful for checking if a minute is favorited without fetching full rows.
 */
export async function getFavoriteIds(): Promise<{
  data: Set<string> | null;
  error: PostgrestError | null;
}> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: asPostgrestError(authError, "Not authenticated") };

  const { data, error } = await supabase
    .from("favorites")
    .select("minute_id")
    .eq("user_id", user.id);

  if (error) return { data: null, error };

  return { data: new Set(data.map((f) => f.minute_id)), error: null };
}

/**
 * Toggle favorite status for a minute.
 * Returns the new state: `true` if favorited, `false` if unfavorited.
 */
export async function toggleFavorite(
  minuteId: string
): Promise<{ data: boolean; error: PostgrestError | null }> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: false, error: asPostgrestError(authError, "Not authenticated") };

  // Check if already favorited
  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("minute_id", minuteId)
    .maybeSingle();

  if (existing) {
    // Unfavorite
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("id", existing.id);
    return { data: false, error };
  } else {
    // Favorite
    const { error } = await supabase
      .from("favorites")
      .insert({ user_id: user.id, minute_id: minuteId });
    return { data: true, error };
  }
}

/**
 * Check if a specific minute is favorited.
 */
export async function isFavorited(
  minuteId: string
): Promise<{ data: boolean; error: PostgrestError | null }> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: false, error: asPostgrestError(authError, "Not authenticated") };

  const { data, error } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("minute_id", minuteId)
    .maybeSingle();

  if (error) return { data: false, error };
  return { data: !!data, error: null };
}
