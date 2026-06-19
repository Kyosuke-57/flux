import { requireUser } from "./supabase";

/**
 * PostgrestError 互換のエラーオブジェクト。
 * @supabase/supabase-js への依存を排除するため、独自に定義する。
 */
export interface PostgrestErrorLike extends Error {
  message: string;
  details: string;
  hint: string;
  code: string;
}

/**
 * requireUser() のラッパー。認証状態に応じて以下のいずれかを返す：
 * - 認証成功時: { user, error: null }
 * - 認証失敗時: { user: null, error: PostgrestErrorLike }
 *
 * 呼び出し側での使用パターン:
 *   const { user, error } = await requireUserOrError();
 *   if (!user) return { data: null, error };
 *   // 以降 user を使って安全に DB 操作ができる
 */
export async function requireUserOrError(): Promise<
  { user: import("./supabase").User; error: null } | { user: null; error: PostgrestErrorLike }
> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) {
    return {
      user: null,
      error: (authError ?? new Error("Not authenticated")) as PostgrestErrorLike,
    };
  }
  return { user, error: null };
}

/**
 * Error オブジェクトを PostgrestErrorLike に変換する。
 * requireUser() の認証エラーや try/catch の例外をサービス層で一貫して扱うために使用。
 *
 * @param err - 変換元のエラー（null の場合は null を返す）
 * @returns PostgrestErrorLike または null
 */
export function asPostgrestError(err: Error | null): PostgrestErrorLike | null {
  if (!err) return null;
  const e = new Error(err.message) as PostgrestErrorLike;
  e.details = "";
  e.hint = "";
  e.code = "AUTH_ERROR";
  return e;
}
