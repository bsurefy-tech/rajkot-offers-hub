/**
 * Public URLs of shops and offers. A shop lives at "/<shop>" and its offers at
 * "/<shop>/<offer>"; the proxy maps these onto the pages that render them, and
 * sends the older "/businesses/<shop>" and "/offers/<slug>-<id>" links here.
 */
export function shopPath(shop: string) {
  return `/${shop}`;
}

/** An offer's address: its shop and its own slug, with no id ("/grip-tyres/10-off-a-set-of-four-tyres"). */
export function offerPath(offer: { businessSlug: string; urlSlug: string }) {
  return `/${offer.businessSlug}/${offer.urlSlug}`;
}
