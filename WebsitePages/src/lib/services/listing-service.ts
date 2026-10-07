/**
 * Listing service — the only place `items` and its child tables are queried
 * (AGENTS.md §4: Component → Hook → Service → Supabase).
 *
 * Reads for discovery go through `public_items_view`, which cannot return
 * coordinates. `authenticated` has no direct SELECT grant on `public.items` at all,
 * so an owner read goes through the `get_my_item_detail()` RPC. The privacy
 * guarantee is therefore structural, not a matter of which columns this file
 * happens to ask for (docs/securityAndService.md §24).
 *
 * No method accepts a user id as proof of identity: writes derive it from the
 * session, and the database re-derives it from `auth.uid()`
 * (docs/authAndRls.md §58).
 */

import type { Database } from "../database.types";
import { getSupabaseBrowserClient } from "../supabase/client";
import { mapPublicProfile, type PublicProfile } from "./profile-types";

type ItemRow = Database["public"]["Tables"]["items"]["Row"];
type SearchPublicItemsArgs = Database["public"]["Functions"]["search_public_items"]["Args"];
/** Only the fields `UpdateListingInput` maps onto are ever set. */
type ItemUpdate = Pick<
  Database["public"]["Tables"]["items"]["Update"],
  | "title"
  | "category"
  | "brand"
  | "color"
  | "description"
  | "event_date"
  | "event_time"
  | "location_text"
  | "latitude"
  | "longitude"
>;
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_ITEM_IMAGES,
  decodeExploreCursor,
  encodeExploreCursor,
  normalizeExploreFilters,
  mapListingImage,
  mapListingSummary,
  mapOwnerListingDetail,
  mapPublicListingDetail,
  type CreateFoundListingInput,
  type CreateListingResult,
  type CreateLostReportInput,
  type ListingPrivateDetailsInput,
  type CursorPage,
  type ExploreFilters,
  type ListingImage,
  type ListingSummary,
  type OwnerListingDetail,
  type PublicListingDetail,
  type UpdateListingInput,
} from "./listing-types";
import { deleteItemImageObject, uploadItemImage, withSignedUrls } from "./media-service";

const PUBLIC_ITEM_COLUMNS =
  "id, user_id, listing_type, title, category, brand, color, description, event_date, event_time, location_text, status, created_at, updated_at";

const PROFILE_COLUMNS =
  "id, display_name, username, avatar_url, trust_score, average_rating, rating_count, successful_returns, created_at, updated_at";

async function requireUserId(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) {
    throw new Error("Please sign in to continue.");
  }
  return userId;
}

/** Loads the images for a set of items in one query, then signs their URLs. */
async function loadImagesForItems(itemIds: string[]): Promise<Map<string, ListingImage[]>> {
  const byItem = new Map<string, ListingImage[]>();
  if (itemIds.length === 0) return byItem;

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("item_images")
    .select("id, item_id, storage_path, position, created_at")
    .in("item_id", itemIds)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return byItem;

  const signed = await withSignedUrls(
    data.map((row) => ({ id: row.id, storagePath: row.storage_path, position: row.position })),
  );
  const urlByPath = new Map(signed.map((image) => [image.storagePath, image.url]));

  for (const row of data) {
    const list = byItem.get(row.item_id) ?? [];
    list.push(mapListingImage(row, urlByPath.get(row.storage_path) ?? null));
    byItem.set(row.item_id, list);
  }

  return byItem;
}

/** Public-safe cover photos for authorized listings, using the existing batch loader. */
export async function getListingCoverUrls(itemIds: string[]): Promise<Map<string, string | null>> {
  const images = await loadImagesForItems([...new Set(itemIds)]);
  return new Map([...images].map(([itemId, photos]) => [itemId, photos[0]?.url ?? null]));
}

/**
 * Display names for a set of creators in one query, for the card trust row.
 * Batched rather than per-card to avoid an N+1
 * (skill: supabase-postgres-best-practices, data-n-plus-one).
 */
async function loadCreatorNames(userIds: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return names;

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", unique);

  if (error || !data) return names;
  for (const row of data) names.set(row.id, row.display_name);
  return names;
}

