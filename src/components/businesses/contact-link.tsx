"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useLogin } from "@/components/auth/login-dialog";
import { useToast } from "@/components/ui/toast";
import { revealContactAction } from "@/lib/actions/auth";
import { track } from "@/lib/analytics/client";
import { trackOffer } from "@/components/offers/track";
import { useT } from "@/lib/i18n/client";
import { telHref, whatsappHref } from "@/lib/utils";

/** Numbers revealed in this tab, so a second tap doesn't ask the API again. */
const revealed = new Map<string, { phone: string; whatsapp: string }>();

/**
 * Call or WhatsApp a shop. Guests see masked numbers, so the first tap opens the
 * login popup (when needed), asks the API for the real numbers, then dials or opens
 * WhatsApp. An unmasked number is a plain link.
 */
export function ContactLink({
  business,
  kind,
  number,
  masked,
  offerId,
  className,
  children,
}: {
  business: string;
  kind: "call" | "whatsapp";
  number: string;
  masked: boolean;
  /** On an offer page: the tap counts towards that offer's stats. */
  offerId?: string;
  className?: string;
  children: ReactNode;
}) {
  const t = useT();
  const login = useLogin();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [numbers, setNumbers] = useState(() => revealed.get(business));
  const open = (contact: { phone: string; whatsapp: string }) => {
    trackOffer(offerId, kind);
    if (kind === "call") window.location.href = telHref(contact.phone);
    else if (!window.open(whatsappHref(contact.whatsapp), "_blank", "noopener")) {
      // Right after logging in the browser may block the new tab: the numbers are known now, so one more tap opens it.
      toast(t("You are logged in. Tap WhatsApp again."));
    }
  };

  /** Asks the API for the real numbers (logging in first when needed), then dials or opens WhatsApp. */
  const reveal = () =>
    start(async () => {
      const result = await revealContactAction(business);
      track("contact_reveal", { shop: business, kind, result: result.ok ? "ok" : result.error === "login" ? "login" : "error" });
      if (result.ok) {
        revealed.set(business, result.data);
        setNumbers(result.data);
        open(result.data);
      } else if (result.error === "login") {
        login.prompt("shop_contact", reveal);
      } else {
        toast(t(result.error));
      }
    });

  if (!masked) {
    const href = kind === "call" ? telHref(number) : whatsappHref(number);
    return (
      <a
        href={href}
        className={className}
        onClick={() => trackOffer(offerId, kind)}
        {...(kind === "whatsapp" && { target: "_blank", rel: "noreferrer" })}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      aria-label={numbers ? undefined : t("Log in to see the number")}
      onClick={() => {
        if (numbers) return open(numbers);
        if (!login.signedIn()) return login.prompt("shop_contact", reveal);
        reveal();
      }}
    >
      {children}
    </button>
  );
}
