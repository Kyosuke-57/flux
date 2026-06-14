/**
 * 履歴画面 (HistoryScreen) のユニットテスト
 *
 * モック制約：
 * - @testing-library/react-native は vi.hoisted との共存で
 *   esbuild パースエラーが発生するため使用不可
 * - react-test-renderer は React 19 で非推奨のため
 *   文字列モックの子を正しく展開できない
 *
 * 上記により、レンダリング結果ではなくサービス関数の呼び出しを検証する。
 * react-test-renderer は useEffect を発火させるためだけに使用（toJSON は未使用）。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import TestRenderer from "react-test-renderer";

// ─── vi.hoisted ──────────────────────────────────────────────

const mockUseAuth = vi.hoisted(() => vi.fn());
const mockUseSettings = vi.hoisted(() => vi.fn());
const mockGetAllActivities = vi.hoisted(() => vi.fn());
const mockFilterActivities = vi.hoisted(() => vi.fn());
const mockSortActivities = vi.hoisted(() => vi.fn());

// ─── 外部モック ──────────────────────────────────────────────

vi.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));
vi.mock("expo-router", () => ({ router: { push: vi.fn() }, useFocusEffect: vi.fn() }));
vi.mock("expo-haptics", () => ({}));

// ─── アプリ内モック ──────────────────────────────────────────

vi.mock("../../../../src/contexts/AuthContext", () => ({ useAuth: () => mockUseAuth() }));
vi.mock("../../../../src/contexts/SettingsContext", () => ({ useSettings: () => mockUseSettings() }));

vi.mock("../../../../src/theme", () => ({
  theme: () => ({
    primary: "#7C3AED", primaryBg: "#F5F3FF",
    textPrimary: "#1E293B", textSecondary: "#64748B",
    textMuted: "#94A3B8", textInverse: "#FFFFFF",
    background: "#FAFAFA", border: "#E2E8F0",
    surface: "#FFFFFF", cardBorder: "#F1F5F9",
    inputBg: "#F8FAFC", success: "#22C55E",
    error: "#EF4444", warning: "#F59E0B", errorBg: "#FEF2F2",
  }),
  Spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  BorderRadius: { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 },
  Shadows: { sm: {}, md: {}, lg: {}, glass: {} },
}));

vi.mock("../../../../src/animations", () => ({
  FadeInView: "FadeInView",
  useHaptics: () => ({ lightTap: vi.fn(), mediumTap: vi.fn(), heavyTap: vi.fn(), errorNotification: vi.fn(), successNotification: vi.fn() }),
}));

vi.mock("../../../../src/components/Glass", () => ({ GlassCard: "GlassCard" }));
vi.mock("../../../../src/components/Skeleton", () => ({ HomeScreenSkeleton: "HomeScreenSkeleton" }));

vi.mock("../../../../src/services/history", () => ({
  getAllActivities: (...args: any[]) => mockGetAllActivities(...args),
  filterActivities: (...args: any[]) => mockFilterActivities(...args),
  sortActivities: (...args: any[]) => mockSortActivities(...args),
  getActivityLabel: vi.fn((t: string) => ({ minute_created: "議事録を作成", minute_edited: "議事録を編集", recording_uploaded: "録音をアップロード", transcription_job: "文字起こし", exported: "エクスポート" } as Record<string, string>)[t] ?? t),
  getActivityStatusLabel: vi.fn((s: string) => ({ completed: "完了", processing: "処理中", queued: "処理中", failed: "エラー", transcribed: "文字起こし済", pending: "未処理" })[s ?? ""] ?? s ?? ""),
}));

// ─── テスト対象 import ───────────────────────────────────────

import HistoryScreen from "../history-screen";

// ─── データ ──────────────────────────────────────────────────

const NOW = new Date("2026-06-14T12:00:00.000Z");
const d = (ms: number) => new Date(NOW.getTime() + ms).toISOString();

const activities = [
  { id: "a1", type: "minute_created", title: "月次MTG", description: "d", timestamp: d(-3600000), targetId: "m1", targetRoute: "/minute/m1" },
  { id: "a2", type: "recording_uploaded", title: "録音_001", description: "d", timestamp: d(-86400000), targetId: "r1", targetRoute: "/recording/r1", status: "transcribed" },
  { id: "a3", type: "transcription_job", title: "audio.mp3", description: "d", timestamp: d(-172800000), targetId: "j1", targetRoute: "/(tabs)/transcription-jobs", status: "completed" },
  { id: "a4", type: "exported", title: "エクスポート", description: "d", timestamp: d(-604800000), targetId: "e1", targetRoute: "/(tabs)/exports" },
];

// ─── テスト ──────────────────────────────────────────────────

describe("HistoryScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(NOW);

    mockUseAuth.mockReturnValue({ user: { id: "u1" }, isLoading: false });
    mockUseSettings.mockReturnValue({ settings: { isDarkMode: false, hapticsEnabled: true }, updateSetting: vi.fn() });
    mockGetAllActivities.mockResolvedValue({ data: [], error: null });
    mockFilterActivities.mockImplementation((x) => x);
    mockSortActivities.mockImplementation((x) => x);
  });

  describe("データ取得", () => {
    it("マウント後に getAllActivities が呼ばれる", async () => {
      TestRenderer.create(<HistoryScreen />);

      await vi.waitFor(() => {
        expect(mockGetAllActivities).toHaveBeenCalled();
      });
    });

    it("データ取得後に filterActivities と sortActivities が呼ばれる", async () => {
      mockGetAllActivities.mockResolvedValue({ data: activities, error: null });

      TestRenderer.create(<HistoryScreen />);

      await vi.waitFor(() => {
        expect(mockFilterActivities).toHaveBeenCalled();
      });
      await vi.waitFor(() => {
        expect(mockSortActivities).toHaveBeenCalled();
      });
    });

    it("filterActivities に activities データと query が渡される", async () => {
      mockGetAllActivities.mockResolvedValue({ data: activities, error: null });

      TestRenderer.create(<HistoryScreen />);

      await vi.waitFor(() => {
        expect(mockFilterActivities).toHaveBeenCalledWith(
          expect.arrayContaining([expect.objectContaining({ id: "a1" })]),
          expect.any(String),
        );
      });
    });

    it("空データの場合に getAllActivities が呼ばれる", async () => {
      mockGetAllActivities.mockResolvedValue({ data: [], error: null });

      TestRenderer.create(<HistoryScreen />);

      await vi.waitFor(() => {
        expect(mockGetAllActivities).toHaveBeenCalled();
      });
    });
  });

  describe("エラー", () => {
    it("getAllActivities が error を返してもクラッシュしない", async () => {
      mockGetAllActivities.mockResolvedValue({
        data: null,
        error: new Error("Network error"),
      });

      TestRenderer.create(<HistoryScreen />);

      await vi.waitFor(() => {
        expect(mockGetAllActivities).toHaveBeenCalled();
      });
    });

    it("getAllActivities が例外を投げてもクラッシュしない", async () => {
      mockGetAllActivities.mockRejectedValue(new Error("Unexpected error"));

      TestRenderer.create(<HistoryScreen />);

      await vi.waitFor(() => {
        expect(mockGetAllActivities).toHaveBeenCalled();
      });
    });
  });


});
