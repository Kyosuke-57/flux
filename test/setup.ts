/**
 * テストセットアップファイル
 * - react-native をモック（Flow型対応不可のため）
 */

import { vi } from "vitest";

vi.mock("react-native", () => ({
  Alert: { alert: vi.fn() },
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  TouchableOpacity: "TouchableOpacity",
  FlatList: "FlatList",
  ScrollView: "ScrollView",
  Modal: "Modal",
  ActivityIndicator: "ActivityIndicator",
  RefreshControl: "RefreshControl",
  StyleSheet: { create: (s: any) => s, absoluteFill: {}, absoluteFillObject: {} },
  Animated: {
    View: "Animated.View",
    Text: "Animated.Text",
    Value: vi.fn(() => ({ setValue: vi.fn(), interpolate: vi.fn() })),
    timing: vi.fn(() => ({ start: vi.fn() })),
    spring: vi.fn(() => ({ start: vi.fn() })),
    loop: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
    sequence: vi.fn(() => ({ start: vi.fn() })),
    parallel: vi.fn(() => ({ start: vi.fn() })),
    createAnimatedComponent: vi.fn(),
    FastAnimation: { setValue: vi.fn() },
  },
  Dimensions: { get: vi.fn(() => ({ width: 375, height: 812 })) },
  Platform: { OS: "ios", select: vi.fn() },
  BackHandler: { addEventListener: vi.fn(() => ({ remove: vi.fn() })) },
  NativeModules: {},
  PanResponder: {
    create: vi.fn(() => ({
      panHandlers: {},
    })),
  },
}));
