/**
 * The Explore URL contract.
 *
 * Explore state lives in the route's search params and nowhere else: no filter
 * Context, no duplicated component state that the URL has to be kept in step with.
 * That makes a reload, a Back/Forward step and a pasted link all reproduce the same
 * board, because they all reproduce the same URL.
 *
 * Everything here is total: any shape of incoming search object normalises to a
 * valid `ExploreSearch`. A hand-edited or stale URL must degrade to a sensible
 * board, never to a crash or an error screen.
 */

import {
  DEFAULT_PAGE_SIZE,
  ITEM_CATEGORIES,
  MAX_PAGE_SIZE,
  isIsoDate,
  type ExploreFilters,
  type ExploreSort,
  type ListingType,
} from "./services/listing-types";

/** The query parameters Explore reads and writes. */
export interface ExploreSearch {
  /** Free-text search over the public listing fields. */
  q?: string | undefined;
  /** `ALL` is the default and is omitted from the URL rather than spelled out. */
  type?: ListingType | undefined;
  category?: string | undefined;
  /** Inclusive `event_date` bounds, YYYY-MM-DD. */
  from?: string | undefined;
  to?: string | undefined;
  location?: string | undefined;
  sort?: ExploreSort | undefined;
  /** Page size, clamped to the documented contract (§31). */
  limit?: number | undefined;
  /** `list` renders the compact row layout; absent means the card grid. */
  view?: "list" | undefined;
}

const MAX_TEXT_LENGTH = 120;

function readText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, MAX_TEXT_LENGTH);
  return trimmed.length > 0 ? trimmed : undefined;
}

function readListingType(value: unknown): ListingType | undefined {
  return value === "LOST" || value === "FOUND" ? value : undefined;
}

function readCategory(value: unknown): string | undefined {
  // An unknown category is dropped rather than passed through: the vocabulary is
  // the one fixed set in listing-types / the items_category_allowed constraint.
  return typeof value === "string" && (ITEM_CATEGORIES as readonly string[]).includes(value)
    ? value
    : undefined;
}

function readDate(value: unknown): string | undefined {
  return typeof value === "string" && isIsoDate(value) ? value : undefined;
}

function readSort(value: unknown): ExploreSort | undefined {
  // NEWEST is the default, so it is left out of the URL.
  return value === "OLDEST" ? "OLDEST" : undefined;
}

function readLimit(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  const clamped = Math.min(Math.max(Math.trunc(parsed), 1), MAX_PAGE_SIZE);
  return clamped === DEFAULT_PAGE_SIZE ? undefined : clamped;
}

/**
 * Route `validateSearch`. Returns a canonical object: defaults are represented by
 * an absent key, so two URLs meaning the same board produce one cache entry.
 */
export function validateExploreSearch(search: Record<string, unknown>): ExploreSearch {
  const next: ExploreSearch = {};
  const q = readText(search["q"]);
  if (q) next.q = q;
  const type = readListingType(search["type"]);
  if (type) next.type = type;
  const category = readCategory(search["category"]);
  if (category) next.category = category;
  const from = readDate(search["from"]);
  if (from) next.from = from;
  const to = readDate(search["to"]);
  if (to) next.to = to;
  const location = readText(search["location"]);
  if (location) next.location = location;
  const sort = readSort(search["sort"]);
  if (sort) next.sort = sort;
  const limit = readLimit(search["limit"]);
  if (limit) next.limit = limit;
  if (search["view"] === "list") next.view = "list";

  // A reversed range is dropped here as well as in the service, so the control
  // never shows a range that the query has quietly ignored.
  if (next.from && next.to && next.from > next.to) delete next.to;
  return next;
}

/** Maps the URL shape onto the service's filter shape (§29). */
export function searchToExploreFilters(search: ExploreSearch): ExploreFilters {
  return {
    query: search.q,
    listingType: search.type ?? "ALL",
    category: search.category,
    dateFrom: search.from,
    dateTo: search.to,
    locationQuery: search.location,
    sort: search.sort ?? "NEWEST",
  };
}

/** True when the board is narrowed, which selects the filtered empty state. */
export function hasActiveExploreFilters(search: ExploreSearch): boolean {
  return Boolean(
    search.q ?? search.type ?? search.category ?? search.from ?? search.to ?? search.location,
  );
}

/** Reset clears the filters but keeps presentation choices (view, page size). */
export function clearedExploreSearch(search: ExploreSearch): ExploreSearch {
  const next: ExploreSearch = {};
  if (search.view) next.view = search.view;
  if (search.limit) next.limit = search.limit;
  return next;
}
