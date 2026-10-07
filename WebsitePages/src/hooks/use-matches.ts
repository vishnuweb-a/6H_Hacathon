/**
 * Match query and mutation hooks.
 *
 * Thin TanStack Query wrappers over the match service, so components hold no
 * fetching logic (AGENTS.md §4). TanStack Query is the single owner of this
 * server state — no match data is mirrored into `kept-context`.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { useAuth } from "@/lib/auth-context";
import {
  dismissMatch,
  getMatchesForItem,
  getMyMatches,
  restoreMatch,
} from "@/lib/services/match-service";
import type { MatchStrengthFilter, MatchSummary } from "@/lib/services/match-types";

/**
 * Query keys.
 *
 * `mine` is keyed by user id so one account's matches can never be served from
 * another's cache entry (docs/authAndRls.md §94) — which matters more here than
 * for listings, since a match is visible to exactly two people.
 */
export const matchKeys = {
  all: ["matches"] as const,
  mine: (userId: string | null, strength: MatchStrengthFilter, limit?: number) =>
    ["matches", "mine", userId, strength, limit ?? null] as const,
  forItem: (userId: string | null, itemId: string, limit?: number) =>
    ["matches", "for-item", userId, itemId, limit ?? null] as const,
};

/**
 * The caller's ranked matches.
 *
 * The database applies the display threshold, the ordering and the row cap, so
 * this hook adds no filtering of its own.
 */
export function useMyMatches(
  options: { strength?: MatchStrengthFilter; limit?: number } = {},
): UseQueryResult<MatchSummary[]> {
  const { isConfigured, isAuthenticated, user } = useAuth();
  const strength = options.strength ?? "ALL";

  return useQuery({
    queryKey: matchKeys.mine(user?.id ?? null, strength, options.limit),
    queryFn: () =>
      getMyMatches(options.limit === undefined ? { strength } : { strength, limit: options.limit }),
    enabled: isConfigured && isAuthenticated,
    staleTime: 30_000,
  });
}

/** Matches for one of the caller's own listings, for the listing detail screen. */
export function useMatchesForItem(
  itemId: string | null | undefined,
  options: { limit?: number } = {},
): UseQueryResult<MatchSummary[]> {
  const { isConfigured, isAuthenticated, user } = useAuth();

  return useQuery({
    queryKey: matchKeys.forItem(user?.id ?? null, itemId ?? "", options.limit),
    queryFn: () =>
      getMatchesForItem(
        itemId as string,
        options.limit === undefined ? {} : { limit: options.limit },
      ),
    enabled: isConfigured && isAuthenticated && Boolean(itemId),
    staleTime: 30_000,
  });
}

/**
 * Invalidates every match surface.
 *
 * Deliberately coarse within the match domain and no wider: the Matches screen,
 * the Home preview, the Activity tab and any per-item list all show the same
 * rows, so a dismissal changes all of them at once. Nothing outside `["matches"]`
 * is touched — a dismissal does not alter any listing.
 */
function useInvalidateMatches() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: matchKeys.all });
}

/**
 * "Not my item".
 *
 * Hides the match for the signed-in user only; the other participant keeps
 * seeing it. The RPC is idempotent, so a retry is safe.
 */
export function useDismissMatch(): UseMutationResult<void, Error, { matchId: string }> {
  const invalidate = useInvalidateMatches();

  return useMutation<void, Error, { matchId: string }>({
    mutationFn: ({ matchId }) => dismissMatch(matchId),
    onSuccess: invalidate,
  });
}

/** Undoes the signed-in user's own dismissal. */
export function useRestoreMatch(): UseMutationResult<void, Error, { matchId: string }> {
  const invalidate = useInvalidateMatches();

  return useMutation<void, Error, { matchId: string }>({
    mutationFn: ({ matchId }) => restoreMatch(matchId),
    onSuccess: invalidate,
  });
}
