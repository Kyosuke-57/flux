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

// ---------------------------------------------------------------------------
// 議事録自動生成
// ---------------------------------------------------------------------------

const MINUTES_GENERATION_SYSTEM_PROMPT = `あなたは会議の文字起こしから構造化された議事録を生成するアシスタントです。

以下の文字起こしを元に、日本語で議事録を作成してください。

【出力形式】
タイトル: [会議のタイトルを推定]

# 議事録

## 参加者（推定）
[登場人物がいれば記載]

## 議題
[議題のリスト]

## 議論内容
[議論の詳細]

## 決定事項
[決定されたこと]

## 次のアクション
- [ ] タスク1（担当者: 名前）
- [ ] タスク2（担当者: 名前）

---
【文字起こし】
{transcript}`;

export interface MinutesGenerationResult {
  title: string;
  content: string;
  summary: string;
  actionItems: string[];
}

/**
 * 文字起こしテキストから構造化された議事録を生成
 * @param transcript 文字起こしテキスト
 * @param templateContent テンプレート内容（任意）— 出力フォーマットの指示として使う
 */
export const generateMinutesFromTranscript = async (
  transcript: string,
  templateContent?: string,
): Promise<MinutesGenerationResult> => {
  let systemPrompt = MINUTES_GENERATION_SYSTEM_PROMPT;

  // テンプレートが指定されていれば、出力形式の指示として上書き
  if (templateContent) {
    systemPrompt = `あなたは会議の文字起こしから構造化された議事録を生成するアシスタントです。

以下の文字起こしを元に、日本語で議事録を作成してください。

【テンプレート指示】
以下の形式に従って議事録を生成してください：
${templateContent}

---
【文字起こし】
{transcript}`;
  }

  const prompt = systemPrompt.replace("{transcript}", transcript);

  const res = await fetch(OPENCODE_GO_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENCODE_GO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: "あなたは会議の文字起こしから構造化された議事録を生成するプロフェッショナルです。" },
        { role: "user", content: prompt },
      ],
      stream: false,
      thinking: { type: "disabled" },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`議事録生成API error: ${res.status} ${errorText}`);
  }

  const data: any = await res.json();
  const rawContent = data.choices?.[0]?.message?.content || "";

  return parseMinutesFromContent(rawContent, transcript);
};

/**
 * LLMの出力から構造化データを抽出
 */
function parseMinutesFromContent(
  content: string,
  transcript: string,
): MinutesGenerationResult {
  // タイトルを抽出
  const titleMatch = content.match(/タイトル:\s*(.+)/);
  const title = titleMatch?.[1]?.trim() || "議事録";

  // 本文全体（タイトル行を除く）
  const bodyContent = content.replace(/タイトル:\s*.+(\n|$)/, "").trim();

  // サマリー（先頭200文字程度を抽出）
  const summary = bodyContent.slice(0, 200).replace(/\n/g, " ").trim() + (bodyContent.length > 200 ? "…" : "");

  // アクションアイテムを抽出
  const actionItems: string[] = [];
  const actionRegex = /-\s*\[\s*[xX ]?\s*\]\s*(.+)/g;
  let match;
  while ((match = actionRegex.exec(content)) !== null) {
    actionItems.push(match[1].trim());
  }

  return { title, content: bodyContent, summary, actionItems };
}
