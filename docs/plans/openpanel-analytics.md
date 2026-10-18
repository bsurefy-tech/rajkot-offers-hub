# Plan: OpenPanel analytics (self-hosted)

Status: Stages A to C built and checked on `feature/openpanel` (see section 8); D and E are not started. Branch when starting: `feature/openpanel` from `develop`, squash PR into `develop`.

Goal: every kind of analytics for the site in one self-hosted OpenPanel project: traffic (page views, sources,
devices, places), product events (search, filters, offers, shops, Zalak, rewards), funnels (login, claim code,
follow, contact), user profiles and per-shop groups, errors, and optionally session replay.

> AGENTS.md: this is not the Next.js you know. Before writing any code read the route handler, `next/script` and
> proxy docs in `node_modules/next/dist/docs/01-app/` and check `@openpanel/nextjs` against Next 16.4.

## 0. Facts about this site that shape the plan

- Next.js 16.4 on **Cloudflare Workers** (OpenNext). Root layout is `force-dynamic`; no Cache Components.
- `src/proxy.ts` rewrites every page to `/<lang>/...` (English has no prefix in the URL), shop and offer URLs are
  `/<shop>` and `/<shop>/<offer>`. Its matcher skips `api`, `_next` and files with an extension, so an
  `/api/op/...` route is not touched by it.
