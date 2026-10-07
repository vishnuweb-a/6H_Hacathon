# Lost & Found Platform — API and Data Contracts

## 1. Purpose

This document defines the application-level data contracts between:

```text
React Frontend
      ↕
Supabase
```

It defines:

- frontend-facing DTOs
- public vs private data
- service function contracts
- database RPC contracts
- mutation payloads
- response shapes
- pagination conventions
- error codes
- status types
- realtime event expectations
- naming conventions
- serialization rules

The objective is to prevent the frontend and backend from developing conflicting assumptions.

The database schema remains authoritative for persistence.

This document remains authoritative for application data exchange.

---

# 2. Contract Principles

## 2.1 Never Expose Raw Tables Everywhere

The frontend should not consume unrestricted database rows for every screen.

Prefer purpose-specific models such as:

```text
PublicListing
ListingDetail
PrivateFoundListing
MatchSummary
ClaimDetail
RecoveryDetail
```

---

## 2.2 Public and Private Data Must Be Explicitly Different

The system must never rely on:

```text
"Frontend simply won't display the private property."
```

Private properties should not be returned at all to unauthorized callers.

---

## 2.3 Backend Owns Critical State

Clients may request actions such as:

```text
Accept Claim
Confirm Handover
Submit Rating
```

but clients must not submit authoritative lifecycle states directly.

Bad:

```json
{
  "status": "COMPLETED"
}
```

Good:

```text
confirm_handover(recovery_id)
```

The backend determines the resulting state.

---

# 3. Naming Convention

Database:

```text
snake_case
```

Examples:

```text
created_at
listing_type
overall_score
```

TypeScript application models may use:

```text
camelCase
```

Examples:

```text
createdAt
listingType
overallScore
```

Choose one mapping strategy and apply it consistently.

---

# 4. Recommended Mapping Strategy

Supabase-generated database types may remain:

```text
snake_case
```

inside the data-access layer.

Application DTOs should preferably use:

```text
camelCase
```

Example:

```text
Database Row
     ↓
Mapper
     ↓
Frontend DTO
```

---

# 5. IDs

All major resource IDs use:

```text
UUID string
```

TypeScript base type:

```ts
type UUID = string;
```

Do not treat IDs as numeric.

---

# 6. Date and Time Serialization

Timestamps:

```text
ISO 8601 strings
```

Example:

```text
2026-10-07T11:42:00.000Z
```

Dates:

```text
YYYY-MM-DD
```

Example:

```text
2026-10-07
```

Time-only values:

```text
HH:mm:ss
```

or normalized equivalent supplied by PostgreSQL/Supabase.

---

# 7. Shared Status Types

## ListingType

```ts
type ListingType = "LOST" | "FOUND";
```

---

# 8. ListingStatus

Recommended final contract:

```ts
type ListingStatus =
  | "ACTIVE"
  | "RECOVERY_IN_PROGRESS"
  | "RETURNED"
  | "CLOSED"
  | "CANCELLED";
```

Do not model:

```text
MATCH_FOUND
CLAIM_PENDING
```

as permanent listing states when they can be derived from related entities.

---

# 9. MatchStatus

```ts
type MatchStatus =
  | "ACTIVE"
  | "DISMISSED"
  | "CLAIMED"
  | "EXPIRED";
```

---

# 10. ClaimStatus

```ts
type ClaimStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";
```

---

# 11. RecoveryStatus

```ts
type RecoveryStatus =
  | "ACTIVE"
  | "PARTIALLY_CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";
```

---

# 12. NotificationType

```ts
type NotificationType =
  | "MATCH_FOUND"
  | "CLAIM_RECEIVED"
  | "CLAIM_ACCEPTED"
  | "CLAIM_REJECTED"
  | "NEW_MESSAGE"
  | "HANDOVER_UPDATE"
  | "RECOVERY_COMPLETED"
  | "RATING_REQUEST"
  | "SYSTEM";
```

---

# 13. Profile DTO

Public profile contract:

```ts
interface PublicProfile {
  id: UUID;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  trustScore: number;
  averageRating: number | null;
  ratingCount: number;
  successfulReturns: number;
  createdAt: string;
}
```

---

# 14. Public Profile Rules

Do not include:

```text
email
phone
auth metadata
private reports
claim history
moderation state
```

in the standard public profile DTO.

---

# 15. Current User Profile DTO

Authenticated own-profile data may include:

```ts
interface MyProfile extends PublicProfile {
  updatedAt: string;
}
```

Future private profile settings should use a separate DTO.

---

# 16. Update Profile Input

```ts
interface UpdateProfileInput {
  displayName?: string;
  username?: string | null;
  avatarPath?: string | null;
}
```

Do not accept:

```text
trustScore
averageRating
ratingCount
successfulReturns
```

from the client.

---

# 17. Listing Summary DTO

Used for:

- Explore cards
- Home recent listings
- Activity summaries

```ts
interface ListingSummary {
  id: UUID;
  userId: UUID;
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
}
```

---

# 18. Public Listing Detail DTO

```ts
interface PublicListingDetail {
  id: UUID;
  userId: UUID;
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
  creator: PublicProfile;
  createdAt: string;
  updatedAt: string;
}
```

---

# 19. Listing Image DTO

```ts
interface ListingImage {
  id: UUID;
  url: string;
  position: number;
}
```

Frontend receives usable URL.

