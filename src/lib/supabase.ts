import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Require an authenticated user.
 * Returns `{ user, error: null }` on success, or `{ user: null, error }` if not authenticated.
 * Does NOT throw — always returns via the result object.
 */
export async function requireUser(): Promise<{ user: User | null; error: Error | null }> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, error: authError ?? new Error("Not authenticated") };
  }

  return { user, error: null };
}
