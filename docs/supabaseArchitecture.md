# Lost & Found Platform — Supabase Backend Architecture

## 1. Purpose

This document defines how Supabase will be used as the backend platform for the Lost & Found application.

Supabase will provide:

- authentication
- PostgreSQL database
- Row Level Security
- file storage
- realtime communication
- database functions
- database triggers
- Edge Functions where needed
- generated TypeScript types

The backend must support the complete recovery lifecycle:

```text
REPORT
   ↓
MATCH
   ↓
CLAIM
   ↓
VERIFY
   ↓
CONNECT
   ↓
HANDOVER
   ↓
CONFIRM
   ↓
RATE
   ↓
TRUST
```

The primary backend goals are:

- strong authorization
- data privacy
- reliable state transitions
- atomic critical operations
- low infrastructure complexity
- maintainability
- scalability
- predictable frontend integration

---

# 2. Backend Technology

Backend platform:

```text
Supabase
```

Core services used:

```text
Supabase Auth
Supabase PostgreSQL
Supabase Storage
Supabase Realtime
Row Level Security
PostgreSQL Functions
PostgreSQL Triggers
Supabase Edge Functions
```

---

# 3. High-Level Backend Architecture

```text
React Frontend
      │
      ▼
Supabase Client
      │
      ├───────────────┐
      │               │
      ▼               ▼
    Auth           Database
                      │
                      ├──────── Storage
                      │
                      ├──────── Realtime
                      │
                      ├──────── Functions
                      │
                      └──────── Triggers
```

For operations requiring privileged server-side work:

```text
React
  ↓
Edge Function
  ↓
Supabase Backend
```

---

# 4. Backend Responsibilities

Supabase will be responsible for:

```text
User authentication
User profiles
Lost reports
Found listings
Item images
Matching records
Claims
Verification questions
Verification answers
Conversations
Messages
Recovery sessions
Handovers
Ratings
Trust score
Notifications
Reports / abuse
```

The frontend must not be authoritative for any of these states.

---

# 5. Backend Principles

## Principle 1 — Database Is the Source of Truth

The authoritative state lives in PostgreSQL.

The frontend may cache data but must not become authoritative.

---

## Principle 2 — RLS Is Mandatory

Sensitive tables must use Row Level Security.

Frontend visibility must never be treated as security.

---

## Principle 3 — Critical Operations Must Be Atomic

Operations affecting multiple tables should happen through:

```text
PostgreSQL function
```

or:

```text
Edge Function + transaction-safe backend operation
```

Examples:

```text
Accept claim
Complete handover
Update trust
Close recovery
```

---

## Principle 4 — Sensitive Information Must Be Separated

Private finder information should not be stored in broad public listing payloads.

Prefer separate tables or controlled views.

---

## Principle 5 — Backend Controls Trust

The client must not update:

```text
trust_score
successful_returns
average_rating
badges
```

directly.

---

# 6. Environment Strategy

Recommended Supabase environments:

```text
Development
Staging
Production
```

Each environment should have its own:

```text
Supabase project
Database
Auth users
Storage buckets
Secrets
```

Do not use production data for local development.

---

# 7. Frontend Supabase Configuration

Frontend-safe variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

These may be used by the browser.

Never expose:

```text
SUPABASE_SERVICE_ROLE_KEY
```

to the frontend.

---

# 8. Backend Secrets

Secrets required by Edge Functions or backend jobs should be stored through Supabase secret management.

Examples:

```text
SUPABASE_SERVICE_ROLE_KEY

AI_PROVIDER_API_KEY

EMAIL_PROVIDER_KEY

WEBHOOK_SECRET
```

They must not be included in:

```text
React source code
Git repository
.env.example real values
browser environment
```

---

# 9. Authentication Architecture

Supabase Auth will manage user authentication.

Initial supported authentication:

```text
Email + Password
```

Optional later:

```text
Google OAuth
Phone Authentication
```

---

# 10. Authentication Flow

```text
User submits credentials
        ↓
Supabase Auth
        ↓
Auth user created / authenticated
        ↓
JWT session issued
        ↓
Frontend receives session
        ↓
Authenticated database requests
```

Supabase includes authenticated user ID through:

```text
auth.uid()
```

This should be used throughout RLS policies.

---

# 11. Profile Creation

Authentication records should not contain all public user data.

Create a separate:

```text
profiles
```

table.

Recommended flow:

```text
New auth user
      ↓
Database trigger
      ↓
Create profiles record
```

This avoids relying on the frontend to create profiles reliably.

---

# 12. Profile Trigger

Example conceptual trigger:

```text
auth.users INSERT
        ↓
handle_new_user()
        ↓
profiles INSERT
```

The trigger may copy:

```text
user_id
display_name
avatar_url
created_at
```

