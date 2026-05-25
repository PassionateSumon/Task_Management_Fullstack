import { useState, useEffect, useRef, useCallback } from "react";

export function useDebounce<T>(value: T, delay: number = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 400,
): (...args: Parameters<T>) => void {
  const fnRef = useRef<T>(fn);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep fnRef current without resetting the debounce timer
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fnRef.current(...args), delay);
    },
    [delay],
  );

  // Cancel any pending timer when the component unmounts
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return debounced;
}
