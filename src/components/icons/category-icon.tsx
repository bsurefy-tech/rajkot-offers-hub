import {
  Candy,
  Car,
  Coffee,
  Dumbbell,
  Gem,
  Gift,
  GraduationCap,
  HeartPulse,
  Pizza,
  Plane,
  Scissors,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Sofa,
  Ticket,
  Utensils,
  Wrench,
  type LucideProps,
} from "lucide-react";
import type { CategoryIcon as CategoryIconName } from "@/types";

const icons = {
  utensils: Utensils,
  shirt: Shirt,
  scissors: Scissors,
  smartphone: Smartphone,
  dumbbell: Dumbbell,
  sofa: Sofa,
  wrench: Wrench,
  gift: Gift,
  ticket: Ticket,
  "graduation-cap": GraduationCap,
  car: Car,
  coffee: Coffee,
  "shopping-bag": ShoppingBag,
  pizza: Pizza,
  "heart-pulse": HeartPulse,
  gem: Gem,
  candy: Candy,
  plane: Plane,
  "shopping-basket": ShoppingBasket,
} satisfies Record<CategoryIconName, unknown>;

export function CategoryIcon({ name, ...props }: LucideProps & { name: CategoryIconName }) {
  const Icon = icons[name];
  return <Icon strokeWidth={1.6} aria-hidden {...props} />;
}