from auth metadata where available.

---

# 13. Profiles Table Responsibility

The `profiles` table will hold:

```text
id
display_name
username
avatar_url
trust_score
average_rating
successful_returns
created_at
updated_at
```

Exact columns are defined in:

```text
08-database-schema.md
```

---

# 14. Listing Architecture

A central listings table should represent both:

```text
LOST
FOUND
```

items.

Recommended table:

```text
items
```

with:

```text
listing_type = LOST | FOUND
```

This avoids unnecessary duplication.

---

# 15. Item Public Data

The main item record should contain information safe for normal authorized listing queries.

Examples:

```text
title
category
brand
color
description
date
time
approximate location
status
```

---

# 16. Private Found Information

Do not place sensitive ownership clues directly in broadly queried public item rows if they can be avoided.

Use a separate table such as:

```text
found_item_private_details
```

Possible fields:

```text
item_id
private_notes
serial_fragment
unique_markings
private_contents
created_at
```

Access should be restricted to:

```text
Finder / listing owner
Authorized backend verification logic
```

---

# 17. Verification Questions

Use a separate table:

```text
verification_questions
```

Examples:

```text
id
item_id
question
position
created_at
```

Questions may be visible to claimants.

The expected/private answer should not necessarily be stored in the same publicly queryable table.

---

# 18. Verification Answer Storage

Claimant answers should be stored separately:

```text
claim_answers
```

Access:

```text
Claimant
Finder
Authorized backend
```

Other users must not access them.

---

# 19. Storage Architecture

Use Supabase Storage for:

```text
Profile avatars
Item images
```

Recommended buckets:

```text
avatars
item-images
```

Optional future buckets:

```text
claim-evidence
```

if image-based evidence is later supported.

---

# 20. Storage Visibility

Recommended initial approach:

## Avatars

May be public or controlled depending on final privacy requirements.

## Item Images

Prefer controlled access where practical.

If public URLs are used, ensure no sensitive item information is uploaded.

For sensitive evidence:

```text
Private bucket
+
Signed URLs
```

should be used.

---

# 21. Storage Path Structure

Recommended:

```text
avatars/{user_id}/avatar.webp
```

and:

```text
item-images/{user_id}/{item_id}/{uuid}.webp
```

This makes ownership clear.

---

# 22. Storage RLS

Storage policies should ensure:

```text
Users upload only into their own folder
Users can delete only their own images
Unauthorized users cannot overwrite another user's assets
```

---

# 23. Database Schemas

Primary application tables may live under:

```text
public
```

for simplicity.

If the project grows, sensitive internal functions may use dedicated schemas such as:

```text
private
```

but the MVP does not require unnecessary schema complexity.

---

# 24. Core Tables

The backend will likely include:

```text
profiles

items

item_images

found_item_private_details

verification_questions

matches

claims

claim_answers

conversations

conversation_members

messages

recoveries

handovers

ratings

notifications

user_reports
```

Exact definitions belong in:

```text
08-database-schema.md
```

---

# 25. Listing Creation Flow

For a Lost Report:

```text
Frontend
   ↓
createLostReport()
   ↓
INSERT items
   ↓
listing_type = LOST
   ↓
status = ACTIVE
   ↓
upload images
   ↓
matching triggered
```

For Found Listing:

```text
Frontend
   ↓
createFoundListing()
   ↓
INSERT items
   ↓
listing_type = FOUND
   ↓
INSERT private details
   ↓
INSERT verification questions
   ↓
matching triggered
```

---

# 26. Matching Trigger Strategy

The matching engine should be triggered after:

```text
New Lost Report
New Found Listing
Relevant Listing Update
```

There are two reasonable architectures.

---

# 27. Matching Option A — Database Function

Recommended for MVP.

Flow:

```text
Item created
   ↓
Frontend / database invokes
generate_matches(item_id)
   ↓
PostgreSQL function
   ↓
Candidate query
   ↓
Score
   ↓
INSERT matches
```

Advantages:

- close to data
- simple infrastructure
- fast
- transactional
- low operational complexity

---

# 28. Matching Option B — Edge Function

Useful later if matching needs:

```text
AI embeddings
External AI APIs
Image analysis
Complex processing
```

Flow:

```text
New Item
   ↓
Edge Function
   ↓
Database candidates
   ↓
AI Provider
   ↓
Score
   ↓
Store Matches
```

---

# 29. Recommended Matching Architecture

For MVP:

```text
PostgreSQL
```

for:

```text
category
date
time
location
basic text
```

Later:

```text
Edge Function
+
embedding provider
+
pgvector
```

for semantic matching.

---

# 30. Match Record

Each match should persist.

Example:

```text
matches
```

stores:

```text
lost_item_id
found_item_id
overall_score
category_score
location_score
time_score
description_score
status
created_at
```

