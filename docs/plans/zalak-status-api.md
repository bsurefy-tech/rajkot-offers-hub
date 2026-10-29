# Plan: Status and Zalak on the real API

Status: the UI is merged (PR #31) and runs on mock data in `src/lib/zalak/data.ts`. The Laravel API is
merged on `redesign/platforms` (PRs #294–#303, phases 0–8). This plan connects the two.

API reference (bsurefy-laravel repo): `docs/api/statuses.md`, `docs/api/reels.md`, `docs/api/feed-views.md`,
`docs/runbooks/status-reels-release.md`.

## 0. Blockers outside this repo

- [ ] Laravel deployed and migrated on `v2-api.rajkotoffershub.com` (on 2026-10-17 `/status-tray`, `/reels`,
      `/reels/featured` and `/platform-statuses` all answered 404: not deployed, or features off).
- [ ] Cloudflare Stream credentials set (`CLOUDFLARE_STREAM_*`) or reels cannot be uploaded or played.
- [ ] `statuses` and `reels` added to the Rajkot Offers platform's `settings.features` (`PUT /admin/platforms/{platform}`;
      the list is replaced, so keep the existing features).
- [ ] Local API running on 127.0.0.1:8000 with `php artisan db:seed --class=StatusReelsDemoSeeder --force`.
      Demo reels have no playable video; photo statuses do. Real reel video can only be tested once Stream is set up.

Work on this plan can start before these are done, against the local API for statuses.

## 1. What the API gives us

| Need | Endpoint |
|---|---|
| Status rings | `GET /status-tray?per_page=` (`data[]`: `business`, `live_count`, `unseen_count`, `has_unseen`, `latest_at`, `following`; plus `platform` ring) |
| Play a ring | `GET /status-tray/{slug or id}`, `GET /platform-statuses` (up to 20 posts, oldest first, `is_seen`, `is_liked`, `likes_count`, `link`) |
| Reel feed | `GET /reels?q&category&business&followed&feed_token&page&per_page` (`meta.feed_token`, `meta.all_seen`) |
| Shelf and chips | `GET /reels/featured`, `GET /reels/categories` |
| One reel | `GET /reels/{id}` |
| Seen | `POST /feed-views {type: "status" or "reel", ids: [..50]}` |
| Counters | `POST /reels/{id}/events {type: view, complete, share, link_tap}` (once per viewer per day) |
| Like, save | `POST` and `DELETE` on `/statuses/{id}/like`, `/reels/{id}/like`, `/reels/{id}/save`; `GET /liked-reels`, `GET /saved-reels` |
| Report | `POST /statuses/{id}/reports`, `POST /reels/{id}/reports` `{reason, note?}` |

- Viewer: signed in (Bearer token), or a guest `X-Device-Key` header (UUID generated once and kept). A header that
  is not a UUID is ignored.
- Everything here is per viewer, so it is never cached. Guests get 422 `device_key` on `/feed-views` without a key.
- A platform without the feature answers 404 on all of it.
- Status post: photo or video up to 30 s, optional `link` (`business`, `catalog_item` with `slug`, `promotion`).
  `link` is `null` when the target is no longer public.
- Reel: one HLS video up to 90 s (`video.hls_url`, `poster_url`, `duration_seconds`, `width`, `height`), `caption`,
  optional `link`, `author` (business or platform), `is_liked`, `is_saved`, `is_following`.

## 2. Where the API and the mock UI differ

1. A reel is one video, not a set of photo "angles". The sideways swipe stays but only shows when a reel has
   more than one clip (the status ring is the multi-clip case).
2. Reels run up to 90 s, not 5–15 s. The 5–15 s rule (`CLIP_MIN_SECONDS`, `CLIP_MAX_SECONDS`) now only decides how
   long a status photo is shown; a status video uses its own `duration_seconds`.
3. Reels are HLS: Safari plays them natively, other browsers need `hls.js`. Play only the reel on screen.
4. Seen, like and save move from localStorage to the API.
5. `api()` caches guest GETs for 60 s; per-viewer calls must skip that cache and carry the device key.
6. No `areaName` and no `distanceKm` in the API: drop them from the viewer header and the cards.
7. Status "title" becomes the caption; the button follows `link` (offer, catalog item or shop).
8. The tray has a `platform` ring (the site's own posts) ahead of the shops.

## 3. Decisions (change these before starting if you disagree)

- Zalak is the reels feed. The older image feed `GET /catalog-items/zalak` is not used.
- The mock stays only behind an env flag (`ZALAK_MOCK=true`) for development; production never shows mock data.
- When the API answers 404 (feature off), the Status row, the Home Zalak shelf and the Zalak tab hide, like Rewards
  does with `LOYALTY_ENABLED`.
- One site PR from `feature/zalak-api`, two stages: statuses first (photos work today), reels second.

## 4. Tasks

### Stage A: foundation

- [x] `src/lib/api/client.ts`: accept extra `headers` and a `cache: "no-store"` option; per-viewer calls pass the
      device key and never use the 60 s guest cache.
- [x] `src/lib/api/device.ts` and `src/proxy.ts`: the proxy hands out the `ro_dk` cookie (UUID, httpOnly, 1 year) on a first
      visit; server code only reads it. Signed-in calls use the token, and send
      the key as well (the API records it against the account).
- [x] `src/lib/api/types.ts`: `StatusTrayRing`, `StatusPost`, `ReelCard`, `VideoInfo`, `ContentLink`, page and meta types.
- [x] `src/lib/zalak/api.ts` (instead of `mappers.ts`): fetch and map API to `ZalakStory` (ring to a story whose clips are its posts; reel to a one-clip
      story); link to the offer, catalog item or shop path (`offerPath`, `shopPath`).
- [x] `src/lib/zalak/types.ts`: add `id`s for the API item per clip (needed for seen and like), `likes`, `isLiked`,
      `isSaved`, `isSeen`, `following`, `link`, `hls`/`poster`/`duration`; remove `areaName` and `distanceKm`.
- [x] Feature probe: a 404 from the API reads as "off" (empty feed); `ZALAK_MOCK=true` keeps the sample feeds in development.

### Stage B: statuses

- [x] `getStatusFeed` calls `/status-tray` (ring order, `has_unseen`, `following` from the API) and the platform ring.
- [x] `StatusRow`: rings lit by `has_unseen`, the platform ring first, hide when the feature is off or the tray is empty.
- [x] Status page `/status`: load `GET /status-tray/{slug}` for the opened ring, `GET /platform-statuses` for the
      platform ring; open on the first unseen post.
- [x] `status-viewer.tsx`: timer = 5–15 s for a photo (default 7 s) or `duration_seconds` for a video; report seen
      through a server action `markSeenAction(type, ids)` after about 1 s on screen (batched); keep the localStorage
      seen set only as an instant, optimistic mirror.
- [x] Like and unlike through server actions; a guest opens the login dialog (existing `LoginProvider`); update counts.
- [x] Link button opens the linked offer, catalog item or shop; hidden when `link` is `null`.
- [x] Follow pill reuses the existing follow action; initial state from `following`.

### Stage C: reels (Zalak)

- [x] `getZalakFeed` and `moreReelsAction` use `/reels` with `page` and `feed_token` (kept in the client between loads);
      stop `all_seen` from showing a "you're all caught up" dead end: the API cycles seen reels, so just keep scrolling.
- [x] HLS player in `ClipMedia`: native HLS on Safari, `hls.js` (dynamic import, exact version, loaded only in the
      viewer) elsewhere; poster from `poster_url`; plays only when the reel is active and no dialog is open; mute
      toggle stays; pause on hidden tab.
- [x] Seen after about 1 s on screen (batched `POST /feed-views`); events: `view` when active, `complete` at the end,
      `share` on share, `link_tap` on the link button (server action, fire and forget).
- [x] Like and save through server actions; the rail shows real counts (`likes_count`, `saves_count` not shown to
      the public, so only likes); a guest sees the login dialog.
- [x] Zalak shelf on Home and the `/zalak` page use `/reels` (first page). Not done: category chips from
      `/reels/categories` and the `/reels/featured` shelf (second pass).
- [x] Feature off (404): hide the Zalak tab (bottom nav and desktop), the Home shelf, and answer `/zalak` with a
      normal not-found page.

### Stage D: extras (second PR if the first is already big)

- [x] Report: a "Report" item in the viewer menu (reason list, `POST .../reports`).
- [x] Notification settings (Account, Preferences): a "Vendors I follow" switch for the new `following` preference
      (`GET` and `PUT /user/notification-preferences`); the runbook asks every customer app to ship this before launch.
      The site has no web push, so this switch governs the account's phone alerts; the feed keeps every notification.
      Also: `status.posted` and `reel.posted` notifications now open the status viewer or the reel.
- [ ] Saved reels list (`GET /saved-reels`) in Saved, if the product wants it.

### Stage E: check and ship

- [ ] `pnpm exec tsc --noEmit`, `pnpm exec eslint src`, `pnpm build`.
- [ ] Local API with the demo seeder: rings, play, seen (ring goes grey and stays grey after reload), like, link.
- [ ] Live API once it is ready: guest (device key) and signed in; reels playing on iOS Safari, Android Chrome, desktop.
- [ ] Mobile and desktop screenshots of Home, `/status`, `/zalak`.
- [ ] Update memory note `zalak-status-reels.md`; remove mock-only code and the env flag once live.

## 5. Files expected to change

`src/lib/api/{client,types,mappers,visitor}.ts`, `src/lib/zalak/{types,data}.ts`, `src/lib/actions/zalak.ts`,
`src/hooks/use-zalak-memory.ts`, `src/components/zalak/{parts,reel-viewer,status-viewer,viewer,status-row,zalak-shelf}.tsx`,
`src/app/[lang]/(main)/page.tsx`, `src/app/[lang]/(immersive)/{status,zalak}/page.tsx`,
`src/components/layout/nav-links.tsx`, `src/lib/i18n/messages.ts`, `package.json` (hls.js).

## 6. Risks

- Prod API not ready: build the layer against the local API and keep the mock flag until it is.
- Per-viewer calls break caching assumptions: never put a device key or token into a cached read (`api()` rules).
- Workers: no cross-request shared promises or timers (see `patches/next@16.4.1.patch` notes); the device-key cookie is
  read per request.
- Video cost and size: the API enforces the caps; the site only plays what it is given.

## 7. Progress notes

- Stage A and B are done and checked against the local API (`php -S 127.0.0.1:8000`, migrated, `RajkotDemoSeeder` and
  `StatusReelsDemoSeeder`): rings with the platform's ring first, the viewer, like (guest gets the login popup), seen
  (ring turns grey and moves to the end of the tray after reload).
- Also done early because statuses can be video: HLS playback in `ClipMedia` (`hls.js`, loaded on demand). Demo videos
  are placeholders, so playback itself is untested until a real Stream video exists.
- The tray's `latest_at` is local time without a zone (India); the mapper reads it as +05:30.
- Stage C done and checked against the local API: `/zalak` reels from `/reels` with `feed_token` paging (tested with a
  page size of 4), view and seen after 1 s on screen, like and save (guest gets the login popup), share, link tap and
  completion events, Zalak tab hidden when `/reels/categories` answers 404, `/zalak` answers 404 then.
- Opening `/zalak?start=<id>` for a reel that is not on the first page loads it with `GET /reels/{id}` first.
- Reels are counted as watched even while the first-time tour is up (a few seconds); fine for now.
- Local API tip: after seeding, run `php artisan cache:clear` with the same env if every route answers 404 (the platform
  host lookup was cached stale).
- Stage D done: report sheet checked in the browser (guest gets the login popup; a signed-in submit and the alerts switch
  were not exercised, as that needs a real login).
