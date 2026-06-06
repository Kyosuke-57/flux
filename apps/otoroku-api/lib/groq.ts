/**
 * Groq Whisper 文字起こし + OpenCode Go 補正（otoroku-api 移植版）
 *
 * mama_care_app/src/features/voice/lib/groq.ts から移植
 * transcribeWithGroq: 音声ファイルを正規化して Groq Whisper に送信
 * refineJapaneseTranscript: OpenCode Go で文字起こしを補正
 */
import Groq from "groq-sdk";
import type { TranscriptionCreateParams } from "groq-sdk/resources/audio/transcriptions";
import { createReadStream } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import { getFfmpegPath } from "./ffmpeg";

const execFileAsync = promisify(execFile);

let groqClient: Groq | null = null;
function getGroqClient(): Groq {
  if (!groqClient) {
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY || "",
    });
  }
  return groqClient;
}

export interface GroqTranscribeOptions {
  filePath: string;
  prompt?: string;
}

/**
 * 音声ファイルを正規化 → Groq Whisper で文字起こし
 */
export const transcribeWithGroq = async ({
  filePath,
  prompt,
}: GroqTranscribeOptions): Promise<string> => {
  let safePrompt: string | undefined;
  if (prompt) safePrompt = prompt.slice(-100); // 916文字制限対策

  const binaryPath = await getFfmpegPath();
  const normalizedPath = filePath + "_norm.m4a";

  try {
    await execFileAsync(binaryPath, [
      "-i", filePath,
      "-af", "dynaudnorm",
      "-c:a", "aac",
      "-b:a", "128k",
      "-y",
      normalizedPath,
    ]);
  } catch (ffmpegError: any) {
    throw new Error(
      `音声正規化に失敗しました: ${ffmpegError?.stderr || ffmpegError?.message || ffmpegError}`,
    );
  }

  try {
    const params: TranscriptionCreateParams = {
      file: createReadStream(normalizedPath),
      model: "whisper-large-v3",
      response_format: "json",
      language: "ja",
    };
    if (safePrompt) params.prompt = safePrompt;

    const transcription = await getGroqClient().audio.transcriptions.create(params);
    return transcription.text;
  } finally {
    try { await fs.unlink(normalizedPath); } catch { /* ignore */ }
  }
};

/**
 * Exponential Backoff リトライ付き文字起こし
 */
export async function transcribeWithRetry(
  chunkPath: string,
  prompt?: string,
  maxRetries: number = 5,
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await transcribeWithGroq({ filePath: chunkPath, prompt });
    } catch (e: any) {
      const isRateLimit = e?.status === 429 || e?.message?.includes("rate_limit");
      if (isRateLimit) {
        const wait = Math.min(2 ** attempt, 30); // 2, 4, 8, 16, 30秒
        await new Promise((r) => setTimeout(r, wait * 1000));
        continue;
      }
      const isTimeout = e?.code === "ETIMEDOUT" || e?.name === "TimeoutError";
      if (isTimeout && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      throw e;
    }
  }
  throw new Error("文字起こし失敗（リトライ上限到達）");
}

// ---------------------------------------------------------------------------
// OpenCode Go 補正
// ---------------------------------------------------------------------------

const REFINE_SYSTEM_PROMPT = `あなたは音声認識の文字起こし結果を整形するアシスタントです。
以下のルールに従って修正してください：

1. 句読点（、。）を適切に追加する
2. 明らかな誤認識を文脈から推測して修正する
3. 話し言葉の言い回しは尊重し、過度に書き言葉にしない
4. 話者の意図や事実関係は絶対に変更しない
5. 意味の切れ目で適切に改行する
6. 修正箇所の説明は不要。修正後のテキストのみを出力する`;

const OPENCODE_GO_API_URL = "https://opencode.ai/zen/go/v1/chat/completions";

/**
 * OpenCode Go で文字起こしを補正
 */
export const refineJapaneseTranscript = async (rawText: string): Promise<string> => {
  const res = await fetch(OPENCODE_GO_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENCODE_GO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: REFINE_SYSTEM_PROMPT },
        { role: "user", content: rawText },
      ],
      stream: false,
      thinking: { type: "disabled" },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`OpenCode Go API error: ${res.status} ${errorText}`);
  }

  const data: any = await res.json();
  return data.choices?.[0]?.message?.content || rawText;
};
