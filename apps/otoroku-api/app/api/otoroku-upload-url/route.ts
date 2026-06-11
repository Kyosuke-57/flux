/**
 * GET /api/otoroku-upload-url
 *
 * R2 署名付きアップロードURLを発行。
 * Expo 側はこのURLを使って R2 に直接音声ファイルをアップロードする。
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/api-auth";
import { generateUploadUrl, isValidAudioType } from "@/lib/r2";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { user } = await getUser(req);
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await req.json() as { filename: string; mimeType: string; fileSize: number };
    const { filename, mimeType, fileSize } = body;

    if (!filename || !mimeType || !fileSize) {
      return NextResponse.json(
        { error: "filename, mimeType, fileSize は必須です" },
        { status: 400 },
      );
    }

    if (!isValidAudioType(mimeType)) {
      return NextResponse.json(
        { error: "サポートされていない音声形式です" },
        { status: 400 },
      );
    }

    const { uploadUrl, r2Key } = await generateUploadUrl({
      userId: user.id,
      filename,
      mimeType,
      fileSize,
    });

    return NextResponse.json({ uploadUrl, r2Key });
  } catch (error) {
    console.error("署名付きURL生成エラー:", error);
    return NextResponse.json(
      { error: "署名付きURLの生成に失敗しました" },
      { status: 500 },
    );
  }
}