- No analytics today. Offer stats go to the Laravel API through one chokepoint:
  `trackOffer()` in `src/components/offers/track.tsx` → `trackOfferAction` (`detail_view`, `call`, `whatsapp`,
  `directions`, `share`). Those stay (they feed the shop owner's stats); OpenPanel is added beside them.
- Login is mobile number + OTP/MPIN (`src/lib/actions/auth.ts`). Guests carry a random device-key cookie
  (`DEVICE_COOKIE`). Saves and follows go through `useToggleSave` (`src/components/offers/save-button.tsx`).
- Settings live in `.env.production` (committed, non-secret) and one Cloudflare secret (`API_FRONTEND_KEY`).
- Privacy page (`src/app/[lang]/(main)/privacy/page.tsx`) lists cookies; it must be updated.

## 1. Decisions to confirm before starting

**Given so far (2026-10-19):** `apiUrl` = `https://analytics.surefy.dev/api` (note the `/api` suffix: the proxy and
the server SDK both use this value as is), `clientId` = `23b4a667-7364-49a8-97ab-319b32d007a2`. That is one project;
use it for production only, and create separate projects (new client IDs) for staging and local (question 2).
Items 1 and 2 below are answered; the rest are still the recommendations until you say otherwise.

| # | Question | Recommendation |
|---|---|---|
| 1 | OpenPanel URL (e.g. `https://op.example.com`) and version (the 2.x self-host)? | Needed for `apiUrl` and the Caddy/Nginx CORS check |
| 2 | Three projects (production, staging, local) or one? | Three, so test traffic never pollutes production |
| 3 | Identify logged-in users? | Yes, with the API's opaque user id only. **Never** the mobile number, name or MPIN-related data |
| 4 | Session replay? | Off at first. Turn on later with `maskAllInputs` (default) because login/MPIN fields are on the site |
| 5 | Consent banner? | OpenPanel is first-party and cookieless by default, so no banner; state it on the privacy page. Revisit if replay is turned on (India's DPDP Act) |
| 6 | Send the owner mobile app / Laravel API events to the same OpenPanel too? | Out of scope here; ask later. A separate project keeps client IDs clean |
| 7 | Gujarati | Not proposed (parked). Events carry `lang` anyway, so it works if it returns |
| 8 | Send the raw search text (`q`) for a "top searches" report? | Not at first: send length and result count only, add `q` if you want it and say so on the privacy page |

## 2. Architecture

```
Browser ──► /api/op/*  (our Worker, route handler = first-party proxy, blocks ad-blocker rules)
                 └──► https://<your-openpanel>/api   (forwards IP + user-agent)
Server actions / route handlers ──► server SDK (clientId + clientSecret) ──► OpenPanel
```

- **Client SDK**: `@openpanel/nextjs` `OpenPanelComponent` in the root layout, pointed at the same-origin proxy
  (`apiUrl="/api/op"`, `scriptUrl="/api/op/op1.js"`). Auto page views, outgoing links, `data-track` attributes.
- **Proxy route** `src/app/api/op/[...op]/route.ts`: `export const { GET, POST } = createRouteHandler()`.
  Must verify on Workers (see risks) and that visitor IP and geo reach OpenPanel (we forward `cf-connecting-ip`;
  `visitorIp()` in `src/lib/api/visitor.ts` already knows the precedence).
- **Server SDK**: events that must not be lost to ad-blockers or tab closes (code claimed, login success, API
  failures). On Workers wrap sends in `getCloudflareContext().ctx.waitUntil(...)` so the worker does not end first.
- **One typed wrapper**, so names and properties stay consistent and everything no-ops when analytics is off:
  - `src/lib/analytics/events.ts`: the event catalogue (`type EventMap = { search: { q_length: number; ... } }`).
  - `src/lib/analytics/client.ts`: `track<E extends keyof EventMap>(name: E, props: EventMap[E])` over
    `useOpenPanel`/`window.op`, a no-op when disabled or on the server.
  - `src/lib/analytics/server.ts`: same signature over the server SDK, with `waitUntil`.
  - Call sites never import the SDK directly.

### Environment

| Variable | Where | Value |
|---|---|---|
| `OPENPANEL_API_URL` | `.env.production`, `.env.example` | `https://analytics.surefy.dev/api` (non-secret) |
| `OPENPANEL_CLIENT_ID` | `.env.production` | `23b4a667-7364-49a8-97ab-319b32d007a2` (public by design, it ships to the browser). `.env.example` gets a placeholder |
| `OPENPANEL_CLIENT_SECRET` | `wrangler secret put`, `.dev.vars.example` | **server only**, never `NEXT_PUBLIC_` |
| `OPENPANEL_ENABLED` | `.env.production` | `true` in production; unset locally so `pnpm dev` sends nothing |

Add the OpenPanel origin to the project's allowed origins in OpenPanel (the proxy makes browser CORS moot, but
server and direct calls still check it). Document all four in README and `.env.example`.

## 3. What to track

### 3.1 Automatic (no code beyond the layout)

Page views, sessions, visit duration, entry/exit pages, referrers and UTM, device/browser/OS, country/region/city,
outgoing link clicks (`trackOutgoingLinks`: WhatsApp, maps, shop websites), and `data-track` clicks for simple
buttons.

**Global properties** (set once, sent with every event; keep cardinality low):

| Property | Value |
|---|---|
| `lang` | `en` / `gu` |
| `area` | area slug from the URL or saved location, when set |
| `page_type` | `home`, `offers`, `offer`, `shop`, `category`, `categories`, `zalak`, `status`, `rewards`, `account`, `login`, `contact`, `how-it-works`, `legal`, `submit-offer`, `not-found`. Needed because `/<shop>/<offer>` URLs are unbounded, so reports group by template, not path |
| `signed_in` | boolean |
| `display` | `standalone` (installed PWA, `manifest.ts`) or `browser` |

`page_type` comes from one small client component (`AnalyticsContext`) that maps `usePathname()` through the same
route knowledge as `src/lib/known-paths.ts`, and calls `setGlobalProperties` on navigation.

### 3.2 Event catalogue

Names are `snake_case`, past tense is avoided: `object_action`. Values are strings, numbers or booleans only.

**Discovery**

| Event | When | Properties | Where |
|---|---|---|---|
| `search` | results page loads with `q` | `q_length`, `results`, `area`, `category` (raw query text only if you accept it, see risks) | a `TrackSearch` client component in `offers-view.tsx` |
| `filter_apply` | a chip or menu changes | `filter` (`category`, `sort`, `distance`, `open_now`…), `value` | `sticky-chips.tsx`, `chip-menu.tsx`, `offers-explorer.tsx` |
| `category_open` | category tile tapped | `category` | `category-tiles.tsx` |
| `area_select` | area chosen | `area`, `source` (`picker`, `link`) | `location-picker.tsx`, `area-links.tsx` |
| `location_request` | GPS tapped | `result` (`granted`, `denied`, `error`) | `near-me.tsx`, `near-you-prompt.tsx` |
| `view_toggle` | list ↔ map | `view` | `view-toggle.tsx`, `map-drawer.tsx` |
| `banner_click` / `hero_click` | home banners and promos | `slot`, `target` | `hero-slider.tsx`, `promos.tsx` |
| `offer_card_click` | card tapped | `offer_id`, `position`, `list` (`home`, `search`, `near_you`, `saved`…) | `offer-card.tsx` |

**Offer and shop**

| Event | When | Properties |
|---|---|---|
| `offer_view` | detail view (reuse `TrackOfferView`) | `offer_id`, `shop`, `category`, `has_code`, `discount_type` |
| `offer_contact` | call / WhatsApp / directions | `offer_id`, `shop`, `kind`; server-side counterpart already exists in `trackOffer()` |
| `offer_share` | share tapped | `offer_id`, `method` (`native`, `copy`, `whatsapp`) |
| `offer_code_reveal` / `offer_code_claim` | shared-code reveal, personal claim | `offer_id`, `shop`, `result` (`ok`, `login`, `refused`, `error`), `reason` |
| `shop_view` | shop page | `shop`, `category`, `outlets` |
| `outlet_select` / `store_switch` | store drawer, outlet map | `shop`, `outlet_id` |
| `reviews_open`, `tab_change` | tabs on detail pages | `tab` |
| `save_toggle`, `follow_toggle` | from `useToggleSave` (one place) | `kind` (`offer`, `shop`, `follow`), `on` (bool), `result`, `guest` (bool) |

**Account and auth (funnel: `login_start` → `login_code_sent` → `login_verified` → `login_done`)**

`login_prompt_shown` (with `reason`: save, follow, claim, like, reveal; this shows what drives sign-ups),
`login_start`, `login_code_sent` (`method`: otp/mpin), `login_verified`, `mpin_set`, `login_done`, `login_failed`
(`step`, `reason`), `logout`, `account_delete`, `name_update`. After `login_done`: `identify` (section 3.3).

**Zalak and Status**

`status_ring_open` (`shop`, `unseen`), `status_view`, `reel_view` (after the 1 s rule already used for "seen"),
`reel_complete`, `reel_like`, `reel_save`, `reel_share`, `reel_link_tap` (`target`: offer/shop), `reel_report`,
`zalak_swipe` (depth only, aggregated, not per swipe), `zalak_tour_done`. Mirror what `POST /reels/{id}/events`
already sends so numbers can be reconciled.

**Rewards and notifications**

`rewards_open`, `scratch_reveal` (`points`), `points_view`, `invite_share`, `notification_open`,
`notification_read`, `push_toggle` (`on`), `bell_open`.

**Other**

`language_switch`, `submit_offer_cta` (`kind`: whatsapp, android, ios), `contact_click` (`kind`), `install_prompt`,
`pwa_installed`, `legal_open`, `back_to_top`.

**Errors and health** (client `window.onerror`/`unhandledrejection`, error boundaries, and server actions)

`not_found` (`path_template`, `referrer`), `app_error` (`area`, `message` truncated, no stack with user data),
`api_error` (`endpoint` template, `status`, from `ApiError`), `slow_page` (optional, from `PerformanceObserver`:
LCP, INP, CLS, TTFB as properties of one `web_vitals` event, sampled).

### 3.3 Users, groups, funnels, revenue

- **Identify**: on `login_done` and on every signed-in page load, `identify({ profileId })` with the API's user id.
  On logout call `clear()`. Add `IdentifyComponent` in the `(main)` layout when the session is known server-side.
  Profile properties: `joined_at`, `has_saved`, `follows_count` (via `increment`/`decrement`). **No** phone, name,
  email.
- **Groups**: `upsertGroup({ id: shopSlug, type: "shop", name })` + `setGroup(shopSlug)` on shop and offer pages,
  so reports can be cut per shop (valuable for showing shop owners their reach). Also an `area` group if wanted.
  Keep to bounded sets.
- **Funnels to configure in the OpenPanel UI** (no code): (1) home → offers → `offer_view` → `offer_contact`;
  (2) `login_prompt_shown` → `login_done`; (3) `offer_view` → `offer_code_claim` ok; (4) `shop_view` →
  `follow_toggle` on; (5) `status_ring_open` → `status_view` → `reel_link_tap`; (6) first visit → `login_done`
  (retention cohort).
- **Revenue**: not applicable now (no payments). If paid promotions arrive, use the revenue API then.
- **Retention / cohorts / unique visitors** come from `profileId` (signed in) plus OpenPanel's cookieless device id
  (guests). We do not have to send the `DEVICE_COOKIE` key.

### 3.4 Server-side events (reliable)

From server actions, after the outcome is known, via `analytics/server.ts` with `profileId` when there is one:
`offer_code_reveal`, `offer_code_claim`, `login_done`, `login_failed`, `logout`, `account_delete`,
`api_error`, `scratch_reveal`, `follow_toggle` (the API confirmed). Client-side events cover intent
(`login_start`, taps); server-side events cover outcome. Do not send the same fact from both sides: pick one, name
the other `*_intent` if both are needed.

## 4. Privacy

- Collect no personal data: no mobile numbers, names, OTP/MPIN, raw exact GPS (the site already rounds location to
  ~100 m for sorting; send `area` only, never coordinates).
- Free-text search is the grey area. Default: send `q_length` and the result count; add `q` itself only if you want
  a "top searches" report, and say so on the privacy page (opt-in decision, #8 in questions).
- Session replay stays off; if enabled mask all inputs and add `data-openpanel-replay-block` to login/MPIN/account.
- Update the privacy page: what is measured, that it is a self-hosted first-party tool, that nothing is sold or sent
  to third parties, how to opt out (a `Do not track`-respecting `filter` and an opt-out toggle on the account page
  that sets `disabled`).
- Do not send events from bots: use `filter` to drop known crawler user agents; the server SDK ignores no-UA calls.
- Respect `navigator.doNotTrack` in the client `filter`.

## 5. Implementation stages

### Stage A: foundation

- [ ] `pnpm add @openpanel/nextjs`; check the pnpm patches (`patches/`) still apply, and the package's actual
      export names (the docs show both `OpenPanel` and `OpenpanelSdk` for the server SDK).
- [ ] Env vars (section 2) in `.env.example`, `.env.production`, `.dev.vars.example`, README; secret via wrangler.
- [ ] `OpenPanelComponent` in `src/app/[lang]/layout.tsx` (only when enabled), `apiUrl="/api/op"`.
- [ ] `src/app/api/op/[...op]/route.ts` proxy; confirm `src/proxy.ts` matcher leaves it alone.
- [ ] `src/lib/analytics/{events,client,server}.ts` with the typed catalogue (start with a few events).
- [ ] `AnalyticsContext` component for global properties and `page_type`.
- [ ] Verify page views arrive in OpenPanel from `pnpm dev` (flag on) and from `pnpm preview` (workerd).

### Stage B: discovery and offers (most value first)

- [ ] `TrackOfferView`/`trackOffer()` also call `track()` (one edit covers view/contact/share).
- [ ] `useToggleSave` → `save_toggle` / `follow_toggle`.
- [ ] Search, filters, category, area, location, view toggle, banners, offer card, shop view, store/outlet.
- [ ] Group (`shop`) on shop/offer pages.

### Stage C: account, server events, identify

- [ ] Auth funnel client events + server outcome events; `identify` / `clear`.
- [ ] Code reveal/claim server events with `waitUntil`.
- [ ] `login_prompt_shown` with `reason` in `login-dialog.tsx`.

### Stage D: Zalak, rewards, notifications, errors

- [ ] Viewer events (reuse the spots that already call the reels events API).
- [ ] Rewards, notifications, language, submit-offer, install.
- [ ] `not-found.tsx`, error boundaries, global error listeners, `api_error` from `ApiError`.

### Stage E: dashboards, privacy page, ship

- [ ] Build the funnels and dashboards from section 3.3 in OpenPanel (home, offers, shops, Zalak, auth, errors).
- [ ] Privacy page text, opt-out, README "Analytics" section.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm preview`; check the browser network tab: events go to
      `/api/op/...` (not to the OpenPanel domain), none when disabled or in dev, none with Do Not Track.
- [ ] Production smoke test with a real phone: events arrive with correct country/city/device (proves IP forwarding).
- [ ] Add a memory note; release PR `develop` → `main` plus tag, per the git flow.

## 6. Risks and things to verify

- **Workers + `createRouteHandler`**: it may use Node-only APIs. If it fails, write our own tiny proxy route
  (`fetch` to `OPENPANEL_API_URL`, passing `cf-connecting-ip`, `user-agent`, `origin`), which is ~30 lines.
- **IP and geo**: if the proxy forwards the Worker's IP, all visitors look like one Cloudflare city. Pass the
  visitor IP header the API expects (see `visitorIp()`), then check a real location in the dashboard.
- **Do not break page rendering**: the component must be async-safe in a `force-dynamic` layout, and a failing
  OpenPanel must never delay or error a page (fire and forget, short timeouts, `waitUntil`).
- **Cardinality**: shop/offer slugs, free-text queries and full paths as properties make reports unusable. Use
  templates and bounded ids (section 3.1).
- **Double counting**: the Laravel offer stats (shop owner numbers) and OpenPanel will differ slightly (ad-blockers,
  bots, one-per-day dedupe on the API side). That is fine; do not try to reconcile exactly.
- **Self-host side** (outside this repo): HTTPS, backups of Postgres/ClickHouse, retention policy, `ALLOW_REGISTRATION`
  off after your account, and the container resource limits (ClickHouse is memory-hungry).
- **Bundle size**: the script is small, but loading it `afterInteractive` should not hurt LCP; check
  `pnpm check:launch` still passes.

## 7. Files expected to change

New: `src/lib/analytics/{events,client,server}.ts`, `src/components/analytics/analytics-context.tsx`,
`src/app/api/op/[...op]/route.ts`.
Edited: `src/app/[lang]/layout.tsx`, `src/components/offers/{track,save-button,offer-card,offers-explorer,
sticky-chips,share-button,view-toggle,map-drawer,near-you-prompt}.tsx`, `src/components/businesses/{contact-link,outlets}.tsx`,
`src/components/layout/{location-picker,near-me,language-toggle,notification-bell}.tsx`,
`src/components/auth/{login-dialog,login-form,account-forms}.tsx`, `src/components/zalak/*`,
`src/components/rewards/*`, `src/lib/actions/{auth,offers,rewards,saves,zalak}.ts`, `src/app/[lang]/not-found.tsx`,
privacy page, `.env.example`, `.env.production`, `.dev.vars.example`, `README.md`, `package.json`.

## 8. Progress notes

- Decisions 3 to 8 use the recommendations. Project: `https://analytics.surefy.dev/api`, one client id (production only).
- Stage A done and checked in the browser against a local stand-in for the OpenPanel API (so no test traffic reached the
  production project): the script loads through `/api/op/op1.js`, events post to `/api/op/track` and arrive upstream with
  `openpanel-client-id`, `origin` and `openpanel-client-ip`; page views carry `lang`, `page_type`, `signed_in`;
  `page_type` updates on client navigation; `offer_view` is sent from `trackOffer()`. `tsc`, `eslint` and `pnpm build` pass.
- Not checked: Workers (`pnpm preview`), the real IP and city in the dashboard, the off state (flag unset).
- Findings that changed the plan:
  - `@openpanel/nextjs` has no server SDK in its main export (only the `createRouteHandler` proxy at `/server`). For
    Stage C use `OpenPanelBase` re-exported from `@openpanel/nextjs`, or add `@openpanel/sdk` directly.
  - The package's proxy fetches its script from `openpanel.dev` with Next's data cache, which this project avoids on
    Workers, so the proxy is our own (about 50 lines) and serves the script from the self-hosted server.
  - The script sends the first page view twice (Next.js calls `history.replaceState` after load); the client `filter`
    drops a repeat of the same address within 2 s.
  - `/<x>` cannot be told apart as area home or shop on the client, so `page_type` is `area_or_shop` until Stage B adds
    explicit page markers.
- One event named `probe_dry` was posted to the production project while checking the endpoint; delete it in OpenPanel
  if it shows.

### Stage B (done, checked against the local stand-in)

- Wired: `offer_card_click`, `save_toggle` / `follow_toggle` (from `useToggleSave`), `search` (length and result count only),
  `filter_apply` (chip menus), `category_open` (home and categories tiles), `area_select`, `location_request`
  (picker and Near you prompt), `view_toggle`, `hero_click`, `store_open`, `tab_change` (offer and shop pages).
- `PageMarker` on the shop page, the offer page and the offers lists sets `page_type`, `shop`, `category`, `area` for every
  later event; `Analytics` clears them on each address change. Checked: `offer_view` carries
  `shop`, `category`, `area`. Those properties stand in for shop groups (`upsertGroup`/`setGroup`), which are not sent yet.
- Events fired before the script has loaded (full page load) used to be dropped: `track()` now queues them until
  `window.op` exists (10 s limit), and does nothing when analytics is off.
- Known limits: the first `screen_view` of a shop or offer page still says `area_or_shop` or lacks `shop` (the marker mounts
  after the page view is sent); changing a filter counts as a new page view (the script counts the query string);
  `follow_toggle` / `save_toggle` were not exercised (they need a login); `banner`/promo clicks other than the home slider
  are not wired.

### Stage C (done, checked against the local stand-in; no real login was possible)

- Login funnel: `login_prompt_shown` (with `reason`: save_offer, save_shop, follow_shop, offer_code, shop_contact, zalak_like,
  zalak_report, rewards, notifications, saved), `login_start` (method otp/mpin), `login_verified`, `mpin_set`,
  `login_done` (`new_user`, `popup`), `login_failed` (`step`, `reason` = the message key). `login.prompt()` now takes the reason first.
- Outcomes known to the browser are sent from the browser (`offer_code`, `contact_reveal` with `ok`/`login`/`error`), not
  from the server, so nothing is counted twice.
- Identity: at login the server sets a readable cookie `ro_uid` (the API user id, only when analytics is on; cleared with the
  session). The layout passes it as `profileId` so every page load is identified; a popup login calls `identify` straight
  away. When the sign-in hint cookie disappears (logout, expiry, deletion) `clear()` is called and one `signed_out`
  event is sent. No phone, name or e-mail is ever sent. Existing sessions have no `ro_uid` until their next login.
- Server events: `src/lib/analytics/server.ts` posts `api_error` (method and first path segment, status 0 = unreachable, or
  5xx) straight to OpenPanel with `OPENPANEL_CLIENT_SECRET`, once a minute per endpoint per Worker, kept alive with
  Workers' `waitUntil`. **Nothing is sent until that secret exists**: create a client secret for the project in
  OpenPanel, then `npx wrangler secret put OPENPANEL_CLIENT_SECRET`.
- Privacy page: added the `ro_uid` cookie and the usage-statistics purpose.
- Not checked: a real login (OTP and MPIN) end to end, account deletion, that OpenPanel merges the pre-login device into the
  profile, and server events against the real project (needs the secret).
