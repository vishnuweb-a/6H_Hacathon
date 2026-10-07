/**
 * The owner's listing management surface, used by the Activity screen's
 * "My Lost Reports" and "My Found Listings" tabs.
 *
 * The approved design has no dedicated edit screen, so editing is an inline panel
 * in the design language already in use (the same pattern Phase 1 used for the
 * profile editor) rather than a new route. Only the fields
 * docs/authAndRls.md §20 lists as user-editable appear here.
 */

import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, Pencil, X } from "lucide-react";
import { z } from "zod";

import { Button } from "./ui/button";
import { Badge } from "./kept-shared";
import {
  ListingCard,
  ListingEmptyState,
  ListingErrorState,
  ListingGridSkeleton,
} from "./kept-listing-ui";
import {
  useCancelItem,
  useCloseItem,
  useMyItemDetail,
  useMyItems,
  useUpdateItem,
} from "@/hooks/use-listings";
import {
  CATEGORY_LABELS,
  ITEM_CATEGORIES,
  STATUS_LABELS,
  type ListingSummary,
} from "@/lib/services/listing-types";

const titleSchema = z.string().trim().min(3).max(120);
const descriptionSchema = z.string().trim().min(10).max(1000);
const locationSchema = z.string().trim().min(2).max(255);

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Inline editor for one listing.
 *
 * Loads the owner detail on open so the form starts from the stored values,
 * including the description and time that the summary does not carry.
 */
