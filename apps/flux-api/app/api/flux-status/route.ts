/**
 * GET /api/flux-status
 *
 * 文字起こしジョブの進捗を確認（Supabase Realtime のフォールバック用）。
 * Expo 側は基本的に Realtime で進捗を受け取るが、
 * 何らかの理由で WebSocket が切れた場合の保険として使用。
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/api-auth";
import { createServiceRoleClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { user } = await getUser(req);
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    if (!jobId) {
      return NextResponse.json({ error: "jobId は必須です" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data: job, error } = await supabase
      .from("transcription_jobs")
      .select("*")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .single();

    if (error || !job) {
      return NextResponse.json(
        { error: "ジョブが見つかりません" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      status: job.status,
      progress: `${job.completed_chunks}/${job.total_chunks}`,
      completedChunks: job.completed_chunks,
      totalChunks: job.total_chunks,
      transcript: job.transcript || undefined,
      errorMessage: job.error_message || undefined,
    });
  } catch (error) {
    console.error("ステータス確認エラー:", error);
    return NextResponse.json(
      { error: "ステータスの取得に失敗しました" },
      { status: 500 },
    );
  }
}
