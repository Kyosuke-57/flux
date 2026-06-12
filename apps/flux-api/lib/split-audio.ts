/**
 * 音声ファイル分割（otoroku-api 移植版）
 *
 * mama_care_app/src/features/voice/lib/split-audio.ts から移植
 */
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { getFfmpegPath } from "./ffmpeg";

const execFileAsync = promisify(execFile);

const GROQ_MAX_SIZE = 25 * 1024 * 1024; // 25MB

interface SplitResult {
  chunkPaths: string[];
}

const parseDuration = (stderr: string): number => {
  const m = stderr.match(/Duration: (\d+):(\d+):(\d+)\.(\d+)/);
  if (!m) throw new Error("音声の長さを取得できませんでした");
  return parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3], 10);
};

const probeDuration = async (binaryPath: string, inputPath: string): Promise<number> => {
  try {
    const { stderr } = await execFileAsync(binaryPath, ["-i", inputPath]);
    return parseDuration(stderr);
  } catch (e: any) {
    return parseDuration(e.stderr || "");
  }
};

export const splitAudioFile = async (
  inputPath: string,
  fileSize: number,
): Promise<SplitResult> => {
  if (fileSize <= GROQ_MAX_SIZE) {
    return { chunkPaths: [inputPath] };
  }

  const tmpDir = os.tmpdir();
  const baseName = path.basename(inputPath, path.extname(inputPath));
  const ext = path.extname(inputPath);
  const outputPattern = path.join(tmpDir, `${baseName}_chunk_%03d${ext}`);

  const binaryPath = await getFfmpegPath();
  const duration = await probeDuration(binaryPath, inputPath);
  if (duration <= 0) throw new Error("音声の長さが無効です");

  const segmentSeconds = Math.max(
    1,
    Math.floor(duration * ((GROQ_MAX_SIZE * 0.8) / fileSize)),
  );

  await execFileAsync(binaryPath, [
    "-i", inputPath,
    "-c", "copy",
    "-f", "segment",
    "-segment_time", String(segmentSeconds),
    "-reset_timestamps", "1",
    outputPattern,
  ]);

  const chunkFiles: string[] = [];
  let chunkIndex = 0;
  while (true) {
    const chunkPath = path.join(
      tmpDir,
      `${baseName}_chunk_${String(chunkIndex).padStart(3, "0")}${ext}`,
    );
    try {
      await fs.access(chunkPath);
      chunkFiles.push(chunkPath);
      chunkIndex++;
    } catch {
      break;
    }
  }

  return { chunkPaths: chunkFiles };
};

export const cleanupChunks = async (chunkPaths: string[]): Promise<void> => {
  for (const chunkPath of chunkPaths) {
    try { await fs.unlink(chunkPath); } catch { /* ignore */ }
  }
};
