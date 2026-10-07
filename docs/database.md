# Lost & Found Platform — Database Schema

## 1. Purpose

This document defines the PostgreSQL database schema for the Lost & Found Platform.

The database must support the complete lifecycle:

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

The schema is designed for:

- Supabase PostgreSQL
- Supabase Auth
- Row Level Security
- Supabase Realtime
- Supabase Storage
- database functions
- future semantic matching
- secure ownership verification

---

# 2. Schema Principles

The database should follow these principles.

## 2.1 PostgreSQL Is the Source of Truth

Important states must be stored in the database rather than inferred only in frontend code.

---

## 2.2 Separate Public and Private Data

Public listing information and private ownership-verification information must not share the same unrestricted access path.

---

## 2.3 Use Explicit Lifecycle States

Important domain entities must use explicit status values.

Examples:

```text
ACTIVE

PENDING

ACCEPTED

RETURNED

COMPLETED
```

---

## 2.4 Critical Relationships Must Be Enforced

Foreign keys, unique constraints, check constraints, and indexes should protect data integrity.

---

## 2.5 Avoid Hard Deletion of Recovery History

Completed recoveries, claims, ratings, and handovers should normally remain available for audit and trust calculations.

---

# 3. Supabase Auth Relationship

Authentication users are stored by Supabase in:

```text
auth.users
```

Application user data will be stored separately in:

```text
public.profiles
```

Relationship:

```text
auth.users.id
      │
      ▼
profiles.id
```

`profiles.id` should use the same UUID as the Supabase Auth user.

---

# 4. UUID Strategy

Use UUID primary keys.

Recommended default:

```sql
gen_random_uuid()
```

For profile:

```text
profiles.id = auth.users.id
```

Other tables may independently generate UUIDs.

---

# 5. Timestamp Strategy

Use:

```text
timestamptz
```

for timestamps.

Recommended common columns:

```text
created_at

updated_at
```

with:

```sql
default now()
```

Store timestamps in UTC and convert them to local time in the frontend.

---

# 6. Core Enums

Recommended PostgreSQL enums:

```text
listing_type

listing_status

match_status

claim_status

recovery_status

notification_type

report_target_type

report_status
```

---

# 7. listing_type

```text
LOST

FOUND
```

---

# 8. listing_status

Recommended initial values:

```text
ACTIVE

MATCH_FOUND

CLAIM_PENDING

RECOVERY_IN_PROGRESS

RETURNED

CLOSED

CANCELLED
```

---

# 9. match_status

```text
ACTIVE

DISMISSED

CLAIMED

EXPIRED
```

---

# 10. claim_status

```text
PENDING

ACCEPTED

REJECTED

CANCELLED

COMPLETED
```

---

# 11. recovery_status

```text
ACTIVE

HANDOVER_PENDING

PARTIALLY_CONFIRMED

COMPLETED

CANCELLED
```

---

# 12. notification_type

Recommended initial values:

```text
MATCH_FOUND

CLAIM_RECEIVED

CLAIM_ACCEPTED

CLAIM_REJECTED

NEW_MESSAGE

HANDOVER_UPDATE

RECOVERY_COMPLETED

RATING_REQUEST

SYSTEM
```

---

# 13. report_target_type

```text
USER

LISTING

CONVERSATION

RECOVERY
```

---

# 14. report_status

```text
OPEN

UNDER_REVIEW

RESOLVED

DISMISSED
```

---

# 15. Profiles Table

Table:

```text
profiles
```

Purpose:

Stores public and system-controlled profile information.

Recommended columns:

```text
id
display_name
username
avatar_url
trust_score
average_rating
rating_count
successful_returns
created_at
updated_at
```

---

## profiles.id

```text
uuid
primary key
references auth.users(id)
on delete cascade
```

---

## profiles.display_name

```text
text
not null
```

---

## profiles.username

```text
text
unique
nullable
```

Username may be optional during MVP.

---

## profiles.avatar_url

```text
text
nullable
```

Prefer storing Storage object reference/path rather than relying solely on permanent external URLs.

---

## profiles.trust_score

Suggested:

```text
numeric(5,2)
default 50
```

Constraint:

```text
0 <= trust_score <= 100
```

Only backend-controlled logic may update it.

---

## profiles.average_rating

```text
numeric(3,2)
default 0
```

Constraint:

```text
0 <= average_rating <= 5
```

---

## profiles.rating_count

```text
integer
default 0
```

Constraint:

```text
rating_count >= 0
```

---

## profiles.successful_returns

