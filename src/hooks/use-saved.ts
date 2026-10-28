import { useCallback, useSyncExternalStore } from "react";
import { loadSavesAction, setSavedAction, type SaveKind } from "@/lib/actions/saves";
import { signedInHint } from "@/lib/auth/hint";

/**
 * Saved offers and shops and followed shops, one store for every component on the page.
 *
 * They live on the visitor's account (the API), so a guest has none: the heart or Follow button opens the login
 * popup, and the lists are loaded once the visitor is seen signed in.
 */

type Lists = { offers: string[]; shops: string[]; follows: string[] };
interface State extends Lists {
  /** False until we know whether the visitor has an account to read saves from, so a saved page never flashes "nothing saved". */
  ready: boolean;
  /** The lists are the account's; false for a guest. */
  member: boolean;
}

const FIELD: Record<SaveKind, keyof Lists> = { offer: "offers", shop: "shops", follow: "follows" };
const EMPTY: string[] = [];
const SERVER_STATE: State = { offers: EMPTY, shops: EMPTY, follows: EMPTY, ready: false, member: false };
const GUEST: State = { offers: EMPTY, shops: EMPTY, follows: EMPTY, ready: true, member: false };

const listeners = new Set<() => void>();
let state: State | null = null;
let loading: Promise<boolean> | null = null;

function emit(next: State) {
  state = next;
  listeners.forEach((listener) => listener());
}

function snapshot(): State {
  // A signed-in visitor's saves are not known until the account answers.
  state ??= signedInHint() ? { ...SERVER_STATE } : GUEST;
  return state;
}

/** Reads the saves from the account. Resolves to whether the visitor is a member (signed in with saves loaded). */
export function loadSaves(): Promise<boolean> {
  loading ??= loadSavesAction().then((result) => {
    loading = null;
    if (result.status === "member") {
      emit({ offers: result.offers, shops: result.shops, follows: result.follows, ready: true, member: true });
      return true;
    }
    emit(GUEST);
    return false;
  });
  return loading;
}

/** Keeps the store in step with the sign-in cookie: sign in (even in a popup) loads the saves, sign out drops them. */
function sync() {
  const current = snapshot();
  const signedIn = signedInHint();
  if (signedIn && !current.member) void loadSaves();
  else if (!signedIn && (current.member || !current.ready)) emit(GUEST);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  sync();
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Puts `key` in or out of the list (`saved` omitted: the other way round). Null for a guest: they have to log in first.
 * `done` says whether the account took it; if not the list goes back as it was.
 */
function change(kind: SaveKind, key: string, saved?: boolean): { saved: boolean; done: Promise<boolean> } | null {
  const before = snapshot();
  if (!before.member) return null;
  const field = FIELD[kind];
  const want = saved ?? !before[field].includes(key);
  const list = before[field].filter((v) => v !== key);
  if (want) list.unshift(key);
  emit({ ...before, [field]: list });
  const done = setSavedAction(kind, key, want).then((result) => {
    if (result === "ok") return true;
    const now = snapshot();
    // The session ended: no account to keep saves on any more.
    if (result === "signed-out") {
      emit(GUEST);
      return false;
    }
    // Put the list back as it was before this tap.
    const reverted = now[field].filter((v) => v !== key);
    if (before[field].includes(key)) reverted.splice(Math.min(before[field].indexOf(key), reverted.length), 0, key);
    emit({ ...now, [field]: reverted });
    return false;
  });
  return { saved: want, done };
}

function useSavedList(kind: SaveKind) {
  const store = useSyncExternalStore(subscribe, snapshot, () => SERVER_STATE);
  const saved = store[FIELD[kind]];

  const isSaved = useCallback((key: string) => saved.includes(key), [saved]);
  /** Flips one item, or sets it to `want`. Null for a guest (log in first); otherwise see `change`. */
  const toggle = useCallback((key: string, want?: boolean) => change(kind, key, want), [kind]);
  const remove = useCallback((key: string) => change(kind, key, false), [kind]);
  /** Puts a removed item back at its old position (undo). */
  const restore = useCallback(
    (key: string, index: number) => {
      const result = change(kind, key, true);
      if (result) {
        // `change` puts it first; move it back where it was.
        const now = snapshot();
        const list = now[FIELD[kind]].filter((v) => v !== key);
        list.splice(Math.min(index, list.length), 0, key);
        emit({ ...now, [FIELD[kind]]: list });
      }
      return result;
    },
    [kind],
  );

  return { saved, ready: store.ready, member: store.member, isSaved, toggle, remove, restore };
}

export const useSavedOffers = () => useSavedList("offer");
export const useSavedShops = () => useSavedList("shop");
export const useFollowedShops = () => useSavedList("follow");
export const useSaved = (kind: SaveKind) => useSavedList(kind);
