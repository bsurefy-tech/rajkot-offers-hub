import { BusinessesSkeleton } from "@/components/businesses/businesses-skeleton";
import { Container } from "@/components/layout/container";

export default function Loading() {
  return (
    <Container className="pt-6 pb-10 lg:pt-12 lg:pb-20">
      <BusinessesSkeleton />
    </Container>
  );
}
