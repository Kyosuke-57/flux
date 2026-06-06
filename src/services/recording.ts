import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The current state of the recording lifecycle. */
export type RecordingState = "idle" | "recording" | "paused";

/** Result returned by `stopRecording()`. */
export interface RecordingResult {
  uri: string;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let _recording: Audio.Recording | null = null;
let _state: RecordingState = "idle";

// ---------------------------------------------------------------------------
// Permission helpers
// ---------------------------------------------------------------------------

/**
 * Request microphone permission (idempotent on iOS, always prompts on Android).
 * Returns `true` if granted, `false` otherwise.
 */
async function ensurePermissions(): Promise<boolean> {
  const { granted } = await Audio.requestPermissionsAsync();
  return granted;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start recording audio.
 *
 * Requests microphone permission and configures the audio mode before
 * creating and starting the recording.
 *
 * @param options - Optional `RecordingOptions` (defaults to `HIGH_QUALITY`).
 * @throws If permissions are denied or recording fails to start.
 */
export async function startRecording(
  options?: Audio.RecordingOptions,
): Promise<void> {
  if (_state === "recording") {
    console.warn("[recording] Already recording — ignoring startRecording()");
    return;
  }

  if (_state === "paused") {
    console.warn("[recording] Recording is paused — call resumeRecording() instead");
    return;
  }

  const hasPermission = await ensurePermissions();
  if (!hasPermission) {
    throw new Error(
      "Microphone permission was denied. Cannot start recording.",
    );
  }

  // Configure audio mode for recording
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  // Create and prepare the recording
  _recording = new Audio.Recording();
  await _recording.prepareToRecordAsync(
    options ?? Audio.RecordingOptionsPresets.HIGH_QUALITY,
  );
  await _recording.startAsync();

  _state = "recording";
}

/**
 * Stop the current recording and unload it from memory.
 *
 * @returns `{ uri, durationMs }` describing the finished recording.
 * @throws If no recording is in progress.
 */
export async function stopRecording(): Promise<RecordingResult> {
  if (!_recording) {
    throw new Error("No recording in progress. Call startRecording() first.");
  }

  const statusBefore = await _recording.getStatusAsync();
  const durationMs = statusBefore.durationMillis;

  await _recording.stopAndUnloadAsync();
  const uri = _recording.getURI();

  _recording = null;
  _state = "idle";

  // Reset audio mode so playback routes back to the speaker
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: false,
  });

  if (!uri) {
    throw new Error("Recording finished but no URI was produced.");
  }

  return { uri, durationMs };
}

/**
 * Pause the current recording.
 *
 * @throws If not currently recording.
 */
export async function pauseRecording(): Promise<void> {
  if (!_recording || _state !== "recording") {
    throw new Error("Cannot pause — no active recording.");
  }

  await _recording.pauseAsync();
  _state = "paused";
}

/**
 * Resume a paused recording.
 *
 * @throws If the recording is not in the paused state.
 */
export async function resumeRecording(): Promise<void> {
  if (!_recording || _state !== "paused") {
    throw new Error("Cannot resume — recording is not paused.");
  }

  // `startAsync()` resumes a paused recording in expo-av
  await _recording.startAsync();
  _state = "recording";
}

/**
 * Get the current recording status.
 *
 * @returns The `RecordingStatus` from expo-av, or `null` if no recording
 *          has been prepared.
 */
export async function getRecordingStatus(): Promise<Audio.RecordingStatus | null> {
  if (!_recording) {
    return null;
  }

  return await _recording.getStatusAsync();
}

/**
 * Pick an audio file from the device using the system document picker.
 *
 * @returns The picked file's URI and metadata, or `null` if the user cancelled.
 */
export async function importAudio(): Promise<DocumentPicker.DocumentPickerResult | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "audio/*",
    copyToCacheDirectory: true,
  });

  if (result.canceled) {
    return null;
  }

  return result;
}

/**
 * Read the duration (in milliseconds) of an audio file.
 *
 * Loads the file into a temporary `Audio.Sound` instance to read its
 * metadata, then immediately unloads it.
 *
 * @param uri - Local file URI of the audio file.
 * @returns The duration in milliseconds.
 * @throws If the file cannot be loaded or has no duration info.
 */
export async function getDuration(uri: string): Promise<number> {
  const { sound, status } = await Audio.Sound.createAsync(
    { uri },
    { shouldPlay: false },
  );

  let durationMs = 0;

  if (status.isLoaded && status.durationMillis != null) {
    durationMs = status.durationMillis;
  }

  await sound.unloadAsync();

  return durationMs;
}
