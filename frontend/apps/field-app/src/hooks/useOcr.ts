import { useState, useCallback } from 'react';

export type OcrState = 'capture' | 'processing' | 'review' | 'error';

export interface OcrField {
  key: string;
  label: string;
  value: string;
  confidence: number; // 0..1
}

export interface OcrResult {
  uri: string;
  fields: OcrField[];
}

export interface UseOcrReturn {
  state: OcrState;
  capturedUri: string | null;
  result: OcrResult | null;
  progress: number; // 0..1
  capture: () => void;
  process: (uri: string) => void;
  confirm: (fields: OcrField[]) => void;
  retake: () => void;
  setError: (message: string) => void;
}

/**
 * Mock OCR hook.
 * In production this would use expo-camera and a backend OCR service.
 */
export function useOcr(): UseOcrReturn {
  const [state, setState] = useState<OcrState>('capture');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [progress, setProgress] = useState(0);

  const capture = useCallback(() => {
    // In production: open camera, user captures, get uri
    const mockUri = `file://photo_${Date.now()}.jpg`;
    setCapturedUri(mockUri);
    setState('capture');
  }, []);

  const process = useCallback((uri: string) => {
    setState('processing');
    setProgress(0);

    // Simulate progressive OCR processing
    let p = 0;
    const interval = setInterval(() => {
      p += 0.15;
      setProgress(Math.min(p, 1));
      if (p >= 1) {
        clearInterval(interval);
        setResult(generateMockResult(uri));
        setState('review');
      }
    }, 300);
  }, []);

  const confirm = useCallback((_fields: OcrField[]) => {
    // In production: pass confirmed fields back to the form
    setState('capture');
    setCapturedUri(null);
    setResult(null);
    setProgress(0);
  }, []);

  const retake = useCallback(() => {
    setState('capture');
    setCapturedUri(null);
    setResult(null);
    setProgress(0);
  }, []);

  const setError = useCallback(() => {
    setState('error');
  }, []);

  return {
    state,
    capturedUri,
    result,
    progress,
    capture,
    process,
    confirm,
    retake,
    setError,
  };
}

function generateMockResult(uri: string): OcrResult {
  return {
    uri,
    fields: [
      { key: 'meeting_date', label: 'Meeting Date', value: '2024-06-15', confidence: 0.94 },
      { key: 'chairperson_name', label: 'Chairperson Name', value: 'Alhaji Musa Ibrahim', confidence: 0.88 },
      { key: 'attendance', label: 'Attendance', value: '47', confidence: 0.97 },
      { key: 'agenda_items', label: 'Agenda Items', value: '4', confidence: 0.82 },
    ],
  };
}
