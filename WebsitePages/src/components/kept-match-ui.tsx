/**
 * Match UI primitives.
 *
 * The visuals are the approved Lovable design, unchanged: the three-column match
 * panel, the badge tone per strength, the oversized score, the signal chips and
 * the "SIMILARITY, NOT OWNERSHIP" caption. Only the data behind them changed from
 * demo fixtures to real backend rows, so these components exist to hold that
 * markup in one place now that three screens render real matches.
 *
 * LANGUAGE RULE (docs/securityAndService.md §67, docs/matchingEngine.md §2.1,
 * task §21). A score is presented as SIMILARITY and never as ownership or
 * probability. "92% Very strong match" is allowed; "92% probability this is
 * yours" and "92% ownership confidence" are not. The caption under every score is
 * there to keep that explicit on screen.
 *
 * PRIVACY. These components receive a `MatchSummary`, which carries no
 * coordinates, no distance and no private verification evidence — there is
 * nothing sensitive available to render even by accident.
 */

import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Sparkles, X } from "lucide-react";

import { Badge } from "./kept-shared";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { ListingImage, listingDateLabel } from "./kept-listing-ui";
import {
  MATCH_SIGNAL_LABELS,
  MATCH_STRENGTH_LABELS,
  type MatchStrength,
  type MatchSummary,
} from "@/lib/services/match-types";

/** The approved tone per band: lime for the strongest, then mint, then orange. */
const STRENGTH_TONE: Record<MatchStrength, string> = {
  VERY_STRONG: "lime",
  STRONG: "mint",
  POSSIBLE: "orange",
};

export function MatchStrengthBadge({ strength }: { strength: MatchStrength }) {
  return <Badge tone={STRENGTH_TONE[strength]}>{MATCH_STRENGTH_LABELS[strength]}</Badge>;
}

/**
 * The public-safe explanation chips (docs/matchingEngine.md §59, §113).
 *
 * A signal the backend did not report is shown greyed rather than hidden, so the
 * card explains what did NOT line up as well as what did — without ever naming a
 * distance, a coordinate or a private clue.
 */
export function MatchSignals({ match }: { match: MatchSummary }) {
  const present = new Set(match.matchedSignals);
  const order = ["CATEGORY", "LOCATION", "DATE", "DESCRIPTION"] as const;

  return (
    <div className="flex flex-wrap gap-3 mt-4 eyebrow">
      {order.map((signal) => {
        const agreed = present.has(signal);
        return (
          <span key={signal} className={agreed ? undefined : "text-muted-foreground/60"}>
            {agreed ? "✓" : "≈"}{" "}
            {signal === "CATEGORY" && match.categoryScore !== 100
              ? "Related categories"
              : MATCH_SIGNAL_LABELS[signal]}
          </span>
        );
      })}
    </div>
  );
}

/**
 * The score block.
 *
 * `displayScore` is a whole percent — the backend keeps two decimals for
 * deterministic ranking, and the UI never shows that precision (task §20).
 */
export function MatchScore({ match }: { match: MatchSummary }) {
  return (
    <>
      <p className="text-5xl font-extrabold">
        {match.displayScore}
        <span className="text-xl">%</span>
      </p>
      <p className="eyebrow mt-1 mb-5">SIMILARITY, NOT OWNERSHIP</p>
    </>
  );
}

/**
 * The full match panel used on the Matches screen.
 *
 * `onDismiss` is optional: the Home and Activity previews render the same card
 * without the dismiss affordance.
 *
 * There is deliberately no Claim action here. A real match offers "See item"
 * only; claiming belongs to Phase 5 (task §37).
 */
