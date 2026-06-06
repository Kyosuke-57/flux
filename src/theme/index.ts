// OTOROKU Design System
// Colors, typography, spacing, and shared styles

export const Colors = {
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

  // Tab bar
  tabActive: "#7C3AED",
  tabInactive: "#94A3B8",
  tabBarBg: "#FFFFFF",
  tabBarBorder: "#F1F5F9",

  // Shadows
  shadow: "#7C3AED",
};

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
};
