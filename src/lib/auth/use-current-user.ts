import { useEffect, useMemo, useState } from "react";
import { PREVIEW_USER_ID } from "@/lib/life/preview-mode";
import { useIsPreviewMode } from "@/lib/life/use-preview-mode";
import { authClient, authEnabled } from "./client";

/** Normalized user shape used across the app, auth on or off. */
export type AppUser = {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  profileImageUrl: string | null;
  /** True when this is the sandbox/dev fallback (auth not configured). */
  isDevFallback: boolean;
};

/**
 * Stable fallback user, used ONLY when auth is disabled
 * (`VITE_AUTH_ENABLED=false`, the shipped default). With auth on, the sandbox
 * live preview does real sign-in via the baked preview client. Its id is
 * `"dev-user"` — the SAME id `verify.server.ts` returns server-side — so per-user
 * rows written in that mode belong to one consistent owner.
 */
export const DEV_USER: AppUser = {
  id: "dev-user",
  displayName: "Dev User",
  primaryEmail: "dev@example.com",
  profileImageUrl: null,
  isDevFallback: true,
};

/**
 * Fictional preview persona. Not a session, not the dev user, and never sent
 * to the server. Preview pages do not call account APIs with this id.
 */
export const PREVIEW_USER: AppUser = {
  id: PREVIEW_USER_ID,
  displayName: "Alex",
  primaryEmail: null,
  profileImageUrl: null,
  isDevFallback: false,
};

const PREVIEW_STATE: CurrentUserState = { user: PREVIEW_USER, isPending: false };

/** `useCurrentUserState()` result: the user plus the session-loading flag. */
export type CurrentUserState = {
  /** The user — `null` BOTH while the session loads and when signed out. */
  user: AppUser | null;
  /** True while the session is still resolving — don't treat `user: null` as signed out yet. */
  isPending: boolean;
};

const DEV_STATE: CurrentUserState = { user: DEV_USER, isPending: false };

/**
 * Current user + loading state. Same behavior in live preview and when deployed:
 *   - Auth enabled -> the real signed-in user; `user` is `null` while
 *                            the session resolves (`isPending: true`) and when
 *                            signed out (`isPending: false`). Session comes from
 *                            Better Auth `useSession()` → `/api/auth/get-session`
 *                            (cookie when deployed; bearer in live preview).
 *   - Auth disabled (`VITE_AUTH_ENABLED=false`) -> `DEV_USER`, never pending.
 *
 * Protect a route by waiting out `isPending` before acting on `user` —
 * redirecting on `user: null` alone bounces signed-in visitors to sign-in on
 * every hard reload:
 *
 *   import { RedirectToSignIn } from "@/lib/auth/gates";
 *   const { user, isPending } = useCurrentUserState();
 *   if (isPending) return null;              // still resolving — don't redirect yet
 *   if (!user) return <RedirectToSignIn />;  // definitely signed out
 *
 * `authEnabled` is a module-level constant fixed at load, so the guarded hook
 * call keeps a stable hook order across every render of a given component.
 */
export function useCurrentUserState(): CurrentUserState {
  const preview = useIsPreviewMode();
  if (!authEnabled) return preview ? PREVIEW_STATE : DEV_STATE;
  // eslint-disable-next-line react-hooks/rules-of-hooks -- authEnabled is constant for the app's lifetime
  return useSessionUserState(preview);
}

function useSessionUserState(preview: boolean): CurrentUserState {
  const { data, isPending } = authClient.useSession();
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!isPending) {
      setTimedOut(false);
      return;
    }
    const id = window.setTimeout(() => setTimedOut(true), 2000);
    return () => window.clearTimeout(id);
  }, [isPending]);
  const id = data?.user.id;
  const displayName = data?.user.name ?? null;
  const primaryEmail = data?.user.email ?? null;
  const profileImageUrl = data?.user.image ?? null;
  const user = useMemo<AppUser | null>(
    () => (id ? { id, displayName, primaryEmail, profileImageUrl, isDevFallback: false } : null),
    [id, displayName, primaryEmail, profileImageUrl],
  );
  const session = useMemo(
    () => ({ user, isPending: isPending && !timedOut }),
    [user, isPending, timedOut],
  );
  // Ignore the real session. Preview must not surface an account identity.
  if (preview) return PREVIEW_STATE;
  return session;
}

/**
 * Convenience view of `useCurrentUserState().user` for display (e.g.
 * `user?.displayName ?? "Guest"`). NOTE: `null` means *loading OR signed out* —
 * for redirects/guards use `useCurrentUserState()` and check `isPending`.
 */
export function useCurrentUser(): AppUser | null {
  return useCurrentUserState().user;
}