function ListingEditor({ listing, onClose }: { listing: ListingSummary; onClose: () => void }) {
  const { data: detail, isPending, isError } = useMyItemDetail(listing.id);
  const updateMutation = useUpdateItem();
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<{
    title: string;
    category: string;
    brand: string;
    color: string;
    description: string;
    locationText: string;
    eventDate: string;
    eventTime: string;
  } | null>(null);

  if (isPending) {
    return (
      <p role="status" aria-live="polite" className="text-sm">
        Loading this listing…
      </p>
    );
  }
  if (isError || !detail) {
    return (
      <p role="alert" className="text-destructive text-sm font-bold">
        We could not load this listing to edit. Please try again.
      </p>
    );
  }

  const form = draft ?? {
    title: detail.title,
    category: detail.category,
    brand: detail.brand ?? "",
    color: detail.color ?? "",
    description: detail.description,
    locationText: detail.locationText,
    eventDate: detail.eventDate,
    eventTime: detail.eventTime?.slice(0, 5) ?? "",
  };

  const set = (name: keyof typeof form, value: string) => setDraft({ ...form, [name]: value });

  const save = async () => {
    setError("");
    if (!titleSchema.safeParse(form.title).success) {
      setError("Item names are 3–120 characters.");
      return;
    }
    if (!descriptionSchema.safeParse(form.description).success) {
      setError("Descriptions are 10–1000 characters.");
      return;
    }
    if (!locationSchema.safeParse(form.locationText).success) {
      setError("Add an approximate location.");
      return;
    }
    if (form.eventDate > todayIso()) {
      setError("The date cannot be in the future.");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        itemId: listing.id,
        input: {
          title: form.title.trim(),
          category: form.category,
          brand: form.brand.trim() || null,
          color: form.color.trim() || null,
          description: form.description.trim(),
          eventDate: form.eventDate,
          eventTime: form.eventTime || null,
          locationText: form.locationText.trim(),
        },
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not save those changes.");
    }
  };

  return (
    <div className="grid gap-4">
      <label className="field-label">
        Item name
        <input
          className="field"
          maxLength={120}
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
        />
      </label>
      <label className="field-label">
        Category
        <select
          className="field"
          value={form.category}
          onChange={(e) => set("category", e.target.value)}
        >
          {ITEM_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {CATEGORY_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="field-label">
          Brand
          <input
            className="field"
            maxLength={120}
            value={form.brand}
            onChange={(e) => set("brand", e.target.value)}
          />
        </label>
        <label className="field-label">
          Colour
          <input
            className="field"
            maxLength={80}
            value={form.color}
            onChange={(e) => set("color", e.target.value)}
          />
        </label>
      </div>
      <label className="field-label">
        Public description
        <textarea
          className="field min-h-24"
          maxLength={1000}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </label>
      <label className="field-label">
        Approximate location
        <input
          className="field"
          maxLength={255}
          value={form.locationText}
          onChange={(e) => set("locationText", e.target.value)}
        />
      </label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="field-label">
          Date
          <input
            type="date"
            className="field"
            max={todayIso()}
            value={form.eventDate}
            onChange={(e) => set("eventDate", e.target.value)}
          />
        </label>
        <label className="field-label">
          Approximate time
          <input
            type="time"
            className="field"
            value={form.eventTime}
            onChange={(e) => set("eventTime", e.target.value)}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm font-bold">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button variant="lime" disabled={updateMutation.isPending} onClick={() => void save()}>
          {updateMutation.isPending ? "Saving…" : "Save changes"}
        </Button>
        <Button variant="outline" disabled={updateMutation.isPending} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/**
 * Close / cancel controls.
 *
 * Both go through their dedicated RPC, never a status write
 * (docs/apiAndDataContracts.md §28). RETURNED and RECOVERY_IN_PROGRESS are not
 * offered: those are backend recovery transitions (docs/securityAndService.md §15).
 */
function ListingLifecycleActions({ listing }: { listing: ListingSummary }) {
  const closeMutation = useCloseItem();
  const cancelMutation = useCancelItem();
  const [confirming, setConfirming] = useState<"CLOSE" | "CANCEL" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const isBusy = closeMutation.isPending || cancelMutation.isPending;

  if (listing.status !== "ACTIVE") {
    return (
      <p className="text-xs text-muted-foreground">
        This listing is {STATUS_LABELS[listing.status].toLowerCase()}.
      </p>
    );
  }

  if (!confirming) {
    return (
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="sm" onClick={() => setConfirming("CLOSE")}>
          Close listing
        </Button>
        <Button variant="outline" size="sm" onClick={() => setConfirming("CANCEL")}>
          Cancel listing
        </Button>
      </div>
    );
  }

  const isClose = confirming === "CLOSE";

  const run = async () => {
    setError("");
    try {
      const payload = { itemId: listing.id, reason: reason.trim() || null };
      if (isClose) await closeMutation.mutateAsync(payload);
      else await cancelMutation.mutateAsync(payload);
      setConfirming(null);
      setReason("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That did not work. Please try again.");
    }
  };

  return (
    <div className="border-2 border-foreground p-4 grid gap-3">
      <p className="text-sm font-bold">
        {isClose
          ? "Close this listing? It comes off the board, and your record of it stays."
          : "Cancel this listing? Use this if it should not have been posted."}
      </p>
      <label className="field-label">
        Reason (optional)
        <input
          className="field"
          maxLength={500}
          placeholder={isClose ? "e.g. I found it myself" : "e.g. Posted by mistake"}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="text-destructive text-sm font-bold">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button variant="pink" size="sm" disabled={isBusy} onClick={() => void run()}>
          {isBusy ? "Working…" : isClose ? "Yes, close it" : "Yes, cancel it"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isBusy}
          onClick={() => {
            setConfirming(null);
            setError("");
          }}
        >
          Keep it open
        </Button>
      </div>
    </div>
  );
}

function MyListingRow({ listing }: { listing: ListingSummary }) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="grid gap-4">
      <ListingCard listing={listing} />
      <div className="panel p-4 grid gap-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <Badge tone={listing.status === "ACTIVE" ? "lime" : "mint"}>
            {STATUS_LABELS[listing.status]}
          </Badge>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/listing/$id" params={{ id: listing.id }}>
                View <ArrowUpRight size={14} />
              </Link>
            </Button>
            {listing.status === "ACTIVE" && (
              <Button
                size="sm"
                variant="outline"
                aria-expanded={isEditing}
                onClick={() => setIsEditing((open) => !open)}
              >
                {isEditing ? <X size={14} /> : <Pencil size={14} />}
                {isEditing ? "Close editor" : "Edit"}
              </Button>
            )}
          </div>
        </div>
        {isEditing && <ListingEditor listing={listing} onClose={() => setIsEditing(false)} />}
        <ListingLifecycleActions listing={listing} />
      </div>
    </div>
  );
}

/** The real "My Lost Reports" / "My Found Listings" tab contents. */
export function MyListings({ listingType }: { listingType: "LOST" | "FOUND" }) {
  const { data, isPending, isError, refetch } = useMyItems(listingType);
  const isLost = listingType === "LOST";

  if (isPending) return <ListingGridSkeleton count={3} />;

  if (isError) {
    return (
      <ListingErrorState
        title={isLost ? "Your reports did not load." : "Your listings did not load."}
        description="We could not reach your activity just now. Try again."
        onRetry={() => void refetch()}
      />
    );
  }

  const listings = data ?? [];

  if (listings.length === 0) {
    return (
      <ListingEmptyState
        title={isLost ? "No lost reports yet." : "No found listings yet."}
        description={
          isLost
            ? "When you report something lost, it shows up here so you can keep track of it."
            : "When you post something you have found, it shows up here while it waits for its person."
        }
        action={
          <Button asChild variant="pink">
            <Link to={isLost ? "/post/lost" : "/post/found"}>
              {isLost ? "Report a lost item" : "Post a found item"} <ArrowUpRight />
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7">
      {listings.map((listing) => (
        <MyListingRow key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
