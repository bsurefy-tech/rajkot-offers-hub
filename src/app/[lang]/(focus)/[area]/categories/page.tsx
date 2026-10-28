import { CategoriesView, categoriesMetadata } from "@/components/pages/categories-view";

export function generateMetadata() {
  return categoriesMetadata();
}

export default async function AreaCategoriesPage({ params }: PageProps<"/[lang]/[area]/categories">) {
  return <CategoriesView area={(await params).area} />;
}