async function loadCreator(userId: string): Promise<PublicProfile | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  // A missing creator profile must not break a listing render.
  if (error || !data) return null;
  return mapPublicProfile(data);
}

// ---------------------------------------------------------------------------
// Queries (docs/apiAndDataContracts.md §123)
// ---------------------------------------------------------------------------

/**
 * Active, publicly discoverable listings for Explore.
 *
 * Everything the board narrows by — text, listing type, category, event-date range,
 * location text, ordering and the page boundary — is applied in PostgreSQL. The
 * client receives one page and never a set it has to filter down itself
 * (docs/apiAndDataContracts.md §29–§31).
 *
 * Only ACTIVE listings are returned. docs/authAndRls.md §19 permits SELECT on
 * ACTIVE, RECOVERY_IN_PROGRESS and RETURNED "depending on product decisions"; the
 * product decision for the board is ACTIVE only, so a listing in recovery, returned,
 * closed or cancelled cannot surface as an ordinary discovery card. RLS still allows
 * the owner to read their own rows elsewhere — this is the discovery filter, not the
 * security boundary.
 *
 * Reads go through `public_items_view`, which has no coordinate columns to project,
 * so no combination of these filters can return a latitude, a longitude, a close
 * reason or any private verification detail (docs/securityAndService.md §24).
 */
