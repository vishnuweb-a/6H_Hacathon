/**
 * Listing presentation pieces shared by Explore, Activity and the detail screen.
 *
 * These replace the mock-shaped `ItemCard` from `kept-shared.tsx` with one that
 * consumes a real `ListingSummary`. The visual language is unchanged — the same
 * panel, badge, tones and layout as the approved Lovable design; only the data
 * shape and the image fallback are new.
 */

import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ImageOff, MapPin, Search, ShieldCheck, TriangleAlert } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { Badge } from "./kept-shared";
import { categoryLabel, STATUS_LABELS, type ListingSummary } from "@/lib/services/listing-types";

/** Matches the mock's `dateLabel` output so the card typography is unchanged. */
export function listingDateLabel(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Stable per-item tint, so a card keeps the playful colour variety of the mock. */
const TINTS = ["bg-pink/20", "bg-mint/30", "bg-purple/15", "bg-orange/15"] as const;

function tintFor(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 997;
  }
  return TINTS[hash % TINTS.length] ?? TINTS[0];
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((part) => part[0] ?? "").join("");
  return letters.toUpperCase() || "??";
}

/**
 * Listing image with a fallback.
 *
 * A signed URL can expire or fail to mint, which is a rendering concern rather than
 * missing media (docs/storageAndMedia.md §55, §63). Both cases render the same calm
 * placeholder instead of a broken image icon.
 */
export function ListingImage({
  url,
  alt,
  className = "",
}: {
  url: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <div
        className={`grid place-content-center text-foreground/40 ${className}`}
        role="img"
        aria-label={`${alt} — no photo available`}
      >
        <ImageOff size={28} strokeWidth={1.5} aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      width={512}
      height={512}
      loading="lazy"
      className={`item-photo ${className}`}
      onError={() => setFailed(true)}
    />
  );
}

export function ListingCard({
  listing,
  list = false,
}: {
  listing: ListingSummary;
  list?: boolean;
}) {
  const isLost = listing.listingType === "LOST";
  const creatorName = listing.creatorName ?? null;

  return (
    <Link
      to="/listing/$id"
      params={{ id: listing.id }}
      className={`panel group transition-transform hover:-translate-y-1 ${list ? "flex" : ""}`}
    >
      <div
        className={`relative overflow-hidden ${list ? "w-40 min-w-32" : "h-52"} ${tintFor(listing.id)}`}
      >
        <ListingImage url={listing.coverImageUrl} alt={listing.title} className="h-full w-full" />
        <span className="absolute top-3 left-3">
          <Badge tone={isLost ? "pink" : "lime"}>{isLost ? "↗ LOST" : "↙ FOUND"}</Badge>
        </span>
        {listing.status !== "ACTIVE" && (
          <span className="absolute top-3 right-3">
            <Badge tone="mint">{STATUS_LABELS[listing.status]}</Badge>
          </span>
        )}
      </div>
      <div className="p-4 flex-1">
        <div className="eyebrow text-muted-foreground mb-2">{categoryLabel(listing.category)}</div>
        <h3 className="font-bold text-lg flex justify-between gap-3">
          {listing.title}
          <ArrowUpRight className="shrink-0" size={18} aria-hidden="true" />
        </h3>
        <p className="text-xs mt-3 flex gap-1.5 items-center">
          <MapPin size={13} aria-hidden="true" />
          {listing.locationText}
          <span className="ml-auto font-mono text-[10px]">
            {listingDateLabel(listing.eventDate)}
          </span>
        </p>
        {creatorName && (
          <div className="flex items-center gap-2 text-[11px] border-t border-foreground/15 pt-3 mt-3">
            <span className="w-5 h-5 rounded-full bg-foreground text-primary-foreground grid place-content-center text-[8px]">
              {initialsFor(creatorName)}
            </span>
            {creatorName}
            <ShieldCheck size={13} className="ml-auto" aria-hidden="true" />
          </div>
        )}
      </div>
    </Link>
  );
}

/** Card-shaped loading placeholders, so the grid does not jump when data lands. */
export function ListingCardSkeleton({ list = false }: { list?: boolean }) {
  return (
    <div className={`panel ${list ? "flex" : ""}`} aria-hidden="true">
      <Skeleton className={`rounded-none ${list ? "w-40 min-w-32" : "h-52 w-full"}`} />
      <div className="p-4 flex-1 space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function ListingGridSkeleton({
  count = 8,
  list = false,
}: {
  count?: number;
  list?: boolean;
}) {
  return (
    <div
      className={list ? "grid gap-4" : "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading items…</span>
      {Array.from({ length: count }, (_, index) => (
        <ListingCardSkeleton key={index} list={list} />
      ))}
    </div>
  );
}

/** The mock's empty-state panel, reusable for any listing surface. */
export function ListingEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel p-12 text-center">
      <Search className="mx-auto mb-4" aria-hidden="true" />
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-muted-foreground mt-2 max-w-md mx-auto">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/**
 * Error state with a recovery path, never a dead end (AGENTS.md §11.7).
 * `role="alert"` so the failure is announced rather than only seen.
 */
export function ListingErrorState({
  title = "That did not load.",
  description = "Something went wrong on our side. Your things are safe — try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="panel p-12 text-center" role="alert">
      <TriangleAlert className="mx-auto mb-4" aria-hidden="true" />
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-muted-foreground mt-2 max-w-md mx-auto">{description}</p>
      {onRetry && (
        <Button variant="lime" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
