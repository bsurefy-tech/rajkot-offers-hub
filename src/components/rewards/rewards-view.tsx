"use client";

import { track } from "@/lib/analytics/client";
import { Clock, Gift, History, Minus, Plus, QrCode, RotateCcw, Sparkles, Ticket } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useLogin } from "@/components/auth/login-dialog";
import { Qr } from "@/components/offers/offer-code";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/display";
import { Sheet } from "@/components/ui/sheet";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { setPoints } from "@/hooks/use-points";
import {
  giveBackRedemptionAction,
  redeemRewardAction,
  rewardsOverviewAction,
  transactionsAction,
  type Loaded,
  type RewardsOverview,
} from "@/lib/actions/rewards";
import type { LoyaltyRedemption, LoyaltyReward, LoyaltyScratchCard, LoyaltyScope, LoyaltyTransaction } from "@/lib/api/types";
import { formatShortDate } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import { EarnTab } from "./earn-tab";
import { useTaskCelebration } from "./task-celebration";
import { ScratchSheet } from "./scratch-card";

const day = (iso: string) => iso.slice(0, 10);

/** The Rewards page: balance, the code to show at the counter, scratch cards, then rewards, ways to earn and history. */
export function RewardsView({ tab }: { tab?: string }) {
  const t = useT();
  const login = useLogin();
  const [state, setState] = useState<Loaded<RewardsOverview> | null>(null);

  const load = useCallback(async () => {
    const result = await rewardsOverviewAction();
    setState(result);
    if (result.status === "ok") {
      const { wallets, cards } = result.data;
      const { total, done } = result.data.taskSummary;
      setPoints({ balance: wallets.platform.balance, label: wallets.platform.point_label, cards: cards.length, tasksLeft: total - done });
    }
  }, []);

  useEffect(() => {
    // Loads after paint; the state is set once the account answers.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (!state) return <RewardsSkeleton />;
  if (state.status === "guest") return <Intro onLogin={() => login.prompt("rewards", () => void load())} />;
  if (state.status === "off") {
    return <EmptyState icon={Gift} title={t("Rewards are not available right now.")} hint={t("Please check back soon.")} />;
  }
  if (state.status === "error") {
    return (
      <EmptyState
        icon={Gift}
        title={t("Could not load your rewards")}
        hint={t("Please try again in a moment.")}
        action={<Button onClick={() => { setState(null); void load(); }}>{t("Try again")}</Button>}
      />
    );
  }
  return <Overview data={state.data} reload={load} tab={tab} />;
}

function Intro({ onLogin }: { onLogin: () => void }) {
  const t = useT();
  const steps = [
    { icon: Ticket, title: t("Pay at a partner shop"), hint: t("Show your code at the counter with your bill.") },
    { icon: Sparkles, title: t("Collect points and scratch cards"), hint: t("Every bill adds points. Bigger bills can win a scratch card.") },
    { icon: Gift, title: t("Spend them on rewards"), hint: t("Turn points into discounts and free items at local shops.") },
  ];
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl bg-ink p-6 text-white">
        <p className="text-body-sm text-white/70">{t("Rajkot Offers Hub rewards")}</p>
        <p className="mt-1 text-page leading-snug font-semibold">{t("Earn points every time you shop local.")}</p>
        <Button className="mt-5 bg-white text-ink hover:bg-white/90" block onClick={onLogin}>
          {t("Log in to see your points")}
        </Button>
      </div>
      <ul className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
        {steps.map(({ icon: Icon, title, hint }) => (
          <li key={title} className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Icon size={20} aria-hidden />
            </span>
            <div>
              <p className="text-body font-medium">{title}</p>
              <p className="text-body-sm text-muted">{hint}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const TABS = ["rewards", "earn", "history"];

function Overview({ data, reload, tab }: { data: RewardsOverview; reload: () => Promise<void>; tab?: string }) {
  const t = useT();
  useTaskCelebration(data);
  const locale = useLocale();
  const [showCode, setShowCode] = useState(false);
  const [scratching, setScratching] = useState<LoyaltyScratchCard | null>(null);
  const wallet = data.wallets.platform;
  const [now] = useState(() => Date.now());
  const nextExpiry = data.transactions
    .filter((tx) => tx.type === "earn" && tx.expires_at && Date.parse(tx.expires_at) > now)
    .map((tx) => tx.expires_at as string)
    .sort()[0];
  const expiresSoon = nextExpiry && Date.parse(nextExpiry) - now < 30 * 86_400_000;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-line bg-white p-5 text-center">
        <p className="text-body-sm text-muted">{wallet.name}</p>
        <p className="mt-1 text-display leading-none font-semibold">{wallet.balance.toLocaleString("en-IN")}</p>
        <p className="mt-1 text-body-sm text-muted">{wallet.point_label}</p>
        {expiresSoon && (
          <p className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-caption font-medium text-primary">
            <Clock size={13} aria-hidden />
            {t("Some points expire on {date}", { date: formatShortDate(day(nextExpiry), locale) })}
          </p>
        )}
        <Button block className="mt-4" onClick={() => setShowCode(true)}>
          <QrCode size={18} aria-hidden />
          {t("Show my code")}
        </Button>
        <p className="mt-2 text-caption text-muted">{t("Show it at a partner shop when you pay, to earn points.")}</p>
      </section>

      {data.cards.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-title font-semibold">{t("Scratch cards")}</h2>
            <span className="text-body-sm text-muted">{t("{count} to scratch", { count: data.cards.length })}</span>
          </div>
          <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
            {data.cards.map((card) => (
              <li key={card.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setScratching(card)}
                  className="flex h-[104px] w-[118px] cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl bg-primary px-2 text-center text-white transition-transform hover:scale-[1.02] active:scale-95"
                >
                  <Sparkles size={24} aria-hidden />
                  <span className="text-body-sm font-semibold">{t("Scratch")}</span>
                  {card.expires_at && <span className="text-micro text-white/80">{t("Use by {date}", { date: formatShortDate(day(card.expires_at), locale) })}</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Tabs
        variant="segmented"
        defaultValue={tab && TABS.includes(tab) ? tab : undefined}
        panelClassName="pt-5"
        items={[
          { value: "rewards", label: t("Rewards"), content: <RewardsTab data={data} reload={reload} /> },
          { value: "earn", label: t("Earn"), content: <EarnTab tasks={data.tasks} summary={data.taskSummary} referral={data.referral} onChanged={() => void reload()} /> },
          { value: "history", label: t("History"), content: <HistoryTab data={data} /> },
        ]}
      />

      <CodeSheet open={showCode} onClose={() => setShowCode(false)} data={data} />
      <ScratchSheet
        key={scratching?.id}
        card={scratching}
        onClose={() => setScratching(null)}
        onScratched={() => void reload()}
      />
    </div>
  );
}

function CodeSheet({ open, onClose, data }: { open: boolean; onClose: () => void; data: RewardsOverview }) {
  const t = useT();
  return (
    <Sheet open={open} onClose={onClose} title={t("Your code")}>
      <div className="flex flex-col items-center gap-3 pb-1 text-center">
        <Qr payload={data.code.qr_payload ?? data.code.code} size={208} />
        <p className="font-mono text-3xl font-semibold tracking-[0.25em]">{data.code.code}</p>
        <p className="text-body-sm text-muted">{t("Show this to the cashier when you pay at a partner shop. They scan it or type it in, and your points are added.")}</p>
      </div>
    </Sheet>
  );
}

/* ----------------------------------------------------------------------------------------------- */

const KIND: Record<LoyaltyReward["kind"], MessageKey> = { discount: "Discount", free_item: "Free item", voucher: "Voucher" };

function RewardsTab({ data, reload }: { data: RewardsOverview; reload: () => Promise<void> }) {
  const t = useT();
  const [choosing, setChoosing] = useState<{ reward: LoyaltyReward; requestId: string } | null>(null);
  const [shown, setShown] = useState<LoyaltyRedemption | null>(null);
  const balance = data.wallets.platform.balance;
  const codes = data.redemptions.filter((r) => r.status === "issued");

  return (
    <div className="flex flex-col gap-6">
      {codes.length > 0 && (
        <section>
          <h2 className="mb-3 text-title font-semibold">{t("My reward codes")}</h2>
          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {codes.map((code) => (
              <li key={code.id}>
                <button type="button" onClick={() => setShown(code)} className="flex w-full cursor-pointer items-center gap-3 p-4 text-left hover:bg-surface">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
                    <Gift size={20} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-medium">{code.reward.title}</span>
                    <span className="block font-mono text-sm tracking-widest text-muted">{code.code}</span>
                  </span>
                  <Badge variant="neutral" size="xs">
                    {t("Ready to use")}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-title font-semibold">{t("Spend your points")}</h2>
        {data.rewards.length === 0 ? (
          <EmptyState icon={Gift} size="md" title={t("No rewards yet")} hint={t("New rewards from partner shops will show up here.")} className="rounded-2xl border border-line bg-white py-10" />
        ) : (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {data.rewards.map((reward) => (
              <li key={reward.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Gift size={22} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-body leading-snug font-semibold">{reward.title}</p>
                    <p className="text-body-sm text-muted">
                      {reward.value_label ?? t(KIND[reward.kind])}
                      {" · "}
                      {reward.redeem_at ? (reward.redeem_at.length === 1 ? reward.redeem_at[0].business_name : t("At {count} shops", { count: reward.redeem_at.length })) : t("At partner shops")}
                    </p>
                  </div>
                  <Badge variant="neutral" size="xs" className="shrink-0 bg-primary-soft text-primary">
                    {t("{points} pts", { points: reward.points_cost.toLocaleString("en-IN") })}
                  </Badge>
                </div>
                {reward.can_redeem ? (
                  <Button block onClick={() => setChoosing({ reward, requestId: crypto.randomUUID() })}>
                    {t("Redeem")}
                  </Button>
                ) : (
                  <div>
                    {!reward.can_afford && (
                      <>
                        <div
                          className="h-1.5 overflow-hidden rounded-full bg-line"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={reward.points_cost}
                          aria-valuenow={Math.min(balance, reward.points_cost)}
                          aria-label={reward.title}
                        >
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (balance / reward.points_cost) * 100)}%` }} />
                        </div>
                        <p className="mt-1.5 text-body-sm text-muted">{t("{points} more points to unlock", { points: (reward.points_cost - balance).toLocaleString("en-IN") })}</p>
                      </>
                    )}
                    {reward.can_afford && <p className="text-body-sm text-muted">{reward.stock_left === 0 ? t("Sold out") : t("You have already claimed the most allowed.")}</p>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmSheet
        key={choosing?.requestId}
        choice={choosing}
        balance={balance}
        onClose={() => setChoosing(null)}
        onRedeemed={(redemption) => {
          setChoosing(null);
          setShown(redemption);
          void reload();
        }}
      />
      <RedemptionSheet redemption={shown} onClose={() => setShown(null)} onGivenBack={() => { setShown(null); void reload(); }} />
    </div>
  );
}

function ConfirmSheet({
  choice,
  balance,
  onClose,
  onRedeemed,
}: {
  choice: { reward: LoyaltyReward; requestId: string } | null;
  balance: number;
  onClose: () => void;
  onRedeemed: (redemption: LoyaltyRedemption) => void;
}) {
  const t = useT();
  const login = useLogin();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const reward = choice?.reward;

  function redeem() {
    if (!choice) return;
    setError(null);
    start(async () => {
      const done = await redeemRewardAction(choice.reward.id, choice.requestId);
      track("reward_redeem", { result: done.ok ? "ok" : done.error === "login" ? "login" : "error" });
      if (done.ok) return onRedeemed(done.data);
      if (done.error === "login") return login.prompt("rewards", redeem);
      setError(done.detail ?? t(done.error));
    });
  }

  return (
    <Sheet
      open={Boolean(choice)}
      onClose={onClose}
      title={t("Redeem this reward?")}
      footer={
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={pending}>
            {t("Cancel")}
          </Button>
          <Button className="flex-1" onClick={redeem} disabled={pending}>
            {pending ? t("Redeeming…") : t("Redeem")}
          </Button>
        </div>
      }
    >
      {reward && (
        <div className="flex flex-col gap-3">
          <p className="text-heading font-semibold">{reward.title}</p>
          {reward.description && <p className="text-body-sm text-muted">{reward.description}</p>}
          <dl className="grid grid-cols-2 gap-3 rounded-xl bg-surface p-4 text-body">
            <dt className="text-muted">{t("Costs")}</dt>
            <dd className="text-right font-semibold">{t("{points} pts", { points: reward.points_cost.toLocaleString("en-IN") })}</dd>
            <dt className="text-muted">{t("You will have")}</dt>
            <dd className="text-right font-semibold">{t("{points} pts", { points: (balance - reward.points_cost).toLocaleString("en-IN") })}</dd>
            <dt className="text-muted">{t("Code valid for")}</dt>
            <dd className="text-right font-semibold">{t("{hours} hours", { hours: reward.claim_validity_hours })}</dd>
          </dl>
          {reward.redeem_at && (
            <p className="text-body-sm text-muted">{t("Works at: {shops}", { shops: [...new Set(reward.redeem_at.map((r) => r.business_name))].join(", ") })}</p>
          )}
          {reward.terms && <p className="text-caption text-muted">{reward.terms}</p>}
          {error && (
            <p role="alert" className="text-body text-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </Sheet>
  );
}

/** A reward code: the QR and the digits for the cashier, and a way to hand an unused one back. */
function RedemptionSheet({ redemption, onClose, onGivenBack }: { redemption: LoyaltyRedemption | null; onClose: () => void; onGivenBack: () => void }) {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [sure, setSure] = useState(false);

  function giveBack() {
    if (!redemption) return;
    start(async () => {
      const done = await giveBackRedemptionAction(redemption.id);
      if (!done.ok) return toast(done.detail ?? t(done.error === "login" ? "Log in again to continue." : done.error));
      toast(t("Code handed back. Your points are back."));
      onGivenBack();
    });
  }

  const usable = redemption?.status === "issued";
  return (
    <Sheet
      open={Boolean(redemption)}
      onClose={() => {
        setSure(false);
        onClose();
      }}
      title={redemption?.reward.title ?? ""}
      footer={
        usable &&
        (sure ? (
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setSure(false)} disabled={pending}>
              {t("Keep it")}
            </Button>
            <Button className="flex-1" onClick={giveBack} disabled={pending}>
              {t("Yes, give it back")}
            </Button>
          </div>
        ) : (
          <Button variant="ghost" block onClick={() => setSure(true)}>
            <RotateCcw size={16} aria-hidden />
            {t("Give code back for my points")}
          </Button>
        ))
      }
    >
      {redemption && (
        <div className="flex flex-col items-center gap-3 pb-1 text-center">
          {usable ? (
            <>
              {redemption.qr_payload && <Qr payload={redemption.qr_payload} size={190} />}
              <p className="font-mono text-3xl font-semibold tracking-[0.25em]">{redemption.code}</p>
              <p className="text-body-sm text-muted">{t("Show this to the cashier. It works once.")}</p>
              {redemption.expires_at && <p className="text-body-sm font-medium">{t("Use it by {date}.", { date: formatShortDate(day(redemption.expires_at), locale) })}</p>}
              {redemption.reward.terms && <p className="text-caption text-muted">{redemption.reward.terms}</p>}
            </>
          ) : (
            <p className="text-body-sm text-muted">{t("This code has been used or has expired.")}</p>
          )}
        </div>
      )}
    </Sheet>
  );
}

/* ----------------------------------------------------------------------------------------------- */

const TX_TITLE: Record<LoyaltyTransaction["type"], MessageKey> = {
  earn: "Points earned",
  redeem: "Reward redeemed",
  adjust: "Points adjusted",
  expire: "Points expired",
  reverse: "Points taken back",
};

function HistoryTab({ data }: { data: RewardsOverview }) {
  const t = useT();
  const locale = useLocale();
  const [scope, setScope] = useState<LoyaltyScope>("platform");
  const [global, setGlobal] = useState<LoyaltyTransaction[] | null>(null);
  const hasGlobal = data.wallets.global.balance > 0 || data.wallets.global.lifetime_earned > 0;
  const items = scope === "platform" ? data.transactions : (global ?? []);

  function pick(next: LoyaltyScope) {
    setScope(next);
    if (next === "global" && !global) void transactionsAction("global").then((r) => setGlobal(r.status === "ok" ? r.data : []));
  }

  return (
    <div className="flex flex-col gap-4">
      {hasGlobal && (
        <div role="group" aria-label={t("Wallet")} className="flex gap-2">
          {(["platform", "global"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={scope === s}
              onClick={() => pick(s)}
              className={cn(
                "h-[34px] cursor-pointer rounded-full border px-3.5 text-body-sm font-medium",
                scope === s ? "border-ink bg-ink text-white" : "border-input bg-white text-ink hover:border-ink",
              )}
            >
              {data.wallets[s].name} · {data.wallets[s].balance.toLocaleString("en-IN")}
            </button>
          ))}
        </div>
      )}
      {scope === "global" && global === null ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : items.length === 0 ? (
        <EmptyState icon={History} size="md" title={t("No points yet")} hint={t("Points you earn and spend will be listed here.")} className="rounded-2xl border border-line bg-white py-10" />
      ) : (
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
          {items.map((tx) => {
            const gain = tx.points > 0;
            return (
              <li key={tx.id} className="flex items-center gap-3 p-4">
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", gain ? "bg-success-soft text-success" : "bg-surface text-muted")}>
                  {gain ? <Plus size={18} aria-hidden /> : <Minus size={18} aria-hidden />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium">{tx.business && tx.type === "earn" ? t("Bill at {shop}", { shop: tx.business.name }) : t(TX_TITLE[tx.type])}</p>
                  <p className="text-body-sm text-muted">
                    {formatShortDate(day(tx.created_at), locale)}
                    {tx.expires_at && gain ? ` · ${t("expires {date}", { date: formatShortDate(day(tx.expires_at), locale) })}` : ""}
                  </p>
                </div>
                <span className={cn("shrink-0 text-body font-semibold", gain ? "text-success" : "text-ink")}>
                  {gain ? "+" : "−"}
                  {Math.abs(tx.points).toLocaleString("en-IN")}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function RewardsSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <Skeleton className="h-[238px] rounded-2xl" />
      <Skeleton className="h-11 rounded-full" />
      <Skeleton className="h-36 rounded-2xl" />
      <Skeleton className="h-36 rounded-2xl" />
    </div>
  );
}
