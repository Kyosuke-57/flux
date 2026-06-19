import { useSettings } from "../contexts/SettingsContext";
import { theme } from "../theme";

/**
 * 現在のテーマ設定（ライト/ダーク）に基づいたカラーパレットを返すフック。
 *
 * 使用例:
 *   const c = useThemeColors();
 *   backgroundColor: c.background
 */
export function useThemeColors(): ReturnType<typeof theme> {
  const { settings } = useSettings();
  return theme(settings.isDarkMode);
}