```text
integer
default 0
```

Constraint:

```text
successful_returns >= 0
```

---

# 16. Profiles Indexes

Recommended:

```text
unique(username)

index(trust_score)

index(created_at)
```

Username index is created automatically with the unique constraint.

---

# 17. Items Table

Table:

```text
items
```

Purpose:

Represents both Lost Reports and Found Listings.

---

# 18. Items Columns

Recommended:

```text
id
user_id
listing_type
title
category
brand
color
description
event_date
event_time
location_text
latitude
longitude
status
closed_reason
closed_at
created_at
updated_at
```

---

## items.id

```text
uuid
primary key
default gen_random_uuid()
```

---

## items.user_id

```text
uuid
not null
references profiles(id)
```

Represents the creator of the listing.

For LOST:

```text
user_id = owner
```

For FOUND:

```text
user_id = finder
```

---

## items.listing_type

```text
listing_type
not null
```

Values:

```text
LOST
FOUND
```

---

## items.title

```text
varchar(120)
not null
```

---

## items.category

Initially:

```text
text
not null
```

Possible values:

```text
electronics
wallet
id_card
keys
bag
clothing
book
document
accessory
other
```

A dedicated category table can be introduced later if category administration is required.

---

## items.brand

```text
varchar(120)
nullable
```

---

## items.color

```text
varchar(80)
nullable
```

---

## items.description

```text
text
not null
```

Recommended application-level limit:

```text
500–1000 characters
```

---

## items.event_date

```text
date
not null
```

Means:

For LOST:

```text
date lost
```

For FOUND:

```text
date found
```

---

## items.event_time

```text
time
nullable
```

Time may be unknown.

---

## items.location_text

```text
varchar(255)
not null
```

Example:

```text
Main Library
```

---

## items.latitude

```text
double precision
nullable
```

Constraint:

```text
-90 <= latitude <= 90
```

---

## items.longitude

```text
double precision
nullable
```

Constraint:

```text
-180 <= longitude <= 180
```

Precise location should not automatically be exposed publicly.

---

## items.status

```text
listing_status
default ACTIVE
not null
```

---

## items.closed_reason

```text
text
nullable
```

---

## items.closed_at

```text
timestamptz
nullable
```

---

# 19. Items Indexes

Recommended:

```text
index(user_id)

index(listing_type)

index(status)

index(category)

index(event_date)

index(created_at)
```

Composite indexes:

```text
(listing_type, status)

(category, listing_type, status)

(event_date, listing_type)
```

Potential location-related indexes may be added later.

---

# 20. Item Images Table

Table:

```text
item_images
```

Purpose:

Stores references to one or more images associated with an item.

Columns:

```text
id
item_id
storage_path
position
created_at
```

---

## item_images.item_id

```text
uuid
not null
references items(id)
on delete cascade
```

---

## item_images.storage_path

```text
text
not null
```

Example:

```text
item-images/{user_id}/{item_id}/{uuid}.webp
```

---

## item_images.position

```text
smallint
default 0
```

Allows image ordering.

---

# 21. Item Images Indexes

```text
index(item_id)

unique(item_id, position)
```

Optional if strict image ordering is required.

---

# 22. Found Item Private Details Table

Table:

```text
found_item_private_details
```

Purpose:

Stores sensitive ownership-verification details.

This table must only apply to FOUND listings.

Columns:

```text
item_id
private_notes
serial_fragment
unique_markings
private_contents
created_at
updated_at
```

---

## found_item_private_details.item_id

```text
uuid
primary key
references items(id)
on delete cascade
```

One private-detail record per Found Listing.

---

## private_notes

```text
text
nullable
```

---

## serial_fragment

```text
text
nullable
```

Do not store unnecessary full sensitive serial numbers unless required.

---

## unique_markings

```text
text
nullable
```

Example:

```text
small scratch near bottom-right corner
```

---

## private_contents

```text
text
nullable
```

Example:

```text
college ID inside wallet
```

---

# 22b. Lost Item Private Details Table

Table:

```text
lost_item_private_details
```

Purpose:

Stores the Owner's private distinguishing characteristics for a LOST listing — the
details only the person who lost the item would know.

This is the LOST-side mirror of `found_item_private_details` and is equally
sensitive. The approved LOST wizard collects the same four fields the FOUND wizard
collects, so the two tables share a shape.

This table must only apply to LOST listings.

Privacy:

```text
owner-only
never in public_items_view
never in Explore
never in public listing detail
never in matching explanations
not used as a matching input
```