Persistent database stores storage path.

---

# 20. Public Listing Exclusions

Never include unauthorized:

```text
latitude
longitude
private notes
serial fragment
unique markings
private contents
verification answers
```

by default.

---

# 21. Owner Listing Detail DTO

The creator may receive additional editable/internal-safe fields.

```ts
interface OwnerListingDetail extends PublicListingDetail {
  latitude: number | null;
  longitude: number | null;
  closedReason: string | null;
  closedAt: string | null;
}
```

For Found Listings, private data should remain a separate object.

---

# 22. Found Private Details DTO

Only available to the Finder who owns the Found Listing.

```ts
interface FoundPrivateDetails {
  itemId: UUID;
  privateNotes: string | null;
  serialFragment: string | null;
  uniqueMarkings: string | null;
  privateContents: string | null;
}
```

---

# 23. Verification Question DTO

Visible to eligible claimant:

```ts
interface VerificationQuestion {
  id: UUID;
  question: string;
  position: number;
}
```

No expected answer is included.

---

# 24. Create Lost Report Input

```ts
interface CreateLostReportInput {
  title: string;
  category: string;
  brand?: string | null;
  color?: string | null;
  description: string;
  eventDate: string;
  eventTime?: string | null;
  locationText: string;
  latitude?: number | null;
  longitude?: number | null;
}
```

The backend derives:

```text
user_id
listing_type = LOST
status = ACTIVE
```

---

# 25. Create Found Listing Input

```ts
interface CreateFoundListingInput {
  title: string;
  category: string;
  brand?: string | null;
  color?: string | null;
  description: string;
  eventDate: string;
  eventTime?: string | null;
  locationText: string;
  latitude?: number | null;
  longitude?: number | null;

  privateDetails?: {
    privateNotes?: string | null;
    serialFragment?: string | null;
    uniqueMarkings?: string | null;
    privateContents?: string | null;
  };

  verificationQuestions?: Array<{
    question: string;
    position: number;
  }>;
}
```

Backend derives:

```text
listing_type = FOUND
user_id = auth.uid()
status = ACTIVE
```

---

# 26. Listing Creation Response

Recommended:

```ts
interface CreateListingResult {
  itemId: UUID;
  listingType: ListingType;
  status: ListingStatus;
  createdAt: string;
}
```

Optional matching summary:

```ts
interface CreateListingResponse extends CreateListingResult {
  matchGeneration?: {
    generated: boolean;
    matchCount?: number;
    topScore?: number | null;
  };
}
```

Listing creation must not fail solely because matching failed.

---

# 27. Update Listing Input

```ts
interface UpdateListingInput {
  title?: string;
  category?: string;
  brand?: string | null;
  color?: string | null;
  description?: string;
  eventDate?: string;
  eventTime?: string | null;
  locationText?: string;
  latitude?: number | null;
  longitude?: number | null;
}
```

Do not accept:

```text
userId
listingType
status
createdAt
```

through normal edit contract.

---

# 28. Close Listing Input

Use explicit action rather than generic status update.

```ts
interface CloseListingInput {
  itemId: UUID;
  reason?: string | null;
}
```

Service:

```text
closeListing()
```

Backend determines valid resulting state.

---

# 29. Explore Filters

```ts
interface ExploreFilters {
  query?: string;
  listingType?: ListingType | "ALL";
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  locationQuery?: string;
  sort?: "NEWEST" | "OLDEST";
}
```

Possible future:

```text
distance
```

---

# 30. Pagination Contract

Recommended generic cursor contract:

```ts
interface CursorPageRequest {
  limit?: number;
  cursor?: string | null;
}
```

Response:

```ts
interface CursorPage<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
```

---

# 31. Default Pagination Limit

Recommended:

```text
20
```

Maximum:

```text
50
```

unless a specific endpoint requires something else.

---

# 32. Match Summary DTO

```ts
interface MatchSummary {
  id: UUID;
  lostItemId: UUID;
  foundItemId: UUID;
  overallScore: number;
  strength: MatchStrength;
  status: MatchStatus;
  matchedSignals: MatchSignal[];
  lostItem: ListingSummary;
  foundItem: ListingSummary;
  createdAt: string;
}
```

---

# 33. MatchStrength

```ts
type MatchStrength =
  | "POSSIBLE"
  | "STRONG"
  | "VERY_STRONG";
```

Mapping:

```text
60–74 → POSSIBLE
75–89 → STRONG
90–100 → VERY_STRONG
```

---

# 34. MatchSignal

```ts
type MatchSignal =
  | "CATEGORY"
  | "LOCATION"
  | "DATE"
  | "TIME"
  | "DESCRIPTION"
  | "BRAND"
  | "COLOR";
```

Only safe signals should be exposed.

---

# 35. Match Detail DTO

```ts
interface MatchDetail extends MatchSummary {
  categoryScore?: number;
  locationScore?: number;
  timeScore?: number;
  descriptionScore?: number;
}
```

Whether component scores are exposed is optional.

The UI does not require all internal scoring details.

---

# 36. Dismiss Match Input

```ts
interface DismissMatchInput {
  matchId: UUID;
}
```

RPC:

```text
dismiss_match(match_id)
```

---

# 37. Dismiss Match Response

```ts
interface DismissMatchResult {
  matchId: UUID;
  status: "DISMISSED";
}
```

---