This allows:

- ranking
- deduplication
- analytics
- dismissal
- future model evaluation

---

# 31. Match Uniqueness

The backend should prevent duplicate Lost ↔ Found pair records.

Use a uniqueness constraint conceptually equivalent to:

```text
UNIQUE(lost_item_id, found_item_id)
```

---

# 32. Match Recalculation

When listing data changes:

```text
Item updated
   ↓
Relevant fields changed?
```

Relevant fields:

```text
category
description
date
time
location
brand
color
```

If yes:

```text
recalculate matches
```

Avoid rerunning matching after irrelevant changes such as:

```text
view count
UI metadata
```

---

# 33. Claim Creation

Recommended operation:

```text
create_claim()
```

The backend must check:

```text
User is authenticated
Listing is FOUND
Listing is active
User is not Finder
Lost report belongs to claimant
No duplicate active claim exists
Lost report is compatible with claiming
```

Then create:

```text
claim
claim answers
notification
```

---

# 34. Claim Creation Should Be Atomic

Do not allow:

```text
Claim inserted
but
answers failed
```

as a valid end state.

Prefer a database function that inserts all required claim state together.

---

# 35. Claim Acceptance

Claim acceptance is a critical transaction.

Avoid frontend logic like:

```text
update claim
update item
create conversation
create recovery
create notification
```

as separate requests.

Instead call:

```text
accept_claim(claim_id)
```

---

# 36. accept_claim() Responsibilities

The function should verify:

```text
Authenticated user is Finder
Claim belongs to user's Found Listing
Claim status = PENDING
Item still available
No active recovery already exists
```

Then atomically:

```text
claim.status = ACCEPTED

item.status = RECOVERY_IN_PROGRESS

create recovery

create conversation

create conversation members

create notifications
```

---

# 37. Reject Claim Operation

Recommended:

```text
reject_claim(claim_id, reason?)
```

The backend checks:

```text
current user owns found listing
claim = PENDING
```

Then:

```text
claim.status = REJECTED
create notification
```

---

# 38. Multiple Claims

A found item may receive multiple pending claims.

However:

```text
Only one active accepted recovery
```

should exist for an item at a time.

This should be enforced at the database level where possible.

---

# 39. Conversation Architecture

A conversation should only exist after a claim is accepted.

Tables:

```text
conversations
conversation_members
messages
```

Conversation participants:

```text
Owner
Finder
```

---

# 40. Conversation Creation

Conversation creation should be part of:

```text
accept_claim()
```

rather than a separate frontend action.

This prevents users from manually opening unauthorized chats.

---

# 41. Conversation Membership

Use:

```text
conversation_members
```

to explicitly define participants.

Example:

```text
conversation_id
user_id
joined_at
```

This makes RLS easier.

---

# 42. Message Authorization

A user may read messages only if:

```text
auth.uid()
```

exists in:

```text
conversation_members
```

for that conversation.

A user may send a message only if they are a member and the conversation is active.

---

# 43. Realtime Chat

Supabase Realtime should subscribe to:

```text
messages
```

filtered by:

```text
conversation_id
```

Flow:

```text
Message INSERT
   ↓
Postgres change
   ↓
Supabase Realtime
   ↓
Other client receives message
```

---

# 44. Realtime Scope

Avoid broad subscriptions such as:

```text
all messages
all notifications
all claims
```

Use narrowly filtered subscriptions.

---

# 45. Message Read State

Possible implementations:

Option A:

```text
messages.read_at
```

Good for two-user conversations.

Option B:

```text
message_reads
```

Useful for multi-member conversations.

For MVP with two users:

```text
read_at
```

or conversation-level last-read timestamp is sufficient.

---

# 46. Recovery Architecture

Create a dedicated:

```text
recoveries
```

record when a claim is accepted.

This becomes the canonical object for:

```text
accepted claim
conversation
handover
completion
rating eligibility
```

---

# 47. Recovery States

Example:

```text
ACTIVE
HANDOVER_PENDING
PARTIALLY_CONFIRMED
COMPLETED
CANCELLED
```

Exact enum will be defined in database schema.

---

# 48. Handover Confirmation

Each side confirms independently.

Possible backend operation:

```text
confirm_handover(recovery_id)
```

Backend determines current user's role.

If Finder:

```text
finder_confirmed = true
```

If Owner:

```text
owner_confirmed = true
```

---

# 49. Dual Confirmation

After every confirmation:

```text
Check both flags
```

If:

```text
finder_confirmed = true
AND
owner_confirmed = true
```

then backend should atomically complete recovery.

---

# 50. Recovery Completion

The backend completion function should update:

```text
recovery.status = COMPLETED

claim.status = COMPLETED

item.status = RETURNED

lost item status = RETURNED where applicable

handover completed_at
```