These values are ownership evidence for later claim verification. A Finder must
never be shown them, or an ownership question answers itself. The Claims phase
compares a claimant's statement against them server-side; it does not reveal them.

Columns:

```text
item_id
private_notes
serial_fragment
unique_markings
private_contents
created_at
updated_at
```

---

## lost_item_private_details.item_id

```text
uuid
primary key
references items(id)
on delete cascade
```

One private-detail record per Lost Report. The parent must be a LOST listing; this
is enforced by the `assert_parent_item_type()` trigger, because a foreign key cannot
express a condition on the parent's `listing_type`.

---

# 23. Verification Questions Table

Table:

```text
verification_questions
```

Purpose:

Allows Finder to define questions for ownership verification.

Columns:

```text
id
item_id
question
position
created_at
```

---

## verification_questions.item_id

```text
uuid
not null
references items(id)
on delete cascade
```

Only FOUND items should have verification questions.

Backend validation should enforce this.

---

## question

```text
text
not null
```

Recommended length limit:

```text
300 characters
```

---

## position

```text
smallint
default 0
```

---

# 24. Verification Questions Indexes

```text
index(item_id)

unique(item_id, position)
```

---

# 25. Matches Table

Table:

```text
matches
```

Purpose:

Stores candidate connections between one Lost Report and one Found Listing.

Columns:

```text
id
lost_item_id
found_item_id
overall_score
category_score
location_score
time_score
description_score
status
created_at
updated_at
```

---

## matches.lost_item_id

```text
uuid
not null
references items(id)
```

Must reference an item with:

```text
listing_type = LOST
```

---

## matches.found_item_id

```text
uuid
not null
references items(id)
```

Must reference:

```text
listing_type = FOUND
```

---

## overall_score

Recommended:

```text
numeric(5,2)
not null
```

Constraint:

```text
0 <= overall_score <= 100
```

---

## category_score

```text
numeric(5,2)
```

---

## location_score

```text
numeric(5,2)
```

---

## time_score

```text
numeric(5,2)
```

---

## description_score

```text
numeric(5,2)
```

Each score should remain:

```text
0–100
```

---

## matches.status

```text
match_status
default ACTIVE
```

---

# 26. Match Unique Constraint

Critical:

```text
unique(lost_item_id, found_item_id)
```

The same item pair must not generate duplicate match rows.

---

# 27. Matches Indexes

```text
index(lost_item_id)

index(found_item_id)

index(overall_score)

index(status)
```

Useful composite:

```text
(lost_item_id, status, overall_score desc)

(found_item_id, status, overall_score desc)
```

---

# 28. Claims Table

Table:

```text
claims
```

Purpose:

Represents an Owner's request to recover a Found Listing.

Columns:

```text
id
found_item_id
lost_item_id
claimant_id
status
additional_message
rejection_reason
submitted_at
accepted_at
rejected_at
cancelled_at
completed_at
created_at
updated_at
```

---

# 29. claims.found_item_id

```text
uuid
not null
references items(id)
```

Must reference a FOUND item.

---

# 30. claims.lost_item_id

```text
uuid
not null
references items(id)
```

Must reference a LOST item owned by the claimant.

This establishes traceability:

```text
Lost Report
     ↕
Claim
     ↕
Found Listing
```

---

# 31. claims.claimant_id

```text
uuid
not null
references profiles(id)
```

Should equal:

```text
lost_item.user_id
```

The backend must enforce this.

---

# 32. claims.status

```text
claim_status
default PENDING
```

---

# 33. additional_message

```text
text
nullable
```

Recommended maximum:

```text
1000 characters
```

---

# 34. rejection_reason

```text
text
nullable
```

Should not automatically expose confidential Finder reasoning to claimant.

Public-safe rejection text may later be separated if necessary.

---

# 35. Claims Unique Rules

A user should not create duplicate active claims for the same Found Listing.

Recommended conceptual uniqueness:

```text
found_item_id + lost_item_id
```

Exact implementation may use a partial unique index.

Example concept:

```text
unique active claim where status in PENDING/ACCEPTED
```

---

# 36. Claims Indexes

```text
index(found_item_id)

index(lost_item_id)

index(claimant_id)

index(status)

index(created_at)
```

Composite:

```text
(found_item_id, status)

(claimant_id, status)
```

---

# 37. Claim Answers Table

Table:

```text
claim_answers
```

Purpose:

Stores claimant responses to verification questions.

Columns:

```text
id
claim_id
question_id
answer
created_at
updated_at
```

