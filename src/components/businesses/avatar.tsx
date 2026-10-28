import Image from "next/image";
import { Store } from "lucide-react";
import { cn } from "@/lib/utils";

/** The shop's logo, or a store icon until it has one. */
export function ShopAvatar({ logo, className }: { logo?: string; className?: string }) {
  return (
    <span className={cn("relative flex items-center justify-center overflow-hidden rounded-full border-4 border-white bg-surface", className)}>
      {logo ? <Image src={logo} alt="" fill sizes="96px" className="object-cover" /> : <Store size={32} strokeWidth={1.6} aria-hidden />}
    </span>
  );
}
