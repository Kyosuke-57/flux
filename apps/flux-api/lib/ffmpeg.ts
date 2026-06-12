/**
 * ffmpeg-static パス取得（otoroku-api 移植版）
 *
 * mama_care_app/src/features/voice/lib/ffmpeg.ts から移植
 */
let ffmpegPath: string | null = null;

export const getFfmpegPath = async (): Promise<string> => {
  if (ffmpegPath) return ffmpegPath;

  const ffmpegStatic = (await import("ffmpeg-static")).default;
  if (!ffmpegStatic) {
    throw new Error("ffmpeg-static: バイナリパスが見つかりません");
  }
  ffmpegPath = ffmpegStatic;
  return ffmpegStatic;
};