---

## claim_answers.claim_id

```text
uuid
not null
references claims(id)
on delete cascade
```

---

## claim_answers.question_id

```text
uuid
not null
references verification_questions(id)
```

---

## claim_answers.answer

```text
text
not null
```

---

# 38. Claim Answers Unique Constraint

```text
unique(claim_id, question_id)
```

A claim should have only one answer per verification question.

---

# 39. Claim Answers Indexes

```text
index(claim_id)

index(question_id)
```

---

# 40. Recoveries Table

Table:

```text
recoveries
```

Purpose:

Represents the active recovery relationship created when a claim is accepted.

Columns:

```text
id
claim_id
lost_item_id
found_item_id
owner_id
finder_id
status
started_at
completed_at
cancelled_at
cancel_reason
created_at
updated_at
```

---

# 41. recoveries.claim_id

```text
uuid
not null
unique
references claims(id)
```

One accepted claim can produce only one recovery.

---

# 42. recoveries.lost_item_id

```text
uuid
not null
references items(id)
```

---

# 43. recoveries.found_item_id

```text
uuid
not null
references items(id)
```

---

# 44. recoveries.owner_id

```text
uuid
not null
references profiles(id)
```

Should equal Lost Report creator.

---

# 45. recoveries.finder_id

```text
uuid
not null
references profiles(id)
```

Should equal Found Listing creator.

---

# 46. recoveries.status

```text
recovery_status
default ACTIVE
```

---

# 47. One Active Recovery Per Found Item

The database should prevent multiple simultaneous active recoveries for the same Found Listing.

Recommended partial unique constraint concept:

```text
unique(found_item_id)
where status in (
  ACTIVE,
  HANDOVER_PENDING,
  PARTIALLY_CONFIRMED
)
```

This prevents simultaneous accepted owners.

---

# 48. Recoveries Indexes

```text
index(claim_id)

index(lost_item_id)

index(found_item_id)

index(owner_id)

index(finder_id)

index(status)
```

---

# 49. Conversations Table

Table:

```text
conversations
```

Purpose:

Stores private chat context.

Columns:

```text
id
recovery_id
is_active
created_at
closed_at
```

---

## conversations.recovery_id

```text
uuid
not null
unique
references recoveries(id)
```

One recovery should normally have one conversation.

---

## is_active

```text
boolean
default true
```

---

# 50. Conversation Members Table

Table:

```text
conversation_members
```

Purpose:

Defines authorized participants.

Columns:

```text
conversation_id
user_id
joined_at
last_read_at
```

Composite primary key:

```text
(conversation_id, user_id)
```

---

## conversation_id

```text
uuid
references conversations(id)
on delete cascade
```

---

## user_id

```text
uuid
references profiles(id)
```

For MVP, normally two rows:

```text
Owner
Finder
```

---

# 51. Conversation Members Indexes

```text
index(user_id)

index(conversation_id)
```

---

# 52. Messages Table

Table:

```text
messages
```

Purpose:

Stores realtime private chat messages.

Columns:

```text
id
conversation_id
sender_id
content
created_at
edited_at
deleted_at
```

---

## messages.id

```text
uuid
primary key
default gen_random_uuid()
```

---

## conversation_id

```text
uuid
not null
references conversations(id)
on delete cascade
```

---

## sender_id

```text
uuid
not null
references profiles(id)
```

Must be a conversation member.

---

## content

```text
text
not null
```

Recommended maximum:

```text
3000 characters
```

---

# 53. Messages Indexes

Critical:

```text
(conversation_id, created_at)
```

Additional:

```text
index(sender_id)
```

This supports message pagination efficiently.

---

# 54. Handovers Table

Table:

```text
handovers
```

Purpose:

Stores independent confirmation from Owner and Finder.

Columns:

```text
id
recovery_id
finder_confirmed
owner_confirmed
finder_confirmed_at
owner_confirmed_at
completed_at
created_at
updated_at
```

---

## handovers.recovery_id

```text
uuid
not null
unique
references recoveries(id)
```

One handover per recovery.

---

## finder_confirmed

```text
boolean
default false
```

---

## owner_confirmed

```text
boolean
default false
```

---

## completed_at

Set only when:

```text
finder_confirmed = true
AND
owner_confirmed = true
```

---

# 55. Ratings Table

Table:

```text
ratings
```

Purpose:

Stores post-recovery ratings.

Columns:

```text
id
recovery_id
from_user_id
to_user_id
rating
review
created_at
updated_at
```

---

## ratings.recovery_id

