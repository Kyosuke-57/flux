// OTOROKU Design System
// Colors, typography, spacing, and shared styles
// Dark mode support v1

// ─── Light Theme ───────────────────────────────────────────
export const ColorsLight = {
  // Primary palette
  primary: "#7C3AED",        // Violet
  primaryLight: "#8B5CF6",   // Light violet
  primaryDark: "#6D28D9",    // Dark violet
  primaryBg: "#F5F3FF",      // Violet background (50)

  // Secondary
  secondary: "#06B6D4",      // Cyan
  secondaryLight: "#22D3EE",

  // Neutral
  white: "#FFFFFF",
  background: "#FAFAFA",
  surface: "#FFFFFF",
  surfaceSecondary: "#F8FAFC",
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  divider: "#F1F5F9",

  // Text
  textPrimary: "#1E293B",    // Slate 800
  textSecondary: "#64748B",  // Slate 500
  textMuted: "#94A3B8",      // Slate 400
  textInverse: "#FFFFFF",

  // Semantic
  success: "#22C55E",
  error: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",
  errorBg: "#FEF2F2",
  successBg: "#F0FDF4",
  warningBg: "#FFFBEB",

  // Tab bar
  tabActive: "#7C3AED",
  tabInactive: "#94A3B8",
  tabBarBg: "#FFFFFF",
  tabBarBorder: "#F1F5F9",

  // Shadows
  shadow: "#0F172A",

  // Component-specific
  toggleBg: "#E2E8F0",
  inputBg: "#F8FAFC",
  cardBorder: "#F1F5F9",

  // Overlay
  overlay: "rgba(0,0,0,0.4)",
};

// ─── Dark Theme ────────────────────────────────────────────
export const ColorsDark: typeof ColorsLight = {
  // Primary palette
  primary: "#A78BFA",        // Violet (lighter for dark bg contrast)
  primaryLight: "#C4B5FD",
  primaryDark: "#8B5CF6",
  primaryBg: "#1E1B4B",      // Violet-950

  // Secondary
  secondary: "#22D3EE",
  secondaryLight: "#67E8F9",

  // Neutral
  white: "#0F172A",          // Actually dark bg
  background: "#0F172A",     // Slate 900
  surface: "#1E293B",        // Slate 800
  surfaceSecondary: "#334155", // Slate 700
  border: "#334155",         // Slate 700
  borderLight: "#475569",    // Slate 600
  divider: "#334155",

  // Text
  textPrimary: "#F1F5F9",    // Slate 100
  textSecondary: "#94A3B8",  // Slate 400
  textMuted: "#64748B",      // Slate 500
  textInverse: "#0F172A",

  // Semantic
  success: "#4ADE80",
  error: "#F87171",
  warning: "#FBBF24",
  info: "#60A5FA",
  errorBg: "#451A1A",
  successBg: "#14532D",
  warningBg: "#451A03",

  // Tab bar
  tabActive: "#A78BFA",
  tabInactive: "#64748B",
  tabBarBg: "#1E293B",
  tabBarBorder: "#334155",

  // Shadows (dark mode shadows are subtle/different)
  shadow: "#000000",

  // Component-specific
  toggleBg: "#475569",
  inputBg: "#334155",
  cardBorder: "#334155",

  // Overlay
  overlay: "rgba(0,0,0,0.6)",
};

// ─── Export helpers ────────────────────────────────────────
export const Colors = ColorsLight; // Default alias for backwards compat
export const DarkColors = ColorsDark;

/**
 * Get the full color palette for a given mode.
 * Use this in components that need dynamic theming:
 *
 *   const c = theme(isDark);
 *   backgroundColor: c.background
 */
export function theme(isDark: boolean): typeof ColorsLight {
  return isDark ? ColorsDark : ColorsLight;
}

// ─── Rest of the design tokens (shared) ────────────────────

export const Typography = {
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "400" as const,
    color: Colors.textSecondary,
  },
  heading: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.textPrimary,
  },
  body: {
    fontSize: 15,
    fontWeight: "400" as const,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  caption: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: Colors.textMuted,
  },
  button: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.textInverse,
  },
  label: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  glass: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
};
