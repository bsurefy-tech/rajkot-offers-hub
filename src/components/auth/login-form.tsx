"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PhoneInput } from "@/components/ui/input";
import { identifyFromCookie, track } from "@/lib/analytics/client";
import { setMpinAction, startLoginAction, verifyLoginAction, type AuthResult } from "@/lib/actions/auth";
import { useT } from "@/lib/i18n/client";
import { PinInput } from "./pin-input";

type Step = "mobile" | "mpin" | "code" | "set";

/**
 * One login for everyone: mobile number → MPIN. A new number (or "Forgot MPIN")
 * verifies a WhatsApp code first and then sets a 6-digit MPIN.
 */
export function LoginForm({ next, onDone }: { next: string | null; /** In a popup: called once logged in, instead of going to another page. */ onDone?: () => void }) {
  const t = useT();
  const [step, setStep] = useState<Step>("mobile");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function run<T>(step: Step, action: () => Promise<AuthResult<T>>, onOk: (data: T) => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) onOk(result.data);
      else {
        track("login_failed", { step, reason: result.error });
        setError(t(result.error, result.vars));
      }
    });
  }

  /** Signed in: tell analytics who this is, then carry on (the page, or the popup's action). */
  function loggedIn(newUser: boolean) {
    track("login_done", { new_user: newUser, popup: Boolean(onDone) });
    identifyFromCookie();
    onDone?.();
  }

  function requestCode(force: boolean) {
    run("mobile", () => startLoginAction(mobile, force), (r) => {
      track("login_start", { method: r.method, forced: force });
      setDevCode(r.devCode);
      setStep(r.method === "mpin" && !force ? "mpin" : "code");
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "");
    if (step === "mobile") {
      const number = value("mobile");
      setMobile(number);
      run("mobile", () => startLoginAction(number), (r) => {
        track("login_start", { method: r.method, forced: false });
        setDevCode(r.devCode);
        setStep(r.method === "mpin" ? "mpin" : "code");
      });
    } else if (step === "mpin" || step === "code") {
      const method = step === "mpin" ? "mpin" : "otp";
      run(step, () => verifyLoginAction(mobile, value(step), next, Boolean(onDone)), (r) => {
        track("login_verified", { method });
        if (r.setMpin) setStep("set");
        else loggedIn(false);
      });
    } else {
      run("set", () => setMpinAction(value("mpin"), value("confirm"), next, Boolean(onDone)), () => {
        track("mpin_set", {});
        loggedIn(true);
      });
    }
  }

  const shownMobile = `+91 ${mobile.replace(/\D/g, "").slice(-10)}`;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5" key={step}>
      {step === "mobile" && (
        <Field id="mobile" label={t("Mobile number")}>
          <PhoneInput id="mobile" name="mobile" defaultValue={mobile} placeholder="98XXX XXXXX" required autoFocus />
        </Field>
      )}

      {step === "mpin" && (
        <>
          <p className="text-body-sm text-muted">{shownMobile}</p>
          <Field id="mpin" label={t("Enter your MPIN")}>
            <PinInput id="mpin" name="mpin" secret required autoFocus aria-label={t("MPIN")} />
          </Field>
        </>
      )}

      {step === "code" && (
        <>
          <p className="text-body-sm text-muted">{t("We sent a 6-digit code on WhatsApp to {mobile}.", { mobile: shownMobile })}</p>
          {devCode && <p className="rounded-lg bg-surface px-3 py-2 font-mono text-xs text-muted">Local API code: {devCode}</p>}
          <Field id="code" label={t("WhatsApp code")}>
            <PinInput id="code" name="code" required autoFocus />
          </Field>
        </>
      )}

      {step === "set" && (
        <>
          <div>
            <h2 className="text-heading font-semibold">{t("Set your MPIN")}</h2>
            <p className="mt-1 text-body-sm text-muted">{t("Create a 6-digit MPIN. You will use it to log in from now on.")}</p>
          </div>
          <Field id="mpin" label={t("New MPIN")}>
            <PinInput id="mpin" name="mpin" secret required autoFocus autoComplete="new-password" />
          </Field>
          <Field id="confirm" label={t("Confirm MPIN")}>
            <PinInput id="confirm" name="confirm" secret required autoComplete="new-password" />
          </Field>
        </>
      )}

      {error && (
        <p role="alert" className="text-body text-danger">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" block disabled={pending}>
        {step === "mpin" ? t("Log in") : step === "code" ? t("Verify") : step === "set" ? t("Save MPIN and log in") : t("Continue")}
      </Button>

      {step !== "mobile" && step !== "set" && (
        <div className="flex flex-wrap justify-between gap-2 text-body">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setStep("mobile");
            }}
            className="cursor-pointer text-muted underline hover:text-ink"
          >
            {t("Use another number")}
          </button>
          <button type="button" onClick={() => requestCode(true)} disabled={pending} className="cursor-pointer font-medium text-primary hover:underline">
            {step === "mpin" ? t("Forgot MPIN?") : t("Resend code")}
          </button>
        </div>
      )}
    </form>
  );
}