```text
uuid
not null
references recoveries(id)
```

---

## from_user_id

```text
uuid
not null
references profiles(id)
```

---

## to_user_id

```text
uuid
not null
references profiles(id)
```

Constraint:

```text
from_user_id <> to_user_id
```

---

## rating

```text
smallint
not null
```

Constraint:

```text
rating between 1 and 5
```

---

## review

```text
text
nullable
```

Recommended maximum:

```text
500 characters
```

---

# 56. Rating Unique Constraint

A participant may rate another participant only once per recovery.

```text
unique(recovery_id, from_user_id)
```

Since each recovery has two participants, this allows at most two ratings.

---

# 57. Ratings Indexes

```text
index(to_user_id)

index(from_user_id)

index(recovery_id)

index(created_at)
```

---

# 58. Notifications Table

Table:

```text
notifications
```

Purpose:

Stores persistent in-app notifications.

Columns:

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

## notifications.user_id

```text
uuid
not null
references profiles(id)
on delete cascade
```

---

## notifications.type

```text
notification_type
not null
```

---

## reference_type

```text
text
nullable
```

Examples:

```text
MATCH

CLAIM

RECOVERY

CONVERSATION

RATING
```

---

## reference_id

```text
uuid
nullable
```

A generic reference avoids excessive nullable foreign-key columns.

Application/backend logic must validate references.

---

## read_at

```text
timestamptz
nullable
```

Unread:

```text
read_at IS NULL
```

---

# 59. Notifications Indexes

```text
(user_id, created_at desc)

(user_id, read_at)

index(type)
```

---

# 60. User Reports Table

Table:

```text
user_reports
```

Purpose:

Stores abuse/safety reports.

Columns:

```text
id
reporter_id
target_type
target_id
reason
description
status
created_at
updated_at
resolved_at
```

---

## reporter_id

```text
uuid
not null
references profiles(id)
```

---

## target_type

```text
report_target_type
```

---

## target_id

```text
uuid
not null
```

May reference:

```text
user
listing
conversation
recovery
```

depending on `target_type`.

---

## reason

```text
text
not null
```

---

## description

```text
text
nullable
```

---

## status

```text
report_status
default OPEN
```

---

# 61. Reports Indexes

```text
index(reporter_id)

index(status)

index(target_type, target_id)

index(created_at)
```

---

# 62. Optional Audit Events Table

Not required for the earliest MVP, but recommended later.

Table:

```text
audit_events
```

Possible fields:

```text
id
actor_user_id
event_type
entity_type
entity_id
metadata
created_at
```

Useful for:

```text
claim acceptance
claim rejection
handover confirmations
recovery cancellation
moderation
trust changes
```

`metadata` may use:

```text
jsonb
```

---

# 63. Future Item Embeddings Table

Not required for MVP.

Table:

```text
item_embeddings
```

Used when semantic matching is introduced.

Columns:

```text
item_id
embedding
model
content_hash
created_at
updated_at
```

Requires:

```text
pgvector
```

---

# 64. item_embeddings.item_id

```text
uuid
primary key
references items(id)
on delete cascade
```

---

# 65. Main Relationships

The main relationship model is:

```text
auth.users
    │
    ▼
 profiles
    │
    ├─────────────┐
    │             │
    ▼             ▼
 LOST ITEM     FOUND ITEM
    │             │
    └──────┬──────┘
           ▼
         MATCH
           │
           ▼
         CLAIM
           │
           ▼
       RECOVERY
           │
     ┌─────┼─────┐
     │     │     │
     ▼     ▼     ▼
 CHAT  HANDOVER RATINGS
```

---

# 66. Expanded Entity Relationship

```text
profiles
   │
   ├──────── items
   │             │
   │             ├──────── item_images
   │             │
   │             ├──────── verification_questions
   │             │
   │             └──────── found_item_private_details
   │
   └──────── ratings


items (LOST)
   │
   └──────── matches
                │
items (FOUND) ──┘
      │
      └──────── claims
                    │
                    ├──────── claim_answers
                    │
                    └──────── recoveries
                                │
                                ├──────── conversations
                                │           │
                                │           ├── conversation_members
                                │           └── messages
                                │
                                ├──────── handovers
                                │
                                └──────── ratings
```

---

# 67. Lost-to-Found Relationship

There is no direct one-to-one relationship between a Lost Report and Found Listing.

They are connected through:

```text
matches
```

and later:

```text
claims
```

This allows:

```text
one Lost Report
→ multiple candidate Found Listings
```

