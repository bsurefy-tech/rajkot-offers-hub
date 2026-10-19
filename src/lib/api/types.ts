/** Response shapes of the BSurefy API, as far as this site reads them. */

export interface Page<T> {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

export interface Media {
  id: string;
  url: string;
  thumb_url: string | null;
}

export type PromotionType = "percent_off" | "amount_off" | "buy_x_get_y" | "free_gift" | "custom";
export type RedemptionMode = "walk_in" | "shared_code" | "unique_claim";
export type Lifecycle = "draft" | "pending_review" | "rejected" | "taken_down" | "paused" | "scheduled" | "live" | "ended" | "expired";

export interface BusinessCaption {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  area: string | null;
  logo_url: string | null;
}

export interface PromotionCard {
  id: string;
  business_id: string;
  title: string;
  slug: string;
  headline: string | null;
  value_label: string;
  type: PromotionType;
  /** Laravel's decimal cast sends it as a string ("30.00"). */
  discount_percent: number | string | null;
  /** Smallest bill the offer applies to, as a decimal string ("25000.00"). */
  min_spend: string | null;
  redemption_mode: RedemptionMode;
  starts_at: string;
  ends_at: string;
  lifecycle: Lifecycle;
  is_available_now: boolean;
  is_featured: boolean;
  saves_count: number;
  is_saved: boolean;
  cover_url: string | null;
  cover_thumb_url: string | null;
  /** Only when the feed was sent lat/lng; null when the shop has no location. */
  distance_km?: number | null;
  /** Average of the offer's approved reviews; null until it has one. */
  rating_avg?: number | null;
  rating_count?: number;
  created_at?: string;
  business: BusinessCaption;
}

export interface Branch {
  id: string;
  name: string;
  is_main: boolean;
  area: string | null;
  city: string | null;
  latitude: string | null;
  longitude: string | null;
}

export interface PromotionDetail extends PromotionCard {
  description: string | null;
  terms: string | null;
  discount_amount: number | null;
  buy_quantity: number | null;
  get_quantity: number | null;
  free_item: string | null;
  available_days: number[] | null;
  available_from: string | null;
  available_until: string | null;
  ended_at: string | null;
  categories: { id: string; slug: string; name: string }[];
  cover: Media | null;
  gallery: Media[];
  created_at: string;
  valid_at: Branch[];
  claim_refusal: string | null;
}

export interface Address {
  address_line1: string | null;
  address_line2: string | null;
  area: string | null;
  landmark: string | null;
  city: string | null;
  postal_code: string | null;
  latitude: string | null;
  longitude: string | null;
  is_primary: boolean;
}

export interface Phone {
  country_code: string;
  phone_number: string;
  full_number: string;
  is_primary: boolean;
  is_whatsapp: boolean;
  whatsapp_url: string | null;
}

export interface Link {
  type: "website" | "facebook" | "instagram" | "twitter" | "linkedin" | "youtube" | "google_maps" | "other";
  url: string;
}

/**
 * Free-form JSON on the API (it only checks for an array), so stored hours come in several shapes:
 * `{ monday: { open, close } }`, `{ mon: [{ open, close }] }` or `{ mon: ["10:00-19:00"] }`; a missing or null day is closed.
 */
export type BusinessHours = Record<string, unknown>;

/** One of a shop's outlets, with its own address and hours (`business.branches`). */
export interface BranchResource {
  id: string;
  name: string;
  is_main: boolean;
  business_hours: BusinessHours | null;
  address: Address | null;
  rating_avg?: number | null;
  rating_count?: number;
}

export interface BusinessResource {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  business_hours: BusinessHours | null;
  categories: { id: string; slug: string; name: string; is_primary?: boolean }[];
  addresses: Address[];
  phones: Phone[];
  links: Link[];
  is_contact_masked: boolean;
  logo: Media | null;
  cover: Media | null;
  gallery: Media[];
  /** Every outlet, the main one first. */
  branches?: BranchResource[];
  established_year?: number | null;
  updated_at: string;
  live_promotions_count?: number;
}

/** `GET /businesses`: a shop as a list card. */
export interface BusinessCard {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  category: { id: string; slug: string; name: string } | null;
  city: string | null;
  logo_url: string | null;
  cover_url: string | null;
  cover_thumb_url: string | null;
  rating_avg: number | null;
  rating_count: number;
  is_verified: boolean;
}

export interface CategoryChip {
  id: string;
  slug: string;
  name: string;
  icon_url: string | null;
  promotions_count: number;
}

export interface AreaCount {
  slug: string;
  name: string;
  city: string | null;
  promotions_count: number;
}

export interface ApiUser {
  id: string;
  name: string | null;
  email: string | null;
  country_code: string | null;
  phone_number: string | null;
  phone_verified_at: string | null;
  mpin_required: boolean;
}

export interface TokenPair {
  user: ApiUser;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

/** A claimed personal code (`POST /promotions/{id}/claims`, `GET /promotion-claims`). */
export interface PromotionClaim {
  id: string;
  code: string;
  qr_payload: string;
  status: "claimed" | "redeemed" | "cancelled" | "expired";
  claimed_at: string;
  expires_at: string | null;
  redeemed_at: string | null;
  promotion?: PromotionCard;
}

/** `GET /promotions/{id}/reviews` and `GET /businesses/{id}/reviews`: approved reviews only. */
export interface ReviewResource {
  id: string;
  title: string | null;
  body: string | null;
  rating: number;
  verified_redemption?: boolean;
  branch_id: string | null;
  ratings: { key: string; label: string; score: number }[];
  user: { name: string | null; is_deleted: boolean } | null;
  created_at: string;
}

/** `GET /banners?placement=…`: the slides of one placement, with the crop sizes they were made for. */
export interface BannerFeed {
  placement: string;
  display: {
    autoplay_ms: number;
    loop: boolean;
    /** The ratio each size's picture was cropped to, as "width:height" (e.g. "16:9"). */
    variants?: Partial<Record<"mobile" | "tablet" | "desktop", { aspect_ratio: string }>>;
  };
  items: {
    id: string;
    images: Partial<Record<"mobile" | "tablet" | "desktop", Media | null>>;
    link: {
      type: "none" | "web" | "screen" | "resource";
      action: { resource?: string; id?: string } | null;
      url: string | null;
    };
  }[];
}

/** The loyalty programme (`/loyalty/*`, only on a platform with the feature on). */
export type LoyaltyScope = "platform" | "global";

export interface LoyaltyWallet {
  scope: LoyaltyScope;
  name: string;
  point_label: string;
  balance: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
}

export interface LoyaltyTransaction {
  id: string;
  wallet: LoyaltyScope;
  type: "earn" | "redeem" | "adjust" | "expire" | "reverse";
  /** Signed. */
  points: number;
  balance_after: number;
  expires_at: string | null;
  business: { id: string; name: string; slug: string } | null;
  created_at: string;
}

export interface LoyaltyCode {
  code: string;
  qr_payload: string | null;
  platform: string;
}

export interface LoyaltyReward {
  id: string;
  title: string;
  description: string | null;
  value_label: string | null;
  terms: string | null;
  kind: "discount" | "free_item" | "voucher";
  points_cost: number;
  wallet: LoyaltyScope;
  stock_left: number | null;
  per_user_limit: number | null;
  claim_validity_hours: number;
  ends_at: string | null;
  /** Null when every partner outlet honours the reward. */
  redeem_at: { business_id: string; business_name: string; branch_id: string | null; branch_name: string | null }[] | null;
  redeemed_by_me: number;
  can_afford: boolean;
  can_redeem: boolean;
}

export interface LoyaltyRedemption {
  id: string;
  code: string;
  qr_payload: string | null;
  status: "issued" | "fulfilled" | "cancelled" | "expired";
  points_spent: number;
  wallet: LoyaltyScope;
  issued_at: string;
  expires_at: string | null;
  fulfilled_at: string | null;
  cancelled_at: string | null;
  reward: { id: string; title: string; value_label: string | null; terms: string | null; kind: LoyaltyReward["kind"] };
}

export interface LoyaltyScratchCard {
  id: string;
  status: "issued" | "scratched" | "expired";
  campaign: { id: string; title: string; description: string | null };
  issued_at: string;
  expires_at: string | null;
  scratched_at: string | null;
  /** Null until the card is scratched. */
  prize: { kind: "points" | "reward" | "nothing"; label: string; points: number | null; redemption: LoyaltyRedemption | null } | null;
}

export interface LoyaltyTask {
  id: string;
  type: "follow" | "join_channel" | "post_story" | "tag_us" | "custom";
  provider: string | null;
  title: string;
  description: string | null;
  target_url: string | null;
  target_handle: string | null;
  proof_required: boolean;
  needs_profile: boolean;
  has_profile: boolean;
  points: number;
  ends_at: string | null;
  status: "submitted" | "approved" | "rejected" | null;
  reject_reason: string | null;
  earned_count: number;
  can_submit: boolean;
}

export interface LoyaltyReferral {
  code: string;
  invite_url: string | null;
  deep_link: string | null;
  enabled: boolean;
  headline_points: number;
  steps: { task_id: string; title: string; points: number }[];
  max_referrals: number | null;
  referrals_left: number | null;
  apply_window_days: number;
  friends: { awaiting_verification: number; active: number; flagged: number; rejected: number; completed: number };
  earned_points: number;
  invited_by: { id: string; status: string; invited_by: string; applied_at: string; activated_at: string | null } | null;
}

/** Where tapping a status or reel goes: always one of the posting business's own things. */
export interface ContentLink {
  type: "business" | "catalog_item" | "promotion";
  id?: string;
  slug?: string;
}

export interface StatusPost {
  id: string;
  kind: "image" | "video";
  caption: string | null;
  link: ContentLink | null;
  image: { url: string; thumb_url: string | null } | null;
  video: { hls_url: string; poster_url: string | null; duration_seconds: number } | null;
  is_seen: boolean;
  is_liked: boolean;
  likes_count: number;
  expires_at: string;
  created_at: string;
}

export interface StatusAuthor {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  logo_thumb_url?: string | null;
}

/** One ring of the status tray: a business with something live. */
export interface StatusRing {
  business: StatusAuthor;
  live_count: number;
  unseen_count: number;
  has_unseen: boolean;
  latest_at: string;
  following: boolean;
}

export interface StatusTray {
  data: StatusRing[];
  /** The platform's own ring, ahead of the shops; null when it has nothing live. */
  platform: { slug: string; name: string; short_name: string; live_count: number; unseen_count: number; has_unseen: boolean; latest_at: string } | null;
}

export interface StatusPlay {
  business?: StatusAuthor;
  platform?: { slug: string; name: string; short_name: string };
  data: StatusPost[];
}

export interface ReelCard {
  id: string;
  caption: string | null;
  link: ContentLink | null;
  video: { duration_seconds: number; width: number | null; height: number | null; hls_url: string; poster_url: string | null };
  author:
    | { type: "business"; id: string; name: string; slug: string; logo_url: string | null; logo_thumb_url?: string | null }
    | { type: "platform"; slug: string; name: string; short_name: string };
  is_featured: boolean;
  likes_count: number;
  is_liked: boolean;
  is_saved: boolean;
  is_following: boolean;
  published_at: string;
}

export interface ReelPage {
  data: ReelCard[];
  /** `feed_token` keeps the order still across the pages of one scroll. */
  meta: { current_page: number; last_page: number; feed_token?: string; all_seen?: boolean };
}
