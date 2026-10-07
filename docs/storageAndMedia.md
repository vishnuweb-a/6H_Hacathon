# Lost & Found Platform — Storage and Media

## 1. Purpose

This document defines how the Lost & Found Platform will handle media and file storage using Supabase Storage.

It covers:

- storage buckets
- file ownership
- upload paths
- image types
- file-size limits
- image validation
- compression
- previews
- public vs private access
- signed URLs
- storage RLS
- replacement and deletion
- cleanup
- media security
- future media expansion

The goal is to make media:

- safe
- efficient
- privacy-aware
- easy to manage
- predictable for frontend and backend code

---

# 2. Storage Provider

The platform will use:

```text
Supabase Storage
```

Initial media types include:

```text
Profile avatars

Lost item images

Found item images
```

Future media may include:

```text
Claim evidence

Moderation evidence

Recovery attachments
```

These future media types should remain outside MVP unless required.

---

# 3. Storage Principles

The system should follow these principles.

## 3.1 Store only what is required

Do not encourage users to upload unnecessary personal information.

---

## 3.2 Public media must be intentionally public

A file should never become publicly accessible just because it is convenient.

---

## 3.3 Storage ownership must match database ownership

A user may upload, replace, or delete only files they are authorized to manage.

---

## 3.4 File paths are not security

Knowing another user's file path must not allow unauthorized modification.

Supabase Storage policies remain authoritative.

---

## 3.5 Sensitive ownership evidence should remain private

Media that could prove ownership must not be exposed through a public bucket.

---

# 4. Initial Buckets

Recommended MVP buckets:

```text
avatars

item-images
```

Possible future buckets:

```text
claim-evidence

report-evidence

recovery-media
```

Do not create extra buckets until they are actually required.

---

# 5. Avatars Bucket

Bucket:

```text
avatars
```

Purpose:

Stores user profile pictures.

Recommended path:

```text
{user_id}/avatar.webp
```

Example:

```text
avatars/
└── 5b74.../
    └── avatar.webp
```

---

# 6. Avatar Visibility

Two reasonable options exist.

## Option A — Public

Suitable if profile avatars are always intended to be publicly visible.

Advantages:

- simple URLs
- easy caching
- low complexity

Risk:

- avatar remains accessible to anyone with the URL

---

## Option B — Private

Safer if profile visibility becomes more restricted.

Requires:

```text
signed URLs
```

For MVP, public avatars are acceptable if users are clearly informed that profile images are visible to other users.

---

# 7. Item Images Bucket

Bucket:

```text
item-images
```

Purpose:

Stores images associated with Lost Reports and Found Listings.

Recommended path:

```text
{user_id}/{item_id}/{file_id}.webp
```

Example:

```text
item-images/
└── user-uuid/
    └── item-uuid/
        ├── image-1.webp
        └── image-2.webp
```

---

# 8. Why Use User and Item IDs in Paths

This provides:

- clear ownership
- easier cleanup
- simpler RLS policies
- predictable organization
- easier debugging

Do not use human-readable names as authoritative paths.

Avoid:

```text
vishnu/black-wallet/photo.jpg
```

Prefer UUID-based paths.

---

# 9. Item Image Visibility

The initial item image may be public-safe.

However, the image must not expose private ownership clues.

Examples of risky details:

- serial numbers
- full ID card information
- home addresses
- private documents
- visible phone numbers
- financial cards
- confidential contents

Found-item upload UI should explicitly warn users about this.

---

# 10. Recommended Item Image Strategy

For MVP:

```text
item-images
→ private bucket
```

Then issue:

```text
signed URLs
```

for authorized or public-safe frontend rendering.

This gives the application more future flexibility than permanently public objects.

If simplicity is prioritized, a public bucket may be used only if all uploaded media is guaranteed to be public-safe.

Private is the safer default.

---

# 11. Claim Evidence Bucket

Future bucket:

```text
claim-evidence
```

