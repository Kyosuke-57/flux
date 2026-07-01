import { StyleSheet } from "react-native";

/**
 * 議事録詳細画面のスタイル定義
 * app/minute/[id].tsx から責務分離で抽出したもの。
 * 観測可能な挙動は一切変更しない。
 */
export const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  loadingText: { marginTop: 12, fontSize: 15 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerAction: { fontSize: 16, fontWeight: "500" },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  saveBtn: { fontWeight: "700" },
  disabled: { opacity: 0.5 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },

  titleInput: {
    fontSize: 24,
    fontWeight: "700",
    paddingVertical: 16,
    borderBottomWidth: 1,
    marginBottom: 4,
  },

  folderSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  folderSelectorText: {
    flex: 1,
    fontSize: 14,
  },

  tagsSection: { marginBottom: 12, marginTop: 4 },
  tagInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tagInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  addTagBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  tagSuggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  tagChipText: { fontSize: 12 },

  playerCard: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  playerControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  playerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  playerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  playerBtnSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  playerTime: {
    fontSize: 13,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  seekTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  seekFill: {
    height: "100%",
    borderRadius: 3,
  },
  transcribingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  transcribingText: { fontSize: 14, fontStyle: "italic" },
  transcribeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  transcribeBtnText: { fontSize: 13, fontWeight: "600" },

  contentInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    paddingVertical: 12,
    minHeight: 300,
  },

  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteBtnText: { fontSize: 13, fontWeight: "600" },
  favBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  favBtnText: { fontSize: 13, fontWeight: "500" },
  templateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  templateBtnText: { fontSize: 13, fontWeight: "600" },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  shareBtnText: { fontSize: 14, fontWeight: "700" },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: "600" },
  modalClose: { fontSize: 16, fontWeight: "500" },
  modalEmpty: {
    paddingVertical: 32,
    alignItems: "center",
  },
  modalEmptyText: { fontSize: 14 },
  templateSectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  templateList: { paddingHorizontal: 24, paddingTop: 12 },
  templateCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  templateCardHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  templateCardName: { fontSize: 15, fontWeight: "600" },
  templateCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  templateCategoryText: { fontSize: 11, fontWeight: "500" },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultBadgeText: { fontSize: 11, fontWeight: "500" },
  templateCardPreview: {
    fontSize: 13,
    lineHeight: 18,
  },

  folderList: { paddingHorizontal: 24, paddingTop: 12, gap: 8 },
  folderItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  folderItemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 32,
  },

  tagCreateModal: {
    marginHorizontal: 40,
    borderRadius: 16,
    padding: 24,
    gap: 16,
  },
  tagCreateTitle: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  tagCreateInput: {
    fontSize: 15,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  tagCreateActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  tagCreateCancel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tagCreateCancelText: {
    fontSize: 14,
    fontWeight: "500",
  },
  tagCreateConfirm: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tagCreateConfirmText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