# 38. Create Claim Input

Recommended RPC input:

```ts
interface CreateClaimInput {
  foundItemId: UUID;
  lostItemId: UUID;
  matchId?: UUID | null;
  additionalMessage?: string | null;
  answers: Array<{
    questionId: UUID;
    answer: string;
  }>;
}
```

Do not submit:

```text
claimantId
status
finderId
```

Backend derives all identity and state.

---

# 39. Claim Creation Rules

Backend verifies:

```text
auth.uid() owns Lost Report

Found Listing belongs to someone else

Listing is claimable

No duplicate active claim

Questions belong to Found Listing
```

---

# 40. Create Claim Response

```ts
interface CreateClaimResult {
  claimId: UUID;
  status: "PENDING";
  submittedAt: string;
}
```

---

# 41. Claim Summary DTO

```ts
interface ClaimSummary {
  id: UUID;
  foundItemId: UUID;
  lostItemId: UUID;
  claimantId: UUID;
  status: ClaimStatus;
  claimant: PublicProfile;
  lostItem: ListingSummary;
  foundItem: ListingSummary;
  submittedAt: string;
}
```

---

# 42. Claim Answer DTO

Only authorized claimant/Finder:

```ts
interface ClaimAnswer {
  questionId: UUID;
  question: string;
  answer: string;
}
```

Do not include expected/private Finder answer.

---

# 43. Claim Detail DTO

```ts
interface ClaimDetail extends ClaimSummary {
  matchId: UUID | null;
  additionalMessage: string | null;
  answers: ClaimAnswer[];
  acceptedAt: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
}
```

Finder-specific safe internal data may be supplied separately if needed.

---

# 44. Accept Claim Input

```ts
interface AcceptClaimInput {
  claimId: UUID;
}
```

RPC:

```text
accept_claim(claim_id)
```

Do not pass:

```text
finderId
ownerId
conversationId
recoveryId
```

Backend creates/derives these.

---

# 45. Accept Claim Response

```ts
interface AcceptClaimResult {
  claimId: UUID;
  claimStatus: "ACCEPTED";
  recoveryId: UUID;
  conversationId: UUID;
  foundItemId: UUID;
  lostItemId: UUID;
}
```

---

# 46. Reject Claim Input

```ts
interface RejectClaimInput {
  claimId: UUID;
  reason?: string | null;
}
```

RPC:

```text
reject_claim(claim_id, reason)
```

---

# 47. Reject Claim Response

```ts
interface RejectClaimResult {
  claimId: UUID;
  status: "REJECTED";
  rejectedAt: string;
}
```

---

# 48. Cancel Claim Input

```ts
interface CancelClaimInput {
  claimId: UUID;
}
```

Allowed only while eligible.

---

# 49. Conversation Summary DTO

```ts
interface ConversationSummary {
  id: UUID;
  recoveryId: UUID;
  otherParticipant: PublicProfile;
  item: ListingSummary;
  recoveryStatus: RecoveryStatus;
  isActive: boolean;
  lastMessage: MessagePreview | null;
  unreadCount: number;
  createdAt: string;
}
```

---

# 50. Message Preview

```ts
interface MessagePreview {
  content: string;
  senderId: UUID;
  createdAt: string;
}
```

Keep preview short in UI.

---

# 51. Message DTO

```ts
interface Message {
  id: UUID;
  conversationId: UUID;
  senderId: UUID;
  content: string;
  createdAt: string;
}
```

Optional frontend-only state:

```ts
type LocalMessageState =
  | "SENDING"
  | "SENT"
  | "FAILED";
```

Do not persist this unless needed.

---

# 52. Send Message Input

```ts
interface SendMessageInput {
  conversationId: UUID;
  content: string;
}
```

Backend derives:

```text
sender_id = auth.uid()
```

---

# 53. Send Message Response

```ts
interface SendMessageResult {
  message: Message;
}
```

---

# 54. Message Pagination

Request:

```ts
interface MessagePageRequest {
  conversationId: UUID;
  limit?: number;
  before?: {
    createdAt: string;
    id: UUID;
  } | null;
}
```

Response:

```ts
interface MessagePage {
  messages: Message[];
  nextCursor: {
    createdAt: string;
    id: UUID;
  } | null;
  hasMore: boolean;
}
```

---

# 55. Realtime Message Event

Realtime insert event should ultimately map to:

```ts
interface RealtimeMessageEvent {
  type: "MESSAGE_CREATED";
  message: Message;
}
```

The raw Supabase payload should be normalized before entering UI logic.

---

# 56. Mark Conversation Read

Input:

```ts
interface MarkConversationReadInput {
  conversationId: UUID;
}
```

Backend/client update affects only:

```text
current user's conversation_members.last_read_at
```

---

# 57. Recovery Summary DTO

```ts
interface RecoverySummary {
  id: UUID;
  claimId: UUID;
  lostItemId: UUID;
  foundItemId: UUID;
  ownerId: UUID;
  finderId: UUID;
  status: RecoveryStatus;
  startedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
}
```

---

# 58. Recovery Detail DTO

```ts
interface RecoveryDetail extends RecoverySummary {
  lostItem: ListingSummary;
  foundItem: ListingSummary;
  owner: PublicProfile;
  finder: PublicProfile;
  conversationId: UUID;
  handover: HandoverState;
  canRate: boolean;
  hasCurrentUserRated: boolean;
}
```