This should always be private.

Possible evidence:

- old photo of the item
- purchase proof
- serial confirmation
- receipt
- identifying documents

These files may contain sensitive information.

Never place claim evidence in a public bucket.

---

# 12. Allowed Image Formats

Recommended accepted formats:

```text
image/jpeg

image/png

image/webp
```

Optional:

```text
image/heic
```

only if the frontend/backend can reliably convert it.

For MVP, it is simpler to accept:

```text
JPEG
PNG
WebP
```

---

# 13. Unsupported Formats

Reject:

```text
SVG
```

for user-uploaded images unless sanitized, because SVG can contain active content.

Also reject:

- executables
- archives
- PDFs for normal listing images
- arbitrary binary files

---

# 14. File Size Limits

Recommended limits:

## Avatar

```text
2 MB
```

maximum before client processing.

## Item Image

```text
5 MB
```

maximum before client processing.

## Future Claim Evidence

Potentially:

```text
8–10 MB
```

depending on evidence type.

Keep limits conservative.

---

# 15. Image Count

Recommended MVP:

## Lost Report

```text
1–3 images
```

## Found Listing

```text
1–3 images
```

Avoid excessive uploads.

Three images are enough to show:

- front
- side
- unique visual context

---

# 16. Image Dimensions

Recommended frontend target:

```text
maximum 1600px on longest side
```

For listing cards, much smaller display sizes are sufficient.

Do not upload original 12–50 megapixel camera images when unnecessary.

---

# 17. Client-Side Compression

Before upload, the frontend should:

```text
resize
compress
convert if appropriate
```

Recommended target:

```text
WebP
```

where browser support and implementation allow.

Possible output quality:

```text
0.75–0.85
```

depending on image complexity.

---

# 18. Compression Goals

The goal is not maximum compression.

The image should remain clear enough to identify:

- object type
- color
- visible characteristics

while reducing:

- upload time
- storage usage
- bandwidth
- page-load cost

---

# 19. Avatar Processing

Recommended avatar processing:

```text
Crop square
↓
Resize to approximately 512 × 512
↓
Convert to WebP
↓
Upload
```

Display sizes will generally be much smaller.

---

# 20. Item Image Processing

Recommended:

```text
Read image
↓
Correct orientation if needed
↓
Resize longest side
↓
Compress
↓
Generate WebP
↓
Upload
```

Do not aggressively crop item photos because full context may help recognition.

---

# 21. EXIF Metadata

Uploaded photos may contain EXIF metadata such as:

- GPS coordinates
- device model
- capture time
- orientation

Where possible, processed images should strip unnecessary EXIF metadata.

This is particularly important for privacy.

---

# 22. GPS Metadata

The platform should never rely on EXIF GPS as public listing location.

Explicitly selected application location should remain authoritative.

If EXIF data is preserved accidentally, it may leak more precise location than intended.

Therefore:

> Processed public/listing images should have location metadata removed.

---

# 23. Upload Flow

Recommended frontend flow:

```text
User selects image
      ↓
Validate MIME type
      ↓
Validate file size
      ↓
Preview locally
      ↓
Compress / resize
      ↓
Generate file ID
      ↓
Upload to Supabase Storage
      ↓
Store storage path in database
```

---

# 24. Database Storage Reference

The database should store:

```text
storage_path
```

rather than depending entirely on generated full URLs.

Example:

```text
user-id/item-id/uuid.webp
```

This makes it easier to:

- generate signed URLs
- change bucket configuration
- move between environments

---

# 25. Do Not Store Signed URLs

Signed URLs expire.

Do not persist them as permanent database values.

Store:

```text
bucket
+
storage_path
```

and generate a signed URL when required.

---

# 26. Preview Flow

Before upload:

```text
File selected
      ↓
Create local preview URL
      ↓
Show preview
```

After upload:

```text
Use uploaded media reference
```

Local preview URLs should be revoked when no longer needed.

---

# 27. Upload Progress