and then:

```text
update successful return metrics
create rating eligibility
create notifications
```

---

# 51. Recovery Completion Must Be Idempotent

Calling completion logic twice must not:

```text
increment return count twice
create duplicate notifications
duplicate ratings eligibility
```

Backend functions must safely handle repeated calls.

---

# 52. Rating Architecture

Ratings should only be allowed if:

```text
Recovery = COMPLETED
```

and:

```text
Rater participated in recovery
```

and:

```text
Rater != Rated User
```

and:

```text
No rating already exists from this user for this recovery
```

---

# 53. Rating Insert

Recommended function:

```text
submit_rating(
  recovery_id,
  rating,
  review
)
```

The backend derives:

```text
from_user
to_user
```

from recovery participants.

The client should not be allowed to arbitrarily specify any target user.

---

# 54. Rating Constraints

Database should enforce:

```text
rating >= 1
rating <= 5
```

and unique:

```text
recovery_id + from_user_id
```

---

# 55. Trust Score Architecture

The backend should calculate trust.

Trust inputs may include:

```text
completed returns
average rating
rating count
claim history
account age
reported abuse
```

The initial algorithm may remain simple.

---

# 56. Trust Recalculation

Recommended:

```text
recalculate_user_trust(user_id)
```

This can be invoked after:

```text
Recovery completed
Rating submitted
Moderation action
```

---

# 57. Trust Is Derived Data

Whenever possible, authoritative metrics should be derivable from source records.

For example:

```text
successful_returns
```

can be computed from completed recoveries.

Caching aggregate values on `profiles` is acceptable for performance, but they should only be updated by backend logic.

---

# 58. Notifications Architecture

Use a persistent:

```text
notifications
```

table.

Fields may include:

```text
id
user_id
type
title
body
reference_type
reference_id
read_at
created_at
```

---

# 59. Notification Types

Examples:

```text
MATCH_FOUND
CLAIM_RECEIVED
CLAIM_ACCEPTED
CLAIM_REJECTED
NEW_MESSAGE
HANDOVER_CONFIRMED
RECOVERY_COMPLETED
RATING_REQUEST
```

---

# 60. Notification Creation

Notifications should normally be generated by backend state changes rather than frontend code.

Example:

```text
Claim accepted
   ↓
Backend function
   ↓
Notification inserted
```

This ensures notifications remain consistent.

---

# 61. Notification Realtime

For MVP, realtime notification badges may subscribe to:

```text
notifications
```

filtered by:

```text
user_id = auth.uid()
```

This is optional if polling/invalidation is simpler initially.

---

# 62. Database Functions

Recommended database functions:

```text
create_claim()

accept_claim()

reject_claim()

confirm_handover()

cancel_recovery()

submit_rating()

recalculate_user_trust()

generate_matches()

dismiss_match()
```

Not all must exist on day one, but sensitive multi-step operations should.

---

# 63. Why Database Functions

Advantages:

```text
Atomic operations
Lower network chatter
Central authorization
Consistent business logic
Less frontend complexity
Better concurrency safety
```

---

# 64. Function Security

Use:

```text
SECURITY DEFINER
```

only when truly necessary.

Functions using elevated privileges must:

- validate `auth.uid()`
- restrict search_path
- avoid arbitrary SQL input
- check object ownership explicitly

Do not use elevated functions as a shortcut around RLS.

---

# 65. Database Triggers

Recommended triggers include:

```text
create profile on auth user creation

update updated_at fields

optional aggregate recalculation

optional notification triggers
```

Avoid putting all business logic in triggers.

Critical product operations are usually clearer as explicit functions.

---

# 66. updated_at Trigger

Reusable trigger:

```text
BEFORE UPDATE
```

sets:

```text
updated_at = now()
```

for mutable tables.

Examples:

```text
profiles
items
claims
recoveries
```

---

# 67. Edge Functions

Edge Functions should be used when logic requires:

```text
external APIs
service role access
AI provider calls
webhooks
email providers
push notification providers
heavy processing
```

---

# 68. Initial Edge Functions

The MVP may require zero or only a few Edge Functions.

Potential future functions:

```text
generate-semantic-match

send-push-notification

moderate-upload

process-image

send-email-notification
```

Do not move normal database CRUD into Edge Functions unnecessarily.

---

# 69. Semantic Matching Future Architecture

Later:

```text
New Listing
   ↓
Edge Function
   ↓
Generate Embedding
   ↓
Store Vector
   ↓
pgvector Similarity Search
   ↓
Combine With Metadata Scores
   ↓
Store Match
```

---

# 70. pgvector

If semantic matching is introduced:

Enable:

```text
pgvector
```

Store embeddings in a dedicated table or listing column.

Possible structure:

```text
item_embeddings
```

with:

