"use client";
import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import { hidesPreviousData, StorefrontError, subscribeSession } from "@/lib/ecommerce/browser";

export function useStorefrontResource<T>(load: (signal: AbortSignal, refresh: boolean) => Promise<T>, cached?: T) {
  const [snapshot, setSnapshot] = useState<{ load: typeof load; data: T | null; error: unknown; pending: boolean }>(
    () => ({ load, data: cached ?? null, error: null, pending: true }),
  );
  const [revision, setRevision] = useState(0);
  const activeController = useRef<AbortController>(null);
  const lastRevision = useRef(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  const setData = useCallback((value: SetStateAction<T | null>) => {
    setSnapshot(current => {
      if (current.load !== load) return current;
      return { ...current, data: typeof value === "function" ? (value as (current: T | null) => T | null)(current.data) : value };
    });
  }, [load]);

  useEffect(() => subscribeSession(() => {
    activeController.current?.abort();
    setSnapshot({ load, data: null, error: new StorefrontError("Accedi nuovamente per continuare.", 401, "SESSION_INVALID"), pending: false });
  }), [load]);

  useEffect(() => {
    const controller = new AbortController();
    activeController.current = controller;
    const refresh = revision !== lastRevision.current;
    lastRevision.current = revision;
    setSnapshot(current => ({ load, pending: true, error: null, data: current.load === load ? current.data : null }));
    void load(controller.signal, refresh).then(data => {
      if (!controller.signal.aborted) setSnapshot({ load, data, error: null, pending: false });
    }).catch(error => {
      if (controller.signal.aborted) return;
      setSnapshot(current => ({
        load, pending: false,
        data: current.load === load && !hidesPreviousData(error) ? current.data : null,
        error: error instanceof DOMException && error.name === "AbortError" ? null : error,
      }));
    });
    return () => controller.abort();
  }, [load, revision]);

  const current = snapshot.load === load ? snapshot : { data: null, error: null, pending: true };
  return {
    data: current.data,
    error: current.error,
    busy: current.pending && current.data === null,
    refreshing: current.pending && current.data !== null,
    setData,
    reload,
  };
}
