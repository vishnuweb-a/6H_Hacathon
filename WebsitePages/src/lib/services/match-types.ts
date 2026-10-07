/**
 * Match domain types.
 *
 * Mirrors the DTOs in docs/apiAndDataContracts.md §32–§37, with the Phase 4
 * per-user dismissal refinement.
 *
 * PRIVACY, structurally. These shapes are built from `get_my_matches()` /
 * `get_matches_for_item()`, whose SQL return types have no latitude, longitude or
 * distance column at all — so there is no coordinate in the data that reaches this
 * file, and none to forget to strip (docs/securityAndService.md §24, §64,
 * docs/matchingEngine.md §111). Private verification evidence is likewise absent:
 * it is not a matching input and not in the projection.
 *
 * SCORES ARE READ-ONLY HERE. Every score is computed in Postgres and arrives
 * already final. Nothing in this module recomputes, re-weights or re-derives an
 * authoritative score — the frontend only maps a number to a label
 * (AGENTS.md: never calculate an authoritative match score in the frontend).
 */

import type { Database } from "../database.types";
import { categoryLabel, type ListingStatus, type ListingType } from "./listing-types";

type GeneratedMatchRow = Database["public"]["Functions"]["get_my_matches"]["Returns"][number];
// PostgreSQL RETURNS TABLE does not encode column nullability in generated RPC
// types. These fields are nullable by the schema and the explicit RPC projection.
type NullableMatchColumns =
  | "category_score"
  | "location_score"
  | "time_score"
  | "description_score"
  | "other_brand"
  | "other_color"
  | "other_event_time";
type MatchRow = Omit<GeneratedMatchRow, NullableMatchColumns> & {
  [K in NullableMatchColumns]: GeneratedMatchRow[K] | null;
};

/** docs/apiAndDataContracts.md §7 — the persisted match lifecycle. */
export type MatchStatus = Database["public"]["Enums"]["match_status"];

/** docs/apiAndDataContracts.md §33. `LOW` exists in the backend band function but
 * is never displayed: the read surfaces filter below the 60 display threshold. */
export type MatchStrength = "POSSIBLE" | "STRONG" | "VERY_STRONG";

/** docs/apiAndDataContracts.md §34 — only public-safe signals. */
export type MatchSignal = "CATEGORY" | "LOCATION" | "DATE" | "TIME" | "DESCRIPTION";

/**
 * Display thresholds and labels.
 *
 * These mirror `matching_config()` in the database, which stays authoritative.
 * They are duplicated here only for labelling a score the backend already
 * decided — never to decide whether a match qualifies. That filtering happens
 * server-side.
 */
export const MATCH_DISPLAY_THRESHOLD = 60;
export const MATCH_STRONG_THRESHOLD = 75;
export const MATCH_VERY_STRONG_THRESHOLD = 90;

/**
 * The approved UI wording (docs/matchingEngine.md §38, task §21).
 *
 * Deliberately phrased as similarity, never as ownership or probability. The
 * screens render "92% Very strong match", never "92% probability this is yours"
 * and never "92% ownership confidence" (docs/securityAndService.md §67).
 */
export const MATCH_STRENGTH_LABELS: Record<MatchStrength, string> = {
  VERY_STRONG: "Very strong match",
  STRONG: "Strong match",
  POSSIBLE: "Possible match",
};

/** Human-readable, public-safe explanation chips (docs/matchingEngine.md §59, §113). */
export const MATCH_SIGNAL_LABELS: Record<MatchSignal, string> = {
  CATEGORY: "Same category",
  LOCATION: "Nearby location",
  DATE: "Dates line up",
  TIME: "Similar time",
  DESCRIPTION: "Similar description",
};

/**
 * The other party's listing as shown on a match card: the public-safe projection
 * only, identical in spirit to `ListingSummary` but sourced from the match RPC.
 */
export interface MatchedListing {
  id: string;
  coverImageUrl: string | null;
  listingType: ListingType;
  title: string;
  category: string;
  categoryLabel: string;
  brand: string | null;
  color: string | null;
  description: string;
  eventDate: string;
  eventTime: string | null;
  locationText: string;
  status: ListingStatus;
  userId: string;
}