```text
item_id
embedding
model
created_at
```

---

# 71. Location Data

For MVP, store:

```text
latitude
longitude
location_text
```

Consider PostGIS later if sophisticated geographic queries are required.

For simple radius calculations, PostgreSQL functions may be sufficient initially.

---

# 72. Location Privacy

Precise coordinates should not automatically be returned in public queries.

Consider creating:

```text
public_item_view
```

that exposes only:

```text
location_text
approximate location
```

while precise coordinates remain protected.

---

# 73. Database Views

Views may simplify safe frontend reads.

Possible views:

```text
public_items_view

public_profiles_view

user_activity_view

match_summary_view
```

Views can help prevent private columns from accidentally reaching the frontend.

---

# 74. Public Item View

Example safe fields:

```text
id
listing_type
title
category
brand
color
description
public_location
event_date
status
owner_public_profile
image
```

Exclude:

```text
private verification notes
precise coordinates where restricted
internal moderation fields
```

---

# 75. Public Profile View

Safe fields:

```text
id
display_name
avatar_url
trust_score
average_rating
successful_returns
created_at
```

Exclude:

```text
email
auth metadata
private moderation data
```

---

# 76. RLS Architecture

Every application table should explicitly define:

```text
SELECT
INSERT
UPDATE
DELETE
```

policies.

Do not rely on default assumptions.

---

# 77. Default RLS Approach

Recommended:

```text
ENABLE RLS
```

then create only necessary policies.

This provides deny-by-default behavior.

---

# 78. Profiles RLS

Users may:

```text
SELECT safe public profile data
UPDATE own profile
```

Users may not:

```text
update trust score directly
update return metrics
update another user's profile
```

Sensitive profile fields may require a private table or controlled view.

---

# 79. Items RLS

Users may:

```text
SELECT active public items

INSERT own items

UPDATE own eligible items
```

Restrictions:

```text
cannot change user_id
cannot arbitrarily set RETURNED
cannot update another user's item
```

Important lifecycle statuses should be updated through backend functions.

---

# 80. Private Details RLS

Only:

```text
Finder
Authorized backend
```

may read:

```text
found_item_private_details
```

Claimants must not have direct SELECT access.

---

# 81. Match RLS

Users should see a match only when they own:

```text
the Lost Report
or
the Found Listing
```

associated with it.

---

# 82. Claims RLS

Claimant may:

```text
view own claims
create eligible claim
cancel eligible pending claim
```

Finder may:

```text
view claims against own Found Listings
```

Acceptance/rejection should preferably use database functions.

---

# 83. Claim Answers RLS

Only:

```text
Claimant
Finder
```

should read relevant claim answers.

Other users receive no access.

---

# 84. Conversations RLS

Only conversation members may:

```text
SELECT conversation
```

Conversation creation should not be available directly to clients.

---

# 85. Messages RLS

Only conversation members may:

```text
SELECT messages
INSERT messages
```

Users must not be able to spoof:

```text
sender_id
```

Prefer deriving:

```text
sender_id = auth.uid()
```

through policies or backend logic.

---

# 86. Recoveries RLS

Only participants may view a recovery.

Users should not directly modify arbitrary recovery fields.

Confirmation actions should use backend functions.

---

# 87. Ratings RLS

Public may read allowed reviews if desired.

Users may submit ratings only through validated completion logic.

Users may not:

```text
rate themselves
rate before recovery completion
rate same recovery twice
```

---

# 88. Notifications RLS

Users may only:

```text
SELECT own notifications
UPDATE own read state
```

Users should not create arbitrary system notifications through the client.

---

# 89. Reports / Abuse RLS

Users may create reports.

Users should generally only see:

```text
their own submitted reports
```

Moderation access is separate.

---

# 90. Soft Delete Strategy

For user-generated content, consider using:

```text
deleted_at
```

instead of immediate hard deletion.

This may be useful for:

```text
moderation
audit
recovery
```

MVP may use status-based closure rather than deleting items.

---

# 91. Avoid Deleting Recovery History

Completed:

```text
claims
recoveries
ratings
handovers
```

should generally not be hard deleted by users.

They represent trust and transaction history.

---

# 92. Audit Fields

Core tables should contain:

```text
created_at
updated_at
```

Important state transitions may also record:

```text
accepted_at
rejected_at
completed_at
closed_at
```

---

# 93. Audit Logging

A full audit log may not be required for MVP.

However, sensitive actions worth logging later include:

```text
claim accepted
claim rejected
recovery cancelled
handover confirmed
moderation actions
trust adjustments
```

---

# 94. Concurrency

The backend must assume two users can act at nearly the same time.

Example:

```text
Claim A accepted
Claim B accepted simultaneously
```

The backend must prevent this.

Use:

```text
unique constraints
transactions
row locking where necessary
atomic database functions
```