---

# 59. Handover State DTO

```ts
interface HandoverState {
  finderConfirmed: boolean;
  ownerConfirmed: boolean;
  finderConfirmedAt: string | null;
  ownerConfirmedAt: string | null;
  completedAt: string | null;
}
```

---

# 60. Confirm Handover Input

```ts
interface ConfirmHandoverInput {
  recoveryId: UUID;
}
```

RPC:

```text
confirm_handover(recovery_id)
```

Backend determines current user's role.

---

# 61. Confirm Handover Response

```ts
interface ConfirmHandoverResult {
  recoveryId: UUID;
  roleConfirmed: "OWNER" | "FINDER";
  finderConfirmed: boolean;
  ownerConfirmed: boolean;
  recoveryStatus: RecoveryStatus;
  completedAt: string | null;
}
```

---

# 62. Cancel Recovery Input

```ts
interface CancelRecoveryInput {
  recoveryId: UUID;
  reason: string;
}
```

Exact eligibility should be backend-controlled.

---

# 63. Cancel Recovery Response

```ts
interface CancelRecoveryResult {
  recoveryId: UUID;
  status: "CANCELLED";
  cancelledAt: string;
}
```

---

# 64. Rating DTO

```ts
interface Rating {
  id: UUID;
  recoveryId: UUID;
  fromUserId: UUID;
  toUserId: UUID;
  rating: number;
  review: string | null;
  createdAt: string;
}
```

---

# 65. Submit Rating Input

```ts
interface SubmitRatingInput {
  recoveryId: UUID;
  rating: 1 | 2 | 3 | 4 | 5;
  review?: string | null;
}
```

Do not submit:

```text
toUserId
fromUserId
```

Backend derives them.

---

# 66. Submit Rating Response

```ts
interface SubmitRatingResult {
  ratingId: UUID;
  rating: number;
  updatedProfile: {
    userId: UUID;
    trustScore: number;
    averageRating: number;
    ratingCount: number;
    successfulReturns: number;
  };
}
```

---

# 67. Public Review DTO

```ts
interface PublicReview {
  id: UUID;
  rating: number;
  review: string | null;
  reviewer: {
    id: UUID;
    displayName: string;
    avatarUrl: string | null;
  };
  createdAt: string;
}
```

Do not expose associated private recovery details.

---

# 68. Notification DTO

```ts
interface Notification {
  id: UUID;
  type: NotificationType;
  title: string;
  body: string;
  referenceType:
    | "MATCH"
    | "CLAIM"
    | "CONVERSATION"
    | "RECOVERY"
    | "RATING"
    | null;
  referenceId: UUID | null;
  readAt: string | null;
  createdAt: string;
}
```

---

# 69. Notification Read Contract

Input:

```ts
interface MarkNotificationReadInput {
  notificationId: UUID;
}
```

Output:

```ts
interface MarkNotificationReadResult {
  notificationId: UUID;
  readAt: string;
}
```

---

# 70. Mark All Notifications Read

Recommended RPC:

```text
mark_all_notifications_read()
```

Response:

```ts
interface MarkAllNotificationsReadResult {
  updatedCount: number;
  readAt: string;
}
```

---

# 71. Notification Realtime Event

Normalized:

```ts
interface NotificationCreatedEvent {
  type: "NOTIFICATION_CREATED";
  notification: Notification;
}
```

---

# 72. Activity DTO

The Activity screen may combine several domain resources.

Recommended response:

```ts
interface ActivityOverview {
  lostReports: ListingSummary[];
  foundListings: ListingSummary[];
  sentClaims: ClaimSummary[];
  receivedClaims: ClaimSummary[];
  activeRecoveries: RecoverySummary[];
}
```

At scale, fetch tabs independently rather than one huge response.

---

# 73. Home Dashboard Contract

Recommended:

```ts
interface HomeDashboardData {
  possibleMatches: MatchSummary[];
  activeRecoveries: RecoverySummary[];
  recentLostItems: ListingSummary[];
  recentFoundItems: ListingSummary[];
  unreadNotifications: number;
}
```

This may initially be assembled from multiple queries.

A dedicated RPC/view can be added later if needed.

---

# 74. API Error Shape

Service layer should normalize backend errors into:

```ts
interface AppError {
  code: AppErrorCode;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}
```

---

# 75. AppErrorCode

Recommended:

```ts
type AppErrorCode =
  | "UNAUTHENTICATED"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "CLAIM_ALREADY_EXISTS"
  | "ITEM_NOT_AVAILABLE"
  | "INVALID_CLAIM_STATE"
  | "RECOVERY_ALREADY_ACTIVE"
  | "RECOVERY_NOT_ACTIVE"
  | "HANDOVER_ALREADY_CONFIRMED"
  | "RATING_ALREADY_SUBMITTED"
  | "RATING_NOT_ALLOWED"
  | "CONVERSATION_CLOSED"
  | "UPLOAD_FAILED"
  | "MATCH_NOT_AVAILABLE"
  | "UNKNOWN";
```

---

# 76. Error Philosophy

Backend errors should be:

```text
stable enough for frontend logic
```

and:

```text
safe enough for user-facing mapping
```

Do not couple frontend behavior to full PostgreSQL error strings.

---

# 77. UNAUTHENTICATED

Meaning:

```text
No valid user session exists.
```

Frontend behavior:

```text
Redirect to login
```

where appropriate.

---

# 78. UNAUTHORIZED

Meaning:

```text
User is authenticated but lacks permission.
```

Frontend:

```text
403 / unauthorized state
```

---

# 79. NOT_FOUND

Do not reveal sensitive resource existence unnecessarily.

Message:

```text
Resource not found or unavailable.
```

---

# 80. VALIDATION_ERROR

May include:

```ts
{
  code: "VALIDATION_ERROR",
  message: "Please correct the highlighted fields.",
  field: "eventDate"
}
```

where applicable.

---

# 81. CONFLICT

Generic lifecycle conflict.

Example:

```text
The item changed while you were reviewing it.
```

Use more specific codes when available.

---

# 82. CLAIM_ALREADY_EXISTS

Frontend message:

```text
You've already submitted an active claim for this item.
```

---

# 83. ITEM_NOT_AVAILABLE

```text
This item is no longer available for claims.
```

---

# 84. RECOVERY_ALREADY_ACTIVE

```text
A recovery is already in progress for this item.
```

---

# 85. HANDOVER_ALREADY_CONFIRMED

Repeated confirmation should generally be handled idempotently where possible.

Frontend may simply refetch current state.

---

# 86. RATING_ALREADY_SUBMITTED

```text
You've already rated this recovery.
```

---

# 87. CONVERSATION_CLOSED

```text
This recovery is closed, so new messages can't be sent.
```

---

# 88. Service Result Convention

Choose one consistent application style.

Recommended:

Service functions:

```ts
async function getListing(id: UUID): Promise<PublicListingDetail>
```

throw normalized `AppError` on failure.

Avoid mixing:

```text
sometimes throw
sometimes { success: false }
sometimes return null
```

for equivalent failures.

---

# 89. Nullable vs Not Found

Use:

```text
null
```

only when absence is an expected valid value.

Examples:

```text
brand = null
avatarUrl = null
```

A requested missing listing should normally throw:

```text
NOT_FOUND
```

rather than return `null`.

---

# 90. Mutation Contract Pattern

Recommended architecture:

```text
UI
 ↓
useMutation()
 ↓
service function
 ↓
Supabase RPC / query
 ↓
normalize response
 ↓
typed result
```

---

# 91. Critical RPC List

Recommended MVP RPCs:

```text
create_claim

accept_claim

reject_claim

cancel_claim

dismiss_match

confirm_handover

cancel_recovery

submit_rating

mark_all_notifications_read

generate_matches
```

---

# 92. Optional RPCs

Could include:

```text
close_listing

update_my_profile

notify_possible_owner

mark_conversation_read
```

depending on implementation preference.

---

# 93. create_claim Contract

Input:

```text
found_item_id
lost_item_id
match_id?
additional_message?
answers[]
```

Output:

```text
claim_id
status
submitted_at
```

Backend side effects:

```text
claim row

claim answer rows

claim-received notification

match status update when applicable
```

---

# 94. accept_claim Contract

Input:

```text
claim_id
```

Backend side effects:

```text
claim → ACCEPTED

Found item → RECOVERY_IN_PROGRESS

Lost item → RECOVERY_IN_PROGRESS

recovery created

handover state created

conversation created

conversation members created

notifications created

other conflicting claims handled according to policy
```

Output:

```text
claim_id
recovery_id
conversation_id
```

---

# 95. Reject Claim Contract

Input:

```text
claim_id
reason?
```

Side effects:

```text
claim → REJECTED

notification created
```

Must not expose secret verification answers.

---

# 96. confirm_handover Contract

Input:

```text
recovery_id
```

The function determines whether caller is:

```text
OWNER
or
FINDER
```

Side effects depend on current state.

If one side:

```text
PARTIALLY_CONFIRMED
```

If both:

```text
recovery → COMPLETED
claim → COMPLETED
items → RETURNED
handover.completed_at set
trust metrics recalculated
rating notifications created
conversation closed/read-only
```

---

# 97. submit_rating Contract

Input:

```text
recovery_id
rating
review?
```

Backend:

```text
validate eligibility
derive target user
insert rating
recalculate average rating
recalculate trust
```

---

# 98. notify_possible_owner Contract

Optional Finder action.

Input:

```ts
interface NotifyPossibleOwnerInput {
  matchId: UUID;
}
```

Backend verifies:

```text
caller owns Found Listing

match active

notification not already sent
```

Response:

```ts
interface NotifyPossibleOwnerResult {
  notified: true;
}
```

---

# 99. Match Generation Contract

Internal/backend:

```text
generate_matches(item_id)
```

Input:

```text
item_id
```

Output concept:

```ts
interface MatchGenerationResult {
  itemId: UUID;
  generated: boolean;
  matchCount: number;
  topScore: number | null;
}
```

Failure should not invalidate listing creation.

---

# 100. Realtime Contract Philosophy

Raw Supabase realtime payloads should not flow directly throughout the application.

Normalize events first.

Example:

```text
Supabase payload
      ↓
realtime adapter
      ↓
Message DTO
      ↓
TanStack Query cache
```

---

# 101. Realtime Event Deduplication

Use authoritative IDs:

```text
message.id

notification.id
```

to prevent duplicate UI entries.

---

# 102. Storage Upload Contract

Recommended:

```ts
interface UploadItemImageInput {
  itemId: UUID;
  file: File;
  position: number;
}
```