For larger files, show progress or clear loading feedback.

Examples:

```text
Uploading image...

Processing image...
```

The user should not wonder whether the upload failed.

---

# 28. Upload Failure

If upload fails:

```text
Keep form data intact

Keep local preview if possible

Show retry action
```

Do not clear the entire Lost/Found form because one media upload failed.

---

# 29. Partial Upload Failure

If multiple images are uploaded and one fails:

```text
Image 1 ✓

Image 2 Failed

Image 3 ✓
```

Allow:

```text
Retry failed image
```

without restarting successful uploads.

---

# 30. Upload Ordering

For multiple images, preserve display order.

Database:

```text
item_images.position
```

Example:

```text
0
1
2
```

The first image becomes the listing cover.

---

# 31. Cover Image

For MVP:

```text
lowest position
```

may be treated as cover image.

No separate cover field is required unless future UX requires manual reordering.

---

# 32. Image Reordering

Optional enhancement:

Allow users to drag/reorder images.

When reordered:

```text
update item_images.position
```

This is not necessary for earliest MVP.

---

# 33. Storage Ownership

For:

```text
item-images/{user_id}/{item_id}/...
```

the current user must satisfy:

```text
auth.uid() = user_id
```

and:

```text
items.id = item_id
AND
items.user_id = auth.uid()
```

where ownership verification is needed.

---

# 34. Avatar Storage Policy

Conceptual policy:

User may upload when path begins with:

```text
{auth.uid()}/
```

User may update/delete only their own directory.

---

# 35. Item Image Storage Policy

User may upload only if:

```text
path user_id = auth.uid()
```

and the referenced item belongs to them.

User may delete only images belonging to their own item.

---

# 36. Preventing Path Spoofing

A malicious client may manually submit:

```text
another-user-id/another-item-id/image.webp
```

The Storage RLS policy must reject it.

Frontend path generation is only convenience, not security.

---

# 37. Database vs Storage Authorization

Both should agree.

Database:

```text
item belongs to User A
```

Storage:

```text
User A can manage item's media
```

Avoid cases where database ownership and storage permissions diverge.

---

# 38. Item Image Insert Flow

Recommended:

```text
Create item
      ↓
Receive item_id
      ↓
Upload images to:
user_id/item_id/...
      ↓
Insert item_images rows
```

This is simpler than uploading before the item exists.

---

# 39. Temporary Uploads

If product UX requires image upload before item creation, use a temporary strategy such as:

```text
tmp/{user_id}/{draft_id}/...
```

then move/finalize after submission.

For MVP, avoid this additional complexity.

Create the item first or delay actual upload until final submission.

---

# 40. Orphaned Uploads

Possible failure:

```text
Storage upload succeeds
but
database insert fails
```

This creates orphaned objects.

Mitigation:

- cleanup failed upload immediately
- scheduled orphan cleanup later
- transaction-like application flow

For MVP, immediate best-effort cleanup is sufficient.

---

# 41. Orphaned Database Rows

Opposite failure:

```text
database row created
but
storage upload fails
```

The row may exist with no valid image.

This should be allowed if images are optional.

Do not make the entire listing unusable because an optional image failed.

---

# 42. Image Replacement

For avatars:

```text
Upload new avatar
      ↓
Update reference
      ↓
Delete old avatar
```

Preferred order:

1. upload new file
2. confirm upload
3. update database/profile
4. delete previous object

This avoids losing the avatar if the new upload fails.

---

# 43. Item Image Replacement

Similarly:

```text
upload replacement
      ↓
update item_images reference
      ↓
delete previous object
```

Avoid deleting old object first.

---

# 44. Item Image Deletion

User should be able to remove their own image while the listing is editable.

Flow:

```text
Delete request
      ↓
Check listing ownership
      ↓
Delete database reference
      ↓
Delete Storage object
```

Implementation order may vary, but partial failure must be handled.

---

# 45. Closing a Listing

