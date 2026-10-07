/**
 * Listing DTO contract tests (docs/apiAndDataContracts.md §161 — public DTO
 * security tests).
 *
 * These assert the shape of what reaches a public surface. The database and RLS are
 * the enforcement; these catch a mapper change that would widen the public payload.
 */

import { describe, expect, it } from "vitest";

import {
  CATEGORY_LABELS,
  ITEM_CATEGORIES,
  MAX_ITEM_IMAGES,
  MAX_ITEM_IMAGE_BYTES,
  STATUS_LABELS,
  categoryLabel,
  mapListingPrivateDetails,
  mapListingSummary,
  mapOwnerListingDetail,
  mapPublicListingDetail,
  mapVerificationQuestion,
} from "@/lib/services/listing-types";
import type { Database } from "@/lib/database.types";

type PublicItemRow = Database["public"]["Views"]["public_items_view"]["Row"];
type ItemRow = Database["public"]["Tables"]["items"]["Row"];

const publicRow: PublicItemRow = {
  id: "item-1",
  user_id: "user-b",
  listing_type: "FOUND",
  title: "Grey oversized hoodie",
  category: "clothing",
  brand: null,
  color: "Grey",
  description: "A grey pullover hoodie found near the reading area.",
  event_date: "2026-10-06",
  event_time: "10:30:00",
  location_text: "Central Library",
  status: "ACTIVE",
  created_at: "2026-10-06T10:00:00.000Z",
  updated_at: "2026-10-06T10:00:00.000Z",
};

const itemRow: ItemRow = {
  ...(publicRow as Required<PublicItemRow>),
  latitude: 12.9716,
  longitude: 77.5946,
  closed_reason: null,
  closed_at: null,
} as ItemRow;

/** Fields that must never appear in a payload handed to a public surface. */
const FORBIDDEN_PUBLIC_KEYS = [
  "latitude",
  "longitude",
  "privateNotes",
  "serialFragment",
  "uniqueMarkings",
  "privateContents",
  "privateDetails",
  "verificationQuestions",
  "closedReason",
  "closedAt",
];

describe("public listing DTOs", () => {
  it("the summary carries no private field", () => {
    const summary = mapListingSummary(publicRow, null, "Ananya Sharma");
    for (const key of FORBIDDEN_PUBLIC_KEYS) {
      expect(summary).not.toHaveProperty(key);
    }
  });

  it("the public detail carries no coordinates or private details", () => {
    const detail = mapPublicListingDetail(publicRow, [], null);
    for (const key of FORBIDDEN_PUBLIC_KEYS) {
      expect(detail).not.toHaveProperty(key);
    }
  });

  it("the public detail cannot be built with coordinates even from a full row", () => {
    // `public_items_view` has no latitude/longitude columns at all, so the only way
    // a coordinate could appear is if the mapper read one. It does not.
    const detail = mapPublicListingDetail(itemRow as unknown as PublicItemRow, [], null);
    expect(JSON.stringify(detail)).not.toContain("12.9716");
    expect(JSON.stringify(detail)).not.toContain("77.5946");
  });

  it("the owner detail does carry coordinates and private details", () => {
    const detail = mapOwnerListingDetail(
      itemRow,
      [],
      null,
      {
        item_id: "item-1",
        private_notes: "Initials inside the collar",
        serial_fragment: null,
        unique_markings: null,
        private_contents: null,
        created_at: "2026-10-06T10:00:00.000Z",
        updated_at: "2026-10-06T10:00:00.000Z",
      },
      [
        {
          id: "q-1",
          item_id: "item-1",
          question: "What is stitched inside the collar?",
          position: 0,
          created_at: "2026-10-06T10:00:00.000Z",
        },
      ],
    );

    expect(detail.latitude).toBe(12.9716);
    expect(detail.privateDetails?.privateNotes).toBe("Initials inside the collar");
    expect(detail.verificationQuestions).toHaveLength(1);
  });

  it("a verification question DTO never carries an expected answer", () => {
    const question = mapVerificationQuestion({
      id: "q-1",
      item_id: "item-1",
      question: "What is inside?",
      position: 0,
      created_at: "2026-10-06T10:00:00.000Z",
    });

    expect(Object.keys(question).sort()).toEqual(["id", "position", "question"]);
    expect(question).not.toHaveProperty("answer");
    expect(question).not.toHaveProperty("expectedAnswer");
  });

  it("the private details DTO maps exactly the four documented fields", () => {
    const details = mapListingPrivateDetails({
      item_id: "item-1",
      private_notes: "a",
      serial_fragment: "b",
      unique_markings: "c",
      private_contents: "d",
      created_at: "2026-10-06T10:00:00.000Z",
      updated_at: "2026-10-06T10:00:00.000Z",
    });

    expect(Object.keys(details).sort()).toEqual([
      "itemId",
      "privateContents",
      "privateNotes",
      "serialFragment",
      "uniqueMarkings",
    ]);
  });
});

describe("listing constants", () => {
  it("uses the documented final status set and no derived state", () => {
    expect(Object.keys(STATUS_LABELS).sort()).toEqual([
      "ACTIVE",
      "CANCELLED",
      "CLOSED",
      "RECOVERY_IN_PROGRESS",
      "RETURNED",
    ]);
    // MATCH_FOUND and CLAIM_PENDING are derived, never persisted (AGENTS.md §6).
    expect(STATUS_LABELS).not.toHaveProperty("MATCH_FOUND");
    expect(STATUS_LABELS).not.toHaveProperty("CLAIM_PENDING");
  });

  it("uses the documented category set, with a label for each", () => {
    expect(ITEM_CATEGORIES).toHaveLength(10);
    for (const category of ITEM_CATEGORIES) {
      expect(CATEGORY_LABELS[category]).toBeTruthy();
      expect(categoryLabel(category)).toBe(CATEGORY_LABELS[category]);
    }
  });

  it("falls back to the raw value for an unknown category rather than throwing", () => {
    expect(categoryLabel("something_new")).toBe("something_new");
  });

  it("applies the documented media limits", () => {
    expect(MAX_ITEM_IMAGES).toBe(3);
    expect(MAX_ITEM_IMAGE_BYTES).toBe(5 * 1024 * 1024);
  });
});
