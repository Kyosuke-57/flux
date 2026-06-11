export type RecordingState = "idle" | "recording" | "paused";

export interface RecordingConfig {
  quality?: string;
  bitRate?: number;
  sampleRate?: number;
}

export interface RecordingResult {
  uri: string;
  durationMs: number;
  fileSize?: number;
}