export async function getExploreItems(
  filters: ExploreFilters = {},
  options: { limit?: number | undefined; cursor?: string | null | undefined } = {},
): Promise<CursorPage<ListingSummary>> {
  const supabase = getSupabaseBrowserClient();
  const normalized = normalizeExploreFilters(filters);
  // The RPC clamps this as well; doing it here too keeps the +1 arithmetic below
  // honest (docs/apiAndDataContracts.md §31).
  const requested = options.limit ?? DEFAULT_PAGE_SIZE;
  const limit = Math.min(Math.max(Math.trunc(requested) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const cursor = decodeExploreCursor(options.cursor);

  // One extra row, to learn whether a further page exists without a count query.
  // The RPC's own maximum is 50, so asking for limit + 1 at the maximum page size
  // would silently lose the probe row — hence the explicit ceiling here.
  const probeLimit = Math.min(limit + 1, MAX_PAGE_SIZE + 1);

  // An unset filter must be an ABSENT argument, not an explicit undefined, so the
  // function's own `default null` applies.
  const args: SearchPublicItemsArgs = {
    p_sort: normalized.sort ?? "NEWEST",
    p_limit: probeLimit,
  };
  if (normalized.query) args.p_query = normalized.query;
  if (normalized.listingType && normalized.listingType !== "ALL") {
    args.p_listing_type = normalized.listingType;
  }
  if (normalized.category) args.p_category = normalized.category;
  if (normalized.dateFrom) args.p_date_from = normalized.dateFrom;
  if (normalized.dateTo) args.p_date_to = normalized.dateTo;
  if (normalized.locationQuery) args.p_location_query = normalized.locationQuery;
  if (cursor) {
    args.p_cursor_created_at = cursor.createdAt;
    args.p_cursor_id = cursor.id;
  }

  const { data, error } = await supabase.rpc("search_public_items", args);

  if (error) {
    throw new Error("We could not load the board just now.");
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const [images, creatorNames] = await Promise.all([
    loadImagesForItems(page.map((row) => row.id)),
    loadCreatorNames(page.map((row) => row.user_id)),
  ]);

  const last = page.at(-1);
  return {
    data: page.map((row) =>
      mapListingSummary(
        row,
        images.get(row.id)?.[0]?.url ?? null,
        creatorNames.get(row.user_id) ?? null,
      ),
    ),
    nextCursor:
      hasMore && last ? encodeExploreCursor({ createdAt: last.created_at, id: last.id }) : null,
    hasMore,
  };
}

/**
 * The public view of one listing. Returns null when it does not exist or is not
 * visible to the caller — "not found" and "not permitted" are deliberately
 * indistinguishable here (docs/apiAndDataContracts.md §96 error privacy).
 */
export async function getItemById(itemId: string): Promise<PublicListingDetail | null> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("public_items_view")
    .select(PUBLIC_ITEM_COLUMNS)
    .eq("id", itemId)
    .maybeSingle();

  if (error) throw new Error("We could not load that item just now.");
  if (!data) return null;

  const [images, creator] = await Promise.all([
    loadImagesForItems([itemId]),
    loadCreator(data.user_id as string),
  ]);

  return mapPublicListingDetail(data, images.get(itemId) ?? [], creator);
}

/**
 * The owner's full view, including coordinates and — for a FOUND listing — the
 * private details and verification questions. The RPC refuses a non-owner, and RLS
 * refuses the child-table reads independently.
 */
export async function getMyItemDetail(itemId: string): Promise<OwnerListingDetail | null> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .rpc("get_my_item_detail", { p_item_id: itemId })
    .single<ItemRow>();

  if (error) {
    // P0002 is the function's own "not found / not yours".
    if (error.code === "P0002") return null;
    throw new Error("We could not load that listing just now.");
  }
  if (!data) return null;

  const item: ItemRow = data;
  const isFound = item.listing_type === "FOUND";

  // Each listing type keeps its private evidence in its own table: the Finder's in
  // `found_item_private_details`, the Owner's in `lost_item_private_details`. Both
  // are owner-only under RLS, so a non-owner reaching this line at all would still
  // read nothing.
  const privateTable = isFound ? "found_item_private_details" : "lost_item_private_details";

  const [images, creator, privateDetails, questions] = await Promise.all([
    loadImagesForItems([itemId]),
    loadCreator(item.user_id),
    supabase
      .from(privateTable)
      .select(
        "item_id, private_notes, serial_fragment, unique_markings, private_contents, created_at, updated_at",
      )
      .eq("item_id", itemId)
      .maybeSingle()
      .then(({ data: row }) => row),
    isFound
      ? supabase
          .from("verification_questions")
          .select("id, item_id, question, position, created_at")
          .eq("item_id", itemId)
          .order("position", { ascending: true })
          .then(({ data: rows }) => rows ?? [])
      : Promise.resolve([]),
  ]);

  return mapOwnerListingDetail(
    item,
    images.get(itemId) ?? [],
    creator,
    privateDetails ?? null,
    questions,
  );
}

/**
 * The caller's own listings of one type, in every status.
 *
 * Read through `public_items_view` filtered to the caller's own id: the owner
 * summary needs no private column, so there is no reason to widen the surface.
 */
export async function getMyItems(listingType?: "LOST" | "FOUND"): Promise<ListingSummary[]> {
  const supabase = getSupabaseBrowserClient();
  const userId = await requireUserId();

  let query = supabase
    .from("public_items_view")
    .select(PUBLIC_ITEM_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (listingType) query = query.eq("listing_type", listingType);

  const { data, error } = await query;
  if (error) throw new Error("We could not load your reports just now.");

  const rows = data ?? [];
  const images = await loadImagesForItems(rows.map((row) => row.id as string));

  return rows.map((row) => mapListingSummary(row, images.get(row.id as string)?.[0]?.url ?? null));
}

// ---------------------------------------------------------------------------
// Mutations (docs/apiAndDataContracts.md §124)
// ---------------------------------------------------------------------------

/** Shared error translation for an item write. */
function itemWriteError(message: string, code?: string): Error {
  if (code === "23514") {
    return new Error("Some of those details are outside what we can accept. Please check them.");
  }
  if (code === "42501") {
    return new Error("You can only change your own listings.");
  }
  return new Error(message);
}

/**
 * Creates the item row. `user_id` comes from the session and is independently
 * re-checked by the INSERT policy against `auth.uid()`, so a forged id cannot
 * produce a listing owned by someone else.
 */
async function insertItem(
  userId: string,
  listingType: "LOST" | "FOUND",
  input: CreateLostReportInput,
): Promise<{ id: string; status: "ACTIVE"; createdAt: string }> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("items")
    .insert({
      user_id: userId,
      listing_type: listingType,
      title: input.title.trim(),
      category: input.category,
      brand: input.brand?.trim() || null,
      color: input.color?.trim() || null,
      description: input.description.trim(),
      event_date: input.eventDate,
      event_time: input.eventTime || null,
      location_text: input.locationText.trim(),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
    })
    .select("id, status, created_at")
    .single();

  if (error || !data) {
    throw itemWriteError("We could not publish your report. Please try again.", error?.code);
  }

  return { id: data.id, status: "ACTIVE", createdAt: data.created_at };
}

/**
 * Uploads images and records them, in the documented order: the item exists first,
 * so every object lands under `{user_id}/{item_id}/` and the storage policy can
 * verify ownership (docs/storageAndMedia.md §38).
 *
 * A failed image does not fail the listing. The count of failures is returned so
 * the UI can say so plainly rather than implying the photo is there
 * (docs/storageAndMedia.md §29).
 */
async function attachImages(userId: string, itemId: string, files: File[]): Promise<number> {
  const supabase = getSupabaseBrowserClient();
  let failed = 0;
  let position = 0;

  for (const file of files.slice(0, MAX_ITEM_IMAGES)) {
    let path: string | null = null;
    try {
      path = await uploadItemImage(userId, itemId, file);
      const { error } = await supabase
        .from("item_images")
        .insert({ item_id: itemId, storage_path: path, position });

      if (error) {
        // The object would otherwise be an orphan (docs/storageAndMedia.md §40).
        await deleteItemImageObject(path).catch(() => undefined);
        failed += 1;
        continue;
      }
      position += 1;
    } catch {
      failed += 1;
    }
  }

  return failed;
}

/**
 * Writes the private-detail row for a listing, into the table that matches its
 * type. Returns false when there is nothing worth storing, so an all-empty row
 * never trips the `*_private_details_not_empty` constraint.
 *
 * Ownership is not passed in: the row carries only `item_id`, and the owner-only
 * RLS policy resolves ownership through the parent item to `auth.uid()`. A LOST row
 * on a FOUND parent (or the reverse) is additionally rejected by the
 * `assert_parent_item_type()` trigger.
 */
async function insertPrivateDetails(
  listingType: "LOST" | "FOUND",
  itemId: string,
  details: ListingPrivateDetailsInput | undefined,
): Promise<boolean> {
  if (!details) return false;

  const row = {
    private_notes: details.privateNotes?.trim() || null,
    serial_fragment: details.serialFragment?.trim() || null,
    unique_markings: details.uniqueMarkings?.trim() || null,
    private_contents: details.privateContents?.trim() || null,
  };
  if (Object.values(row).every((value) => value === null)) return false;

  const table =
    listingType === "FOUND" ? "found_item_private_details" : "lost_item_private_details";
  const { error } = await getSupabaseBrowserClient()
    .from(table)
    .insert({ item_id: itemId, ...row });
  if (error) throw error;
  return true;
}

/**
 * Creates a Lost Report together with the Owner's private distinguishing
 * characteristics.
 *
 * Those details are the Owner's side of verification, so the same failure model as
 * the FOUND path applies: if they cannot be stored the listing is cancelled rather
 * than published without the evidence the Claims phase will check against. They
 * were previously discarded at submit; they are now persisted to
 * `lost_item_private_details`.
 */
export async function createLostItem(
  input: CreateLostReportInput,
  images: File[] = [],
): Promise<CreateListingResult> {
  const supabase = getSupabaseBrowserClient();
  const userId = await requireUserId();
  const item = await insertItem(userId, "LOST", input);

  try {
    await insertPrivateDetails("LOST", item.id, input.privateDetails);
  } catch {
    await supabase
      .rpc("cancel_my_item", { p_item_id: item.id, p_reason: "Incomplete submission" })
      .then(
        () => undefined,
        () => undefined,
      );
    throw new Error(
      "We could not save your private details, so the report was not published. Please try again.",
    );
  }

  const failedImageCount = await attachImages(userId, item.id, images);

  return {
    itemId: item.id,
    listingType: "LOST",
    status: item.status,
    createdAt: item.createdAt,
    failedImageCount,
  };
}

/**
 * Creates a Found Listing together with its private details and verification
 * questions.
 *
 * Sequencing follows docs/storageAndMedia.md §38 and the prompt's failure model:
 * item → private rows → images. If a private-detail write fails the listing is
 * cancelled rather than left published without the Finder's verification basis —
 * a Found Listing with no private anchor cannot safely accept a claim later.
 */
export async function createFoundItem(
  input: CreateFoundListingInput,
  images: File[] = [],
): Promise<CreateListingResult> {
  const supabase = getSupabaseBrowserClient();
  const userId = await requireUserId();
  const item = await insertItem(userId, "FOUND", input);

  try {
    await insertPrivateDetails("FOUND", item.id, input.privateDetails);

    const questions = (input.verificationQuestions ?? [])
      .map((entry, index) => ({
        item_id: item.id,
        question: entry.question.trim(),
        position: entry.position ?? index,
      }))
      .filter((entry) => entry.question.length > 0);

    if (questions.length > 0) {
      const { error } = await supabase.from("verification_questions").insert(questions);
      if (error) throw error;
    }
  } catch {
    // Roll the listing back out of discovery rather than leaving a half-built one.
    await supabase
      .rpc("cancel_my_item", { p_item_id: item.id, p_reason: "Incomplete submission" })
      .then(
        () => undefined,
        () => undefined,
      );
    throw new Error(
      "We could not save your private details, so the listing was not published. Please try again.",
    );
  }

  const failedImageCount = await attachImages(userId, item.id, images);

  return {
    itemId: item.id,
    listingType: "FOUND",
    status: item.status,
    createdAt: item.createdAt,
    failedImageCount,
  };
}

/**
 * Edits the safe fields of the caller's own listing.
 *
 * `user_id`, `listing_type` and `status` are absent from `UpdateListingInput` and
 * are additionally rejected by the `protect_item_fields()` trigger, so neither this
 * service nor a hand-crafted request can move them.
 */
export async function updateMyItem(itemId: string, input: UpdateListingInput): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  // Typed against the generated Update shape, so a field outside the editable set
  // (user_id, listing_type, status) cannot be added here without a type error.
  const patch: ItemUpdate = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.category !== undefined) patch.category = input.category;
  if (input.brand !== undefined) patch.brand = input.brand?.trim() || null;
  if (input.color !== undefined) patch.color = input.color?.trim() || null;
  if (input.description !== undefined) patch.description = input.description.trim();
  if (input.eventDate !== undefined) patch.event_date = input.eventDate;
  if (input.eventTime !== undefined) patch.event_time = input.eventTime || null;
  if (input.locationText !== undefined) patch.location_text = input.locationText.trim();
  if (input.latitude !== undefined) patch.latitude = input.latitude;
  if (input.longitude !== undefined) patch.longitude = input.longitude;

  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from("items").update(patch).eq("id", itemId);

  if (error) {
    throw itemWriteError("We could not save those changes. Please try again.", error.code);
  }
}

