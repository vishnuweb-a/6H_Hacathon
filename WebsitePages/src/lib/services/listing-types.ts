/**
 * Listing domain types.
 *
 * Mirrors the DTOs in docs/apiAndDataContracts.md §17–§29. The generated row types
 * are snake_case; these are the camelCase shapes the UI consumes, produced by the
 * mappers below (§121, §122).
 *
 * The public/private split is structural, not cosmetic: `ListingSummary` and
 * `PublicListingDetail` are built from `public_items_view`, which cannot return
 * coordinates at all. `OwnerListingDetail` is built from the owner-only
 * `get_my_item_detail()` RPC. A non-owner cannot be handed an owner DTO by
 * accident, because the data to build one never reaches them
 * (docs/securityAndService.md §24).
 */

import type { Database } from "../database.types";
import type { PublicProfile } from "./profile-types";

type ItemRow = Database["public"]["Tables"]["items"]["Row"];
type PublicItemRow = Database["public"]["Views"]["public_items_view"]["Row"];
type ItemImageRow = Database["public"]["Tables"]["item_images"]["Row"];
type FoundPrivateRow = Database["public"]["Tables"]["found_item_private_details"]["Row"];
type LostPrivateRow = Database["public"]["Tables"]["lost_item_private_details"]["Row"];
type VerificationQuestionRow = Database["public"]["Tables"]["verification_questions"]["Row"];

/** docs/apiAndDataContracts.md §7, §8 — the final persisted sets (AGENTS.md §6). */
export type ListingType = Database["public"]["Enums"]["listing_type"];
export type ListingStatus = Database["public"]["Enums"]["listing_status"];

/** docs/database.md §18 items.category. */
export const ITEM_CATEGORIES = [
  "electronics",
  "wallet",
  "id_card",
  "keys",
  "bag",
  "clothing",
  "book",
  "document",
  "accessory",
  "other",
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

/** Approved-UI labels for the stored category slugs. */
export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  electronics: "Electronics",
  wallet: "Wallet",
  id_card: "Cards & documents",
  keys: "Keys",
  bag: "Bag",
  clothing: "Clothing",
  book: "Book",
  document: "Document",
  accessory: "Accessory",
  other: "Other",
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category as ItemCategory] ?? category;
}

/** docs/storageAndMedia.md §15 — 1–3 images per listing. */
export const MAX_ITEM_IMAGES = 3;
/** docs/storageAndMedia.md §14 — 5 MB per image before client processing. */
export const MAX_ITEM_IMAGE_BYTES = 5 * 1024 * 1024;
/** docs/storageAndMedia.md §12, §13 — no SVG. */
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** docs/apiAndDataContracts.md §19 — the frontend receives a usable URL. */
export interface ListingImage {
  id: string;
  /** Short-lived signed URL. The canonical value is `storagePath`. */
  url: string | null;
  storagePath: string;
  position: number;
}

/** docs/apiAndDataContracts.md §17 — Explore cards, Activity summaries. */
export interface ListingSummary {
  id: string;
  userId: string;
  listingType: ListingType;
  title: string;
  category: string;
  brand: string | null;
  color: string | null;
  locationText: string;
  eventDate: string;
  status: ListingStatus;
  coverImageUrl: string | null;
  createdAt: string;
  /**
   * Public display name of the creator, joined in for the card's trust row. Not in
   * the §17 DTO, which lists `userId` only; it is added here because the approved
   * card shows the poster's name, and a per-card profile fetch would be an N+1.
   * Public-safe by definition — the same value `public_profiles_view` exposes.
   */
  creatorName: string | null;
}

/** docs/apiAndDataContracts.md §18 — no coordinates, no private details. */
export interface PublicListingDetail {
  id: string;
  userId: string;
  listingType: ListingType;
  title: string;
  category: string;
  brand: string | null;
  color: string | null;
  description: string;
  eventDate: string;
  eventTime: string | null;
  locationText: string;
  status: ListingStatus;
  images: ListingImage[];
  creator: PublicProfile | null;
  createdAt: string;
  updatedAt: string;
}

/** docs/apiAndDataContracts.md §21 — the creator's own extra fields. */
export interface OwnerListingDetail extends PublicListingDetail {
  latitude: number | null;
  longitude: number | null;
  closedReason: string | null;
  closedAt: string | null;
  /**
   * The caller's own private detail row for this listing: the Finder's for a FOUND
   * listing, the Owner's distinguishing characteristics for a LOST one. Both are
   * owner-only and share a shape; neither ever reaches a non-owner, because the
   * data to build this DTO is read under the owner-only RLS policies.
   */
  privateDetails: ListingPrivateDetails | null;
  verificationQuestions: VerificationQuestion[];
}

/**
 * docs/apiAndDataContracts.md §22, §22b — owner only.
 *
 * One shape for both sides: `found_item_private_details` (the Finder's verification
 * basis) and `lost_item_private_details` (the Owner's ownership evidence) carry the
 * same four fields, and the approved wizard collects the same four in both flows.
 */
export interface ListingPrivateDetails {
  itemId: string;
  privateNotes: string | null;
  serialFragment: string | null;
  uniqueMarkings: string | null;
  privateContents: string | null;
}

/** @deprecated Use {@link ListingPrivateDetails}. Kept so §22 references still resolve. */
export type FoundPrivateDetails = ListingPrivateDetails;

