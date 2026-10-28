import { Container } from "@/components/layout/container";
import { OffersSkeleton } from "@/components/offers/offers-skeleton";

export default function Loading() {
  return (
    <Container className="pt-6 pb-10 lg:pt-12 lg:pb-20">
      <OffersSkeleton subtitle />
    </Container>
  );
}