/** docs/apiAndDataContracts.md §28 — an explicit action, not a status write. */
export async function closeMyItem(itemId: string, reason?: string | null): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("close_my_item", {
    p_item_id: itemId,
    // The SQL argument defaults to null, so an absent reason is left out of the
    // payload entirely rather than sent as a null the generated Args type forbids.
    ...(reason ? { p_reason: reason } : {}),
  });
  if (error) {
    throw itemWriteError("We could not close that listing. Please try again.", error.code);
  }
}

export async function cancelMyItem(itemId: string, reason?: string | null): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("cancel_my_item", {
    p_item_id: itemId,
    // The SQL argument defaults to null, so an absent reason is left out of the
    // payload entirely rather than sent as a null the generated Args type forbids.
    ...(reason ? { p_reason: reason } : {}),
  });
  if (error) {
    throw itemWriteError("We could not cancel that listing. Please try again.", error.code);
  }
}

/** Removes one image: the row first, then the object, so no row outlives its file. */
export async function deleteItemImage(imageId: string, storagePath: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  const { error } = await supabase.from("item_images").delete().eq("id", imageId);
  if (error) {
    throw itemWriteError("We could not remove that photo. Please try again.", error.code);
  }

  // An orphaned object is tidied on a best-effort basis; the listing is already
  // correct from the reader's point of view (docs/storageAndMedia.md §40).
  await deleteItemImageObject(storagePath).catch(() => undefined);
}

/** Adds images to an existing listing the caller owns. Returns the failure count. */
export async function uploadItemImages(itemId: string, files: File[]): Promise<number> {
  const userId = await requireUserId();
  return attachImages(userId, itemId, files);
}