and:

```text
one Found Listing
→ multiple candidate Lost Reports
```

---

# 68. Match vs Claim Relationship

A claim may originate from a match.

For stronger traceability, an optional field may be added to `claims`:

```text
match_id
```

Nullable.

This allows manual discovery claims where no formal match exists.

Recommended:

```text
claims.match_id nullable
references matches(id)
```

This is useful for analytics.

---

# 69. Recommended Claims Addition

Add:

```text
match_id uuid nullable
```

to `claims`.

If claim originated from automatic matching:

```text
match_id = matching record
```

If claim originated from Explore:

```text
match_id = NULL
```

---

# 70. Lifecycle State Relationships

## New Lost Item

```text
items.status = ACTIVE
```

---

## Match Found

May become:

```text
items.status = MATCH_FOUND
```

However, status should not oscillate unnecessarily when multiple matches exist.

An alternative is to keep item:

```text
ACTIVE
```

and derive match existence from `matches`.

For database simplicity, the recommended long-term approach is:

> Keep listing status focused on recovery availability, not every minor system event.

Recommended simplified lifecycle:

```text
ACTIVE
RECOVERY_IN_PROGRESS
RETURNED
CLOSED
CANCELLED
```

and derive:

```text
MATCH_FOUND
CLAIM_PENDING
```

from related tables.

This avoids conflicting state.

---

# 71. Recommended Final Listing Status

To prevent duplicated state, prefer:

```text
ACTIVE

RECOVERY_IN_PROGRESS

RETURNED

CLOSED

CANCELLED
```

Then:

```text
Has Matches
```

is derived from `matches`.

And:

```text
Has Pending Claims
```

is derived from `claims`.

This is more robust.

---

# 72. Recommended Final Claim Status

```text
PENDING

ACCEPTED

REJECTED

CANCELLED

COMPLETED
```

---

# 73. Recommended Final Recovery Status

```text
ACTIVE

PARTIALLY_CONFIRMED

COMPLETED

CANCELLED
```

`HANDOVER_PENDING` may be derived from an active recovery rather than needing a separate state.

Keep enums as small as practical.

---

# 74. Data Ownership Rules

## profiles

Owned by:

```text
profiles.id
```

---

## items

Owned by:

```text
items.user_id
```

---

## found_item_private_details

Owned indirectly through:

```text
items.user_id
```

---

## lost_item_private_details

Owned indirectly through:

```text
items.user_id
```

---

## claims

Created by:

```text
claimant_id
```

Reviewed by:

```text
found_item.user_id
```

---

## conversations

Owned by neither participant individually.

Access is controlled through:

```text
conversation_members
```

---

## recoveries

Accessible by:

```text
owner_id

finder_id
```

---

## ratings

Created by:

```text
from_user_id
```

but should only be inserted through validated backend logic.

---

# 75. Public vs Private Tables

## Mostly Public-Safe

With proper RLS/views:

```text
profiles

items

item_images

ratings
```

---

## Sensitive

```text
found_item_private_details

claim_answers

claims

conversation_members

messages

recoveries

handovers

notifications

user_reports
```

Sensitive tables require stricter RLS.

---

# 76. Recommended Public Views

To reduce accidental exposure, create views such as:

```text
public_profiles_view

public_items_view
```

---

# 77. public_profiles_view

Safe fields:

```text
id

display_name

username

avatar_url

trust_score

average_rating

rating_count

successful_returns

created_at
```

Exclude internal/private fields if added later.

---

# 78. public_items_view

Safe fields:

```text
id

user_id

listing_type

title

category

brand

color

description

event_date

event_time

location_text

status

created_at

updated_at
```

Do not expose:

```text
precise private data

finder private notes

claim answers
```

Latitude/longitude may be omitted or coarsened.

---

# 79. Required Foreign Keys Summary

```text
profiles.id
→ auth.users.id

items.user_id
→ profiles.id

item_images.item_id
→ items.id

found_item_private_details.item_id
→ items.id

verification_questions.item_id
→ items.id

matches.lost_item_id
→ items.id

matches.found_item_id
→ items.id

claims.found_item_id
→ items.id

claims.lost_item_id
→ items.id

claims.claimant_id
→ profiles.id

claim_answers.claim_id
→ claims.id

claim_answers.question_id
→ verification_questions.id

recoveries.claim_id
→ claims.id

recoveries.lost_item_id
→ items.id

recoveries.found_item_id
→ items.id

recoveries.owner_id
→ profiles.id

recoveries.finder_id
→ profiles.id

conversations.recovery_id
→ recoveries.id

conversation_members.conversation_id
→ conversations.id

conversation_members.user_id
→ profiles.id

messages.conversation_id
→ conversations.id

messages.sender_id
→ profiles.id

handovers.recovery_id
→ recoveries.id

ratings.recovery_id
→ recoveries.id

ratings.from_user_id
→ profiles.id

ratings.to_user_id
→ profiles.id

notifications.user_id
→ profiles.id

user_reports.reporter_id
→ profiles.id
```

