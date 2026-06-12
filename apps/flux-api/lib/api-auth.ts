/**
 * JWT 認証ヘルパー（otoroku-api）
 *
 * mama_care 版（api-auth.ts）と異なり、otoroku Supabase の JWT を検証する。
 * Expo からの Authorization ヘッダに JWT を付与してもらい、それを検証する。
 */
import { NextRequest } from "next/server";
import { createAnonClient } from "./supabase";

/** リクエストからユーザー情報を取得（JWT 検証） */
export async function getUser(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { user: null };
  }

  const jwt = authHeader.replace("Bearer ", "");
  const supabase = createAnonClient();
  const { data, error } = await supabase.auth.getUser(jwt);

  if (error || !data.user) {
    return { user: null };
  }

  return { user: data.user, jwt };
}
