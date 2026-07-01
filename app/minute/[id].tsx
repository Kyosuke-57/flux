import { useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useThemeColors } from "../../src/hooks/useThemeColors";
import { Skeleton } from "../../src/components/Skeleton";
import { Spacing } from "../../src/theme";
import { styles } from "./styles/minuteStyles";
import { useMinuteForm } from "./hooks/useMinuteForm";
import { useMinuteActions } from "./hooks/useMinuteActions";
import { useMinutePlayback } from "./hooks/useMinutePlayback";
import { MinuteHeader } from "./components/MinuteHeader";
import { MinuteEditor } from "./components/MinuteEditor";
import { TemplatePickerModal } from "./components/TemplatePickerModal";
import { TagPickerModal } from "./components/TagPickerModal";
import { FolderPickerModal } from "./components/FolderPickerModal";
import { MinuteShareSheet } from "./components/MinuteShareSheet";
import { ConfirmDeleteDialog } from "./components/ConfirmDeleteDialog";

export default function MinuteDetailScreen() {
  const c = useThemeColors();
  const { id, recordingUri, recordingPath } = useLocalSearchParams<{
    id: string;
    recordingUri?: string;
    recordingPath?: string;
  }>();
  const isNew = !id || id === "new" || id === "create";

  const form = useMinuteForm(id, isNew, recordingUri, recordingPath);
  const actions = useMinuteActions(id, isNew, recordingUri, recordingPath);
  const playback = useMinutePlayback(form.recordingPathState ?? null);

  // Synced state: recordingPathState from form → actions (for handleTranscribe)
  useEffect(() => {
    if (form.recordingPathState !== actions.recordingPathState) {
      actions.setRecordingPathState(form.recordingPathState);
    }
  }, [form.recordingPathState]);

  if (form.loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
        <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.divider }]}>
          <Skeleton width={60} height={20} borderRadius={6} />
          <Skeleton width={120} height={20} borderRadius={6} />
          <Skeleton width={50} height={20} borderRadius={6} />
        </View>
        <View style={{ paddingHorizontal: 24, paddingTop: 20, gap: 16 }}>
          <Skeleton width="100%" height={28} borderRadius={8} />
          <Skeleton width="40%" height={18} borderRadius={6} />
          <Skeleton width="100%" height={200} borderRadius={12} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      {/* ─── ナビゲーションヘッダー ──────────────────────────── */}
      <MinuteHeader
        onBack={form.confirmBack}
        onSave={() => form.handleSave()}
        isSaving={form.saving}
        headerTitle={form.title ? "議事録を編集" : "新規議事録"}
      />

      {/* ─── スクロールエリア ────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* タイトル入力 */}
        <TextInput
          style={[styles.titleInput, { color: c.textPrimary, borderBottomColor: c.divider }]}
          value={form.title}
          onChangeText={form.setTitle}
          placeholder="会議のタイトル"
          placeholderTextColor={c.textMuted}
        />

        {/* フォルダセレクター */}
        <TouchableOpacity
          style={[styles.folderSelector, { borderBottomColor: c.divider }]}
          onPress={() => actions.setFolderModalVisible(true)}
        >
          <Ionicons
            name={form.selectedFolderId ? "folder" : "folder-open-outline"}
            size={18}
            color={form.selectedFolderId ? c.primary : c.textMuted}
          />
          <Text
            style={[
              styles.folderSelectorText,
              { color: form.selectedFolderId ? c.textPrimary : c.textMuted },
            ]}
          >
            {form.selectedFolderId
              ? form.folders.find((f) => f.id === form.selectedFolderId)?.name ?? "フォルダ"
              : "フォルダを選択"}
          </Text>
          <Ionicons name="chevron-down" size={16} color={c.textMuted} />
        </TouchableOpacity>

        {/* タグセクション */}
        <View style={styles.tagsSection}>
          <View style={styles.tagInputRow}>
            <TextInput
              style={[styles.tagInput, { color: c.primary, borderBottomColor: c.divider }]}
              value={form.tagsStr}
              onChangeText={form.setTagsStr}
              placeholder="タグ（カンマ区切り）"
              placeholderTextColor={c.textMuted}
            />
            <TouchableOpacity
              style={[styles.addTagBtn, { backgroundColor: c.primaryBg }]}
              onPress={form.handleCreateAndAddTag}
            >
              <Ionicons name="add" size={18} color={c.primary} />
            </TouchableOpacity>
          </View>
          {form.availableTags.length > 0 && (
            <View style={styles.tagSuggestions}>
              {form.availableTags.map((tag) => {
                const isSelected = form.parsedTags.includes(tag.name);
                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={[
                      styles.tagChip,
                      { backgroundColor: c.surfaceSecondary },
                      isSelected && { backgroundColor: c.primary },
                    ]}
                    onPress={() => form.handleToggleTag(tag.name)}
                  >
                    <Text
                      style={[
                        styles.tagChipText,
                        { color: c.textSecondary },
                        isSelected && { color: c.textInverse, fontWeight: "600" },
                      ]}
                    >
                      {tag.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* 音声プレーヤー + 文字起こし + 本文入力 */}
        <MinuteEditor
          content={form.content}
          onChangeContent={form.handleContentChange}
          onSelectionChange={form.setSelection}
          contentInputRef={form.contentInputRef}
          transcribing={actions.transcribing}
          onTranscribe={() => actions.handleTranscribe(form.setContent)}
          recordingPath={form.recordingPathState}
          audioPlayer={
            form.recordingPathState
              ? {
                  player: playback.player,
                  playerStatus: playback.playerStatus,
                  fmt: playback.fmt,
                  seekBarWidth: playback.seekBarWidth,
                }
              : null
          }
        />
      </ScrollView>

      {/* ─── ボトムバー ──────────────────────────────────────── */}
      <View style={[styles.bottomBar, { backgroundColor: c.surface, borderTopColor: c.divider }]}>
        {!isNew && (
          <TouchableOpacity
            style={[styles.deleteBtn, { backgroundColor: c.errorBg }]}
            onPress={actions.handleDelete}
          >
            <Ionicons name="trash-outline" size={16} color={c.error} />
            <Text style={[styles.deleteBtnText, { color: c.error }]}>削除</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.favBtn,
            { backgroundColor: actions.currentFavorited ? c.primaryBg : c.surfaceSecondary },
          ]}
          onPress={actions.handleToggleFavorite}
        >
          <Ionicons
            name={actions.currentFavorited ? "heart" : "heart-outline"}
            size={16}
            color={actions.currentFavorited ? c.primary : c.textMuted}
          />
          <Text
            style={[
              styles.favBtnText,
              { color: actions.currentFavorited ? c.primary : c.textSecondary },
            ]}
          >
            {actions.currentFavorited ? "保存済み" : "保存"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.templateBtn, { backgroundColor: c.primaryBg }]}
          onPress={() => actions.setTemplateModalVisible(true)}
        >
          <Ionicons name="document-text-outline" size={14} color={c.primary} />
          <Text style={[styles.templateBtnText, { color: c.primary }]}>テンプレート</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shareBtn, { backgroundColor: c.primary }]}
          onPress={actions.handleSharePress}
        >
          <Ionicons name="share-outline" size={16} color="#fff" />
          <Text style={[styles.shareBtnText, { color: "#fff" }]}>共有</Text>
        </TouchableOpacity>
      </View>

      {/* ─── モーダル類 ──────────────────────────────────────── */}
      <TemplatePickerModal
        visible={actions.templateModalVisible}
        onClose={() => actions.setTemplateModalVisible(false)}
        templates={form.templates}
        onApply={(t) => actions.handleApplyTemplate(t, form.setContent, form.setTitle, form.title)}
        onPreview={actions.handlePreviewTemplate}
      />

      <FolderPickerModal
        visible={actions.folderModalVisible}
        onClose={() => actions.setFolderModalVisible(false)}
        folders={form.folders}
        selectedFolderId={form.selectedFolderId}
        onSelectFolder={form.setSelectedFolderId}
      />

      <TagPickerModal
        tagCreateModalVisible={form.tagCreateModalVisible}
        newTagName={form.newTagName}
        onChangeNewTagName={form.setNewTagName}
        onCancelCreateTag={() => form.setTagCreateModalVisible(false)}
        onConfirmCreateTag={form.handleConfirmCreateTag}
      />

      <MinuteShareSheet
        visible={actions.shareModalVisible}
        onClose={() => actions.setShareModalVisible(false)}
        onShare={(format) => actions.handleShare(format, form.title, form.content)}
      />

      <ConfirmDeleteDialog
        visible={actions.deleteModalVisible}
        onCancel={() => actions.setDeleteModalVisible(false)}
        onConfirm={actions.confirmDelete}
      />
    </SafeAreaView>
  );
}