---

# 80. Cascading Delete Strategy

Use cascade carefully.

Recommended cascade:

```text
item
→ item_images

item
→ found_item_private_details

item
→ verification_questions

claim
→ claim_answers

conversation
→ conversation_members

conversation
→ messages
```

---

# 81. Avoid Broad Cascade for Completed Recoveries

Do not automatically delete historical:

```text
recoveries

ratings

handovers
```

if a user closes an item.

Closing and deletion are separate concepts.

---

# 82. User Account Deletion

Do not blindly cascade historical recovery records when deleting an account.

A future account-deletion process should:

```text
anonymize user profile

remove unnecessary personal data

preserve required recovery history
```

Supabase Auth cascade design should be reviewed before production account deletion is introduced.

---

# 83. Check Constraints

Recommended constraints include:

```text
trust_score between 0 and 100

average_rating between 0 and 5

rating between 1 and 5

overall_score between 0 and 100

category_score between 0 and 100

location_score between 0 and 100

time_score between 0 and 100

description_score between 0 and 100

latitude between -90 and 90

longitude between -180 and 180

from_user_id <> to_user_id
```

---

# 84. Business Constraints Not Expressible as Simple Checks

Some constraints require functions/triggers.

Examples:

```text
matches.lost_item must actually be LOST

matches.found_item must actually be FOUND

claims.lost_item must belong to claimant

claims.found_item must be FOUND

recovery owner must own lost item

recovery finder must own found item

message sender must be conversation member
```

These should be enforced by:

```text
database functions

triggers where appropriate

RLS
```

---

# 85. updated_at Trigger

Use a reusable trigger function:

```text
set_updated_at()
```

Apply to:

```text
profiles

items

found_item_private_details

matches

claims

claim_answers

recoveries

handovers

ratings

user_reports
```

where useful.

---

# 86. Profile Creation Trigger

Create:

```text
handle_new_user()
```

Triggered after:

```text
auth.users INSERT
```

It inserts corresponding:

```text
profiles
```

record.

---

# 87. Search Considerations

For MVP, indexes on:

```text
title

category

brand

location_text
```

may support basic search.

If using PostgreSQL full-text search later, consider:

```text
search_vector tsvector
```

generated from:

```text
title
brand
description
location_text
```

---

# 88. Future Full-Text Search Index

Potential:

```text
GIN(search_vector)
```

This is not mandatory at initial scale.

---

# 89. Location Matching

For MVP:

```text
latitude
longitude
```

can be used in backend distance calculations.

Future:

```text
PostGIS
```

may be introduced for:

- radius queries
- geographic indexes
- large-scale proximity matching

---

# 90. Match Scoring Storage

Store component scores rather than only total score.

This allows later analysis:

```text
Was location highly correlated?

Did description score cause false matches?

Which weights work best?
```

Therefore keep:

```text
overall_score

category_score

location_score

time_score

description_score
```

---

# 91. Match Metadata Future Field

Optional future field:

```text
metadata jsonb
```

for information such as:

```json
{
  "matched_brand": true,
  "matched_color": true,
  "distance_meters": 180,
  "time_difference_minutes": 45
}
```

Do not rely on `jsonb` for fields that need frequent indexing or constraints.

---

# 92. Notification Reference Model

Because notifications may reference different entity types, use:

```text
reference_type
reference_id
```

instead of multiple nullable fields.

Example:

```text
type = CLAIM_ACCEPTED

reference_type = RECOVERY

reference_id = recovery UUID
```

---

# 93. Soft Deletion

For user-generated listings, consider:

```text
deleted_at timestamptz
```

later if real deletion is required.

For MVP:

```text
CLOSED
CANCELLED
```

statuses are generally sufficient.

---

# 94. Item Closure vs Return

Important distinction:

```text
CLOSED
```

means the listing was manually closed.

```text
RETURNED
```

means a successful platform recovery occurred.

This distinction matters for analytics and trust.

---

# 95. Claim Rejection History

Rejected claims should remain stored.