/** docs/apiAndDataContracts.md §32, §35, with the Phase 4 `isDismissed` field. */
export interface MatchSummary {
  id: string;
  lostItemId: string;
  foundItemId: string;
  overallScore: number;
  /** Whole percent, for display. The backend keeps two decimals for ranking. */
  displayScore: number;
  categoryScore: number | null;
  locationScore: number | null;
  timeScore: number | null;
  descriptionScore: number | null;
  strength: MatchStrength;
  status: MatchStatus;
  matchedSignals: MatchSignal[];
  /**
   * True when the CALLING user has dismissed this match. It is per-user state:
   * the other participant's view is unaffected (Phase 4 refinement).
   */
  isDismissed: boolean;
  createdAt: string;
  updatedAt: string;
  /** The side the caller does not own — the listing being suggested to them. */
  otherListing: MatchedListing;
  /** Which of the caller's own listings produced this match. */
  myItemId: string;
  myItemTitle: string;
}

const VALID_SIGNALS: readonly string[] = ["CATEGORY", "LOCATION", "DATE", "TIME", "DESCRIPTION"];

/**
 * Maps a stored score to its band.
 *
 * The backend already returns `strength`; this exists for the case where only a
 * number is in hand, and as the single definition the UI trusts. Anything below
 * the display threshold is reported as POSSIBLE rather than inventing a visible
 * "LOW" state, because the read surfaces never return those rows in the first
 * place.
 */
export function matchStrengthFromScore(score: number): MatchStrength {
  if (score >= MATCH_VERY_STRONG_THRESHOLD) return "VERY_STRONG";
  if (score >= MATCH_STRONG_THRESHOLD) return "STRONG";
  return "POSSIBLE";
}

function normalizeStrength(value: string | null, score: number): MatchStrength {
  if (value === "VERY_STRONG" || value === "STRONG" || value === "POSSIBLE") return value;
  // "LOW", null, or anything unexpected: fall back to the score, which is
  // authoritative anyway.
  return matchStrengthFromScore(score);
}

/**
 * Row -> DTO.
 *
 * Note what is NOT here: no coordinate, no distance, no private detail, and no
 * recomputed score. `overall_score` is passed through as the backend produced it;
 * `displayScore` is only a rounding for the UI, never a recalculation
 * (task §19, §20).
 */
export function mapMatchSummary(row: MatchRow): MatchSummary {
  const overallScore = Number(row.overall_score);

  return {
    id: row.id,
    lostItemId: row.lost_item_id,
    foundItemId: row.found_item_id,
    overallScore,
    displayScore: Math.round(overallScore),
    categoryScore: row.category_score === null ? null : Number(row.category_score),
    locationScore: row.location_score === null ? null : Number(row.location_score),
    timeScore: row.time_score === null ? null : Number(row.time_score),
    descriptionScore: row.description_score === null ? null : Number(row.description_score),
    strength: normalizeStrength(row.strength, overallScore),
    status: row.status,
    matchedSignals: (row.matched_signals ?? []).filter((signal): signal is MatchSignal =>
      VALID_SIGNALS.includes(signal),
    ),
    isDismissed: row.is_dismissed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    otherListing: {
      id: row.other_item_id,
      coverImageUrl: null,
      listingType: row.other_listing_type,
      title: row.other_title,
      category: row.other_category,
      categoryLabel: categoryLabel(row.other_category),
      brand: row.other_brand,
      color: row.other_color,
      description: row.other_description,
      eventDate: row.other_event_date,
      eventTime: row.other_event_time,
      locationText: row.other_location_text,
      status: row.other_status,
      userId: row.other_user_id,
    },
    myItemId: row.my_item_id,
    myItemTitle: row.my_item_title,
  };
}

/** The tab filter on the Matches screen. */
export type MatchStrengthFilter = MatchStrength | "ALL";

export const MATCH_FILTER_OPTIONS: readonly { value: MatchStrengthFilter; label: string }[] = [
  { value: "ALL", label: "All matches" },
  { value: "VERY_STRONG", label: "Very strong" },
  { value: "STRONG", label: "Strong" },
  { value: "POSSIBLE", label: "Possible" },
];
