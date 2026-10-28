import Image from "next/image";
import { Store } from "lucide-react";
import platformLogo from "@/assets/brand/logo.png";
import type { ZalakShop } from "@/lib/zalak/types";

/** The shop's logo, or the platform's own wordmark for the platform's posts, or a plain shop icon. Fills its (round, clipped) parent. */
export function ShopAvatar({ shop, sizes, iconSize = 18 }: { shop: ZalakShop; sizes: string; iconSize?: number }) {
  if (shop.platform) return <Image src={platformLogo} alt="" fill sizes={sizes} className="bg-white object-contain p-1" />;
  if (shop.logo) return <Image src={shop.logo} alt="" fill sizes={sizes} className="object-cover" />;
  return <Store size={iconSize} strokeWidth={1.6} aria-hidden />;
}
