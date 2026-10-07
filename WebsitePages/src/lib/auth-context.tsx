/**
 * Real Supabase authentication state for the app.
 *
 * Replaces the `signedIn` boolean that `kept-context.tsx` used to fake
 * (docs/authAndRls.md §8). Session ownership is split deliberately:
 *
 * - The **session/user** lives in this provider, driven by Supabase's
 *   `onAuthStateChange`. Supabase already owns refresh-token rotation and emits the
 *   authoritative events, so mirroring it into TanStack Query would duplicate a
 *   source of truth rather than cache a fetch.
 * - The **profile** is server state and lives in TanStack Query
 *   (`useCurrentProfile`), keyed by user id so a sign-out cannot leave the previous
 *   user's profile in the cache.
 */

import { useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { getSupabaseBrowserClient } from "./supabase/client";
import { hasSupabaseEnv } from "./supabase/env";

type AuthState = {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  /** True until the first auth event resolves, so UI can avoid a signed-out flash. */
  isLoading: boolean;
  /** False when the publishable Supabase config is absent. */
  isConfigured: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({
  children,
  initialSession = null,
}: {
  children: ReactNode;
  /** Session resolved during SSR, so the first paint already knows the user. */
  initialSession?: Session | null;
}) {
  const configured = hasSupabaseEnv();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(initialSession);
  const [isLoading, setIsLoading] = useState(configured && initialSession === null);

  useEffect(() => {
    if (!configured) {
      setIsLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let active = true;

    // Reconcile with the stored session on mount: this is what makes a signed-in
    // session survive a refresh.
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setIsLoading(false);

      // Drop every cached query on a user change so no private data from the
      // previous user can be rendered (docs/securityAndService.md §8, §171).
      if (event === "SIGNED_OUT") {
        queryClient.clear();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [configured, queryClient]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.user),
      isLoading,
      isConfigured: configured,
    }),
    [session, isLoading, configured],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider required");
  return context;
}
