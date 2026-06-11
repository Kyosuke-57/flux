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
  title: string;
  content: string;
  original_transcript?: string;
  tags: string[];
  template_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color?: string;
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

export type SubscriptionPlan = "free" | "pro" | "byok";

export const PLAN_LIMITS: Record<SubscriptionPlan, number> = {
  free: 600, // 10 minutes in seconds
  pro: 7200, // 2 hours (120 minutes) in seconds
  byok: 7200, // 2 hours (120 minutes) in seconds
};
