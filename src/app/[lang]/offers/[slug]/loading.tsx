import { DetailSkeleton } from "@/components/layout/page-skeleton";

/** Shown while the slug resolves to an offer or a category list; most are offers. */
export default function Loading() {
  return <DetailSkeleton kind="offer" />;
}
