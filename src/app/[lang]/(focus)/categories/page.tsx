import { CategoriesView, categoriesMetadata } from "@/components/pages/categories-view";

export function generateMetadata() {
  return categoriesMetadata();
}

export default function CategoriesPage() {
  return <CategoriesView />;
}