Closing:

```text
ACTIVE → CLOSED
```

does not necessarily require deleting images.

Images may be required for:

- recovery history
- claim review
- audit
- completed return history

---

# 46. Returned Items

When item becomes:

```text
RETURNED
```

media should remain available to recovery participants and historical views according to product rules.

Do not immediately delete successful-recovery media.

---

# 47. Retention

MVP may retain item images while the listing/recovery exists.

Future retention policy may remove media from:

- long-closed listings
- abandoned drafts
- deleted accounts
- old moderation evidence

Retention should be defined before broad public deployment.

---

# 48. User Account Deletion

When account deletion is added, media handling should include:

```text
delete unnecessary avatar

delete private evidence

review item image retention needs

anonymize historical recovery records if required
```

Do not blindly delete files still needed for moderation or recovery integrity.

---

# 49. Privacy Review Before Upload

Found Listing form should include helper text such as:

```text
Make sure the image does not reveal details that should be used to verify the real owner.
```

This is important.

For example, if a wallet photo clearly shows:

```text
Name
College ID
Unique sticker
```

then claim verification becomes weaker.

---

# 50. Found Item Image Guidance

Finder should be encouraged to:

- photograph the item generally
- hide identifying numbers
- avoid displaying contents
- avoid showing full IDs
- avoid exposing financial cards
- avoid exposing addresses

---

# 51. Lost Item Image Guidance

Lost owner may upload an older photo.

This image can safely contain identifying characteristics if only displayed appropriately.

However, any publicly displayed version should still be reviewed for sensitive personal information.

---

# 52. Lost Item Image Privacy

A user may upload a photo containing:

- personal surroundings
- another person
- location clues

The UI should encourage cropping unrelated sensitive information.

---

# 53. Claim Evidence Media

If introduced later, claim evidence must be visible only to:

```text
Claimant

Finder

Authorized moderation/backend
```

Never expose it in:

```text
Explore

Match cards

Notifications

Public profile
```

---

# 54. Signed URL Strategy

For private bucket objects:

```text
Frontend requests signed URL
      ↓
Supabase validates access
      ↓
Short-lived URL issued
```

Recommended expiry depends on context.

For ordinary in-app image viewing:

```text
5–60 minutes
```

is reasonable.

Do not create excessively long-lived private-media URLs without need.

---

# 55. Signed URL Refresh

Because signed URLs expire:

```text
storage_path
```

remains the canonical value.

When URL expires:

```text
generate a new signed URL
```

The app should not treat URL expiry as missing media.

---

# 56. Caching

Public-safe media can use normal browser/CDN caching.

Private signed URLs may also cache temporarily, but expiry and authorization must remain respected.

---

# 57. Cache Busting

For avatar replacement using the same storage path, stale CDN/browser caches may occur.

Possible solutions:

```text
unique filename per upload
```

or:

```text
version query/reference
```

Recommended:

Use unique file names rather than overwriting the exact same object when easy.

---

# 58. MIME Validation

Do not trust the filename extension.

Validate:

```text
MIME type
```

and where possible, actual decoded image content.

A file named:

```text
photo.jpg
```

must not automatically be assumed to be a safe JPEG.

---

# 59. File Name Strategy

Do not use raw user file names as authoritative object names.

Original name may include:

- spaces
- unusual characters
- personal information
- path-like characters

Generate:

```text
UUID + safe extension
```

Example:

```text
a7d2...f1.webp
```

---

# 60. Original Filename

For listing images, there is usually no need to store original filename.

For future claim evidence, original filename may be stored as metadata only if useful.

---

# 61. Image Malware Considerations

Normal image uploads have lower risk than arbitrary files, but processing should still reject malformed inputs.

If advanced file scanning becomes necessary, use backend processing or a scanning service.

This is not required for MVP.

---

# 62. Content Moderation

Future media moderation may check for:

- inappropriate images
- unrelated spam
- personal information leakage

