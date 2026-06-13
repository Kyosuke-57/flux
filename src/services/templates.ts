import { supabase, requireUser } from "../lib/supabase";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Template } from "../types";

/**
 * Fetch all templates for the current user, ordered by updated_at descending.
 */
export async function getAllTemplates(): Promise<{
  data: Template[] | null;
  error: PostgrestError | null;
}> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: authError as unknown as PostgrestError | null };

  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return { data, error };
}

/**
 * Fetch the default template for the current user (where is_default = true).
 */
export async function getDefaultTemplate(): Promise<{
  data: Template | null;
  error: PostgrestError | null;
}> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: authError as unknown as PostgrestError | null };

  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_default", true)
    .maybeSingle();

  return { data, error };
}

/**
 * Create a new template for the current user.
 *
 * @param name      - The template name.
 * @param content   - The template content (markdown body).
 * @param is_default - Optional flag to mark as default (defaults to false).
 */
export async function createTemplate(
  name: string,
  content: string,
  is_default?: boolean
): Promise<{ data: Template | null; error: PostgrestError | null }> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: authError as unknown as PostgrestError | null };

  const { data, error } = await supabase
    .from("templates")
    .insert({
      user_id: user.id,
      name,
      content,
      is_default: is_default ?? false,
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Update an existing template. Only the owner can update.
 *
 * Pass a partial object with the fields you wish to change.
 * Fields like `id`, `user_id`, `created_at` are omitted for safety.
 */
export async function updateTemplate(
  id: string,
  updates: Partial<Pick<Template, "name" | "content" | "is_default">>
): Promise<{ data: Template | null; error: PostgrestError | null }> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: authError as unknown as PostgrestError | null };

  const { data, error } = await supabase
    .from("templates")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  return { data, error };
}

/**
 * Delete a template by id. Only the owner can delete.
 */
export async function deleteTemplate(
  id: string
): Promise<{ data: Template | null; error: PostgrestError | null }> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: authError as unknown as PostgrestError | null };

  const { data, error } = await supabase
    .from("templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  return { data, error };
}