---

# 95. Claim Acceptance Race Protection

When accepting a claim:

```text
lock/check item
```

then ensure:

```text
no active recovery exists
```

before committing.

Only one acceptance succeeds.

---

# 96. Handover Race Protection

Two confirmations may arrive nearly simultaneously.

The confirmation function must safely process both without duplicate completion effects.

---

# 97. Idempotency

Sensitive operations should tolerate duplicate client requests.

Examples:

```text
Accept claim
Confirm handover
Submit rating
```

Unique constraints and state validation should prevent duplicates.

---

# 98. Database Indexes

Important indexes will likely include:

```text
items(user_id)

items(listing_type)

items(status)

items(category)

items(event_date)

matches(lost_item_id)

matches(found_item_id)

claims(item_id)

claims(claimant_id)

messages(conversation_id, created_at)

notifications(user_id, created_at)

recoveries(claim_id)
```

More detailed indexing is defined in database schema.

---

# 99. Pagination

All potentially large data sets must support pagination.

Examples:

```text
Explore listings
Messages
Notifications
Activity
Reviews
```

Do not return unlimited rows.

---

# 100. Message Pagination

Messages should use:

```text
created_at
```

and preferably cursor-based loading.

Flow:

```text
Newest messages
      ↓
Scroll up
      ↓
Load older messages
```

---

# 101. Search

Initial text search may use:

```text
PostgreSQL text search
ILIKE
structured filters
```

depending on performance needs.

Later:

```text
full-text search
```

may be added.

---

# 102. Search Security

Search results must only return public-safe columns.

Search queries must never accidentally expose private verification details.

---

# 103. Matching Search

Matching query logic may be more permissive internally than public search.

Backend functions may use:

```text
precise coordinates
private normalized metadata
```

if needed.

But resulting frontend match objects should remain safe.

---

# 104. Normalized Listing Data

Matching may benefit from normalized values.

Examples:

```text
normalized_title
normalized_brand
normalized_color
```

These can be generated during creation/update.

This avoids repeating cleanup logic during every match.

---

# 105. Backend Validation

Database constraints must validate core assumptions.

Examples:

```text
listing_type in LOST / FOUND

rating between 1 and 5

match score between 0 and 100

latitude between -90 and 90

longitude between -180 and 180
```

Frontend validation is not sufficient.

---

# 106. Status Enums

Use PostgreSQL enums or constrained text consistently.

Potential enums:

```text
listing_type

listing_status

claim_status

match_status

recovery_status

notification_type

report_status
```

Exact choices will be finalized in schema documentation.

---

# 107. Enum Migration Strategy

Enums are strict and require migrations when expanded.

Use them for stable lifecycle states.

For rapidly evolving fields, constrained text may sometimes be easier.

For core lifecycle states, enums are acceptable.

---

# 108. Supabase Migrations

All database changes must be versioned.

Recommended structure:

```text
supabase/
├── migrations/
├── functions/
└── seed.sql
```

Never make important production schema changes manually without migration files.

---

# 109. Migration Responsibilities

Migrations should create:

```text
extensions
enums
tables
constraints
indexes
functions
triggers
RLS policies
views
```

---

# 110. Seed Data

Development seed data may include:

```text
sample profiles
lost items
found items
matches
claims
messages
```

Do not seed sensitive production data.

---

# 111. Local Supabase

Use Supabase local development when possible.

Workflow:

```text
supabase start
      ↓
apply migrations
      ↓
seed database
      ↓
run React app
```

---

# 112. Type Generation

After schema changes, regenerate TypeScript database types.

Conceptual workflow:

```text
Database migration
      ↓
Supabase type generation
      ↓
database.types.ts
      ↓
Frontend compilation
```

This helps identify schema/frontend mismatch early.

---

# 113. Development Data Reset

During active schema development:

```text
supabase db reset
```

may be used locally to verify migrations from zero.

Production must never use destructive reset operations.

---

# 114. Edge Function Folder

Recommended:

```text
supabase/functions/
├── generate-semantic-match/
├── send-notification/
└── _shared/
```

Only create functions actually required.

---

# 115. Shared Edge Function Utilities

Potential shared code:

```text
auth verification
CORS
Supabase admin client
error handling
response helpers
```

---

# 116. Edge Function Authentication

Functions handling user actions should validate the Supabase access token.

Never trust a passed:

```text
user_id
```

without verifying session ownership.

---

# 117. Service Role Usage

Service role should only be used in trusted backend contexts.

Because it bypasses RLS, every service-role operation requires explicit authorization logic.

---

# 118. Realtime Authorization

Realtime access should align with database authorization.

Do not expose channels that allow users to receive events for:

```text
other people's chats
private claims
other users' notifications
```

---

# 119. Realtime Cleanup

