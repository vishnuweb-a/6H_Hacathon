/**
 * Match service — the only place `matches` and `match_dismissals` are queried
 * (AGENTS.md §4: Component → Hook → Service → Supabase).
 *
 * Every read goes through `get_my_matches()` / `get_matches_for_item()`, whose
 * return types contain no coordinate, no distance and no private verification
 * data. The service never selects from `public.matches` directly, so a future
 * careless `select *` cannot widen the projection.
 *
 * Every write goes through `dismiss_match()` / `restore_match()`. `authenticated`
 * holds no INSERT, UPDATE or DELETE privilege on `matches` at all, so this layer
 * cannot set a score or a status even by mistake — the database refuses
 * (docs/authAndRls.md §68, docs/securityAndService.md §66).
 *
 * No method accepts a user id as proof of identity: the database derives it from
 * `auth.uid()` (docs/authAndRls.md §58).
 */

import { getListingCoverUrls } from "./listing-service";
import type { Database } from "../database.types";
import { getSupabaseBrowserClient } from "../supabase/client";
import {
  mapMatchSummary,
  type MatchStrength,
  type MatchStrengthFilter,
  type MatchSummary,
} from "./match-types";

type GetMyMatchesArgs = Database["public"]["Functions"]["get_my_matches"]["Args"];
type GetMatchesForItemArgs = Database["public"]["Functions"]["get_matches_for_item"]["Args"];

async function withMatchCovers(matches: MatchSummary[]): Promise<MatchSummary[]> {
  // Photos are optional. Keep valid matches usable if media signing is unavailable.
  const covers = await getListingCoverUrls(matches.map((match) => match.otherListing.id)).catch(
    () => new Map<string, string | null>(),
  );
  return matches.map((match) => ({
    ...match,
    otherListing: {
      ...match.otherListing,
      coverImageUrl: covers.get(match.otherListing.id) ?? null,
    },
  }));
}

/**
 * The caller's ranked matches, already filtered to the display threshold and
 * ordered by score by the database (docs/matchingEngine.md §40, §43).
 *
 * `strength` is passed to the RPC rather than filtered client-side so the row
 * limit applies to the band the user actually asked for.
 */
export async function getMyMatches(
  options: { strength?: MatchStrengthFilter; includeDismissed?: boolean; limit?: number } = {},
): Promise<MatchSummary[]> {
  const supabase = getSupabaseBrowserClient();

  // An unset filter must be an ABSENT argument, not an explicit undefined, so the
  // function's own `default null` applies — the same convention as the listing
  // service's Explore call.
  const args: GetMyMatchesArgs = {
    p_include_dismissed: options.includeDismissed ?? false,
  };
  if (options.strength && options.strength !== "ALL") args.p_strength = options.strength;
  if (options.limit !== undefined) args.p_limit = options.limit;

  const { data, error } = await supabase.rpc("get_my_matches", args);

  if (error) {
    throw new Error(error.message || "We could not load your matches.");
  }

  return withMatchCovers((data ?? []).map(mapMatchSummary));
}

/**
 * Matches for one of the caller's own listings, for the listing detail screen.
 * The database requires ownership of the subject listing.
 */
export async function getMatchesForItem(
  itemId: string,
  options: { limit?: number } = {},
): Promise<MatchSummary[]> {
  const supabase = getSupabaseBrowserClient();

  const args: GetMatchesForItemArgs = { p_item_id: itemId };
  if (options.limit !== undefined) args.p_limit = options.limit;

  const { data, error } = await supabase.rpc("get_matches_for_item", args);

  if (error) {
    throw new Error(error.message || "We could not load matches for this listing.");
  }

  return withMatchCovers((data ?? []).map(mapMatchSummary));
}

/**
 * Hides a match for the signed-in user only.
 *
 * This does NOT invalidate the pair for the other participant: the RPC writes a
 * row to `match_dismissals` keyed by (match_id, auth.uid()) and never touches
 * `matches.status` (Phase 4 refinement of docs/matchingEngine.md §54). Idempotent.
 */
export async function dismissMatch(matchId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  const { error } = await supabase.rpc("dismiss_match", { p_match_id: matchId });

  if (error) {
    throw new Error(error.message || "We could not dismiss this match.");
  }
}

/** Undoes the signed-in user's own dismissal. Affects only their view. */
export async function restoreMatch(matchId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  const { error } = await supabase.rpc("restore_match", { p_match_id: matchId });

  if (error) {
    throw new Error(error.message || "We could not restore this match.");
  }
}

/**
 * Counts by band, for the Matches screen tabs and the Activity summary.
 *
 * Derived from one already-fetched list rather than issuing four queries.
 */
export function countMatchesByStrength(
  matches: readonly MatchSummary[],
): Record<MatchStrength, number> {
  return matches.reduce<Record<MatchStrength, number>>(
    (counts, match) => {
      counts[match.strength] += 1;
      return counts;
    },
    { VERY_STRONG: 0, STRONG: 0, POSSIBLE: 0 },
  );
}
