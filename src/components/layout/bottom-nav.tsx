import { Suspense } from "react";
import { loyaltyEnabled } from "@/lib/rewards/enabled";
import { zalakEnabled } from "@/lib/zalak/data";
import { BottomNav } from "./nav-links";

async function Tabs() {
  return <BottomNav rewards={loyaltyEnabled()} zalak={await zalakEnabled().catch(() => true)} />;
}

/** The mobile tab bar with this platform's tabs: Zalak only where reels are switched on, Rewards only where the programme is. */
export function SiteBottomNav() {
  return (
    <Suspense fallback={<BottomNav rewards={loyaltyEnabled()} />}>
      <Tabs />
    </Suspense>
  );
}
