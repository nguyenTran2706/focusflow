import { useState, useCallback, useRef } from 'react';

interface UseSaveOptions<T> {
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
}

interface UseSaveReturn<TArgs extends unknown[]> {
  save: (...args: TArgs) => Promise<void>;
  isSaving: boolean;
  error: string | null;
  lastSavedAt: number | null;
}

export function useSave<T, TArgs extends unknown[] = []>(
  saveFn: (...args: TArgs) => Promise<T>,
  options: UseSaveOptions<T> = {},
): UseSaveReturn<TArgs> {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const save = useCallback(async (...args: TArgs) => {
    setIsSaving(true);
    setError(null);
    try {
      const result = await saveFn(...args);
      setLastSavedAt(Date.now());
      optionsRef.current.onSuccess?.(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setError(message);
      optionsRef.current.onError?.(err instanceof Error ? err : new Error(message));
    } finally {
      setIsSaving(false);
    }
  }, [saveFn]);

  return { save, isSaving, error, lastSavedAt };
}
