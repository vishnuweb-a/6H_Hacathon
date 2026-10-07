/**
 * Media service tests.
 *
 * Covers the client-side validation gate and the storage path convention. The
 * bucket's own MIME and size limits remain the enforcement; these assert that a
 * person is told before a round trip, and that an upload path is always
 * `{user_id}/{item_id}/{uuid}.webp` rather than the original filename.
 */

import { describe, expect, it } from "vitest";

import {
  MediaValidationError,
  buildItemImagePath,
  validateImageFile,
} from "@/lib/services/media-service";

function fileOf(name: string, type: string, bytes: number): File {
  const file = new File(["x"], name, { type });
  // `File` size is derived from its content; override it for the limit check.
  Object.defineProperty(file, "size", { value: bytes });
  return file;
}

describe("validateImageFile", () => {
  it("accepts JPEG, PNG and WebP", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(() => validateImageFile(fileOf("photo", type, 1024))).not.toThrow();
    }
  });

  it("rejects SVG, which can carry active content", () => {
    expect(() => validateImageFile(fileOf("photo.svg", "image/svg+xml", 1024))).toThrow(
      MediaValidationError,
    );
  });

  it("rejects a PDF and other non-image files", () => {
    expect(() => validateImageFile(fileOf("doc.pdf", "application/pdf", 1024))).toThrow(
      MediaValidationError,
    );
    expect(() => validateImageFile(fileOf("a.zip", "application/zip", 1024))).toThrow(
      MediaValidationError,
    );
  });

  it("rejects a file over the 5 MB input limit", () => {
    expect(() => validateImageFile(fileOf("big.jpg", "image/jpeg", 5 * 1024 * 1024 + 1))).toThrow(
      /under 5 MB/i,
    );
  });

  it("accepts a file exactly at the limit", () => {
    expect(() =>
      validateImageFile(fileOf("edge.jpg", "image/jpeg", 5 * 1024 * 1024)),
    ).not.toThrow();
  });
});

describe("buildItemImagePath", () => {
  it("uses the documented {user_id}/{item_id}/{uuid}.webp shape", () => {
    const path = buildItemImagePath("11111111-1111-1111-1111-111111111111", "item-1");
    expect(path).toMatch(/^11111111-1111-1111-1111-111111111111\/item-1\/[0-9a-f-]{36}\.webp$/);
  });

  it("never uses the original filename as the object id", () => {
    const path = buildItemImagePath("user-a", "item-1");
    expect(path).not.toContain("photo");
    expect(path.endsWith(".webp")).toBe(true);
  });

  it("produces a distinct path on each call, so an upload cannot clobber another", () => {
    const a = buildItemImagePath("user-a", "item-1");
    const b = buildItemImagePath("user-a", "item-1");
    expect(a).not.toBe(b);
  });
});