Result:

```ts
interface UploadItemImageResult {
  imageId: UUID;
  storagePath: string;
  url: string;
  position: number;
}
```

---

# 103. Upload Contract Rules

Frontend service is responsible for:

```text
client validation
compression
upload progress
```

Backend/storage policies remain responsible for authorization.

---

# 104. Avatar Upload Result

```ts
interface UploadAvatarResult {
  storagePath: string;
  url: string;
}
```

The database/profile should persist path rather than expiring signed URL.

---

# 105. API Input Validation

Every externally supplied mutation input must be validated.

Frontend:

```text
Zod
```

Backend:

```text
PostgreSQL constraints
function checks
RLS
```

Never trust frontend validation alone.

---

# 106. String Length Contracts

Recommended initial limits:

```text
Listing title
120

Listing description
1000

Claim additional message
1000

Verification question
300

Verification answer
1000

Chat message
3000

Rating review
500

Profile display name
100
```

Exact database constraints should align with these limits.

---

# 107. Image Contract

Listing:

```text
maximum 3 images
```

Accepted:

```text
JPEG
PNG
WebP
```

Frontend should normalize processed uploads where possible to:

```text
WebP
```

---

# 108. Search Response

Recommended:

```ts
interface ExploreResponse {
  items: ListingSummary[];
  nextCursor: string | null;
  hasMore: boolean;
}
```

Do not send total count on every request unless the UI truly needs it.

---

# 109. Sorting Contract

Supported initial listing sort:

```text
NEWEST
OLDEST
```

Possible later:

```text
NEAREST
MATCH_RELEVANCE
```

but do not add before implemented.

---

# 110. Public API Safety

Any endpoint/view consumed for:

```text
Home
Explore
Public Profile
Listing Detail
```

must use public-safe DTOs.

Never reuse Finder-private DTOs for convenience.

---

# 111. Match Privacy Contract

Match DTO may contain:

```text
safe listing data
scores
matched signals
```

Must not contain:

```text
finder private details
expected verification details
claim answers
```

---

# 112. Claim Privacy Contract

Claim details may be visible only to:

```text
claimant
finder
```

No public claim DTO should exist.

---

# 113. Chat Privacy Contract

Conversation and message DTOs are only available to:

```text
conversation_members
```

There is no generic public:

```text
getConversation(id)
```

access without membership enforcement.

---

# 114. Recovery Privacy Contract

Recovery data is available only to:

```text
owner
finder
```

Public profiles may show aggregate successful return counts, not individual private recoveries.

---

# 115. Rating Privacy Contract

Public reviews may expose:

```text
rating
review
reviewer public identity
date
```

Do not expose:

```text
recovery chat
meetup details
private claim data
```

---

# 116. Notification Privacy Contract

Notification DTO is always user-scoped.

There is no endpoint to fetch arbitrary user's notifications.

---

# 117. Loading Contract

Queries should distinguish:

```text
initial loading
background refetch
empty data
error
```

Do not treat:

```text
[]
```

as loading.

---

# 118. Empty Data

Examples:

```text
matches: []
```

means:

```text
No matches currently exist.
```

not:

```text
Match request failed.
```

---

# 119. API Versioning

Formal external API versioning is not required for MVP because frontend/backend ship together.

However, database function contracts should be treated as stable once used.

Breaking RPC changes require coordinated frontend updates.

---

# 120. Database Type Generation

After schema migrations:

```text
Generate Supabase TypeScript types
```

and compile the frontend.

The application should not maintain stale manually duplicated database enum definitions without reason.

---

# 121. Domain Type Layer

Recommended separation:

```text
database.types.ts
→ generated

domain types
→ application-specific

DTOs
→ frontend-facing
```

This avoids tightly binding every UI component to raw PostgreSQL schema.

---

# 122. Mapper Layer

Example:

```text
mapListingRowToSummary()

mapListingRowToDetail()

mapMatchRowToSummary()

mapNotificationRow()
```

Only create explicit mappers where the transformation is useful.

Do not create meaningless boilerplate.

---

# 123. Query Service Naming

Preferred:

```text
getListing()

getListings()

getMatches()

getClaim()

getClaims()

getRecovery()

getConversations()

getMessages()

getNotifications()

getProfile()
```

---

# 124. Mutation Service Naming

Preferred:

```text
createLostReport()

createFoundListing()

updateListing()

closeListing()

createClaim()

acceptClaim()

rejectClaim()

cancelClaim()

dismissMatch()

sendMessage()

confirmHandover()

cancelRecovery()

submitRating()

markNotificationRead()
```

---

# 125. Avoid Generic Data Methods

Avoid UI code calling services such as:

```text
updateTable("claims", ...)
```

Feature services should expose domain-specific operations.

This protects lifecycle rules.

---

# 126. Cache Invalidation Contract

After `createLostReport()`:

Invalidate:

```text
my listings
activity
home
matches
```

as needed.

---

# 127. After createFoundListing()

Invalidate:

```text
my listings
activity
explore
matches
```

---

# 128. After createClaim()

Invalidate:

```text
claims
match
activity
notifications where relevant
```

---

# 129. After acceptClaim()

Invalidate:

```text
claim
claims
items
matches
recoveries
conversations
activity
notifications
```

---

# 130. After sendMessage()

Update:

```text
messages
conversation preview
```