Frontend subscriptions should be removed when no longer needed.

Backend architecture should assume clients may reconnect and duplicate subscriptions.

---

# 120. Notification Reliability

Realtime notification delivery is not the authoritative notification record.

The persistent database row is authoritative.

If realtime delivery is missed:

```text
Notification Center
```

should still show the notification later.

---

# 121. Storage Cleanup

When listing images are replaced or removed:

```text
old object cleanup
```

should be considered.

Avoid orphaned storage indefinitely.

---

# 122. Image Deletion

Deleting an image reference from the database should not automatically assume storage deletion succeeded.

Use controlled deletion workflows.

---

# 123. User Account Deletion

Future account deletion needs special handling because the account may participate in historical recoveries.

Potential strategy:

```text
anonymize profile
preserve recovery history
remove unnecessary personal data
```

Do not cascade-delete critical trust/recovery history blindly.

---

# 124. Moderation Architecture

Initial moderation may be simple.

Use:

```text
user_reports
```

for:

```text
user reports
listing reports
chat/recovery reports
```

Moderation dashboard is future scope.

---

# 125. Abuse Prevention

Potential backend protections:

```text
claim frequency limits
listing frequency limits
message limits
report spam limits
duplicate listing detection
```

Advanced anti-abuse systems can be introduced later.

---

# 126. Rate Limiting

Supabase database alone is not ideal for every request-level rate limit.

For high-risk actions, use:

```text
Edge Functions
```

or database-backed rate limiting.

Candidates:

```text
claim submission
login-sensitive flows
notification triggers
AI matching
reports
```

---

# 127. Error Strategy

Backend functions should return clear structured errors.

Examples:

```text
CLAIM_ALREADY_EXISTS

ITEM_NOT_AVAILABLE

NOT_ITEM_OWNER

RECOVERY_ALREADY_ACTIVE

RECOVERY_NOT_COMPLETE

RATING_ALREADY_SUBMITTED
```

Frontend maps these into user-friendly messages.

---

# 128. Never Expose Raw Internal Errors

Avoid displaying raw:

```text
Postgres errors
SQL
stack traces
internal policy names
```

to end users.

---

# 129. Database Function Result Pattern

Sensitive functions may return:

```text
success
data
error_code
```

or throw controlled database exceptions that the frontend service maps.

Keep behavior consistent.

---

# 130. Observability

At minimum monitor:

```text
database errors
Edge Function errors
failed storage uploads
auth failures
realtime failures
matching failures
```

Production observability can be expanded later.

---

# 131. Backend Health Indicators

Useful metrics later include:

```text
new listings per day
matches generated
claims created
claim acceptance rate
recovery completion rate
average matching duration
failed backend function calls
```

---

# 132. Matching Analytics

Persist enough data to answer:

```text
Which score ranges lead to successful returns?

Which matching factors are useful?

How often are high-scoring matches dismissed?
```

This will help improve the engine.

---

# 133. Match Feedback Data

Useful match outcomes:

```text
CLAIMED
DISMISSED
EXPIRED
SUCCESSFUL_RECOVERY
```

These can later train better matching heuristics.

---

# 134. Backend Access Pattern Summary

Simple reads:

```text
React
 ↓
Supabase SELECT
```

Simple user-owned CRUD:

```text
React
 ↓
Supabase
 ↓
RLS
```

Critical multi-table operations:

```text
React
 ↓
Database Function
 ↓
Transaction
```

External integration operations:

```text
React / Database
 ↓
Edge Function
 ↓
External API
```

---

# 135. Recommended Backend Operation Ownership

## Direct Supabase Client

Suitable for:

```text
Read public listings

Read profile

Update own basic profile

Create initial item record

Read activity

Read notifications

Mark notification read
```

---

## PostgreSQL Function

Suitable for:

```text
Create claim

Accept claim

Reject claim

Confirm handover

Complete recovery

Submit rating

Recalculate trust

Generate basic matches
```

---

## Edge Function

Suitable for:

```text
AI embeddings

Image analysis

Push notifications

Email provider

External moderation

External API calls
```

---

# 136. Complete Backend Flow — Lost Report

```text
React
 ↓
Create Lost Report
 ↓
Supabase
 ↓
items INSERT
 ↓
item_images INSERT
 ↓
generate_matches()
 ↓
matches INSERT
 ↓
notification INSERT
 ↓
Frontend query refresh
```

---

# 137. Complete Backend Flow — Found Listing

```text
React
 ↓
Create Found Listing
 ↓
items INSERT
 ↓
found_item_private_details INSERT
 ↓
verification_questions INSERT
 ↓
images INSERT
 ↓
generate_matches()
 ↓
matches INSERT
 ↓
notifications
```

---

# 138. Complete Backend Flow — Claim

