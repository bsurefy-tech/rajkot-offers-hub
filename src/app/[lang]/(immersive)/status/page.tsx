import type { Metadata } from "next";
import { ZalakViewer } from "@/components/zalak/viewer";
import { getT } from "@/lib/i18n/server";
import { getStatusViewer } from "@/lib/zalak/data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Status"), robots: { index: false } };
}

/** `/status?shop=<slug>` opens on that shop's status, `/status?platform=1` on the platform's own. */
export default async function StatusPage({ searchParams }: PageProps<"/[lang]/status">) {
  const { shop, platform } = await searchParams;
  const { stories, start } = await getStatusViewer({ shop: Array.isArray(shop) ? shop[0] : shop, platform: Boolean(platform) });
  return <ZalakViewer stories={stories} kind="status" start={start} />;
}
