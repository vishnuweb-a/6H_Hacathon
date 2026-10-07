/**
 * Profile service — narrowly scoped profile data access.
 *
 * Reads go through the `profiles` table under the caller's own RLS; writes go
 * through the `update_my_profile` RPC, which accepts safe fields only
 * (docs/authAndRls.md §18, docs/apiAndDataContracts.md §16).
 *
 * No method here accepts a user id for the *current* user: identity always comes
 * from the session via `auth.uid()` (docs/authAndRls.md §58).
 */

import { getSupabaseBrowserClient } from "../supabase/client";
import {
  mapMyProfile,
  mapPublicProfile,
  type MyProfile,
  type PublicProfile,
  type UpdateProfileInput,
} from "./profile-types";

const PROFILE_COLUMNS =
  "id, display_name, username, avatar_url, trust_score, average_rating, rating_count, successful_returns, created_at, updated_at";

/**
 * The signed-in user's own profile, or null when not signed in. A missing row also
 * yields null — the trigger normally creates it, but a null is a legitimate
 * "nothing to show" rather than an error (docs/apiAndDataContracts.md §89).
 */
export async function getCurrentProfile(): Promise<MyProfile | null> {
  const supabase = getSupabaseBrowserClient();

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error("We could not load your profile just now.");
  return data ? mapMyProfile(data) : null;
}

/** Another member's public-safe profile. Reputation is read-only here. */
export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error("We could not load that profile just now.");
  return data ? mapPublicProfile(data) : null;
}

/**
 * Updates the caller's own safe profile fields.
 *
 * Only display name, username and avatar path are sent. Reputation columns are not
 * part of the input type and are rejected by the database even if a caller were to
 * attempt a direct table update.
 */
export async function updateCurrentProfile(input: UpdateProfileInput): Promise<MyProfile> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .rpc("update_my_profile", {
      // Each SQL argument defaults to null ("leave unchanged"), so an absent field
      // is left out of the payload entirely rather than sent as a null the
      // generated Args type forbids. Clearing a value goes through the dedicated
      // p_clear_* flags below, not through a null.
      ...(input.displayName ? { p_display_name: input.displayName } : {}),
      ...(input.username ? { p_username: input.username } : {}),
      ...(input.avatarPath ? { p_avatar_url: input.avatarPath } : {}),
      p_clear_username: input.username === null,
      p_clear_avatar_url: input.avatarPath === null,
    })
    .single();

  if (error) {
    if (error.code === "23505" || error.message.toLowerCase().includes("duplicate")) {
      throw new Error("That username is already taken. Try another one.");
    }
    if (error.message.toLowerCase().includes("profiles_username_format")) {
      throw new Error("Usernames use 3–30 lowercase letters, numbers or underscores.");
    }
    if (error.message.toLowerCase().includes("reputation")) {
      throw new Error("Trust and rating values are set by the platform and cannot be edited.");
    }
    throw new Error("We could not save your profile changes. Please try again.");
  }

  return mapMyProfile(data);
}
