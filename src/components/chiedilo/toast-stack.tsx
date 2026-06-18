"use client";

import { useEffect } from "react";

export type ToastItem = {
  id: string;
  type: "success" | "warning" | "error";
  message: string;
};

export default function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timers = toasts.map((toast) =>
      setTimeout(() => {
        onDismiss(toast.id);
      }, 4200),
    );

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [toasts, onDismiss]);

  if (!toasts.length) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 bottom-28 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:bottom-4">
      {toasts.map((toast) => {
        const tone =
          toast.type === "success"
            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
            : toast.type === "warning"
              ? "border-amber-300 bg-amber-50 text-amber-800"
              : "border-rose-300 bg-rose-50 text-rose-800";

        return (
          <div key={toast.id} className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-lg ${tone}`} role="status" aria-live="polite">
            <p>{toast.message}</p>
            <button type="button" className="mt-1 text-xs underline" onClick={() => onDismiss(toast.id)}>
              Chiudi
            </button>
          </div>
        );
      })}
    </div>
  );
}
