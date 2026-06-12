import { File, Directory, Paths } from "expo-file-system";

/**
 * 録音ファイルをアプリのドキュメントディレクトリに保存する
 * @param uri      元ファイルの URI
 * @param filename 保存ファイル名（拡張子なし）
 * @returns 保存先のローカルパス
 */
export async function saveRecordingLocally(
  uri: string,
  filename: string,
): Promise<string> {
  const recordingsDir = new Directory(Paths.document, "recordings");
  if (!recordingsDir.exists) {
    recordingsDir.create({ intermediates: true });
  }
  // Directory.createFile はネイティブ側のバグで親ディレクトリに作成されるため、
  // 直接パスを組み立てて File インスタンスを作成する
  const destUri = Paths.join(recordingsDir.uri, `${filename}.m4a`);
  const destFile = new File(destUri);
  if (!destFile.exists) {
    destFile.create();
  }
  const sourceFile = new File(uri);
  const bytes = await sourceFile.bytes();
  await destFile.write(bytes);
  return destFile.uri;
}

