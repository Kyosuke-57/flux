import { supabase, requireUser } from "../lib/supabase";
import type { AuthData } from "../types";

export async function getAllAuthData() {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: authError };

  const { data, error } = await supabase
    .from("auth_data")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return { data: data as AuthData[] | null, error };
}

export async function getAuthData(id: string) {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: authError };

  const { data, error } = await supabase
    .from("auth_data")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  return { data: data as AuthData | null, error };
}

export async function createAuthData(
  provider: string,
  label: string,
  api_key: string,
) {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: authError };

  const { data, error } = await supabase
    .from("auth_data")
    .insert({
      user_id: user.id,
      provider,
      label,
      api_key,
    })
    .select()
    .single();

  return { data: data as AuthData | null, error };
}

export async function updateAuthData(
  id: string,
  updates: Partial<Pick<AuthData, "provider" | "label" | "api_key" | "is_active">>,
) {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { data: null, error: authError };

  const { data, error } = await supabase
    .from("auth_data")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  return { data: data as AuthData | null, error };
}

export async function deleteAuthData(id: string) {
  const { user, error: authError } = await requireUser();
  if (authError || !user) return { error: authError };

  const { error } = await supabase
    .from("auth_data")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return { error };
}
