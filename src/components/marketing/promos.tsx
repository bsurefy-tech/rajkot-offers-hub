import Image from "next/image";
import { InstagramIcon } from "@/components/icons/brand";
import { ButtonAnchor, ButtonLink } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";
import { cn, instagramHref } from "@/lib/utils";
import { site } from "@/lib/site";

/** "For businesses" call to action with an image. */
export async function BusinessCta({ image }: { image: string }) {
  const t = await getT();
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white lg:grid lg:grid-cols-[1.1fr_1fr]">
      <div className="relative aspect-video lg:order-2 lg:aspect-auto lg:min-h-[400px]">
        <Image src={image} alt="" fill sizes="(min-width: 1024px) 570px, 100vw" className="object-cover" />
      </div>
      <div className="flex flex-col items-start gap-3 p-5 lg:justify-center lg:gap-4 lg:px-14 lg:py-16">
        <h2 className="text-page leading-[1.3] font-semibold lg:leading-tight">
          {t("Take your offer to Rajkot")}
        </h2>
        <p className="text-heading leading-relaxed text-muted">
          {t("List your shop’s offer for free and reach local customers.")}
        </p>
        <ButtonLink href="/submit-offer" className="mt-2 w-full lg:w-auto lg:px-7">
          {t("Submit an offer")}
        </ButtonLink>
      </div>
    </div>
  );
}

/** "Follow us on Instagram" band. */
export async function FollowBand({ className }: { className?: string }) {
  const t = await getT();
  return (
    <div className={cn("flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between", className)}>
      <div>
        <p className="text-page font-semibold">{t("Follow us on Instagram for daily offers")}</p>
        <p className="mt-1 text-body-sm text-muted">{site.instagram}</p>
      </div>
      <ButtonAnchor
        href={instagramHref(site.instagram)}
        target="_blank"
        rel="noreferrer"
        variant="outline"
        className="h-11 self-start lg:h-12 lg:self-auto"
      >
        <InstagramIcon size={18} />
        {t("Follow")}
      </ButtonAnchor>
    </div>
  );
}
