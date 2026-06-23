import type { AuthData } from "../../../../src/types";

export type SortField = "date" | "name" | "status";
export type SortDirection = "asc" | "desc";

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "****" + key.slice(-4);
}

export const PROVIDER_OPTIONS = [
  { value: "openai", label: "OpenAI", icon: "sparkles" },
  { value: "anthropic", label: "Anthropic", icon: "sparkles" },
  { value: "google", label: "Google AI", icon: "logo-google" },
  { value: "groq", label: "Groq", icon: "flash" },
  { value: "custom", label: "カスタム", icon: "key" },
] as const;

export function getProviderLabel(provider: string): string {
  const found = PROVIDER_OPTIONS.find((p) => p.value === provider);
  return found ? found.label : provider;
}

export function sortAuthData(
  list: AuthDTO[],
  field: SortField = "date",
  direction: SortDirection = "desc",
): AuthDTO[] {
  return [...list].sort((a, b) => {
    let cmp: number;
    switch (field) {
      case "date":
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case "name":
        cmp = a.label.localeCompare(b.label, "ja");
        break;
      case "status":
        cmp = Number(a.is_active) - Number(b.is_active);
        break;
    }
    return direction === "desc" ? -cmp : cmp;
  });
}

export function filterAuthData(list: AuthDTO[], query: string): AuthDTO[] {
  if (!query.trim()) return list;
  const q = query.trim().toLowerCase();
  return list.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.provider.toLowerCase().includes(q) ||
      getProviderLabel(item.provider).toLowerCase().includes(q) ||
      item.api_key.toLowerCase().includes(q),
  );
}

export type AuthDTO = AuthData;
