import React, { useState, useEffect, useCallback } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";

import { useAuth } from "../../src/contexts/AuthContext";
import { signOut } from "../../src/services/auth";
import { getSubscriptionStatus } from "../../src/services/subscription";
import { getAllTemplates } from "../../src/services/templates";
import { Colors } from "../../src/theme";

const SECURE_STORE_API_KEY = "openrouter_api_key";

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

  // Subscription state
  const [subscription, setSubscription] = useState<{
    plan: string;
    usageSeconds: number;
    limitSeconds: number;
  } | null>(null);
  const [subLoading, setSubLoading] = useState(true);

  // API key state
  const [apiKey, setApiKey] = useState("");
  const [apiKeyDirty, setApiKeyDirty] = useState(false);
  const [apiKeyLoading, setApiKeyLoading] = useState(true);

  // Language detection
  const [languageAuto, setLanguageAuto] = useState(true);

  // Offline mode
  const [offlineMode, setOfflineMode] = useState(false);

  // Templates
  const [templateCount, setTemplateCount] = useState(0);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  // Load persisted API key
  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(SECURE_STORE_API_KEY);
        if (stored) setApiKey(stored);
      } catch {
        // SecureStore may fail in some environments
      } finally {
        setApiKeyLoading(false);
      }
    })();
  }, []);

  // Save API key when it changes (debounced via blur or on end editing)
  const saveApiKey = useCallback(async (key: string) => {
    try {
      if (key.trim()) {
        await SecureStore.setItemAsync(SECURE_STORE_API_KEY, key.trim());
      } else {
        await SecureStore.deleteItemAsync(SECURE_STORE_API_KEY);
      }
    } catch (e) {
      Alert.alert("エラー", "APIキーの保存に失敗しました");
    }
  }, []);

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

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/(tabs)");
    } catch {
      Alert.alert("エラー", "ログアウトに失敗しました");
    }
  };

  const handleApiKeyBlur = () => {
    if (apiKeyDirty) {
      saveApiKey(apiKey);
      setApiKeyDirty(false);
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
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Text style={styles.title}>設定</Text>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ─── アカウント ─── */}
        <Text style={styles.section}>アカウント</Text>
        <View style={styles.card}>
          {authLoading ? (
            <View style={styles.row}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : user ? (
            <>
              <View style={styles.row}>
                <View>
                  <Text style={styles.rowText}>ログイン中</Text>
                  <Text style={styles.emailText}>{user.email}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.row} onPress={handleSignOut}>
                <Text style={styles.signOutText}>ログアウト</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push("/(auth)/login")}
            >
              <Text style={styles.primaryButtonText}>サインイン</Text>
              <Text style={styles.chevron}>→</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ─── サブスクリプション ─── */}
        <Text style={styles.section}>サブスクリプション</Text>
        <View style={styles.card}>
          {subLoading ? (
            <View style={styles.row}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : subscription ? (
            <>
              <View style={styles.row}>
                <Text style={styles.rowText}>現在のプラン</Text>
                <View
                  style={[
                    styles.badge,
                    subscription.plan === "pro" || subscription.plan === "byok"
                      ? styles.badgePro
                      : styles.badgeFree,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      subscription.plan === "pro" || subscription.plan === "byok"
                        ? styles.badgeTextPro
                        : styles.badgeTextFree,
                    ]}
                  >
                    {planLabel(subscription.plan)}
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.rowText}>使用量</Text>
                <Text style={styles.rowValue}>
                  {formatTime(subscription.usageSeconds)} /{" "}
                  {formatLimit(subscription.limitSeconds)}
                </Text>
              </View>
              {subscription.limitSeconds !== Infinity && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(
                            (subscription.usageSeconds /
                              subscription.limitSeconds) *
                              100,
                            100
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              )}
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.row}
                onPress={() => Alert.alert("管理", "サブスクリプション管理 - 準備中")}
              >
                <Text style={styles.rowText}>サブスクリプション管理</Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.row}>
              <Text style={styles.rowValue}>サインインしてサブスクリプション詳細を表示</Text>
            </View>
          )}
        </View>

        {/* ─── 文字起こし ─── */}
        <Text style={styles.section}>文字起こし</Text>
        <View style={styles.card}>
          {/* API Key */}
          <View style={styles.columnRow}>
            <Text style={styles.rowText}>OpenRouter APIキー</Text>
            {apiKeyLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <TextInput
                style={styles.apiKeyInput}
                value={apiKey}
                onChangeText={(t) => {
                  setApiKey(t);
                  setApiKeyDirty(true);
                }}
                onBlur={handleApiKeyBlur}
                placeholder="sk-..."
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
            )}
          </View>
          <View style={styles.divider} />

          {/* Language Detection */}
          <View style={styles.row}>
            <Text style={styles.rowText}>言語</Text>
            <TouchableOpacity
              style={styles.toggleGroup}
              onPress={() => setLanguageAuto(!languageAuto)}
            >
              <View
                style={[
                  styles.toggleOption,
                  languageAuto && styles.toggleOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.toggleText,
                    languageAuto && styles.toggleTextActive,
                  ]}
                >
                  自動
                </Text>
              </View>
              <View
                style={[
                  styles.toggleOption,
                  !languageAuto && styles.toggleOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.toggleText,
                    !languageAuto && styles.toggleTextActive,
                  ]}
                >
                  手動
                </Text>
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />

          {/* Offline Mode */}
          <View style={styles.row}>
            <Text style={styles.rowText}>オフラインモード</Text>
            <Switch
              value={offlineMode}
              onValueChange={setOfflineMode}
              trackColor={{ false: "#e2e8f0", true: "#c7d2fe" }}
              thumbColor={offlineMode ? Colors.primary : "#fff"}
            />
          </View>
        </View>

        {/* ─── テンプレート ─── */}
        <Text style={styles.section}>テンプレート</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowText}>保存済みテンプレート</Text>
            {templatesLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.rowValue}>{templateCount}</Text>
            )}
          </View>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              Alert.alert(
                "テンプレート",
                `テンプレートが ${templateCount} 個あります。管理機能は準備中です。`
              )
            }
          >
            <Text style={styles.rowText}>テンプレート管理</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ─── アプリ情報 ─── */}
        <Text style={styles.section}>アプリ情報</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowText}>バージョン</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  scroll: { marginTop: 16 },

  // ── Section Header ──
  section: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    paddingHorizontal: 24,
    marginBottom: 8,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ── Card ──
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    overflow: "hidden",
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
  rowText: { fontSize: 15, color: "#0f172a" },
  rowValue: { fontSize: 14, color: "#94a3b8" },
  emailText: { fontSize: 14, color: Colors.primary, marginTop: 2 },
  chevron: { fontSize: 20, color: "#94a3b8" },
  divider: {
    height: 1,
    backgroundColor: "#f8fafc",
    marginHorizontal: 16,
  },

  // ── Buttons ──
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.primary,
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
  badgeTextPro: { color: Colors.primary },

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
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },

  // ── API Key Input ──
  apiKeyInput: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#fafafa",
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
    color: Colors.primary,
    fontWeight: "600",
  },
});
