import { supabase } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

WebBrowser.maybeCompleteAuthSession();

export async function signUp(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred during sign up";
    return { data: null, error: new Error(message) };
  }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Google OAuth サインイン (Expo Go + PKCE フロー)
 *
 * Expo Go では exp:// スキーマのみインターセプト可能なため、
 * Linking.createURL で現在の開発サーバーURLをリダイレクト先として生成。
 * リダイレクトURLは自動的に exp://* パターンで Supabase Auth に登録済み。
 *
 * 必要な設定（Supabase ダッシュボード → Authentication → URL Configuration）:
 * - Redirect URLs に登録済み: exp://*, com.fluxapp.app://auth/callback
 * - Google Cloud Console で OAuth 同意画面とクライアントIDを設定
 */
export async function signInWithGoogle() {
  // Expo Go では exp:// スキーマのURLが使われるので、
  // Linking.createURL で正しいリダイレクトURLを生成
  const redirectUri = Linking.createURL("auth/callback");

  // 1)  Supabase から OAuth URL を取得（PKCE チャレンジ自動生成）
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUri,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    return { data: null, error };
  }

  if (!data?.url) {
    return {
      data: null,
      error: new Error("Failed to start Google sign in: no OAuth URL returned"),
    };
  }

  // 2) システムブラウザで OAuth 画面を開く
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

  if (result.type === "success") {
    // セッションは AuthContext の onAuthStateChange リスナーが自動検出する
    // 成功時は data を返す
    return { data, error: null };
  }

  if (result.type === "cancel") {
    return {
      data: null,
      error: new Error("Google sign in was cancelled"),
    };
  }

  return {
    data: null,
    error: new Error("Failed to sign in with Google"),
  };
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  return { user: data?.user ?? null, error };
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  return { session: data?.session ?? null, error };
}

export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void,
) {
  return supabase.auth.onAuthStateChange((event, session) =>
    callback(event, session),
  );
}
