import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import type { TextInput as TextInputType } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../../src/hooks/useThemeColors";
import { styles } from "../styles/minuteStyles";

interface AudioPlayerInfo {
  player: {
    playing: boolean;
    pause: () => void;
    play: () => void;
    seekTo: (position: number) => void;
  };
  playerStatus: {
    currentTime: number;
    duration: number;
  };
  fmt: (s: number) => string;
  seekBarWidth: React.MutableRefObject<number>;
}

interface MinuteEditorProps {
  content: string;
  onChangeContent: (text: string) => void;
  onSelectionChange: (selection: { start: number; end: number }) => void;
  contentInputRef: React.RefObject<TextInputType | null>;
  transcribing: boolean;
  onTranscribe: () => void;
  recordingPath: string | null;
  audioPlayer: AudioPlayerInfo | null;
}

/**
 * 議事録編集エリア。
 * - フォルダセレクター、タグセクション、音声プレーヤー、文字起こしボタン、本文入力
 *
 * このコンポーネントはスクロールビューを内包しない。
 * 親の ScrollView 内に配置されることを前提とする。
 */
export function MinuteEditor({
  content,
  onChangeContent,
  onSelectionChange,
  contentInputRef,
  transcribing,
  onTranscribe,
  recordingPath,
  audioPlayer,
}: MinuteEditorProps) {
  const c = useThemeColors();

  return (
    <>
      {recordingPath && audioPlayer && (
        <View style={[styles.playerCard, { backgroundColor: c.surface, borderColor: c.cardBorder }]}>
          {/* コントロール行 */}
          <View style={styles.playerControls}>
            <View style={styles.playerButtons}>
              <TouchableOpacity
                style={[styles.playerBtn, { backgroundColor: c.primary }]}
                onPress={() => {
                  if (audioPlayer.player.playing) audioPlayer.player.pause();
                  else audioPlayer.player.play();
                }}
              >
                <Ionicons
                  name={audioPlayer.player.playing ? "pause" : "play"}
                  size={20}
                  color="#fff"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.playerBtnSmall, { backgroundColor: c.surfaceSecondary }]}
                onPress={() => {
                  audioPlayer.player.seekTo(0);
                  audioPlayer.player.pause();
                }}
              >
                <Ionicons name="stop" size={16} color={c.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.playerTime, { color: c.textMuted }]}>
              {audioPlayer.fmt(audioPlayer.playerStatus.currentTime)} /{" "}
              {audioPlayer.fmt(audioPlayer.playerStatus.duration)}
            </Text>
          </View>

          {/* シークバー */}
          <View
            style={[styles.seekTrack, { backgroundColor: c.border }]}
            onStartShouldSetResponder={() => true}
            onResponderRelease={(e) => {
              if (!audioPlayer.playerStatus.duration || !audioPlayer.seekBarWidth.current) return;
              const ratio = Math.max(
                0,
                Math.min(1, e.nativeEvent.locationX / audioPlayer.seekBarWidth.current),
              );
              audioPlayer.player.seekTo(ratio * audioPlayer.playerStatus.duration);
            }}
            onLayout={(e) => {
              audioPlayer.seekBarWidth.current = e.nativeEvent.layout.width;
            }}
          >
            <View
              style={[
                styles.seekFill,
                {
                  backgroundColor: c.primary,
                  width:
                    audioPlayer.playerStatus.duration > 0
                      ? `${(audioPlayer.playerStatus.currentTime / audioPlayer.playerStatus.duration) * 100}%`
                      : "0%",
                },
              ]}
            />
          </View>

          {/* 文字起こし */}
          {transcribing ? (
            <View style={styles.transcribingRow}>
              <ActivityIndicator size="small" color={c.primary} />
              <Text style={[styles.transcribingText, { color: c.textMuted }]}>文字起こし中…</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.transcribeBtn, { backgroundColor: c.primaryBg }]}
              onPress={onTranscribe}
            >
              <Ionicons name="mic-outline" size={16} color={c.primary} />
              <Text style={[styles.transcribeBtnText, { color: c.primary }]}>文字起こし</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <TextInput
        ref={contentInputRef}
        style={[styles.contentInput, { color: c.textPrimary }]}
        value={content}
        onChangeText={onChangeContent}
        onSelectionChange={(e) => onSelectionChange(e.nativeEvent.selection)}
        placeholder="議事録を書き始めましょう…"
        placeholderTextColor={c.textMuted}
        multiline
        textAlignVertical="top"
      />
    </>
  );
}