They may be useful for:

```text
fraud detection

abuse monitoring

claim analytics
```

Do not delete rejected claims automatically.

---

# 96. Rating Calculation

`profiles.average_rating` should be treated as cached aggregate data.

Canonical source:

```text
ratings
```

When a rating is created:

```text
recalculate average rating
```

from valid ratings.

Do not simply trust a frontend-provided average.

---

# 97. Successful Returns Calculation

Canonical source should be:

```text
completed recoveries
```

The cached:

```text
profiles.successful_returns
```

can be updated after recovery completion.

---

# 98. Trust Score Source

`profiles.trust_score` is derived.

The exact algorithm is documented in:

```text
14-trust-and-rating.md
```

The database should treat it as system-controlled.

---

# 99. Realtime Tables

Supabase Realtime may be enabled selectively for:

```text
messages

notifications
```

Potentially:

```text
claims

recoveries
```

if needed.

Avoid enabling Realtime on every table.

---

# 100. Recommended Realtime Scope

MVP:

```text
messages
```

Required.

Optional:

```text
notifications
```

All other UI can use query invalidation/refetch initially.

---

# 101. Core Index Summary

At minimum:

```text
profiles(username)

items(user_id)

items(listing_type, status)

items(category, listing_type, status)

items(event_date)

matches(lost_item_id, overall_score)

matches(found_item_id, overall_score)

claims(found_item_id, status)

claims(claimant_id, status)

claim_answers(claim_id)

recoveries(owner_id, status)

recoveries(finder_id, status)

messages(conversation_id, created_at)

ratings(to_user_id)

notifications(user_id, created_at)

user_reports(target_type, target_id)
```

---

# 102. Initial Table Build Order

Recommended migration order:

```text
1. Extensions

2. Enums

3. profiles

4. profile creation trigger

5. items

6. item_images

7. found_item_private_details

8. verification_questions

9. matches

10. claims

11. claim_answers

12. recoveries

13. conversations

14. conversation_members

15. messages

16. handovers

17. ratings

18. notifications

19. user_reports

20. indexes

21. views

22. functions

23. triggers

24. RLS policies
```

---

# 103. Schema Overview

```text
AUTH
└── auth.users
      │
      ▼
   profiles
      │
      ├──────── items
      │           │
      │           ├──── item_images
      │           ├──── found_item_private_details
      │           └──── verification_questions
      │
      └──────────────────────────────┐
                                     │
LOST ITEM ─────┐                     │
               ▼                     │
             matches                 │
               ▲                     │
FOUND ITEM ────┘                     │
   │                                 │
   └──────── claims                  │
              │                      │
              ├──── claim_answers    │
              │                      │
              ▼                      │
          recoveries                 │
              │                      │
      ┌───────┼────────┐             │
      │       │        │             │
      ▼       ▼        ▼             │
conversations handovers ratings ◄────┘
      │
      ├── conversation_members
      │
      └── messages

profiles
   │
   ├──── notifications
   │
   └──── user_reports
```

---

# 104. MVP Minimum Tables

The minimum production-capable schema requires:

```text
profiles

items

item_images

found_item_private_details

verification_questions

matches

claims

claim_answers

recoveries

conversations

conversation_members

messages

handovers

ratings

notifications
```

`user_reports` should also be included before broader public release.

---

# 105. Database Definition of Done

The database schema is ready when it supports this scenario without inconsistent state:

```text
User A
creates Lost Report

User B
creates Found Listing

System
creates Match

User A
creates Claim + Answers

User B
accepts Claim

System
creates Recovery + Conversation

Both users
exchange Messages

Finder
confirms Handover

Owner
confirms Receipt

System
marks Recovery Completed
marks Items Returned
marks Claim Completed

Both users
submit Ratings

System
updates Reputation
```

The database must also prevent:

```text
duplicate matches

duplicate active claims

multiple simultaneous recoveries

self-ratings

ratings before completion

unauthorized conversations

private verification leakage

duplicate handover completion effects
```

---

# 106. Final Schema Philosophy

The schema should model the Lost & Found Platform as a recovery system rather than merely a collection of item posts.

The central data relationship is:

```text
LOST REPORT
     │
     ▼
   MATCH
     │
     ▼
   CLAIM
     │
     ▼
 RECOVERY
     │
 ┌───┼───────────┐
 ▼   ▼           ▼
CHAT HANDOVER   RATING
     │
     ▼
   TRUST
```

Every future database change should preserve the integrity, privacy, and traceability of this lifecycle.