This can later use:

```text
Edge Function
+
moderation provider
```

Do not block MVP on automated image moderation.

---

# 63. Placeholder Images

If no image exists:

Use a category-specific placeholder.

Examples:

```text
Wallet icon

Headphones icon

Keys icon

Document icon
```

Avoid generic broken-image UI.

---

# 64. Listing Card Image Behavior

Recommended:

```text
aspect-ratio: 4 / 3
```

Use:

```text
object-cover
```

and:

```text
lazy loading
```

---

# 65. Detail Image Behavior

On item detail:

- maintain full visible context
- allow larger preview
- avoid excessive crop
- optionally allow gallery

---

# 66. Gallery

If multiple images exist:

Mobile:

```text
swipe / carousel
```

Desktop:

```text
primary image + thumbnails
```

Keep gallery simple.

---

# 67. Avatar Fallback

If no avatar exists:

```text
User initials
```

should be displayed.

Example:

```text
VB
```

Avoid anonymous broken-image icons.

---

# 68. Alt Text

Images must include useful alt text.

Listing image:

```text
Photo of black wallet
```

Avoid:

```text
image123
```

Avatar:

```text
Vishnu Bhardwaj profile picture
```

or empty alt if decorative and name already adjacent.

---

# 69. Accessibility

Media components must support:

- keyboard gallery navigation where applicable
- meaningful alt text
- visible focus
- no critical information conveyed only visually

---

# 70. Upload Component

Recommended shared component:

```text
ItemImageUploader
```

Responsibilities:

- file selection
- drag/drop if desired
- validation
- preview
- compression
- upload state
- error state
- retry
- removal

---

# 71. Upload Component States

```text
Empty

Selected

Processing

Uploading

Uploaded

Failed
```

Each state should be visually explicit.

---

# 72. Upload Validation Errors

Examples:

```text
This file type isn't supported.

Image must be smaller than 5 MB.

You can upload up to 3 images.

We couldn't process this image.
```

Do not show technical browser errors directly.

---

# 73. Retry Behavior

A failed upload should allow:

```text
Retry
```

without requiring reselection when the browser still holds the File object.

---

# 74. Upload Cancellation

If practical, users may cancel an in-progress upload.

Not essential for MVP.

---

# 75. Media Service Layer

Frontend media operations should live behind services.

Example:

```text
features/listings/services/media.service.ts
```

Functions may include:

```text
uploadItemImage()

deleteItemImage()

getSignedItemImageUrl()

uploadAvatar()

deleteAvatar()
```

---

# 76. Do Not Scatter Storage Calls

Avoid:

```text
supabase.storage.from(...)
```

inside many unrelated React components.

Use dedicated service functions.

---

# 77. Database Synchronization

Media operations often affect both:

```text
Supabase Storage
```

and:

```text
PostgreSQL
```

The application must account for failure between those systems.

---

# 78. Item Image Creation Flow

Recommended:

```text
Create listing
      ↓
Receive item ID
      ↓
Upload first image
      ↓
Insert item_images row
      ↓
Repeat
```

If an image fails:

```text
listing can still exist
```

if image is optional.

---

# 79. Avatar Update Flow

```text
Process avatar
      ↓
Upload new object
      ↓
Update profile avatar path
      ↓
Delete previous object
      ↓
Invalidate profile cache
```

---

# 80. Storage Bucket Naming

Use lowercase kebab-case.

Good:

```text
item-images

claim-evidence
```

Avoid:

```text
ItemImages

item_images_bucket
```

---

# 81. Storage Folder Naming

Use IDs and predictable hierarchy.

Recommended:

```text
{user_id}/{resource_id}/{file_id}.webp
```

---

# 82. Cross-Environment Storage

Development, staging, and production Supabase projects should have separate buckets.

Never reuse production Storage as a development file repository.

---

# 83. Seed Media

For local development, sample images may be stored in:

```text
public/assets/
```

or local seed resources rather than relying on production Storage.

