import { useState, useCallback, useRef } from 'react';

export type RecordingState = 'idle' | 'recording' | 'processing' | 'done' | 'error';

export interface RecordingResult {
  uri: string;
  durationMs: number;
  transcript: string;
  confidence: number;
}

export interface UseAudioRecorderReturn {
  state: RecordingState;
  durationMs: number;
  transcript: string | null;
  result: RecordingResult | null;
  startRecording: () => void;
  stopRecording: () => void;
  reset: () => void;
}

/**
 * Mock audio recorder hook.
 * In production this would use expo-av Recording.createAsync()
 * and upload to a speech-to-text backend.
 */
export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [durationMs, setDurationMs] = useState(0);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [result, setResult] = useState<RecordingResult | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(() => {
    setState('recording');
    setDurationMs(0);
    setTranscript(null);
    setResult(null);
    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      setDurationMs(Date.now() - startTimeRef.current);
    }, 100);
  }, []);

  const stopRecording = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    const finalDuration = Date.now() - startTimeRef.current;
    setDurationMs(finalDuration);
    setState('processing');

    // Simulate transcript generation after a delay
    setTimeout(() => {
      const mockTranscript = generateMockTranscript(finalDuration);
      setTranscript(mockTranscript);
      setResult({
        uri: `file://recording_${Date.now()}.m4a`,
        durationMs: finalDuration,
        transcript: mockTranscript,
        confidence: Math.min(0.95, 0.6 + finalDuration / 60000),
      });
      setState('done');
    }, 1500);
  }, []);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setState('idle');
    setDurationMs(0);
    setTranscript(null);
    setResult(null);
  }, []);

  return {
    state,
    durationMs,
    transcript,
    result,
    startRecording,
    stopRecording,
    reset,
  };
}

function generateMockTranscript(_durationMs: number): string {
  // In production this comes from the backend speech-to-text API
  return 'Ward meeting held today. Attendance was good. We discussed water project and road repairs. Chairman approved the budget.';
}
