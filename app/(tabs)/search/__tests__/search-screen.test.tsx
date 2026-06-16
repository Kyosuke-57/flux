/**
 * 検索画面 (SearchScreen) のユニットテスト
 *
 * @testing-library/react-native + vi.hoisted の共存で
 * esbuild パースエラーが発生するため react-test-renderer を使用。
 * React 19 では TestRenderer.create / update を act() でラップする。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { act } from "react";
import TestRenderer from "react-test-renderer";

// ─── vi.hoisted ──────────────────────────────────────────────

const mockUseAuth = vi.hoisted(() => vi.fn());
const mockUseSettings = vi.hoisted(() => vi.fn());
const mockGlobalSearch = vi.hoisted(() => vi.fn());

// ─── 外部モック ──────────────────────────────────────────────

vi.mock("expo-router", () => ({ router: { push: vi.fn() } }));
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));
vi.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

// ─── アプリ内モック ──────────────────────────────────────────

vi.mock("../../../../src/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));
vi.mock("../../../../src/contexts/SettingsContext", () => ({
  useSettings: () => mockUseSettings(),
}));
vi.mock("../../../../src/services/search", () => ({
  globalSearch: (...args: any[]) => mockGlobalSearch(...args),
}));
vi.mock("../../../../src/theme", () => ({
  theme: () => ({
    primary: "#7C3AED", primaryBg: "#F5F3FF",
    textPrimary: "#1E293B", textSecondary: "#64748B",
    textMuted: "#94A3B8", textInverse: "#FFFFFF",
    background: "#FAFAFA", surface: "#FFFFFF",
    surfaceSecondary: "#F8FAFC", border: "#E2E8F0",
    cardBorder: "#F1F5F9", warning: "#F59E0B",
    warningBg: "#FFFBEB",
  }),
  Spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  BorderRadius: { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 },
  Shadows: { sm: {}, md: {}, lg: {}, glass: {} },
}));

// LoadingSkeleton は Animated.Value を new で使うため文字列モック
vi.mock("../components/skeleton-state", () => ({
  LoadingSkeleton: "LoadingSkeleton",
  UnauthenticatedView: "UnauthenticatedView",
}));

// ─── テスト対象 import ───────────────────────────────────────

import SearchScreen from "../search-screen";

// ─── テストデータ ────────────────────────────────────────────

const mockUser = { id: "u1", email: "test@example.com" };
const defaultSettings = {
  settings: {
    isDarkMode: false,
    recordingEffect: "ripple" as const,
    hapticsEnabled: true,
    minutesGenerationMode: "manual" as const,
  },
  updateSetting: vi.fn(),
};

const minuteResult = {
  id: "m1",
  type: "minute" as const,
  title: "定例ミーティング",
  subtitle: "今週の振り返りと来週の計画",
  created_at: "2026-06-14T09:00:00Z",
  original: { id: "m1" } as any,
};

const recordingResult = {
  id: "r1",
  type: "recording" as const,
  title: "打ち合わせ録音",
  subtitle: "未文字起こし ・ 15:30",
  created_at: "2026-06-13T09:00:00Z",
  original: { id: "r1" } as any,
};

const jobResult = {
  id: "j1",
  type: "transcription_job" as const,
  title: "audio.mp3",
  subtitle: "ステータス: 完了",
  created_at: "2026-06-12T09:00:00Z",
  original: { id: "j1" } as any,
};

// ─── ヘルパー ────────────────────────────────────────────────

function findAllByType(
  root: TestRenderer.ReactTestInstance,
  type: string,
): TestRenderer.ReactTestInstance[] {
  const results: TestRenderer.ReactTestInstance[] = [];
  function walk(node: TestRenderer.ReactTestInstance) {
    if (node.type === type) results.push(node);
    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => {
        if (child && typeof child === "object" && "type" in child) {
          walk(child as unknown as TestRenderer.ReactTestInstance);
        }
      });
    }
  }
  walk(root);
  return results;
}

function renderScreen() {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(<SearchScreen />);
  });
  return renderer;
}

// ─── 共通セットアップ ─────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: mockUser, isLoading: false });
  mockUseSettings.mockReturnValue(defaultSettings);
  mockGlobalSearch.mockResolvedValue({ data: [], error: null });
});

// ─── テストケース ─────────────────────────────────────────────

describe("SearchScreen", () => {
  // ── 初期状態 ──────────────────────────────────────────────

  it("マウント後に検索バーが表示される", () => {
    const renderer = renderScreen();
    const inputs = findAllByType(renderer.root, "TextInput");
    expect(inputs.length).toBeGreaterThanOrEqual(1);
  });

  it("未認証時は検索バーが表示されない", () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    const renderer = renderScreen();
    const inputs = findAllByType(renderer.root, "TextInput");
    expect(inputs.length).toBe(0);
  });

  // ── 検索入力 → デバウンス ─────────────────────────────────

  it("テキスト入力後、デバウンスで globalSearch が呼ばれる", async () => {
    mockGlobalSearch.mockResolvedValue({ data: [], error: null });
    const renderer = renderScreen();
    const inputs = findAllByType(renderer.root, "TextInput");

    act(() => {
      inputs[0].props.onChangeText("テスト検索");
    });

    await vi.waitFor(
      () => {
        expect(mockGlobalSearch).toHaveBeenCalledWith("テスト検索");
      },
      { timeout: 1000, interval: 50 },
    );
  });

  it("空文字を入力しても globalSearch は呼ばれない", async () => {
    const renderer = renderScreen();
    const inputs = findAllByType(renderer.root, "TextInput");

    act(() => {
      inputs[0].props.onChangeText("");
    });

    await vi.waitFor(
      () => {
        expect(mockGlobalSearch).not.toHaveBeenCalled();
      },
      { timeout: 500 },
    );
  });

  // ── ローディング ──────────────────────────────────────────

  it("検索中は LoadingSkeleton が表示される", async () => {
    let resolveSearch!: (v: any) => void;
    mockGlobalSearch.mockImplementation(
      () => new Promise((resolve) => { resolveSearch = resolve; }),
    );

    const renderer = renderScreen();
    act(() => { findAllByType(renderer.root, "TextInput")[0].props.onChangeText("test"); });

    await vi.waitFor(() => {
      expect(mockGlobalSearch).toHaveBeenCalledWith("test");
    });

    // LoadingSkeleton は文字列モック → "LoadingSkeleton" ホスト要素
    await vi.waitFor(() => {
      const skeletons = findAllByType(renderer.root, "LoadingSkeleton");
      expect(skeletons.length).toBeGreaterThanOrEqual(1);
    });

    resolveSearch({ data: [], error: null });
  });

  // ── 空の検索結果 ──────────────────────────────────────────

  it("空の検索結果で該当なしメッセージが表示される", async () => {
    mockGlobalSearch.mockResolvedValue({ data: [], error: null });
    const renderer = renderScreen();

    act(() => { findAllByType(renderer.root, "TextInput")[0].props.onChangeText("xyz"); });

    await vi.waitFor(() => {
      expect(mockGlobalSearch).toHaveBeenCalledWith("xyz");
    });

    await TestRenderer.act(async () => {});

    act(() => { renderer.update(<SearchScreen />); });

    await vi.waitFor(() => {
      const allTexts = findAllByType(renderer.root, "Text");
      expect(allTexts.find((t) => t.children?.[0] === "該当する結果がありません")).toBeDefined();
      expect(allTexts.find((t) => t.children?.[0] === "キーワードを変えてみてください")).toBeDefined();
    });
  });

  // ── 検索結果の表示 ────────────────────────────────────────

  it("検索結果を種類ごとにセクション分けして表示する", async () => {
    mockGlobalSearch.mockResolvedValue({
      data: [minuteResult, recordingResult, jobResult],
      error: null,
    });

    const renderer = renderScreen();
    act(() => { findAllByType(renderer.root, "TextInput")[0].props.onChangeText("検索"); });

    await vi.waitFor(() => {
      expect(mockGlobalSearch).toHaveBeenCalledWith("検索");
    });

    await TestRenderer.act(async () => {});

    act(() => { renderer.update(<SearchScreen />); });

    await vi.waitFor(() => {
      const allTexts = findAllByType(renderer.root, "Text");

      expect(allTexts.find((t) => t.children?.[0] === "議事録")).toBeDefined();
      expect(allTexts.find((t) => t.children?.[0] === "録音")).toBeDefined();
      expect(allTexts.find((t) => t.children?.[0] === "文字起こし")).toBeDefined();

      // {section.data.length}件 → children は [1, "件"]（数値＋文字列）
      const countTexts = allTexts.filter(
        (t) => String(t.children?.[0]) === "1" && t.children?.[1] === "件",
      );
      expect(countTexts.length).toBe(3);

      expect(allTexts.find((t) => t.children?.[0] === "定例ミーティング")).toBeDefined();
      expect(allTexts.find((t) => t.children?.[0] === "打ち合わせ録音")).toBeDefined();
      expect(allTexts.find((t) => t.children?.[0] === "audio.mp3")).toBeDefined();
    });
  });

  // ── 結果タップ → 遷移 ────────────────────────────────────

  it("議事録カードの onPress が router.push(/minute/{id}) を呼ぶ", async () => {
    mockGlobalSearch.mockResolvedValue({ data: [minuteResult], error: null });
    const renderer = renderScreen();

    act(() => { findAllByType(renderer.root, "TextInput")[0].props.onChangeText("検索"); });
    await vi.waitFor(() => { expect(mockGlobalSearch).toHaveBeenCalledWith("検索"); });
    await TestRenderer.act(async () => {});
    act(() => { renderer.update(<SearchScreen />); });

    // 最後の TouchableOpacity がカード（SearchResultCard のラッパー）
    const touchables = findAllByType(renderer.root, "TouchableOpacity");
    const card = touchables[touchables.length - 1];
    expect(card).toBeDefined();

    act(() => { card.props.onPress(); });

    const { router } = await import("expo-router");
    expect(router.push).toHaveBeenCalledWith("/minute/m1");
  });

  it("録音カードの onPress が router.push(/(tabs)/recordings) を呼ぶ", async () => {
    mockGlobalSearch.mockResolvedValue({ data: [recordingResult], error: null });
    const renderer = renderScreen();

    act(() => { findAllByType(renderer.root, "TextInput")[0].props.onChangeText("検索"); });
    await vi.waitFor(() => { expect(mockGlobalSearch).toHaveBeenCalledWith("検索"); });
    await TestRenderer.act(async () => {});
    act(() => { renderer.update(<SearchScreen />); });

    const touchables = findAllByType(renderer.root, "TouchableOpacity");
    const card = touchables[touchables.length - 1];
    expect(card).toBeDefined();

    act(() => { card.props.onPress(); });

    const { router } = await import("expo-router");
    expect(router.push).toHaveBeenCalledWith("/(tabs)/recordings");
  });

  it("文字起こしジョブカードの onPress が router.push(/(tabs)/transcription-jobs) を呼ぶ", async () => {
    mockGlobalSearch.mockResolvedValue({ data: [jobResult], error: null });
    const renderer = renderScreen();

    act(() => { findAllByType(renderer.root, "TextInput")[0].props.onChangeText("検索"); });
    await vi.waitFor(() => { expect(mockGlobalSearch).toHaveBeenCalledWith("検索"); });
    await TestRenderer.act(async () => {});
    act(() => { renderer.update(<SearchScreen />); });

    const touchables = findAllByType(renderer.root, "TouchableOpacity");
    const card = touchables[touchables.length - 1];
    expect(card).toBeDefined();

    act(() => { card.props.onPress(); });

    const { router } = await import("expo-router");
    expect(router.push).toHaveBeenCalledWith("/(tabs)/transcription-jobs");
  });

  // ── クリア ────────────────────────────────────────────────

  it("クリア後に初期状態に戻る", async () => {
    mockGlobalSearch.mockResolvedValue({ data: [minuteResult], error: null });
    const renderer = renderScreen();

    act(() => { findAllByType(renderer.root, "TextInput")[0].props.onChangeText("会議"); });
    await vi.waitFor(() => { expect(mockGlobalSearch).toHaveBeenCalledWith("会議"); });
    await TestRenderer.act(async () => {});
    act(() => { renderer.update(<SearchScreen />); });

    // 結果表示を確認
    const textsAfterSearch = findAllByType(renderer.root, "Text");
    expect(textsAfterSearch.find((t) => t.children?.[0] === "定例ミーティング")).toBeDefined();

    // クリア
    act(() => { findAllByType(renderer.root, "TextInput")[0].props.onChangeText(""); });

    await vi.waitFor(() => {
      const texts = findAllByType(renderer.root, "Text");
      expect(texts.find((t) => t.children?.[0] === "すべてのデータを検索")).toBeDefined();
    });
  });

  // ── ソート ────────────────────────────────────────────────

  it("ソートフィールドをタップしてもクラッシュしない", async () => {
    mockGlobalSearch.mockResolvedValue({
      data: [minuteResult, { ...minuteResult, id: "m2", title: "朝会" }],
      error: null,
    });

    const renderer = renderScreen();
    act(() => { findAllByType(renderer.root, "TextInput")[0].props.onChangeText("検索"); });
    await vi.waitFor(() => { expect(mockGlobalSearch).toHaveBeenCalledWith("検索"); });
    await TestRenderer.act(async () => {});
    act(() => { renderer.update(<SearchScreen />); });

    // 名前ソートボタンを探す（子要素に "名前" テキストがある TouchableOpacity）
    const touchables = findAllByType(renderer.root, "TouchableOpacity");
    const nameBtn = touchables.find((t) => {
      const texts = findAllByType(t, "Text");
      return texts.some((txt) => txt.children?.[0] === "名前");
    });

    if (nameBtn) {
      act(() => { nameBtn.props.onPress(); });
    }

    act(() => { renderer.update(<SearchScreen />); });

    const texts = findAllByType(renderer.root, "Text");
    expect(texts.find((t) => t.children?.[0] === "定例ミーティング")).toBeDefined();
    expect(texts.find((t) => t.children?.[0] === "朝会")).toBeDefined();
  });
});
