import { requireUser } from "./supabase";
import { PostgrestError } from "@supabase/supabase-js";

/**
 * requireUser() のラッパー。認証状態に応じて以下のいずれかを返す：
 * - 認証成功時: { user, error: null }
 * - 認証失敗時: { user: null, error: PostgrestError }
 *
 * 呼び出し側での使用パターン:
 *   const { user, error } = await requireUserOrError();
 *   if (!user) return { data: null, error };
 *   // 以降 user を使って安全に DB 操作ができる
 */
export async function requireUserOrError(): Promise<
  { user: import("./supabase").User; error: null } | { user: null; error: PostgrestError }
> {
  const { user, error: authError } = await requireUser();
  if (authError || !user) {
    const error = asPostgrestError(authError ?? new Error("Not authenticated"), "Not authenticated")!;
    return { user: null, error };
  }
  return { user, error: null };
}

/**
 * Error オブジェクトを PostgrestError に変換する。
 * requireUser() の認証エラーや try/catch の例外をサービス層で一貫して扱うために使用。
 *
 * @param err - 変換元のエラー（null の場合は null を返す）
 * @param fallbackMessage - err.message が falsy な場合の代替メッセージ
 * @returns PostgrestError または null
 */
export function asPostgrestError(err: Error | null, fallbackMessage = "Not authenticated"): PostgrestError | null {
  if (!err) return null;
  return new PostgrestError({
    message: err.message ?? fallbackMessage,
    details: "",
    hint: "",
    code: "AUTH_ERROR",
  });
}
