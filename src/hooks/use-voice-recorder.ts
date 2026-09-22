import {
  AudioQuality,
  IOSOutputFormat,
  RecordingOptions,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { File } from 'expo-file-system';
import { useCallback, useState } from 'react';

// Mono, AAC/M4A — good enough for speech, small enough to upload quickly.
const SPEECH_RECORDING_OPTIONS: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 32000,
  android: {
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
  },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.MEDIUM,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 32000,
  },
};

export type VoiceRecorderStatus = 'idle' | 'recording' | 'paused';

export function useVoiceRecorder() {
  const recorder = useAudioRecorder(SPEECH_RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 200);
  const [status, setStatus] = useState<VoiceRecorderStatus>('idle');
  const [permissionDenied, setPermissionDenied] = useState(false);

  const start = useCallback(async () => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      setPermissionDenied(true);
      return false;
    }
    setPermissionDenied(false);
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setStatus('recording');
    return true;
  }, [recorder]);

  const pause = useCallback(() => {
    recorder.pause();
    setStatus('paused');
  }, [recorder]);

  const resume = useCallback(() => {
    recorder.record();
    setStatus('recording');
  }, [recorder]);

  function deleteFileIfPresent(uri: string | null) {
    if (!uri) return;
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
    } catch {
      // Best-effort cleanup — a stray temp file isn't worth surfacing an error for.
    }
  }

  const finish = useCallback(async () => {
    await recorder.stop();
    setStatus('idle');
    return recorder.uri;
  }, [recorder]);

  const cancel = useCallback(async () => {
    await recorder.stop();
    setStatus('idle');
    deleteFileIfPresent(recorder.uri);
  }, [recorder]);

  const discard = useCallback((uri: string | null) => {
    deleteFileIfPresent(uri);
  }, []);

  return {
    status,
    durationMillis: recorderState.durationMillis ?? 0,
    permissionDenied,
    start,
    pause,
    resume,
    finish,
    cancel,
    discard,
  };
}
