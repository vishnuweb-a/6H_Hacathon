/**
 * Auth service — narrowly scoped Supabase Auth access.
 *
 * The only place in the frontend that talks to `supabase.auth`. Errors are mapped
 * to friendly messages here so components never surface a raw provider string
 * (docs/apiAndDataContracts.md §152, docs/securityAndService.md §102).
 *
 * Credentials are passed straight to Supabase and never logged
 * (docs/securityAndService.md §100).
 */

import type { Session, User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "../supabase/client";

export type AuthResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

/**
 * Maps a Supabase auth error to something a person can act on. Sign-in failures
 * stay deliberately vague about *which* half was wrong, so the form cannot be used
 * to enumerate registered addresses (docs/securityAndService.md §103).
 */
function friendlyAuthError(message: string, status?: number): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "That email and password combination does not match an account.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Check your inbox and confirm your email address before signing in.";
  }
  if (normalized.includes("already registered") || normalized.includes("already been registered")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (normalized.includes("password")) {
    return "That password does not meet the minimum requirements. Try a longer one.";
  }
  if (normalized.includes("rate limit") || status === 429) {
    return "Too many attempts just now. Wait a moment and try again.";
  }
  if (normalized.includes("failed to fetch") || normalized.includes("network")) {
    return "We could not reach the server. Check your connection and try again.";
  }
  return "Something went wrong signing you in. Please try again.";
}

export async function signUp(input: SignUpInput): Promise<AuthResult<{ session: Session | null }>> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      // handle_new_user() reads display_name from this metadata to seed the profile.
      // It is a display value only and carries no authorization meaning.
      data: { display_name: input.displayName },
    },
  });

  if (error) return { ok: false, error: friendlyAuthError(error.message, error.status) };
  return { ok: true, data: { session: data.session } };
}

export async function signIn(input: SignInInput): Promise<AuthResult<{ session: Session }>> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) return { ok: false, error: friendlyAuthError(error.message, error.status) };
  if (!data.session) {
    return { ok: false, error: "Sign in did not return a session. Please try again." };
  }
  return { ok: true, data: { session: data.session } };
}

export async function signOut(): Promise<AuthResult<null>> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut();
  if (error) return { ok: false, error: "We could not sign you out. Please try again." };
  return { ok: true, data: null };
}

/**
 * Sends Supabase's own recovery email (docs/authAndRls.md §11). The result is
 * intentionally identical whether or not the address exists.
 */
export async function requestPasswordReset(email: string): Promise<AuthResult<null>> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    email,
    typeof window === "undefined"
      ? {}
      : { redirectTo: `${window.location.origin}/auth?mode=recovery` },
  );
  if (error && error.status === 429) {
    return { ok: false, error: "Too many reset emails requested. Try again in a few minutes." };
  }
  return { ok: true, data: null };
}

/** Updates the password of the currently established (including recovery) session. */
export async function updatePassword(password: string): Promise<AuthResult<null>> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: friendlyAuthError(error.message, error.status) };
  return { ok: true, data: null };
}

/**
 * Returns the verified current user. Uses `getUser()`, which validates the token
 * with the auth server, rather than trusting a locally stored session object.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}
