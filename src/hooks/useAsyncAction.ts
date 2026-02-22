"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface UseAsyncActionOptions<TResult> {
  onSuccess?: (result: TResult) => void;
  onError?: (error: string) => void;
  refreshOnSuccess?: boolean;
}

interface UseAsyncActionReturn<TArgs extends unknown[], TResult> {
  execute: (...args: TArgs) => Promise<TResult | undefined>;
  loading: boolean;
  error: string;
  clearError: () => void;
}

export function useAsyncAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  { onSuccess, onError, refreshOnSuccess }: UseAsyncActionOptions<TResult> = {},
): UseAsyncActionReturn<TArgs, TResult> {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      setLoading(true);
      setError("");
      try {
        const result = await action(...args);
        if (refreshOnSuccess) router.refresh();
        onSuccess?.(result);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur inattendue";
        setError(msg);
        onError?.(msg);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [action, refreshOnSuccess, onSuccess, onError, router],
  );

  const clearError = useCallback(() => setError(""), []);

  return { execute, loading, error, clearError };
}
