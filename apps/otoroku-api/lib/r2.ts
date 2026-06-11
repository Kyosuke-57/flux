/**
 * Cloudflare R2 クライアント設定（otoroku-api 移植版）
 *
 * mama_care_app/src/lib/r2.ts から移植（音声ファイル対応に特化）
 */
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = () => process.env.R2_ACCOUNT_ID || "";
const R2_ENDPOINT = () =>
  R2_ACCOUNT_ID()
    ? `https://${R2_ACCOUNT_ID()}.r2.cloudflarestorage.com`
    : "";
export const R2_BUCKET_NAME = () => process.env.R2_BUCKET_NAME || "otoroku-audio";

const AUDIO_CATEGORY = "otoroku";

function createR2Client() {
  if (!process.env.R2_ACCOUNT_ID) throw new Error("R2_ACCOUNT_ID is not set");
  if (!process.env.R2_ACCESS_KEY_ID) throw new Error("R2_ACCESS_KEY_ID is not set");
  if (!process.env.R2_SECRET_ACCESS_KEY) throw new Error("R2_SECRET_ACCESS_KEY is not set");

  return new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT(),
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
}

/** 署名付きアップロードURLを発行（Expo → R2 直アップロード用） */
export async function generateUploadUrl(params: {
  userId: string;
  filename: string;
  mimeType: string;
  fileSize: number;
}): Promise<{ uploadUrl: string; r2Key: string }> {
  const client = createR2Client();
  const timestamp = Date.now();
  const randomId = crypto.randomUUID();
  const ext = params.filename.split(".").pop() || "m4a";
  const r2Key = `${AUDIO_CATEGORY}/${params.userId}/${timestamp}-${randomId}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME(),
    Key: r2Key,
    ContentType: params.mimeType,
    ContentLength: params.fileSize,
    Metadata: {
      "user-id": params.userId,
      "original-filename": encodeURIComponent(params.filename),
    },
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
  return { uploadUrl, r2Key };
}

/** R2 からファイルを取得（Buffer） */
export async function getObject(key: string): Promise<Buffer> {
  const client = createR2Client();
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME(),
    Key: key,
  });
  const response = await client.send(command);
  if (!response.Body) throw new Error("Failed to get object: empty body");
  const chunks: Buffer[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** R2 からオブジェクトを削除 */
export async function deleteObject(key: string): Promise<void> {
  const client = createR2Client();
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME(),
    Key: key,
  });
  await client.send(command);
}

/** 音声MIMEタイプのバリデーション */
export const isValidAudioType = (mimeType: string): boolean => {
  if (mimeType.startsWith("audio/")) return true;
  const allowed = [
    "audio/mpeg", "audio/mp3", "audio/wav", "audio/wave",
    "audio/x-wav", "audio/mp4", "audio/x-m4a", "audio/aac",
    "audio/ogg", "audio/opus", "audio/flac", "audio/webm",
    "audio/3gpp", "audio/3gpp2",
  ];
  return allowed.includes(mimeType);
};