```text
Owner
 ↓
Submit Claim
 ↓
create_claim()
 ↓
Validate
 ↓
claims INSERT
 ↓
claim_answers INSERT
 ↓
notification for Finder
```

---

# 139. Complete Backend Flow — Accept Claim

```text
Finder
 ↓
accept_claim()
 ↓
Validate Finder
 ↓
Validate Item
 ↓
Lock Recovery State
 ↓
Claim ACCEPTED
 ↓
Item RECOVERY_IN_PROGRESS
 ↓
Recovery Created
 ↓
Conversation Created
 ↓
Members Created
 ↓
Notification Created
 ↓
Commit
```

---

# 140. Complete Backend Flow — Chat

```text
User
 ↓
INSERT message
 ↓
RLS validates membership
 ↓
Message persisted
 ↓
Realtime event
 ↓
Other participant receives message
```

---

# 141. Complete Backend Flow — Handover

```text
Participant
 ↓
confirm_handover()
 ↓
Identify role
 ↓
Set confirmation
 ↓
Check both
```

If only one:

```text
PARTIALLY_CONFIRMED
```

If both:

```text
Complete Recovery
 ↓
Item RETURNED
 ↓
Claim COMPLETED
 ↓
Recovery COMPLETED
 ↓
Trust stats updated
 ↓
Rating request notifications
```

---

# 142. Complete Backend Flow — Rating

```text
User
 ↓
submit_rating()
 ↓
Validate completed recovery
 ↓
Validate participant
 ↓
Check duplicate
 ↓
ratings INSERT
 ↓
Recalculate user stats
 ↓
Return success
```

---

# 143. Backend Security Rules

The following are mandatory:

1. RLS enabled on sensitive application tables.
2. Service-role key never exposed to browser.
3. Sensitive verification data isolated.
4. Users cannot arbitrarily update lifecycle states.
5. Users cannot directly update trust score.
6. Users cannot access chats they are not part of.
7. Claim acceptance requires Finder ownership.
8. Handover confirmation requires recovery participation.
9. Ratings require completed recovery.
10. Database constraints complement frontend validation.

---

# 144. Backend MVP Scope

Required for MVP:

```text
Supabase Auth

Profiles

Items

Item images

Private Found Item Details

Matching

Claims

Verification Questions

Claim Answers

Conversations

Messages

Recoveries

Handover

Ratings

Notifications

RLS

Core Database Functions
```

---

# 145. Backend Features Not Required for MVP

Do not block launch on:

```text
AI embeddings

Image recognition

Push notifications

Email workflows

Complex moderation dashboard

Advanced analytics

PostGIS

Organization tenancy

Automated abuse scoring
```

---

# 146. Recommended Implementation Order

```text
1. Initialize Supabase project

2. Create enums

3. Create profiles

4. Add auth profile trigger

5. Create items

6. Create item images

7. Create private found details

8. Create verification questions

9. Create matches

10. Create claims

11. Create claim answers

12. Create conversations

13. Create conversation members

14. Create messages

15. Create recoveries

16. Create handover logic

17. Create ratings

18. Create notifications

19. Add indexes

20. Add RLS

21. Add database functions

22. Add triggers

23. Generate TypeScript types

24. Add seed data

25. Test complete recovery lifecycle
```

---

# 147. Backend Definition of Done

The backend is MVP-ready when the following scenario works securely:

```text
User A creates Lost Report
        ↓
User B creates Found Listing
        ↓
Match is generated
        ↓
User A submits claim
        ↓
User B accepts claim
        ↓
Conversation created
        ↓
Messages exchanged
        ↓
Finder confirms handover
        ↓
Owner confirms receipt
        ↓
Recovery completes
        ↓
Ratings become available
        ↓
Trust updates
```

while ensuring:

```text
unauthorized users cannot access private details

unauthorized users cannot read chats

users cannot fake recovery completion

users cannot change trust score

users cannot accept claims for listings they do not own
```

---

# 148. Backend Architecture Summary

The recommended architecture is:

```text
                    REACT FRONTEND
                          │
                          ▼
                    SUPABASE CLIENT
                          │
       ┌──────────────────┼──────────────────┐
       │                  │                  │
       ▼                  ▼                  ▼
     AUTH              DATABASE            STORAGE
                          │
                    ┌─────┼─────┐
                    │     │     │
                    ▼     ▼     ▼
                   RLS  FUNCTIONS TRIGGERS
                          │
                          ▼
                       REALTIME
                          │
                          ▼
                    EDGE FUNCTIONS
                   when externally needed
```

The fundamental backend rule is:

> Simple data access may use Supabase directly, while critical state transitions must be controlled by secure backend logic.

Supabase should act not only as the application's database, but as the authoritative security and state-management layer for the complete lost-and-found recovery lifecycle.