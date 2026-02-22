"use client";

import { useSyncExternalStore, useCallback, type Dispatch, type SetStateAction } from "react";

function getServerSnapshot() {
  return null;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const subscribe = useCallback(
    (callback: () => void) => {
      const handler = (e: StorageEvent) => {
        if (e.key === key) callback();
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
    [key],
  );

  const getSnapshot = useCallback(() => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);

  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const value: T = raw !== null
    ? (() => { try { return JSON.parse(raw) as T; } catch { return initialValue; } })()
    : initialValue;

  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (action) => {
      const current = (() => {
        try {
          const s = localStorage.getItem(key);
          return s !== null ? (JSON.parse(s) as T) : initialValue;
        } catch {
          return initialValue;
        }
      })();
      const next = typeof action === "function"
        ? (action as (prev: T) => T)(current)
        : action;
      try {
        localStorage.setItem(key, JSON.stringify(next));
        // Trigger re-render via storage event for same-window updates
        window.dispatchEvent(new StorageEvent("storage", { key }));
      } catch {
        // ignore quota errors
      }
    },
    [key, initialValue],
  );

  const hydrated = raw !== null;

  return [value, setValue, hydrated];
}
