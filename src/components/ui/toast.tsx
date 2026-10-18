"use client";

import { Check } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

interface ToastOptions {
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastState extends ToastOptions {
  id: number;
  message: string;
}

const ToastContext = createContext<((message: string, options?: ToastOptions) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const counter = useRef(0);

  const show = useCallback((message: string, options?: ToastOptions) => {
    counter.current += 1;
    setToast({ id: counter.current, message, ...options });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[84px] z-50 flex justify-center px-5 lg:bottom-8"
      >
        {toast && (
          <div
            key={toast.id}
            className="pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-xl bg-ink px-4 py-3 text-body text-white shadow-float"
          >
            {!toast.actionLabel && <Check size={16} strokeWidth={2.5} aria-hidden />}
            <span>{toast.message}</span>
            {toast.actionLabel && (
              <>
                <span aria-hidden className="text-white/40">
                  •
                </span>
                <button
                  type="button"
                  className="cursor-pointer font-semibold text-white underline-offset-2 hover:underline"
                  onClick={() => {
                    toast.onAction?.();
                    setToast(null);
                  }}
                >
                  {toast.actionLabel}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </ToastContext>
  );
}

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside <ToastProvider>");
  return show;
}
