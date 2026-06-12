/** transcription_jobs テーブルの status */
export type JobStatus = "queued" | "processing" | "completed" | "failed";

/** transcription_jobs テーブルのレコード */
export interface TranscriptionJob {
  id: string;
  recording_id: string;
  user_id: string;
  r2_key: string;
  file_name: string;
  file_size: number;
  status: JobStatus;
  total_chunks: number;
  completed_chunks: number;
  transcript: string | null;
  error_message: string | null;
  groq_retry_count: number;
  created_at: string;
  updated_at: string;
}

// API レスポンス型

export interface UploadUrlResponse {
  uploadUrl: string;
  r2Key: string;
}

export interface TranscribeResponse {
  jobId: string;
}

export interface StatusResponse {
  status: JobStatus;
  progress: string; // "3/18"
  completedChunks: number;
  totalChunks: number;
  transcript?: string;
  errorMessage?: string;
}

export interface ErrorResponse {
  error: string;
}
