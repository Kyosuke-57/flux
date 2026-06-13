export interface User {
  id: string;
  email: string;
  created_at: string;
  subscription_tier: "free" | "pro" | "byok";
  monthly_usage_seconds: number;
  monthly_limit_seconds: number;
}

export interface Recording {
  id: string;
  user_id: string;
  title: string;
  file_path: string;
  duration_seconds: number;
  created_at: string;
  transcribed: boolean;
}

export interface Minute {
  id: string;
  user_id: string;
  recording_id?: string;
  recording_path?: string;
  title: string;
  content: string;
  original_transcript?: string;
  corrected_transcript?: string;
  tags: string[];
  template_id?: string;
  folder_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export type TagStatus = "active" | "archived";

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color?: string;
  status: TagStatus;
  created_at: string;
}

export interface Template {
  id: string;
  user_id: string;
  name: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthData {
  id: string;
  user_id: string;
  provider: string;
  label: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TranscriptionJob {
  id: string;
  user_id: string;
  recording_id: string;
  r2_key: string;
  file_name: string;
  file_size: number;
  status: "queued" | "processing" | "completed" | "failed";
  total_chunks: number;
  completed_chunks: number;
  transcript?: string;
  error_message?: string;
  groq_retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  minute_id: string;
  created_at: string;
}

export interface ExportItem {
  id: string;
  user_id: string;
  minute_id?: string;
  title: string;
  format: "txt" | "md" | "pdf";
  created_at: string;
}

export type SubscriptionPlan = "free" | "pro" | "byok";

export const PLAN_LIMITS: Record<SubscriptionPlan, number> = {
  free: Infinity, // 無制限（テスト中）
  pro: Infinity,
  byok: Infinity,
};