export function MatchCard({
  match,
  onDismiss,
  isDismissing = false,
}: {
  match: MatchSummary;
  onDismiss?: (matchId: string) => void;
  isDismissing?: boolean;
}) {
  const { otherListing } = match;
  const foundSide = otherListing.listingType === "FOUND";

  return (
    <article className="panel p-5 grid md:grid-cols-[120px_1fr_180px] gap-6 items-center">
      <div className="h-32 border-2 border-foreground bg-mint/20">
        <ListingImage
          url={otherListing.coverImageUrl}
          alt={otherListing.title}
          className="h-full w-full"
        />
      </div>
      <div className="min-w-0 break-words">
        <MatchStrengthBadge strength={match.strength} />
        <h2 className="text-2xl font-bold mt-3">{otherListing.title}</h2>
        <p className="text-sm text-muted-foreground mt-2">
          {foundSide ? "Found near" : "Lost near"} {otherListing.locationText} ·{" "}
          {listingDateLabel(otherListing.eventDate)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Compared with your “{match.myItemTitle}”
        </p>
        <MatchSignals match={match} />
      </div>
      <div>
        <MatchScore match={match} />
        <Button asChild variant="lime">
          <Link to="/listing/$id" params={{ id: otherListing.id }}>
            See item <ArrowUpRight />
          </Link>
        </Button>
        {onDismiss && (
          <button
            type="button"
            onClick={() => onDismiss(match.id)}
            disabled={isDismissing}
            className="mt-3 min-h-11 px-2 text-xs font-bold underline inline-flex items-center gap-1 disabled:opacity-50"
          >
            <X size={12} aria-hidden="true" />
            {isDismissing ? "Hiding…" : "Not my item"}
          </button>
        )}
      </div>
    </article>
  );
}

/** The compact card for the Home strip and the Activity tab. */
export function MatchPreviewCard({
  match,
  tone = "bg-pink/20",
}: {
  match: MatchSummary;
  tone?: string;
}) {
  const { otherListing } = match;

  return (
    <Link
      to="/listing/$id"
      params={{ id: otherListing.id }}
      className="panel p-4 flex gap-4 bg-paper"
    >
      <div className={`w-20 sm:w-28 h-32 shrink-0 ${tone}`}>
        <ListingImage
          url={otherListing.coverImageUrl}
          alt={otherListing.title}
          className="h-full w-full"
        />
      </div>
      <div className="min-w-0 break-words flex flex-col justify-between">
        <Badge tone={STRENGTH_TONE[match.strength]}>
          <Sparkles size={11} />
          {MATCH_STRENGTH_LABELS[match.strength].toUpperCase()}
        </Badge>
        <h3 className="font-bold text-lg mt-2">{otherListing.title}</h3>
        <p className="eyebrow mt-1">{match.displayScore}% similarity</p>
        <p className="text-xs mt-2 text-muted-foreground">{otherListing.locationText}</p>
        <span className="text-xs underline mt-3 font-bold">Take a closer look ↗</span>
      </div>
    </Link>
  );
}

/**
 * The calm empty state (task §38).
 *
 * It must not imply the item cannot be recovered, and it may promise continued
 * comparison only because the engine really does recalculate when an opposing
 * listing is created — an AFTER trigger on `items` calls `generate_matches()`.
 */
export function MatchEmptyState({ action }: { action?: ReactNode }) {
  return (
    <div className="panel p-12 text-center">
      <Sparkles className="mx-auto mb-4" aria-hidden="true" />
      <h2 className="text-xl font-bold">No strong matches yet.</h2>
      <p className="text-muted-foreground mt-2 max-w-md mx-auto">
        We will keep comparing your reports against every new listing as it is posted. Nothing is
        lost — this just takes a little time.
      </p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function MatchListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-5" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading your matches…</span>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="panel p-5 grid md:grid-cols-[120px_1fr_180px] gap-6 items-center"
        >
          <Skeleton className="h-32 w-full" />
          <div>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-3/4 mt-3" />
            <Skeleton className="h-4 w-1/2 mt-3" />
            <div className="flex gap-3 mt-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div>
            <Skeleton className="h-12 w-24" />
            <Skeleton className="h-10 w-full mt-5" />
          </div>
        </div>
      ))}
    </div>
  );
}
