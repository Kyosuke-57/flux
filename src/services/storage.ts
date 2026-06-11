import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "../lib/supabase";

const BUCKET = "recordings";

/**
 * Extract the file extension from a URI, or default to "m4a".
 */
function getExtension(uri: string): string {
  const match = uri.match(/\.(\w+)(?:\?.*)?$/);
  return match ? match[1] : "m4a";
}

/**
 * Convert a base64 string to an ArrayBuffer.
 * Uses atob (available in Hermes / React Native since RN 0.71+).
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Upload an audio recording to Supabase Storage.
 *
 * The file is stored at `recordings/{userId}/{recordingId}.{ext}` inside the
 * `recordings` bucket.
 *
 * @param userId      - The authenticated user's ID.
 * @param recordingId - UUID of the recording (will be part of the storage path).
 * @param uri         - Local file URI of the audio recording (from expo-av or document picker).
 * @returns The storage path on success, or null + error.
 */
export async function uploadAudio(
  userId: string,
  recordingId: string,
  uri: string,
): Promise<{ path: string | null; error: any }> {
  try {
    const ext = getExtension(uri);
    const filePath = `recordings/${userId}/${recordingId}.${ext}`;

    // Read the file as a base64 string
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert to ArrayBuffer for Supabase upload
    const arrayBuffer = base64ToArrayBuffer(base64);

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, arrayBuffer, {
        contentType: `audio/${ext}`,
        upsert: true,
      });

    if (error) {
      return { path: null, error };
    }

    return { path: data.path, error: null };
  } catch (err) {
    return { path: null, error: err };
  }
}

/**
 * Get the public URL for an audio file stored in Supabase Storage.
 *
 * @param path - The storage path (e.g. `recordings/{userId}/{recordingId}.m4a`).
 * @returns The public URL string.
 */
export function getAudioUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete an audio file from Supabase Storage.
 *
 * @param path - The storage path to delete.
 * @returns An object containing any error that occurred.
 */
export async function deleteAudio(
  path: string,
): Promise<{ error: any }> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  return { error };
}
