/**
 * Listing query and mutation hooks.
 *
 * Thin TanStack Query wrappers over the listing service, so components hold no
 * fetching logic (AGENTS.md §4). TanStack Query is the single owner of this server
 * state — nothing here is mirrored into `kept-context`.
 */

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseInfiniteQueryResult,
  type InfiniteData,
  type UseQueryResult,
} from "@tanstack/react-query";

import { useAuth } from "@/lib/auth-context";
import { matchKeys } from "./use-matches";
import {
  cancelMyItem,
  closeMyItem,
  createFoundItem,
  createLostItem,
  deleteItemImage,
  getExploreItems,
  getItemById,
  getMyItemDetail,
  getMyItems,
  updateMyItem,
  uploadItemImages,
} from "@/lib/services/listing-service";
import { normalizeExploreFilters } from "@/lib/services/listing-types";
import type {
  CreateFoundListingInput,
  CreateListingResult,
  CreateLostReportInput,
  CursorPage,
  ExploreFilters,
  ListingSummary,
  OwnerListingDetail,
  PublicListingDetail,
  UpdateListingInput,
} from "@/lib/services/listing-types";

/**
 * Query keys. `mine` is keyed by user id so one account's reports can never be
 * served from another's cache entry (docs/authAndRls.md §94).
 */
export const listingKeys = {
  all: ["listings"] as const,
  /**
   * Filters are normalised into the key, so `?q=hoodie` and `?q=%20hoodie%20`
   * share one cache entry while two genuinely different boards never do. `limit`
   * is part of the key because it changes the page contents, not just their count.
   */
  explore: (filters: ExploreFilters, limit?: number) =>
    ["listings", "explore", normalizeExploreFilters(filters), limit ?? null] as const,
  detail: (itemId: string) => ["listings", "detail", itemId] as const,
  ownerDetail: (itemId: string) => ["listings", "owner-detail", itemId] as const,
  mine: (userId: string | null, listingType?: "LOST" | "FOUND") =>
    ["listings", "mine", userId, listingType ?? "ALL"] as const,
};

/**
 * A single page of the board.
 *
 * Kept for the surfaces that want exactly one bounded read — the Home strip — so
 * they do not pull in pagination they never use.
 */
export function useExploreItems(
  filters: ExploreFilters = {},
  options: { limit?: number | undefined } = {},
): UseQueryResult<CursorPage<ListingSummary>> {
  const { isConfigured, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: listingKeys.explore(filters, options.limit),
    queryFn: () => getExploreItems(filters, { limit: options.limit }),
    // Explore is behind auth in the MVP scope (docs/authAndRls.md §105).
    enabled: isConfigured && isAuthenticated,
    staleTime: 30_000,
  });
}

/**
 * The paginated board.
 *
 * `getNextPageParam` hands back the opaque composite cursor the service minted for
 * the last row of the page, so paging is keyset and stays O(1) at depth. A null
 * cursor is the end of the board and stops TanStack Query asking for more.
 *
 * Changing a filter changes the query key, which starts a fresh first page — so
 * pagination resets on a new search without any manual bookkeeping.
 */
export function useInfiniteExploreItems(
  filters: ExploreFilters = {},
  options: { limit?: number | undefined } = {},
): UseInfiniteQueryResult<InfiniteData<CursorPage<ListingSummary>>, Error> {
  const { isConfigured, isAuthenticated } = useAuth();

  return useInfiniteQuery({
    queryKey: listingKeys.explore(filters, options.limit),
    queryFn: ({ pageParam }) =>
      getExploreItems(filters, { limit: options.limit, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : null),
    enabled: isConfigured && isAuthenticated,
    staleTime: 30_000,
  });
}

export function useItem(itemId: string): UseQueryResult<PublicListingDetail | null> {
  const { isConfigured, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: listingKeys.detail(itemId),
    queryFn: () => getItemById(itemId),
    enabled: isConfigured && isAuthenticated && itemId.length > 0,
    staleTime: 30_000,
  });
}

/** The owner's own view, including private details for a FOUND listing. */
export function useMyItemDetail(
  itemId: string,
  options: { enabled?: boolean } = {},
): UseQueryResult<OwnerListingDetail | null> {
  const { isConfigured, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: listingKeys.ownerDetail(itemId),
    queryFn: () => getMyItemDetail(itemId),
    enabled: (options.enabled ?? true) && isConfigured && isAuthenticated && itemId.length > 0,
    staleTime: 30_000,
  });
}

export function useMyItems(listingType?: "LOST" | "FOUND"): UseQueryResult<ListingSummary[]> {
  const { user, isConfigured } = useAuth();

  return useQuery({
    queryKey: listingKeys.mine(user?.id ?? null, listingType),
    queryFn: () => getMyItems(listingType),
    enabled: isConfigured && Boolean(user?.id),
    staleTime: 30_000,
  });
}

/**
 * Invalidates every listing surface a write can affect.
 *
 * Deliberately coarse within the listing domain and no wider: discovery, the
 * caller's own reports and the affected detail all change together
 * (docs/apiAndDataContracts.md §126, §127). Matching-relevant writes also
 * refresh matches because the backend trigger may create or expire pairs.
 */
function useInvalidateListings(matchRelevant = false) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: listingKeys.all }),
      ...(matchRelevant ? [queryClient.invalidateQueries({ queryKey: matchKeys.all })] : []),
    ]);
}

export function useCreateLostItem() {
  const invalidate = useInvalidateListings(true);

  return useMutation<CreateListingResult, Error, { input: CreateLostReportInput; images?: File[] }>(
    {
      mutationFn: ({ input, images }) => createLostItem(input, images ?? []),
      onSuccess: invalidate,
      // A creation retried blindly would publish a second listing.
      retry: false,
    },
  );
}

export function useCreateFoundItem() {
  const invalidate = useInvalidateListings(true);

  return useMutation<
    CreateListingResult,
    Error,
    { input: CreateFoundListingInput; images?: File[] }
  >({
    mutationFn: ({ input, images }) => createFoundItem(input, images ?? []),
    onSuccess: invalidate,
    retry: false,
  });
}

export function useUpdateItem() {
  const invalidate = useInvalidateListings(true);

  return useMutation<void, Error, { itemId: string; input: UpdateListingInput }>({
    mutationFn: ({ itemId, input }) => updateMyItem(itemId, input),
    onSuccess: invalidate,
  });
}

export function useCloseItem() {
  const invalidate = useInvalidateListings(true);

  return useMutation<void, Error, { itemId: string; reason?: string | null }>({
    mutationFn: ({ itemId, reason }) => closeMyItem(itemId, reason),
    onSuccess: invalidate,
  });
}

export function useCancelItem() {
  const invalidate = useInvalidateListings(true);

  return useMutation<void, Error, { itemId: string; reason?: string | null }>({
    mutationFn: ({ itemId, reason }) => cancelMyItem(itemId, reason),
    onSuccess: invalidate,
  });
}

export function useUploadItemImages() {
  const invalidate = useInvalidateListings();

  return useMutation<number, Error, { itemId: string; files: File[] }>({
    mutationFn: ({ itemId, files }) => uploadItemImages(itemId, files),
    onSuccess: invalidate,
    retry: false,
  });
}

export function useDeleteItemImage() {
  const invalidate = useInvalidateListings();

  return useMutation<void, Error, { imageId: string; storagePath: string }>({
    mutationFn: ({ imageId, storagePath }) => deleteItemImage(imageId, storagePath),
    onSuccess: invalidate,
  });
}
