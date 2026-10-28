import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ZalakViewer } from "@/components/zalak/viewer";
import { getT } from "@/lib/i18n/server";
import { getReelViewer, zalakEnabled } from "@/lib/zalak/data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Zalak"), robots: { index: false } };
}

/** `/zalak?start=<id>` opens on that reel. A platform without reels has no such page. */
export default async function ZalakPage({ searchParams }: PageProps<"/[lang]/zalak">) {
  const { start } = await searchParams;
  if (!(await zalakEnabled())) notFound();
  const { feed, start: index } = await getReelViewer(Array.isArray(start) ? start[0] : start);
  return <ZalakViewer stories={feed.stories} kind="reel" start={index} feed={{ token: feed.token, hasMore: feed.hasMore }} />;
}
