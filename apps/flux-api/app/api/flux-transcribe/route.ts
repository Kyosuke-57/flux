/**
 * POST /api/flux-transcribe
 *
 * 文字起こしパイプラインのエントリポイント。
 * 1. R2 から音声ダウンロード
 * 2. FFmpeg で分割
 * 3. 各チャンクを Groq Whisper で文字起こし（429時 Exponential Backoff）
 * 4. 全チャンク完了 → OpenCode Go で補正
 * 5. 結果を flux Supabase に保存
 * 6. 完了/失敗時に R2 音声ファイルを自動削除
 *
 * Vercel Pro の 15分タイムアウト内で全処理を完了させる。
 */
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { getUser } from "@/lib/api-auth";
import { getObject, deleteObject } from "@/lib/r2";
import { splitAudioFile, cleanupChunks } from "@/lib/split-audio";
import { transcribeWithRetry, refineJapaneseTranscript, generateMinutesFromTranscript } from "@/lib/groq";
import { createServiceRoleClient } from "@/lib/supabase";

export const runtime = "nodejs";

const GROQ_CHUNK_SIZE = 25 * 1024 * 1024; // 25MB 超えたら分割

export async function POST(req: NextRequest) {
  let jobId: string | undefined;
  let tempDir: string | null = null;
  let chunkPaths: string[] = [];
  let r2KeyToCleanup: string | undefined;

  try {
    // ---- 認証 ----
    const { user } = await getUser(req);
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await req.json() as {
      r2Key: string;
      recordingId: string;
      fileSize?: number;
      fileName?: string;
      generationMode?: "auto" | "manual";
    };
    const { r2Key, recordingId, fileSize, fileName, generationMode } = body;
    if (!r2Key || !recordingId) {
      return NextResponse.json(
        { error: "r2Key, recordingId は必須です" },
        { status: 400 },
      );
    }

    r2KeyToCleanup = r2Key;
    const supabase = createServiceRoleClient();

    // ---- ジョブを DB に登録 ----
    const totalChunksEstimate = fileSize
      ? Math.ceil(fileSize / GROQ_CHUNK_SIZE)
      : 1;

    const { data: job, error: insertError } = await supabase
      .from("transcription_jobs")
      .insert({
        recording_id: recordingId,
        user_id: user.id,
        r2_key: r2Key,
        file_name: fileName || "recording.m4a",
        file_size: fileSize || 0,
        status: "processing",
        total_chunks: totalChunksEstimate,
        completed_chunks: 0,
      })
      .select("id")
      .single();

    if (insertError || !job) {
      throw new Error(`ジョブ登録失敗: ${insertError?.message}`);
    }
    jobId = job.id;

    // ---- R2 から音声をダウンロード ----
    const fileBuffer = await getObject(r2Key);

    // ---- テンポラリディレクトリに保存 ----
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "flux-"));
    const ext = path.extname(fileName || ".m4a") || ".m4a";
    const inputPath = path.join(tempDir, `input${ext}`);
    await fs.writeFile(inputPath, fileBuffer);

    // ---- 音声分割 ----
    const { chunkPaths: splitPaths } = await splitAudioFile(
      inputPath,
      fileBuffer.length,
    );
    chunkPaths = splitPaths;

    // 実際のチャンク数で更新
    if (chunkPaths.length !== totalChunksEstimate) {
      await supabase
        .from("transcription_jobs")
        .update({ total_chunks: chunkPaths.length })
        .eq("id", jobId);
    }

    // ---- 各チャンクを Groq Whisper で文字起こし ----
    let fullTranscript = "";

    for (let i = 0; i < chunkPaths.length; i++) {
      const transcriptText = await transcribeWithRetry(
        chunkPaths[i],
        fullTranscript || undefined,
      );

      const separator = fullTranscript ? "\n" : "";
      fullTranscript = `${fullTranscript}${separator}${transcriptText}`;

      // 進捗を DB に保存（→ Realtime で Expo に通知）
      await supabase
        .from("transcription_jobs")
        .update({
          completed_chunks: i + 1,
          transcript: fullTranscript,
        })
        .eq("id", jobId);
    }

    // ---- OpenCode Go で補正 ----
    let refinedTranscript = fullTranscript;
    try {
      refinedTranscript = await refineJapaneseTranscript(fullTranscript);
    } catch (refineError) {
      // 補正が失敗しても文字起こし結果は使える
      console.error("補正スキップ:", refineError);
    }

    let minuteId: string | undefined;

    if (generationMode === "auto") {
      // ---- 自動議事録生成（文字起こし完了後、即座に議事録を作成） ----
      try {
        const minutesResult = await generateMinutesFromTranscript(refinedTranscript);

        const { data: newMinute, error: minuteError } = await supabase
          .from("minutes")
          .insert({
            title: minutesResult.title,
            content: minutesResult.content,
            original_transcript: fullTranscript,
            corrected_transcript: refinedTranscript,
            summary: minutesResult.summary,
            recording_id: recordingId,
            user_id: user.id,
          })
          .select("id")
          .single();

        if (minuteError || !newMinute) {
          console.error("議事録保存失敗:", minuteError);
        } else {
          minuteId = newMinute.id;
        }
      } catch (genError) {
        // 議事録生成が失敗しても文字起こし結果は使える
        console.error("議事録自動生成スキップ:", genError);
      }
    }

    // ---- 完了を DB に保存 ----
    const finalUpdate: any = {
      status: "completed",
      transcript: refinedTranscript,
      completed_chunks: chunkPaths.length,
    };
    if (minuteId) {
      finalUpdate.minute_id = minuteId;
    }
    await supabase
      .from("transcription_jobs")
      .update(finalUpdate)
      .eq("id", jobId);

    // ---- R2 音声ファイルを自動削除 ----
    try {
      await deleteObject(r2Key);
      console.log(`R2 音声削除完了: ${r2Key}`);
    } catch (deleteError) {
      console.error(`R2 音声削除失敗: ${r2Key}`, deleteError);
    }

    return NextResponse.json({
      jobId,
      status: "completed",
      completedChunks: chunkPaths.length,
      totalChunks: chunkPaths.length,
      ...(minuteId ? { minuteId } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "予期しないエラーが発生しました";
    console.error("文字起こしエラー:", error);

    // エラー時に DB を更新
    if (jobId) {
      try {
        const supabase = createServiceRoleClient();
        await supabase
          .from("transcription_jobs")
          .update({ status: "failed", error_message: message })
          .eq("id", jobId);
      } catch { /* ignore */ }
    }

    // エラー時も R2 音声ファイルを削除
    if (r2KeyToCleanup) {
      try {
        await deleteObject(r2KeyToCleanup);
      } catch { /* ignore */ }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    // テンポラリファイルをクリーンアップ
    if (chunkPaths.length > 0) await cleanupChunks(chunkPaths);
    if (tempDir) {
      try { await fs.rm(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  }
}
