"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@/components/i18n/link";
import { Sheet } from "@/components/ui/sheet";
import { useT } from "@/lib/i18n/client";
import { signedInHint } from "@/lib/auth/hint";
import { LoginForm } from "./login-form";

interface Login {
  /** Does the visitor look signed in? (A hint; the API still decides.) */
  signedIn: () => boolean;
  /** Opens the login popup on this page; `onDone` runs once they are logged in. */
  prompt: (onDone?: () => void) => void;
}

const LoginContext = createContext<Login | null>(null);

/**
 * Lets any button ask the visitor to log in without leaving the page: a popup with the usual
 * mobile → MPIN form, then the action they tapped carries on.
 */
export function LoginProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  // Bumped on every opening so the form starts again from the mobile step.
  const [round, setRound] = useState(0);
  const pending = useRef<(() => void) | undefined>(undefined);

  const prompt = useCallback((onDone?: () => void) => {
    pending.current = onDone;
    setRound((n) => n + 1);
    setOpen(true);
  }, []);

  const value = useMemo<Login>(() => ({ signedIn: signedInHint, prompt }), [prompt]);

  function done() {
    const next = pending.current;
    pending.current = undefined;
    setOpen(false);
    next?.();
  }

  return (
    <LoginContext value={value}>
      {children}
      <Sheet open={open} onClose={() => setOpen(false)} title={t("Log in to continue")}>
        <p className="mb-5 text-body-sm text-muted">{t("Use your mobile number. The first time, we send you a code on WhatsApp.")}</p>
        {open && <LoginForm key={round} next={null} onDone={done} />}
        <p className="mt-6 text-caption leading-relaxed text-muted">
          {t("By continuing, you agree to our terms and privacy policy.")}{" "}
          <Link href="/terms" className="underline hover:text-ink">
            {t("Terms of use")}
          </Link>
          {" · "}
          <Link href="/privacy" className="underline hover:text-ink">
            {t("Privacy policy")}
          </Link>
        </p>
      </Sheet>
    </LoginContext>
  );
}

export function useLogin() {
  const login = useContext(LoginContext);
  if (!login) throw new Error("useLogin must be used inside <LoginProvider>");
  return login;
}
