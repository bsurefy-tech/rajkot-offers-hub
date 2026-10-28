import { BusinessesView, businessesMetadata } from "@/components/pages/businesses-view";

export function generateMetadata() {
  return businessesMetadata();
}

export default function BusinessesPage({ searchParams }: PageProps<"/[lang]/businesses">) {
  return <BusinessesView searchParams={searchParams} />;
}
