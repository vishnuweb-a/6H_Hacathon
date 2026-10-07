/**
 * Auth and profile mutation hooks.
 *
 * Thin TanStack Query wrappers over the service layer, so components keep no
 * fetching logic of their own (Component → Hook → Service → Supabase, AGENTS.md §4).
 */

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { useAuth } from "@/lib/auth-context";
import {
  requestPasswordReset,
  signIn,
  signOut,
  signUp,
  type SignInInput,
  type SignUpInput,
} from "@/lib/services/auth-service";
import { getCurrentProfile, updateCurrentProfile } from "@/lib/services/profile-service";
import type { MyProfile, UpdateProfileInput } from "@/lib/services/profile-types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/** Keyed by user id so one user's profile can never be served to another. */
export const profileKeys = {
  current: (userId: string | null) => ["profile", "current", userId] as const,
};

export function useCurrentProfile(): UseQueryResult<MyProfile | null> {
  const { user, isConfigured } = useAuth();

  return useQuery({
    queryKey: profileKeys.current(user?.id ?? null),
    queryFn: getCurrentProfile,
    enabled: isConfigured && Boolean(user?.id),
    staleTime: 30_000,
  });
}

export function useSignUp() {
  return useMutation({
    mutationFn: (input: SignUpInput) => signUp(input),
  });
}

export function useSignIn() {
  return useMutation({
    mutationFn: (input: SignInInput) => signIn(input),
  });
}

export function usePasswordReset() {
  return useMutation({
    mutationFn: (email: string) => requestPasswordReset(email),
  });
}

/**
 * Signs the user out, then clears every cached query and navigates home.
 *
 * The cache is cleared here *and* on the SIGNED_OUT event in `AuthProvider`: the
 * event is the reliable path (it also fires for an expired or remotely revoked
 * session), while clearing here guarantees it has happened before we navigate.
 */
export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      const result = await signOut();

      // Drop user-scoped realtime subscriptions before the token goes away.
      // None exist in Phase 1, but channels opened by later phases are removed
      // here rather than left attached to a dead session.
      try {
        await getSupabaseBrowserClient().removeAllChannels();
      } catch {
        // A failed teardown must not block sign-out.
      }

      return result;
    },
    onSettled: async () => {
      queryClient.clear();
      await navigate({ to: "/" });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateCurrentProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.current(user?.id ?? null), profile);
    },
  });
}
