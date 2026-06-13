/**
 * 議事録エクスポートサービス
 *
 * PDF / テキスト / Markdown 形式で議事録をファイルに出力し、
 * デバイスの共有シートを使って共有する。
 *
 * 依存:
 *   - expo-print    → PDF 生成 (printToFileAsync)
 *   - expo-file-system → テキストファイル書き込み (Paths, File)
 *   - expo-sharing  → 共有シート表示 (shareAsync)
 */

import { Paths, File } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { Minute } from "../types";

// ─── 型定義 ────────────────────────────────────────────────

export type ExportFormat = "txt" | "md" | "pdf";

export interface ExportResult {
  uri: string;
  mimeType: string;
}

// ─── ヘルパー（公開: テスト用） ────────────────────────────

/**
 * 本文 (content) をプレーンテキストに変換する。
 * Markdown 記号を除去し、空行を適切に処理する。
 */
export function contentToPlainText(content: string): string {
  return content
    .replace(/[#*`\[\]]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * 本文から HTML を生成する（簡易 Markdown → HTML 変換）。
 */
export function contentToHtml(title: string, content: string): string {
  const escapedTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const bodyLines = content.split("\n").map((line) => {
    if (line.startsWith("# ")) return `<h1>${line.slice(2)}</h1>`;
    if (line.startsWith("## ")) return `<h2>${line.slice(3)}</h2>`;
    if (line.startsWith("### ")) return `<h3>${line.slice(4)}</h3>`;
    if (line.trim() === "") return `<br/>`;
    return `<p>${line}</p>`;
  });
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <style>
    @page { margin: 20mm; }
    body {
      font-family: -apple-system, "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
      padding: 0;
      line-height: 1.8;
      color: #333;
      max-width: 720px;
      margin: 0 auto;
    }
    h1 {
      font-size: 22px;
      border-bottom: 3px solid #7C3AED;
      padding-bottom: 8px;
      margin-top: 24px;
    }
    h2 { font-size: 18px; margin-top: 20px; }
    h3 { font-size: 16px; margin-top: 16px; }
    p { margin: 8px 0; }
    .meta {
      font-size: 12px;
      color: #94A3B8;
      margin-bottom: 24px;
    }
  </style>
</head>
<body>
  <h1>${escapedTitle}</h1>
  <div class="meta">作成日: ${new Date().toLocaleDateString("ja-JP")}</div>
  ${bodyLines.join("\n")}
</body>
</html>`;
}

// ─── 公開関数 ──────────────────────────────────────────────

/**
 * 指定された形式で議事録をファイルにエクスポートする。
 *
 * @param minute  - エクスポートする議事録
 * @param format  - 出力形式 ("txt" | "md" | "pdf")
 * @returns       生成されたファイルの URI と MIME タイプ
 */
export async function exportMinuteToFile(
  minute: Minute,
  format: ExportFormat,
): Promise<ExportResult> {
  const timestamp = Date.now();
  const safeTitle = minute.title.replace(/[\/\\?%*:|"<>]/g, "_").slice(0, 60);

  if (format === "pdf") {
    const { printToFileAsync } = await import("expo-print");
    const html = contentToHtml(minute.title, minute.content);
    const { uri } = await printToFileAsync({ html });
    return { uri, mimeType: "application/pdf" };
  }

  // txt / md は expo-file-system で書き出す
  const ext = format;
  const file = new File(Paths.cache, `${safeTitle}-${timestamp}.${ext}`);

  if (format === "md") {
    file.write(`# ${minute.title}\n\n${minute.content}`);
    return { uri: file.uri, mimeType: "text/markdown" };
  }

  // txt
  file.write(`${minute.title}\n\n${contentToPlainText(minute.content)}`);
  return { uri: file.uri, mimeType: "text/plain" };
}

/**
 * エクスポートしたファイルをデバイスの共有シートで共有する。
 *
 * @param uri          - ファイルの URI
 * @param mimeType     - MIME タイプ
 * @param dialogTitle  - 共有シートのタイトル（デフォルト: "議事録を共有"）
 */
export async function shareExportedFile(
  uri: string,
  mimeType: string,
  dialogTitle: string = "議事録を共有",
): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error("このデバイスでは共有が利用できません。");
  }

  await Sharing.shareAsync(uri, { mimeType, dialogTitle });
}

/**
 * エクスポート → 共有 を一度に行う便利関数。
 *
 * @param minute  - エクスポートする議事録
 * @param format  - 出力形式
 */
export async function exportAndShareMinute(
  minute: Minute,
  format: ExportFormat,
): Promise<void> {
  const { uri, mimeType } = await exportMinuteToFile(minute, format);
  await shareExportedFile(uri, mimeType);
}