Prefer cache insertion over broad app invalidation.

---

# 131. After confirmHandover()

Invalidate:

```text
recovery
activity
items
claim
notifications
profile if completion changes trust stats
```

---

# 132. After submitRating()

Invalidate:

```text
ratings
public profile
my profile
recovery
```

for relevant users.

---

# 133. Retry Policy

Safe GET/read operations:

```text
may retry
```

Sensitive mutations:

```text
should not automatically retry blindly
```

unless backend operation is idempotent.

---

# 134. Mutation Retry Guidance

Safe/relatively safe:

```text
mark notification read
```

Potentially dangerous without idempotency:

```text
create claim

send message

submit rating
```

Critical backend functions should be made idempotent where practical.

---

# 135. Client-Supplied Idempotency

Not required for all MVP mutations.

Future high-risk operations may accept:

```text
idempotency_key
```

for:

```text
message send
external notifications
payment-like operations if ever introduced
```

No payment exists in current Lost & Found MVP.

---

# 136. HTTP/API Layer

Because Supabase Client communicates directly with Supabase:

```text
REST
RPC
Storage
Realtime
```

the application does not need a separate custom REST server for MVP.

---

# 137. When to Use Direct Table Queries

Appropriate for:

```text
public-safe reads

own profile update through restricted path

listing reads

notification reads

message reads
```

provided RLS is correct.

---

# 138. When to Use RPC

Use RPC for:

```text
multi-table state transitions

critical authorization decisions

atomic operations

derived participant actions
```

Examples:

```text
accept_claim

confirm_handover

submit_rating
```

---

# 139. When to Use Edge Functions

Use when needing:

```text
external APIs

AI providers

service role logic

email/push integrations

image processing requiring server execution
```

Do not proxy all normal Supabase CRUD through Edge Functions.

---

# 140. Future Semantic Match Edge Contract

Possible future input:

```ts
interface GenerateSemanticMatchInput {
  itemId: UUID;
}
```

The Edge Function should load item data itself.

Do not send the full authoritative listing from the client.

---

# 141. AI Contract Rule

External AI operations must never accept client-provided private system state as trusted input.

Backend loads authoritative records.

---

# 142. Response Minimization

Return only fields needed for the current use case.

Examples:

Listing card should not download:

```text
full claims
messages
private details
```

This improves both:

```text
security
performance
```

---

# 143. Nullability Rules

Use `null` intentionally.

Examples:

```text
brand: null
eventTime: null
avatarUrl: null
```

Avoid:

```text
undefined
```

in network/database responses where the property is part of the contract.

Frontend input objects may use optional `undefined` before serialization.

---

# 144. Boolean Naming

Use positive names:

```text
isActive
canRate
hasMore
finderConfirmed
ownerConfirmed
```

Avoid ambiguous names:

```text
notClosed
notUnread
```

---

# 145. Score Contract

All matching scores use:

```text
0–100
```

not:

```text
0–1
```

in frontend DTOs.

Internal algorithms may use normalized values, but API output should be consistent.

---

# 146. Trust Contract

Trust score:

```text
0–100
```

Rating:

```text
1–5
```

Average rating:

```text
0–5
```

Do not mix these scales.

---

# 147. Location Contract

Public DTO:

```text
locationText
```

Owner/private backend DTO may include:

```text
latitude
longitude
```

Do not silently expose exact coordinates via a generic Listing object.

---

# 148. Role Derivation

The client should derive contextual role from authoritative data:

```text
currentUser.id === recovery.ownerId
```

or:

```text
currentUser.id === recovery.finderId
```

Backend still validates role.

Do not store permanent:

```text
role = OWNER
```

on user account because roles are contextual.

---

# 149. Claim Role Contract

A user can be:

```text
claimant
```

for one claim and:

```text
finder
```

for another.

Do not create global Owner/Finder roles.

---

# 150. API Security Rule

Never accept client-provided:

```text
trust score
match score
recovery status
claim status
sender identity
rating target
notification recipient
```

as authoritative.

These are backend-derived.

---

# 151. Frontend Validation Schema Alignment

Zod schemas should mirror API input contracts.

Example:

```text
lostReportSchema
```

must align with:

```text
CreateLostReportInput
```

Do not maintain unrelated validation rules in page components.

---

# 152. Error Mapping Layer

Recommended:

```text
Supabase/Postgres Error
       ↓
mapSupabaseError()
       ↓
AppError
       ↓
UI Message
```

---

# 153. Unknown Error

Fallback:

```text
Something went wrong. Please try again.
```

Log technical diagnostic safely.

Do not expose stack traces.

---

# 154. Network Error

Frontend message:

```text
We couldn't connect. Check your connection and try again.
```

Do not represent this as authorization failure.

---

# 155. Optimistic UI Contracts

Safe candidates:

```text
mark notification read

chat message visual sending state
```

Avoid optimistic final success for:

```text
claim acceptance

handover completion

trust updates
```

---

# 156. Soft Consistency

Some dashboard sections may briefly show stale cached state after mutation.

TanStack Query invalidation/refetch should reconcile them.

Critical detail screens should refetch authoritative state after sensitive mutation.

---

# 157. Route Parameter Contracts

Use UUID route params for:

```text
/items/:itemId

/matches/:matchId

/claims/:claimId

/recoveries/:recoveryId

/messages/:conversationId

/profile/:userId
```

