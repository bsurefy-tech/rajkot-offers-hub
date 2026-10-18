import { Link } from "@/components/i18n/link";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";
import { ShopAvatar } from "./avatar";

/**
 * The shop's logo. When the shop has a status up it gets a ring like a stories bar (pink until watched,
 * grey after) and opens that status.
 */
export async function ShopStatusAvatar({
  logo,
  slug,
  status,
  className,
}: {
  logo?: string;
  slug: string;
  status?: { unseen: boolean };
  className?: string;
}) {
  if (!status) return <ShopAvatar logo={logo} className={className} />;
  const t = await getT();
  return (
    <Link
      href={`/status?shop=${encodeURIComponent(slug)}`}
      aria-label={t("Watch status")}
      className={cn(
        "block shrink-0 rounded-full p-[3px]",
        status.unseen ? "bg-[conic-gradient(var(--color-primary),#ff8a3d,var(--color-primary))]" : "bg-line-strong",
        className,
      )}
    >
      <ShopAvatar logo={logo} className="size-full border-[2.5px]" />
    </Link>
  );
}
