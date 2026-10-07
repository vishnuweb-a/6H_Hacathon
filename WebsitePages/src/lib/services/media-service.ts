/**
 * Media service — the single place Storage is touched (docs/storageAndMedia.md
 * §75, §76: "do not scatter storage calls").
 *
 * The `item-images` bucket is PRIVATE (docs/storageAndMedia.md §10), so reads go
 * through short-lived signed URLs minted here. The database stores the object path
 * only, never a signed URL (§24, §25).
 *
 * Client-side processing (§16–§22): resize to 1600px on the longest side, re-encode
 * as WebP at ~0.8 quality, and — because the canvas round-trip rebuilds the file
 * from raw pixels — drop all EXIF, including GPS, as a side effect.
 */

import { getSupabaseBrowserClient } from "../supabase/client";
import { ACCEPTED_IMAGE_TYPES, MAX_ITEM_IMAGE_BYTES, type ListingImage } from "./listing-types";

export const ITEM_IMAGES_BUCKET = "item-images";

/** docs/storageAndMedia.md §16. */
const MAX_IMAGE_EDGE = 1600;
/** docs/storageAndMedia.md §17 — 0.75–0.85. */
const WEBP_QUALITY = 0.8;
/** docs/storageAndMedia.md §54 — 5–60 minutes is reasonable for in-app viewing. */
const SIGNED_URL_TTL_SECONDS = 60 * 30;

export class MediaValidationError extends Error {}

/**
 * Rejects anything the bucket would reject anyway, but with a message a person can
 * act on. The bucket's own `allowed_mime_types` and `file_size_limit` remain the
 * enforcement (docs/securityAndService.md §54, §55) — this is the usability layer.
 */
export function validateImageFile(file: File): void {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    throw new MediaValidationError("Photos need to be a JPG, PNG or WebP file.");
  }
  if (file.size > MAX_ITEM_IMAGE_BYTES) {
    throw new MediaValidationError("Photos need to be under 5 MB.");
  }
}

/**
 * Resizes and re-encodes to WebP.
 *
 * Drawing to a canvas and re-exporting discards every metadata block the original
 * carried, so EXIF GPS cannot survive this step (docs/storageAndMedia.md §21, §22).
 * If the browser cannot decode the file we surface a validation error rather than
 * uploading the untouched original, which could still carry location metadata.
 */
export async function processItemImage(file: File): Promise<Blob> {
  validateImageFile(file);

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new MediaValidationError("That photo could not be read. Try a different file.");
  });

  try {
    const longestEdge = Math.max(bitmap.width, bitmap.height);
    const scale = longestEdge > MAX_IMAGE_EDGE ? MAX_IMAGE_EDGE / longestEdge : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new MediaValidationError("That photo could not be processed in this browser.");
    }
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY);
    });

    if (!blob) {
      throw new MediaValidationError("That photo could not be processed. Try a different file.");
    }
    return blob;
  } finally {
    bitmap.close();
  }
}

/**
 * Builds the documented object path: `{user_id}/{item_id}/{uuid}.webp`
 * (docs/storageAndMedia.md §7, §59). The original filename is never used — it can
 * carry personal information and is not a safe identifier (§60).
 */
export function buildItemImagePath(userId: string, itemId: string): string {
  return `${userId}/${itemId}/${crypto.randomUUID()}.webp`;
}

/**
 * Uploads one processed image. Returns the object path, which is what the
 * `item_images` row stores.
 */
export async function uploadItemImage(userId: string, itemId: string, file: File): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const blob = await processItemImage(file);
  const path = buildItemImagePath(userId, itemId);

  const { error } = await supabase.storage
    .from(ITEM_IMAGES_BUCKET)
    .upload(path, blob, { contentType: "image/webp", upsert: false });

  if (error) {
    throw new Error("That photo could not be uploaded. You can try again.");
  }

  return path;
}

export async function deleteItemImageObject(storagePath: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.storage.from(ITEM_IMAGES_BUCKET).remove([storagePath]);
  if (error) {
    throw new Error("That photo could not be removed. You can try again.");
  }
}

/**
 * Mints signed URLs for a batch of object paths.
 *
 * A failed signature yields `null` for that image rather than failing the whole
 * listing: an expired or missing URL is a rendering concern, not missing media
 * (docs/storageAndMedia.md §55, §63).
 */
export async function createSignedItemImageUrls(
  storagePaths: string[],
): Promise<Map<string, string | null>> {
  const urls = new Map<string, string | null>();
  if (storagePaths.length === 0) return urls;

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.storage
    .from(ITEM_IMAGES_BUCKET)
    .createSignedUrls(storagePaths, SIGNED_URL_TTL_SECONDS);

  if (error || !data) {
    for (const path of storagePaths) urls.set(path, null);
    return urls;
  }

  for (const entry of data) {
    // `path` is echoed back by the API; fall back to null when a single entry failed.
    if (entry.path) urls.set(entry.path, entry.signedUrl ?? null);
  }
  for (const path of storagePaths) {
    if (!urls.has(path)) urls.set(path, null);
  }

  return urls;
}

/** Attaches freshly signed URLs to image rows, preserving their order. */
export async function withSignedUrls(
  images: Array<Omit<ListingImage, "url">>,
): Promise<ListingImage[]> {
  const signed = await createSignedItemImageUrls(images.map((image) => image.storagePath));
  return images.map((image) => ({ ...image, url: signed.get(image.storagePath) ?? null }));
}
