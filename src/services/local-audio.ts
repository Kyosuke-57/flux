import { Audio } from "expo-av";
import { File, Directory, Paths } from "expo-file-system";

let _sound: Audio.Sound | null = null;

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

/**
 * ローカルの音声ファイルを再生する
 * @param uri 再生する音声ファイルの URI
 */
export async function playLocalAudio(uri: string): Promise<void> {
  if (_sound) {
    await _sound.stopAsync();
    await _sound.unloadAsync();
    _sound = null;
  }

  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    allowsRecordingIOS: false,
  });

  const { sound } = await Audio.Sound.createAsync(
    { uri },
    { shouldPlay: true },
  );

  _sound = sound;

  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.isLoaded && status.didJustFinish) {
      sound.unloadAsync();
      _sound = null;
    }
  });
}

/**
 * 現在再生中の音声を停止する
 */
export async function stopLocalAudio(): Promise<void> {
  if (_sound) {
    await _sound.stopAsync();
    await _sound.unloadAsync();
    _sound = null;
  }
}
