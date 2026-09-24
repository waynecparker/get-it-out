import { Directory, File, Paths } from 'expo-file-system';

// expo-audio writes each recording to <cache>/Audio/recording-<uuid>.<ext>
// on Android and <cache>/ExpoAudio/recording-<uuid>.<ext> on iOS (see
// node_modules/expo-audio's native AudioRecorder sources) — nothing else
// in this app writes into either directory. A file only survives here
// past its own session if the app was killed before start/cancel/discard
// or the post-upload cleanup ran, so at a fresh app launch every match is
// safely an abandoned temp recording, never saved-history audio (that
// lives in Supabase Storage) or an unrelated file.
const TEMP_RECORDING_SUBDIRS = ['Audio', 'ExpoAudio'];
const TEMP_RECORDING_NAME_PATTERN = /^recording-[\w-]+\.\w+$/i;

// Best-effort — runs once at app startup. Never throws, never blocks
// startup on a slow or failing filesystem call.
export function cleanupAbandonedTempRecordings() {
  for (const subdir of TEMP_RECORDING_SUBDIRS) {
    try {
      const directory = new Directory(Paths.cache, subdir);
      if (!directory.exists) continue;
      for (const entry of directory.list()) {
        if (entry instanceof File && TEMP_RECORDING_NAME_PATTERN.test(entry.name)) {
          try {
            entry.delete();
          } catch {
            // Leave it for next time rather than fail startup over one file.
          }
        }
      }
    } catch {
      // Directory may not exist yet, or listing may fail — not worth surfacing.
    }
  }
}
