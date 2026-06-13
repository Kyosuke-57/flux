import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../src/contexts/AuthContext";
import { useSettings } from "../../src/contexts/SettingsContext";
import { useToast } from "../../src/contexts/ToastContext";
import { signOut } from "../../src/services/auth";
import { getSubscriptionStatus, purchasePlan, PLANS, type PlanInfo } from "../../src/services/subscription";
import { getAllTemplates } from "../../src/services/templates";
import { getAllFolders, createFolder, updateFolder, deleteFolder } from "../../src/services/folders";
import { getAllTags, createTag, updateTag, deleteTag } from "../../src/services/tags";
import type { Folder, Tag } from "../../src/types";
import { theme } from "../../src/theme";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  }
  return `${mins}m ${secs}s`;
}

function formatLimit(seconds: number): string {
  if (seconds === Infinity) return "無制限";
  return formatTime(seconds);
}

export default function SettingsScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { settings, updateSetting } = useSettings();
  const toast = useToast();
  const c = theme(settings.isDarkMode);

  // Subscription state
  const [subscription, setSubscription] = useState<{
    plan: string;
    usageSeconds: number;
    limitSeconds: number;
  } | null>(null);
  const [subLoading, setSubLoading] = useState(true);

  // Templates
  const [templateCount, setTemplateCount] = useState(0);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  // Folder & Tag management
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [manageTarget, setManageTarget] = useState<"folder" | "tag" | null>(null);
  const [editItem, setEditItem] = useState<{ id: string; name: string } | null>(null);
  const [createName, setCreateName] = useState("");

  // Modal animation（単一の Animated.Value で opacity と scale を同時制御）
  const [modalVisible, setModalVisible] = useState(false);
  const animProgress = useRef(new Animated.Value(0)).current;

  const backdropOpacity = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const contentScale = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });

  // Open
  useEffect(() => {
    if (manageTarget !== null) {
      animProgress.setValue(0);
      setModalVisible(true);
      Animated.timing(animProgress, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }
  }, [manageTarget, animProgress]);

  const handleModalClose = () => {
    Animated.timing(animProgress, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      animProgress.setValue(0);
      setModalVisible(false);
      setManageTarget(null);
    });
  };

  // Load subscription data
  useEffect(() => {
    (async () => {
      try {
        const { data } = await getSubscriptionStatus();
        if (data) {
          setSubscription(data);
        }
      } catch {
        // Not authenticated or error
      } finally {
        setSubLoading(false);
      }
    })();
  }, [user]);

  // Load template count
  useEffect(() => {
    (async () => {
      try {
        const { data } = await getAllTemplates();
        setTemplateCount(data?.length ?? 0);
      } catch {
        // Not authenticated or error
      } finally {
        setTemplatesLoading(false);
      }
    })();
  }, [user]);

  // Load folders & tags
  useEffect(() => {
    (async () => {
      if (!user) return;
      const [{ data: f }, { data: t }] = await Promise.all([getAllFolders(), getAllTags()]);
      if (f) setFolders(f);
      if (t) setTags(t);
    })();
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/(tabs)");
    } catch {
      Alert.alert("エラー", "ログアウトに失敗しました");
    }
  };

  const planLabel = (plan: string) => {
    switch (plan) {
      case "free":
        return "無料";
      case "pro":
        return "Pro";
      case "byok":
        return "BYOK";
      default:
        return plan.charAt(0).toUpperCase() + plan.slice(1);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["top", "left", "right"]}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ─── アカウント ─── */}
        <Text style={[styles.section, { color: c.textMuted }]}>アカウント</Text>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.cardBorder }]}>
          {authLoading ? (
            <View style={styles.row}>
              <ActivityIndicator size="small" color={c.primary} />
            </View>
          ) : user ? (
            <>
              <View style={styles.row}>
                <View>
                  <Text style={[styles.rowText, { color: c.textPrimary }]}>ログイン中</Text>
                  <Text style={[styles.emailText, { color: c.textSecondary }]}>{user.email}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.row} onPress={handleSignOut}>
                <Text style={[styles.signOutText, { color: c.error }]}>ログアウト</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push("/(auth)/login")}
            >
              <Text style={styles.primaryButtonText}>サインイン</Text>
              <Text style={[styles.chevron, { color: c.textMuted }]}>→</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ─── 表示設定 ─── */}
        <Text style={[styles.section, { color: c.textMuted }]}>表示設定</Text>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.cardBorder }]}>
          <View style={styles.row}>
            <Text style={[styles.rowText, { color: c.textPrimary }]}>ダークモード</Text>
            <Switch
              value={settings.isDarkMode}
              onValueChange={(v) => updateSetting("isDarkMode", v)}
              trackColor={{ false: c.toggleBg, true: c.primaryBg }}
              thumbColor={settings.isDarkMode ? c.primary : "#fff"}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={[styles.rowText, { color: c.textPrimary }]}>録音エフェクト</Text>
            <View style={[styles.toggleGroup, { backgroundColor: c.surfaceSecondary }]}>
              {[
                { label: "波紋", value: "ripple" },
                { label: "波形", value: "waveform" },
                { label: "パルス", value: "pulse" },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.toggleOption,
                    settings.recordingEffect === opt.value && { backgroundColor: settings.isDarkMode ? "#334155" : "#fff", ...(settings.isDarkMode ? {} : { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 }) },
                  ]}
                  onPress={() => updateSetting("recordingEffect", opt.value as any)}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      { color: c.textSecondary },
                      settings.recordingEffect === opt.value && { color: c.primary, fontWeight: "600" },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ─── 議事録生成設定 ─── */}
        <Text style={[styles.section, { color: c.textMuted }]}>議事録設定</Text>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.cardBorder }]}>
          <View style={styles.row}>
            <Text style={[styles.rowText, { color: c.textPrimary }]}>議事録生成モード</Text>
            <View style={[styles.toggleGroup, { backgroundColor: c.surfaceSecondary }]}>
              {[
                { label: "自動生成", value: "auto" },
                { label: "手動編集", value: "manual" },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.toggleOption,
                    settings.minutesGenerationMode === opt.value && { backgroundColor: settings.isDarkMode ? "#334155" : "#fff", ...(settings.isDarkMode ? {} : { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 }) },
                  ]}
                  onPress={() => updateSetting("minutesGenerationMode", opt.value)}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      { color: c.textSecondary },
                      settings.minutesGenerationMode === opt.value && { color: c.primary, fontWeight: "600" },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.divider} />
          <View style={[styles.row, { flexDirection: "column", alignItems: "flex-start", paddingVertical: 8 }]}>
            <Text style={[styles.hintText, { color: c.textMuted, fontSize: 12, lineHeight: 18 }]}>
              自動生成: 録音→文字起こし→議事録作成まで一気に完了
            </Text>
            <Text style={[styles.hintText, { color: c.textMuted, fontSize: 12, lineHeight: 18 }]}>
              手動編集: 文字起こし後、編集画面で確認してから保存
            </Text>
          </View>
        </View>

        {/* ─── 試験的プラン切替 ─── */}
        <Text style={[styles.section, { color: c.textMuted }]}>試験設定</Text>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.cardBorder }]}>
          <View style={styles.row}>
            <Text style={[styles.rowText, { color: c.textPrimary }]}>プラン切替（テスト）</Text>
          </View>
          {(["free", "pro", "byok"] as const).map((planId) => {
            const plan = PLANS.find((p) => p.id === planId)!;
            const isCurrent = (subscription?.plan ?? "free") === planId;
            return (
              <TouchableOpacity
                key={planId}
                style={[styles.manageRow, { borderBottomColor: c.divider, paddingHorizontal: 16 }]}
                onPress={async () => {
                  setSubscription((prev) => prev ? { ...prev, plan: planId } : null);
                  try {
                    const { data } = await getSubscriptionStatus();
                    if (data) {
                      setSubscription({ ...data, plan: planId });
                    }
                  } catch {}
                }}
              >
                <Text style={[styles.manageName, { color: c.textPrimary }]}>{plan.name} — {plan.price}</Text>
                {isCurrent && (
                  <View style={[styles.badge, { backgroundColor: c.primary }]}>
                    <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>現在</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ─── サブスクリプション ─── */}
        <Text style={[styles.section, { color: c.textMuted }]}>プラン</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 24 }}>
          {PLANS.map((plan) => {
            const isCurrent = subscription?.plan === plan.id;
            const isPro = plan.id === "pro";
            return (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: isPro ? c.primary : c.surface,
                    borderColor: isPro ? c.primary : c.cardBorder,
                  },
                  isCurrent && { borderColor: c.primary, borderWidth: 2 },
                ]}
                onPress={() => {
                  if (!isCurrent) {
                    Alert.alert(
                      `${plan.name}にアップグレード`,
                      `${plan.price}で${plan.name}プランに変更しますか？`,
                      [
                        { text: "キャンセル", style: "cancel" },
                        {
                          text: "変更する",
                          onPress: async () => {
                            const { success, error } = await purchasePlan(plan.id);
                            if (success) {
                              const { data } = await getSubscriptionStatus();
                              if (data) setSubscription(data);
                              toast.showToast({ message: `${plan.name}プランに変更しました`, type: "success" });
                            } else if (error) {
                              toast.showToast({ message: error, type: "error" });
                            }
                          },
                        },
                      ],
                    );
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.planName, { color: isPro ? "#fff" : c.textPrimary }]}>
                  {plan.name}
                </Text>
                <Text style={[styles.planPrice, { color: isPro ? "rgba(255,255,255,0.9)" : c.primary }]}>
                  {plan.price}
                </Text>
                <Text style={[styles.planMinutes, { color: isPro ? "rgba(255,255,255,0.7)" : c.textMuted }]}>
                  月{plan.monthlyMinutes}分
                </Text>
                <View style={{ marginTop: 8, gap: 4 }}>
                  {plan.features.map((f) => (
                    <View key={f} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="checkmark" size={12} color={isPro ? "rgba(255,255,255,0.7)" : c.primary} />
                      <Text style={[styles.planFeature, { color: isPro ? "rgba(255,255,255,0.7)" : c.textMuted }]}>
                        {f}
                      </Text>
                    </View>
                  ))}
                </View>
                {isCurrent && (
                  <View style={[styles.planBadge, { backgroundColor: c.primary }]}>
                    <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>現在</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ─── テンプレート ─── */}
        <Text style={[styles.section, { color: c.textMuted }]}>テンプレート</Text>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.cardBorder }]}>
          <View style={styles.row}>
            <Text style={[styles.rowText, { color: c.textPrimary }]}>保存済みテンプレート</Text>
            {templatesLoading ? (
              <ActivityIndicator size="small" color={c.primary} />
            ) : (
              <Text style={[styles.rowValue, { color: c.textMuted }]}>{templateCount}</Text>
            )}
          </View>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push("/templates")}
          >
            <Text style={[styles.rowText, { color: c.textPrimary }]}>テンプレート管理</Text>
            <Text style={[styles.chevron, { color: c.textMuted }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ─── 整理 ─── */}
        <Text style={[styles.section, { color: c.textMuted }]}>整理</Text>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.cardBorder }]}>
          <TouchableOpacity style={styles.row} onPress={() => setManageTarget("folder")}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="folder" size={16} color={c.textMuted} />
              <Text style={[styles.rowText, { color: c.textPrimary }]}>フォルダ管理</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={[styles.rowValue, { color: c.textMuted }]}>{folders.length}</Text>
              <Text style={[styles.chevron, { color: c.textMuted }]}>›</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={() => setManageTarget("tag")}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="pricetag-outline" size={16} color={c.textMuted} />
              <Text style={[styles.rowText, { color: c.textPrimary }]}>タグ管理</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={[styles.rowValue, { color: c.textMuted }]}>{tags.length}</Text>
              <Text style={[styles.chevron, { color: c.textMuted }]}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ─── アプリ情報 ─── */}
        <Text style={[styles.section, { color: c.textMuted }]}>アプリ情報</Text>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.cardBorder }]}>
          <View style={styles.row}>
            <Text style={[styles.rowText, { color: c.textPrimary }]}>バージョン</Text>
            <Text style={[styles.rowValue, { color: c.textMuted }]}>1.0.0</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── フォルダ/タグ管理モーダル ─── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalContainer}>
          {/* 背景オーバーレイ（フェード） */}
          <Animated.View
            style={[styles.modalBackdrop, { backgroundColor: c.overlay, opacity: backdropOpacity }]}
            pointerEvents={modalVisible ? "auto" : "none"}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={handleModalClose}
            />
          </Animated.View>

          {/* コンテンツ（スケール + フェード） */}
          <Animated.View
            style={[
              styles.modalContent,
              {
                backgroundColor: c.surface,
                transform: [{ scale: contentScale }],
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={[styles.modalHeader, { borderBottomColor: c.divider }]}>
                <Text style={[styles.modalTitle, { color: c.textPrimary }]}>
                  {manageTarget === "folder" ? "フォルダ" : "タグ"}
                </Text>
                <TouchableOpacity onPress={handleModalClose}>
                  <Text style={[styles.modalClose, { color: c.primary }]}>閉じる</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.manageRow, { borderBottomColor: c.divider, backgroundColor: c.surface }]}>
                <TextInput
                  style={[styles.manageInput, { backgroundColor: c.background, borderColor: c.border, color: c.textPrimary }]}
                  value={createName}
                  onChangeText={setCreateName}
                  placeholder={manageTarget === "folder" ? "新しいフォルダ名" : "新しいタグ名"}
                  placeholderTextColor={c.textMuted}
                />
                <TouchableOpacity
                  style={[styles.manageSaveBtn, { backgroundColor: c.primaryBg }]}
                  onPress={async () => {
                    if (!createName.trim()) return;
                    if (manageTarget === "folder") {
                      const { data } = await createFolder(createName.trim());
                      if (data) setFolders((prev) => [...prev, data]);
                    } else {
                      const { data } = await createTag(createName.trim());
                      if (data) setTags((prev) => [...prev, data]);
                    }
                    setCreateName("");
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: c.primary }}>作成</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 400 }}>
                {(manageTarget === "folder" ? folders : tags).map((item) => (
                  <View key={item.id} style={[styles.manageRow, { borderBottomColor: c.divider, backgroundColor: c.surface }]}>
                    {editItem?.id === item.id ? (
                      <TextInput
                        style={[styles.manageInput, { backgroundColor: c.background, borderColor: c.border, color: c.textPrimary }]}
                        value={editItem.name}
                        onChangeText={(t) => setEditItem({ ...editItem, name: t })}
                        autoFocus
                        placeholder="名前"
                        placeholderTextColor={c.textMuted}
                      />
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                        {"color" in item && item.color && (
                          <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                        )}
                        <Text style={[styles.manageName, { color: c.textPrimary }]}>
                          {"name" in item ? (item as any).name : ""}
                        </Text>
                      </View>
                    )}
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {editItem?.id === item.id ? (
                        <>
                          <TouchableOpacity
                            style={[styles.manageSaveBtn, { backgroundColor: c.primaryBg }]}
                            onPress={async () => {
                              if (manageTarget === "folder") {
                                await updateFolder(item.id, { name: editItem.name });
                                setFolders((prev) => prev.map((f) => f.id === item.id ? { ...f, name: editItem.name } : f));
                              } else {
                                await updateTag(item.id, { name: editItem.name });
                                setTags((prev) => prev.map((t) => t.id === item.id ? { ...t, name: editItem.name } : t));
                              }
                              setEditItem(null);
                            }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: "600", color: c.primary }}>保存</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.manageCancelBtn, { backgroundColor: c.surfaceSecondary }]}
                            onPress={() => setEditItem(null)}
                          >
                            <Text style={{ fontSize: 13, fontWeight: "500", color: c.textSecondary }}>取消</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          <TouchableOpacity
                            style={[styles.manageEditBtn, { backgroundColor: c.surfaceSecondary }]}
                            onPress={() => setEditItem({ id: item.id, name: "name" in item ? (item as any).name : "" })}
                          >
                            <Ionicons name="pencil" size={14} color={c.textSecondary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.manageDeleteBtn, { backgroundColor: c.errorBg }]}
                            onPress={() => {
                              Alert.alert("削除", `「${"name" in item ? (item as any).name : ""}」を削除しますか？`, [
                                { text: "キャンセル", style: "cancel" },
                                {
                                  text: "削除",
                                  style: "destructive",
                                  onPress: async () => {
                                    if (manageTarget === "folder") {
                                      await deleteFolder(item.id);
                                      setFolders((prev) => prev.filter((f) => f.id !== item.id));
                                    } else {
                                      await deleteTag(item.id);
                                      setTags((prev) => prev.filter((t) => t.id !== item.id));
                                    }
                                  },
                                },
                              ]);
                            }}
                          >
                            <Ionicons name="trash-outline" size={14} color={c.error} />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                ))}
                {(manageTarget === "folder" ? folders : tags).length === 0 && (
                  <Text style={[styles.manageEmpty, { color: c.textMuted }]}>
                    {manageTarget === "folder" ? "フォルダがありません" : "タグがありません"}
                  </Text>
                )}
              </ScrollView>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  scroll: { marginTop: 16 },

  // ── Section Header ──
  section: {
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 24,
    marginBottom: 8,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ── Card ──
  card: {
    marginHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },

  // ── Rows ──
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  columnRow: {
    flexDirection: "column",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowText: { fontSize: 15 },
  rowValue: { fontSize: 14 },
  emailText: { fontSize: 14, marginTop: 2 },
  chevron: { fontSize: 20 },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  hintText: { fontSize: 12, lineHeight: 18 },

  // ── Buttons ──
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ef4444",
  },

  // ── Badge (Plan) ──
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeFree: { backgroundColor: "#f1f5f9" },
  badgePro: { backgroundColor: "#eef2ff" },
  badgeText: { fontSize: 12, fontWeight: "600" },
  badgeTextFree: { color: "#64748b" },
  badgeTextPro: {},

  // ── Progress Bar ──
  progressContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#f1f5f9",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#7C3AED",
    borderRadius: 3,
  },

  // ── Toggle Group ──
  toggleGroup: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 2,
  },
  toggleOption: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleOptionActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748b",
  },
  toggleTextActive: {
    color: "#7C3AED",
    fontWeight: "600",
  },

  // ── Management Modal ──
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: "88%",
    maxHeight: "60%",
    borderRadius: 20,
    paddingBottom: 32,
    // shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
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
  manageRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  manageName: { fontSize: 15, fontWeight: "500", flex: 1 },
  manageInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  manageSaveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  manageCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  manageEditBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  manageDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  manageEmpty: {
    textAlign: "center",
    paddingVertical: 32,
    fontSize: 14,
  },

  // ── Plan Cards ──
  planCard: {
    width: 200,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 12,
    marginBottom: 8,
    position: "relative",
  },
  planName: {
    fontSize: 18,
    fontWeight: "800",
  },
  planPrice: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 4,
  },
  planMinutes: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  planFeature: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  planBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
});
