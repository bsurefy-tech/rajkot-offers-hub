"use server";

import { getCatalogItem, type CatalogItemDetail } from "@/lib/data/catalog";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A catalog item's details for its popup, or null when it cannot be read. */
export async function loadCatalogItemAction(businessId: string, itemId: string): Promise<CatalogItemDetail | null> {
  if (typeof businessId !== "string" || typeof itemId !== "string" || !UUID.test(businessId) || !UUID.test(itemId)) return null;
  return (await getCatalogItem(businessId, itemId)) ?? null;
}
