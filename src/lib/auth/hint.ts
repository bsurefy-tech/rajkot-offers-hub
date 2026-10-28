import { SIGNED_IN_HINT_COOKIE } from "./cookies";

/** Browser only: does this visitor look signed in? A hint to skip a round trip; the API still decides. */
export function signedInHint() {
  return document.cookie.split("; ").some((cookie) => cookie.startsWith(`${SIGNED_IN_HINT_COOKIE}=`));
}