/** The private-detail payload both report wizards submit. */
export interface ListingPrivateDetailsInput {
  privateNotes?: string | null | undefined;
  serialFragment?: string | null | undefined;
  uniqueMarkings?: string | null | undefined;
  privateContents?: string | null | undefined;
}

/** docs/apiAndDataContracts.md §23 — no expected answer is ever included. */
export interface VerificationQuestion {
  id: string;
  question: string;
  position: number;
}

/** docs/apiAndDataContracts.md §24 — the backend derives userId, type and status. */
export interface CreateLostReportInput {
  title: string;
  category: string;
  brand?: string | null | undefined;
  color?: string | null | undefined;
  description: string;
  eventDate: string;
  eventTime?: string | null | undefined;
  locationText: string;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  /**
   * The Owner's private distinguishing characteristics, persisted to
   * `lost_item_private_details`. Never published, never fed to matching: it is
   * ownership evidence the Claims phase verifies against (docs/securityAndService.md
   * §24b).
   */
  privateDetails?: ListingPrivateDetailsInput | undefined;
}

/** docs/apiAndDataContracts.md §25. */
export interface CreateFoundListingInput extends CreateLostReportInput {
  verificationQuestions?: Array<{ question: string; position: number }> | undefined;
}

/**
 * docs/apiAndDataContracts.md §27 — userId, listingType, status and createdAt are
 * deliberately absent. They are not editable through the normal edit contract.
 */
export interface UpdateListingInput {
  title?: string | undefined;
  category?: string | undefined;
  brand?: string | null | undefined;
  color?: string | null | undefined;
  description?: string | undefined;
  eventDate?: string | undefined;
  eventTime?: string | null | undefined;
  locationText?: string | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
}

/** docs/apiAndDataContracts.md §29 — Explore filtering for this phase. */
export interface ExploreFilters {
  query?: string | undefined;
  listingType?: ListingType | "ALL" | undefined;
  category?: string | undefined;
  locationQuery?: string | undefined;
  sort?: "NEWEST" | "OLDEST" | undefined;
}

/** docs/apiAndDataContracts.md §30, §31. */
export interface CursorPage<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

/** docs/apiAndDataContracts.md §26. */
export interface CreateListingResult {
  itemId: string;
  listingType: ListingType;
  status: ListingStatus;
  createdAt: string;
  /** Images that were requested but could not be stored (docs/storageAndMedia.md §29). */
  failedImageCount: number;
}

// ---------------------------------------------------------------------------
// Mappers (docs/apiAndDataContracts.md §122)
// ---------------------------------------------------------------------------

/**
 * A `public_items_view` row never carries coordinates, so there is no shape in
 * which this mapper could leak them. The nullable columns come from the view's
 * generated types, not from the underlying NOT NULL table.
 */
export function mapListingSummary(
  row: PublicItemRow,
  coverImageUrl: string | null,
  creatorName: string | null = null,
): ListingSummary {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    listingType: row.listing_type as ListingType,
    title: row.title as string,
    category: row.category as string,
    brand: row.brand,
    color: row.color,
    locationText: row.location_text as string,
    eventDate: row.event_date as string,
    status: row.status as ListingStatus,
    coverImageUrl,
    createdAt: row.created_at as string,
    creatorName,
  };
}

export function mapPublicListingDetail(
  row: PublicItemRow,
  images: ListingImage[],
  creator: PublicProfile | null,
): PublicListingDetail {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    listingType: row.listing_type as ListingType,
    title: row.title as string,
    category: row.category as string,
    brand: row.brand,
    color: row.color,
    description: row.description as string,
    eventDate: row.event_date as string,
    eventTime: row.event_time,
    locationText: row.location_text as string,
    status: row.status as ListingStatus,
    images,
    creator,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapOwnerListingDetail(
  row: ItemRow,
  images: ListingImage[],
  creator: PublicProfile | null,
  privateDetails: FoundPrivateRow | LostPrivateRow | null,
  questions: VerificationQuestionRow[],
): OwnerListingDetail {
  return {
    id: row.id,
    userId: row.user_id,
    listingType: row.listing_type,
    title: row.title,
    category: row.category,
    brand: row.brand,
    color: row.color,
    description: row.description,
    eventDate: row.event_date,
    eventTime: row.event_time,
    locationText: row.location_text,
    status: row.status,
    images,
    creator,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    latitude: row.latitude,
    longitude: row.longitude,
    closedReason: row.closed_reason,
    closedAt: row.closed_at,
    privateDetails: privateDetails ? mapListingPrivateDetails(privateDetails) : null,
    verificationQuestions: questions.map(mapVerificationQuestion),
  };
}

export function mapListingPrivateDetails(
  row: FoundPrivateRow | LostPrivateRow,
): ListingPrivateDetails {
  return {
    itemId: row.item_id,
    privateNotes: row.private_notes,
    serialFragment: row.serial_fragment,
    uniqueMarkings: row.unique_markings,
    privateContents: row.private_contents,
  };
}

export function mapVerificationQuestion(row: VerificationQuestionRow): VerificationQuestion {
  return { id: row.id, question: row.question, position: row.position };
}

export function mapListingImage(row: ItemImageRow, url: string | null): ListingImage {
  return { id: row.id, storagePath: row.storage_path, position: row.position, url };
}

/** Human labels for the persisted statuses, for the approved UI copy. */
export const STATUS_LABELS: Record<ListingStatus, string> = {
  ACTIVE: "Open",
  RECOVERY_IN_PROGRESS: "Recovery in progress",
  RETURNED: "Returned",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};
