"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SheetFooter } from "@/components/ui/sheet";
import { changeMpinAction, deleteAccountAction, updateNameAction, type AuthResult } from "@/lib/actions/auth";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import { PinInput } from "./pin-input";

function useSubmit() {
  const t = useT();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  function run(action: () => Promise<AuthResult>, success: MessageKey, onOk?: () => void) {
    setMessage(null);
    start(async () => {
      const result = await action();
      setMessage(result.ok ? { ok: true, text: t(success) } : { ok: false, text: t(result.error, result.vars) });
      if (result.ok) onOk?.();
    });
  }
  const shown = message && (
    <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-body text-open" : "text-body text-danger"}>
      {message.text}
    </p>
  );
  return { run, pending, shown };
}

export function NameForm({ name }: { name?: string }) {
  const t = useT();
  const { run, pending, shown } = useSubmit();
  const formId = useId();
  return (
    <form
      id={formId}
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const value = String(new FormData(e.currentTarget).get("name") ?? "");
        run(() => updateNameAction(value), "Saved");
      }}
    >
      <Field id="name" label={t("Your name")}>
        <Input id="name" name="name" defaultValue={name} maxLength={80} autoComplete="name" />
      </Field>
      {shown}
      <SheetFooter>
        <Button type="submit" form={formId} block disabled={pending}>
          {t("Save")}
        </Button>
      </SheetFooter>
    </form>
  );
}

export function ChangeMpinForm() {
  const t = useT();
  const { run, pending, shown } = useSubmit();
  const [formKey, setFormKey] = useState(0);
  const formId = useId();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "");
    run(() => changeMpinAction(value("current"), value("mpin"), value("confirm")), "MPIN changed", () => setFormKey((k) => k + 1));
  }
  return (
    <div className="flex flex-col gap-3">
      <form id={formId} key={formKey} onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field id="current" label={t("Current MPIN")}>
          <PinInput id="current" name="current" secret required className="h-12 text-heading" />
        </Field>
        <Field id="mpin" label={t("New MPIN")}>
          <PinInput id="mpin" name="mpin" secret required autoComplete="new-password" className="h-12 text-heading" />
        </Field>
        <Field id="confirm" label={t("Confirm MPIN")}>
          <PinInput id="confirm" name="confirm" secret required autoComplete="new-password" className="h-12 text-heading" />
        </Field>
      </form>
      {shown}
      <SheetFooter>
        <Button type="submit" form={formId} block disabled={pending}>
          {t("Change MPIN")}
        </Button>
      </SheetFooter>
    </div>
  );
}

/** "Delete my account", behind a second confirmation. */
export function DeleteAccountForm({ startConfirming, onCancel }: { startConfirming?: boolean; onCancel?: () => void }) {
  const t = useT();
  const { run, pending, shown } = useSubmit();
  const [confirming, setConfirming] = useState(Boolean(startConfirming));
  if (!confirming) {
    return (
      <Button type="button" variant="ghost" className="self-start px-0 text-danger hover:text-danger" onClick={() => setConfirming(true)}>
        {t("Delete my account")}
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-body-sm text-muted">
        {t("This deletes your account, your name and your claimed codes. You can sign up again later with the same number.")}
      </p>
      {shown}
      <SheetFooter>
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" disabled={pending} onClick={() => (onCancel ? onCancel() : setConfirming(false))}>
            {t("Cancel")}
          </Button>
          <Button type="button" className="flex-1 bg-danger hover:bg-danger/90" disabled={pending} onClick={() => run(deleteAccountAction, "Saved")}>
            {t("Yes, delete my account")}
          </Button>
        </div>
      </SheetFooter>
    </div>
  );
}
