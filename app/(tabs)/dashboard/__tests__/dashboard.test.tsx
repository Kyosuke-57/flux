/**
 * dashboard のテスト
 * - 空データ判定ロジックの単体テスト
 * - EmptyState コンポーネントの存在確認
 */

import { describe, it, expect, vi } from "vitest";

// @expo/vector-icons は Native モジュール依存によりテスト環境でロード不可
vi.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

// EmptyState コンポーネントの依存モック
vi.mock("expo-router", () => ({ router: { push: vi.fn() } }));
vi.mock("../../../../src/contexts/SettingsContext", () => ({
  useSettings: () => ({ settings: { isDarkMode: false }, updateSetting: vi.fn() }),
}));
vi.mock("../../../../src/animations", () => ({
  FadeInView: "FadeInView",
  useHaptics: () => ({
    lightTap: vi.fn(),
    mediumTap: vi.fn(),
    heavyTap: vi.fn(),
    errorNotification: vi.fn(),
    successNotification: vi.fn(),
  }),
}));
vi.mock("../../../../src/theme", () => ({
  theme: () => ({
    primary: "#7C3AED",
    primaryBg: "#F5F3FF",
    textInverse: "#FFFFFF",
    textPrimary: "#1E293B",
    textSecondary: "#64748B",
    textMuted: "#94A3B8",
    background: "#FAFAFA",
    border: "#E2E8F0",
    inputBg: "#F8FAFC",
    surface: "#FFFFFF",
    cardBorder: "#F1F5F9",
    secondary: "#06B6D4",
    success: "#22C55E",
    error: "#EF4444",
    warning: "#F59E0B",
    info: "#3B82F6",
    errorBg: "#FEF2F2",
  }),
  Spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  BorderRadius: { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 },
  Shadows: { sm: {}, md: {}, lg: {}, glass: {} },
}));

// ─── 空データ判定ロジック（dashboard-screen.tsx より） ──────

function isEmpty(data: {
  stats?: { totalMinutes: number; totalRecordings: number; totalFolders: number; totalTags: number };
} | null): boolean {
  if (data == null) return false;
  const s = data.stats;
  return (
    (s?.totalMinutes ?? 0) === 0 &&
    (s?.totalRecordings ?? 0) === 0 &&
    (s?.totalFolders ?? 0) === 0 &&
    (s?.totalTags ?? 0) === 0
  );
}

// ─── テスト ────────────────────────────────────────────────────

describe("isEmpty", () => {
  it("null の場合は false", () => {
    expect(isEmpty(null)).toBe(false);
  });

  it("stats が undefined の場合は true（値なし）", () => {
    expect(isEmpty({})).toBe(true);
  });

  it("全ての値が 0 の場合は true", () => {
    expect(
      isEmpty({
        stats: {
          totalMinutes: 0,
          totalRecordings: 0,
          totalFolders: 0,
          totalTags: 0,
        },
      }),
    ).toBe(true);
  });

  it("1つでも値があれば false", () => {
    expect(
      isEmpty({
        stats: {
          totalMinutes: 1,
          totalRecordings: 0,
          totalFolders: 0,
          totalTags: 0,
        },
      }),
    ).toBe(false);
  });

  it("複数の値がある場合も false", () => {
    expect(
      isEmpty({
        stats: {
          totalMinutes: 5,
          totalRecordings: 3,
          totalFolders: 2,
          totalTags: 1,
        },
      }),
    ).toBe(false);
  });
});

// ─── EmptyState の構造確認 ──────────────────────────────────

describe("EmptyState の構造", () => {
  it("コンポーネントがエクスポートされている", async () => {
    const mod = await import("../components/EmptyState");
    expect(mod.EmptyState).toBeDefined();
    expect(typeof mod.EmptyState).toBe("function");
  });

  it("コンポーネント名が EmptyState", async () => {
    const mod = await import("../components/EmptyState");
    expect(mod.EmptyState.name).toBe("EmptyState");
  });
});
