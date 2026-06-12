/**
 * otoroku Supabase クライアント
 *
 * otoroku プロジェクト専用。mama_care の Supabase とは別。
 */
import { createClient } from "@supabase/supabase-js";

/** Service Role クライアント（RLS バイパス。mama_care の Vercel からのみ使用） */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase 環境変数が設定されていません");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Anon クライアント（JWT 検証後など） */
export function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase 環境変数が設定されていません");
  }
  return createClient(url, key);
}
