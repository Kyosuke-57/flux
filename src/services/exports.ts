import { supabase, requireUser } from "../lib/supabase";
import type { PostgrestError } from "@supabase/supabase-js";
import { asPostgrestError } from "../lib/service-utils";
import type { ExportItem } from "../types";

/**
 * Fetch all exports for the current user, ordered by created_at descending.
 */
export async function getAllExports(): Promise<{
  data: ExportItem[] | null;
  error: PostgrestError | null;
}> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: asPostgrestError(authError, "Not authenticated") };

  const { data, error } = await supabase
    .from("exports")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return { data, error };
}

/**
 * Fetch a single export by id, verifying it belongs to the current user.
 */
export async function getExport(
  id: string,
): Promise<{ data: ExportItem | null; error: PostgrestError | null }> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: asPostgrestError(authError, "Not authenticated") };

  const { data, error } = await supabase
    .from("exports")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  return { data, error };
}

/**
 * Create a new export record for the current user.
 *
 * @param title   - The exported minute title.
 * @param format  - Export format ("txt" | "md" | "pdf").
 * @param minute_id - Optional reference to the exported minute.
 */
export async function createExport(
  title: string,
  format: "txt" | "md" | "pdf",
  minute_id?: string,
): Promise<{ data: ExportItem | null; error: PostgrestError | null }> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: asPostgrestError(authError, "Not authenticated") };

  const { data, error } = await supabase
    .from("exports")
    .insert({
      user_id: user.id,
      title,
      format,
      minute_id: minute_id ?? null,
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Update an existing export record. Only the owner can update.
 */
export async function updateExport(
  id: string,
  updates: Partial<Pick<ExportItem, "title" | "format" | "minute_id">>,
): Promise<{ data: ExportItem | null; error: PostgrestError | null }> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: asPostgrestError(authError, "Not authenticated") };

  const { data, error } = await supabase
    .from("exports")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  return { data, error };
}

/**
 * Delete an export record by id. Only the owner can delete.
 */
export async function deleteExport(
  id: string,
): Promise<{ data: ExportItem | null; error: PostgrestError | null }> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: asPostgrestError(authError, "Not authenticated") };

  const { data, error } = await supabase
    .from("exports")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  return { data, error };
}