Validate route parameter before querying.

---

# 158. Unauthorized Route Data

If user manually navigates to:

```text
/messages/{someone-elses-conversation}
```

backend returns unauthorized/not found.

Frontend should render:

```text
You don't have access to this conversation.
```

or generic unavailable state.

---

# 159. Data Contract Tests

Every major DTO should have at least:

```text
valid serialization test
null field test
unauthorized field absence test
```

where appropriate.

---

# 160. RPC Contract Tests

Test:

```text
correct input
invalid input
unauthenticated
unauthorized
wrong lifecycle state
duplicate call
concurrent call
```

for critical RPCs.

---

# 161. Public DTO Security Tests

Verify `PublicListingDetail` does not include:

```text
latitude
longitude
private notes
claim answers
```

for unrelated users.

---

# 162. Claim DTO Security Test

User C should never receive:

```text
ClaimDetail
```

for recovery between User A and B.

---

# 163. Message Contract Test

Realtime and initial query must produce equivalent `Message` shapes.

Do not force the UI to support two unrelated message models.

---

# 164. Notification Contract Test

Notification loaded through:

```text
initial query
```

and:

```text
Realtime
```

must normalize into the same `Notification` DTO.

---

# 165. Contract Source of Truth

For implementation:

```text
database-schema.md
→ persistence structure

auth-and-rls.md
→ authorization

api-and-data-contracts.md
→ application exchange format
```

If these conflict, update the documentation before inventing a workaround.

---

# 166. Core Contract Flow — Lost Report

```text
CreateLostReportInput
        ↓
createLostReport()
        ↓
items INSERT
        ↓
CreateListingResult
        ↓
Matching Engine
        ↓
MatchSummary[]
```

---

# 167. Core Contract Flow — Found Listing

```text
CreateFoundListingInput
        ↓
createFoundListing()
        ↓
Public Listing
+
Private Details
+
Verification Questions
        ↓
Matching Engine
```

---

# 168. Core Contract Flow — Claim

```text
CreateClaimInput
       ↓
create_claim()
       ↓
CreateClaimResult
       ↓
Finder sees ClaimDetail
```

---

# 169. Core Contract Flow — Accepted Claim

```text
AcceptClaimInput
      ↓
accept_claim()
      ↓
AcceptClaimResult
      │
      ├── recoveryId
      └── conversationId
```

Frontend then navigates to:

```text
/recoveries/:recoveryId
```

---

# 170. Core Contract Flow — Chat

```text
SendMessageInput
      ↓
INSERT
      ↓
Message
      ↓
RealtimeMessageEvent
      ↓
Other participant cache
```

---

# 171. Core Contract Flow — Handover

```text
ConfirmHandoverInput
        ↓
confirm_handover()
        ↓
ConfirmHandoverResult
        ↓
PARTIALLY_CONFIRMED
or
COMPLETED
```

---

# 172. Core Contract Flow — Rating

```text
SubmitRatingInput
       ↓
submit_rating()
       ↓
Rating
       ↓
Updated Reputation
```

---

# 173. Minimum RPC Outputs

Critical RPCs should return enough data for the frontend to:

```text
know the operation succeeded
know resulting entity ID
know resulting lifecycle state
navigate appropriately
update cache
```

Avoid returning entire unrelated datasets.

---

# 174. Contract Stability Rule

Once frontend code depends on an RPC response:

Do not silently rename:

```text
recovery_id
```

to:

```text
recovery
```

or change enum values without updating:

- migrations
- generated types
- services
- tests
- this document

---

# 175. API Definition of Done

The data-contract layer is MVP-ready when:

1. Public profile DTO is defined.
2. Listing summary/detail DTOs are defined.
3. Public and private Found data are separated.
4. Lost/Found creation inputs are defined.
5. Match summary/detail contracts are defined.
6. Claim creation and review contracts are defined.
7. Critical claim RPCs have stable inputs/outputs.
8. Conversation/message DTOs are defined.
9. Message pagination contract is defined.
10. Recovery and handover contracts are defined.
11. Rating contracts are defined.
12. Notification contracts are defined.
13. Pagination conventions are consistent.
14. Errors map into stable `AppErrorCode` values.
15. Sensitive user IDs/states are backend-derived.
16. Critical state transitions use RPCs.
17. Realtime events normalize into the same DTOs as normal queries.
18. Exact location is not accidentally included in public listing DTOs.
19. Private ownership evidence is absent from public contracts.
20. Generated Supabase types and application DTOs remain synchronized.

---

# 176. Final Contract Architecture

```text
                    REACT UI
                       │
                       ▼
                 FEATURE HOOK
                       │
                       ▼
                  SERVICE
                       │
                Typed Input DTO
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
       SELECT          RPC        STORAGE
          │            │            │
          └────────────┼────────────┘
                       │
                       ▼
                  SUPABASE
                       │
             RLS + VALIDATION
                       │
                       ▼
                AUTHORITATIVE DATA
                       │
                       ▼
                    MAPPER
                       │
                       ▼
                Typed Output DTO
                       │
                       ▼
                TANSTACK QUERY
                       │
                       ▼
                    REACT UI
```

The fundamental contract rule is:

> The frontend describes intent. The backend determines authority and final state.

The application should never depend on hidden conventions or loosely shaped objects for core recovery operations.

Every critical interaction should have an explicit, typed, testable contract.