"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { StorefrontError, subscribeSession } from "@/lib/ecommerce/browser";

export function useStorefrontResource<T>(load: (signal: AbortSignal, refresh: boolean) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(true);
  const [revision, setRevision] = useState(0);
  const active = useRef(0);
  const activeController = useRef<AbortController>(null);
  const lastRevision = useRef(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => subscribeSession(() => {
    active.current++;
    activeController.current?.abort();
    setData(null);
    setError(new StorefrontError("Accedi nuovamente per continuare.", 401, "SESSION_INVALID"));
    setBusy(false);
  }), []);
  useEffect(() => {
    const controller = new AbortController();
    activeController.current = controller;
    const request = ++active.current;
    const refresh = revision !== lastRevision.current;
    lastRevision.current = revision;
    setData(null); setError(null); setBusy(true);
    load(controller.signal, refresh).then(value => { if (!controller.signal.aborted && active.current === request) setData(value); }).catch(reason => { if (!controller.signal.aborted && active.current === request && !(reason instanceof DOMException && reason.name === "AbortError")) setError(reason); }).finally(() => { if (active.current === request) setBusy(false); });
    return () => { controller.abort(); active.current++; };
  }, [load, revision]);
  return { data, setData, error, setError, busy, reload };
}