---

# 84. Storage Migration Considerations

Supabase bucket creation and policies should be included in project setup/migrations where possible.

Storage configuration should not rely only on manual dashboard actions.

---

# 85. Recommended Bucket Configuration Summary

## avatars

```text
Purpose:
Profile photos

Max size:
2 MB input

Output:
~512 × 512

Visibility:
Public or controlled

Path:
{user_id}/{uuid}.webp
```

---

## item-images

```text
Purpose:
Lost/Found item photos

Max input size:
5 MB

Max count:
3 per item initially

Output:
max 1600px longest side

Visibility:
Prefer private + signed URLs

Path:
{user_id}/{item_id}/{uuid}.webp
```

---

# 86. Future claim-evidence

```text
Purpose:
Private ownership evidence

Visibility:
Private only

Access:
Claimant + Finder + authorized backend

Signed URLs:
Required
```

---

# 87. Storage Security Checklist

Before release verify:

1. Users cannot upload into another user's avatar folder.
2. Users cannot overwrite another user's item image.
3. Users cannot delete another user's media.
4. Private buckets cannot be fetched without authorization.
5. Signed URLs expire.
6. Private evidence is never public.
7. Storage paths use UUIDs.
8. Service-role key is never used in browser upload code.
9. File types are validated.
10. File-size limits are enforced.
11. SVG uploads are rejected.
12. EXIF GPS data is stripped where possible.
13. Sensitive ownership clues are not encouraged in public images.
14. Closed/returned media is not unintentionally deleted.
15. Logout does not expose stale private signed media through application state.

---

# 88. Media Performance Checklist

Use:

```text
compression

resize

lazy loading

thumbnail-sized display

limited image count

caching
```

Avoid:

```text
original full-resolution camera uploads

loading all gallery images immediately

unlimited image lists
```

---

# 89. Privacy Checklist for Found Images

Before publishing a Found Listing, remind Finder to verify the photo does not reveal:

```text
Full ID card

Phone number

Address

Bank card information

Serial number used for proof

Private wallet contents

Hidden markings used for verification
```

---

# 90. Recovery Media Philosophy

The application's visual media should help users identify objects without weakening the ownership-verification system.

Therefore:

```text
Public image
→ enough to recognize category/object

Private details
→ enough to prove ownership
```

These two responsibilities must remain separate.

---

# 91. Complete Media Flow

```text
User selects image
       ↓
Client validation
       ↓
Resize / compression
       ↓
Remove unnecessary metadata
       ↓
Preview
       ↓
Upload to user-owned path
       ↓
Storage RLS validation
       ↓
Store path in database
       ↓
Generate signed/public URL
       ↓
Display optimized image
```

---

# 92. Media Definition of Done

Storage and media handling are MVP-ready when:

1. Users can upload profile avatars.
2. Users can upload item images.
3. Invalid file types are rejected.
4. Oversized files are rejected or compressed.
5. Item images are optimized before upload.
6. Users can access their own media.
7. Unauthorized users cannot modify another user's media.
8. Private files require authorization.
9. Database stores storage paths rather than expiring signed URLs.
10. Listing images render reliably.
11. Broken images have fallback states.
12. Upload failures can be retried.
13. Sensitive image guidance is shown for Found Listings.
14. Storage policies are tested with unrelated users.
15. Old/replaced media is cleaned up safely.

---

# 93. Final Storage Principle

The storage layer should follow one core rule:

> Media should help recovery without becoming a privacy leak.

The recommended architecture is:

```text
USER
  ↓
VALIDATE
  ↓
PROCESS
  ↓
UPLOAD
  ↓
AUTHORIZE
  ↓
STORE REFERENCE
  ↓
CONTROL ACCESS
  ↓
DISPLAY
```

Supabase Storage should remain responsible for object storage and access enforcement, while PostgreSQL remains the source of truth for who owns the associated resource and how that media relates to the recovery lifecycle.