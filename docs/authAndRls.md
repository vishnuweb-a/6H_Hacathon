# Lost & Found Platform — Authentication and Row Level Security

## 1. Purpose

This document defines the authentication model and Row Level Security strategy for the Lost & Found Platform.

The security model must ensure that:

- users can access only data they are allowed to see
- users cannot edit another user's resources
- private ownership-verification information remains protected
- claim answers remain restricted
- chat is private
- recovery actions are limited to participants
- trust and rating metrics cannot be manipulated from the client
- critical lifecycle transitions are controlled by backend logic

Supabase Auth and PostgreSQL Row Level Security are the primary security mechanisms.

---

# 2. Security Philosophy

The frontend must never be treated as a security boundary.

Hiding a button in React does not prevent unauthorized API calls.

Authorization must be enforced by:

```text
Supabase Auth
+
PostgreSQL RLS
+
Database Constraints
+
Database Functions
+
Edge Functions where required
```

The guiding principle is:

> The client may request an action, but the backend decides whether it is allowed.

---

# 3. Authentication Provider

The initial application will use:

```text
Supabase Auth
```

Initial method:

```text
Email + Password
```

Future options may include:

```text
Google OAuth

Phone Authentication
```

These should not change the underlying authorization model.

---

# 4. Authentication Identity

Every authenticated user has a Supabase Auth ID.

Accessible in PostgreSQL as:

```sql
auth.uid()
```

This ID is the authoritative identity for user-scoped database operations.

---

# 5. Profiles Relationship

Supabase stores authentication records in:

```text
auth.users
```

Application profile data lives in:

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

Both IDs must be identical.

---

# 6. Profile Creation

A database trigger should automatically create the profile.

Flow:

```text
New Auth User
      ↓
auth.users INSERT
      ↓
handle_new_user()
      ↓
profiles INSERT
```

This is preferred over requiring the React client to create the profile separately.

---

# 7. Session Flow

```text
User Login
   ↓
Supabase Auth
   ↓
Session Created
   ↓
Access Token
   ↓
Frontend Supabase Client
   ↓
Database Request
   ↓
auth.uid()
   ↓
RLS Evaluation
```

---

# 8. Frontend Session Handling

The frontend may maintain:

```text
user

session

profile

isAuthenticated
```

but authentication authority remains Supabase.

The frontend must not construct or fake identity information for database authorization.

---

# 9. Protected Application Areas

Authentication is required for:

```text
Creating Lost Reports

Creating Found Listings

Creating Claims

Viewing Private Claims

Messaging

Recovery Management

Handover Confirmation

Rating

Notifications

Profile Editing

Reporting Users/Listings
```

Some public-safe listing/profile reads may later be available without authentication.

---

# 10. Password Requirements

At minimum:

- enforce Supabase password policy
- reject weak passwords
- never store passwords in application tables
- never log passwords
- never send passwords through custom backend endpoints

Password storage is entirely handled by Supabase Auth.

---

# 11. Password Recovery

Password recovery should use Supabase's reset flow.

```text
User Requests Reset
      ↓
Supabase sends recovery email
      ↓
User opens secure link
      ↓
Session established for recovery
      ↓
New password submitted
```

The application database should not implement its own password reset tokens.

---

# 12. Logout

Logout should:

```text
Invalidate local Supabase session
      ↓
Clear client auth state
      ↓
Clear sensitive cached queries
      ↓
Redirect to public application
```

Sensitive cached data should not remain visible after logout.

---

# 13. Row Level Security

RLS must be enabled on all application tables containing user-scoped or sensitive data.

Recommended default approach:

```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

Then add explicit policies.

Without a policy:

> Access should be denied by default.

---

# 14. RLS Policy Categories

Policies should be considered independently for:

```text
SELECT

INSERT

UPDATE

DELETE
```

Do not create broad policies such as:

```text
Authenticated users can do everything.
```

---

# 15. Policy Design Principle

Prefer policies based on:

```sql
auth.uid()
```

and explicit ownership relationships.

Example conceptual rule:

```text
User may update item
IF
items.user_id = auth.uid()
```

---

# 16. Profiles RLS

Table:

```text
profiles
```

---

## SELECT

Users may read safe public profile information.

However, if sensitive profile fields are added later, either:

- use a safe public view
- separate private profile data
- restrict direct SELECT

Recommended long-term approach:

```text
public_profiles_view
```

for public profile reads.

---

## UPDATE

Users may update only their own profile.

Conceptual condition:

```sql
id = auth.uid()
```

---

## INSERT

Direct profile insert from frontend should not be necessary.

Profiles should be created through:

```text
handle_new_user()
```

trigger.

---

## DELETE

Users should not directly delete their profile row through normal frontend access.

Account deletion should use a controlled workflow.

---

# 17. Protected Profile Fields

Users must not directly modify:

```text
trust_score

average_rating

rating_count

successful_returns
```

Possible enforcement approaches:

- separate system-owned profile stats table
- trigger rejecting unauthorized field changes
- controlled database functions
- frontend update function restricted to safe fields

Recommended safer structure:

```text
User-editable profile fields
+
Backend-controlled reputation fields
```

---

# 18. Recommended Profile Update Function

Instead of allowing arbitrary profile updates, the application may expose:

```text
update_my_profile(
  display_name,
  username,
  avatar_url
)
```

This reduces accidental changes to system-managed columns.

---

# 19. Items RLS

Table:

```text
items
```

Represents:

```text
LOST

FOUND
```

---

## SELECT

Users may view public-safe active listings.

Potentially visible states:

```text
ACTIVE

RECOVERY_IN_PROGRESS

RETURNED
```

Depending on product decisions.

Private details are not stored in this table.

---

## INSERT

Authenticated users may create items only when:

```text
user_id = auth.uid()
```

The client must not create a listing on behalf of another user.

---

## UPDATE

Users may update only items they own.

Conceptually:

```sql
items.user_id = auth.uid()
```

However, direct updates must be limited to editable fields.

---

# 20. Item Fields Users May Edit

Safe user-controlled fields:

```text
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
```

Potentially:

```text
closed_reason
```

through a controlled close flow.

---

# 21. Item Fields Users Must Not Freely Edit

Users should not be able to arbitrarily change:

```text
user_id

listing_type after creation

RETURNED state

RECOVERY_IN_PROGRESS state

system timestamps
```

Critical status changes should use backend functions.

---

# 22. Item DELETE

Hard deletion should not normally be exposed directly.

Prefer:

```text
CLOSED
```

or:

```text
CANCELLED
```

through controlled operations.

---

# 23. Item Images RLS

Table:

```text
item_images
```

---

## SELECT

Users may read images if the parent item is visible to them.

---

## INSERT

Allowed only if:

```text
parent item belongs to auth.uid()
```

---

## UPDATE / DELETE

Allowed only if the current user owns the parent item.

---

# 24. Found Item Private Details RLS

Table:

```text
found_item_private_details
```

This is one of the most sensitive tables.

---

## SELECT

Only:

```text
Finder who owns the Found Listing
```

should have direct access.

Conceptual condition:

```text
items.user_id = auth.uid()
AND
items.listing_type = FOUND
```

---

## INSERT

Only the Finder creating/owning the Found Listing.

---

## UPDATE

Only the Finder.

---

## DELETE

Only through controlled listing-deletion/cleanup flow if required.

---

# 25. Important Private Details Rule

Claimants must never receive direct SELECT access to:

```text
found_item_private_details
lost_item_private_details
```

The verification flow should compare user answers with Finder knowledge without revealing expected answers.

---

# 25b. Lost Item Private Details RLS

Table:

```text
lost_item_private_details
```

The LOST-side mirror of §24, and equally sensitive: it holds the Owner's private
ownership evidence.

---

## SELECT

Only:

```text
Owner who created the Lost Report
```

Conceptual condition:

```text
items.user_id = auth.uid()
AND
items.listing_type = LOST
```

---

## INSERT

Only the Owner creating/owning the Lost Report.

---

## UPDATE

Only the Owner.

---

## DELETE

Only the Owner, or through a controlled listing-cleanup flow.

---

## Ownership derivation

Ownership is never taken from a client-supplied user id. The table carries no user
column at all: ownership resolves through the parent item.

```text
item_id -> items.user_id -> auth.uid()
```

The `user_owns_item()` helper performs that lookup. A second authenticated user
fails it and receives nothing; an anonymous caller has no policy and no grant, so it
is denied twice over.

A Finder must never receive direct SELECT access to this table. The Claims phase
compares a claimant's statement against these values server-side without revealing
them — the same rule §25 applies to the FOUND side.

---

# 26. Verification Questions RLS

Table:

```text
verification_questions
```

Questions themselves may be visible to eligible claimants.

---

## SELECT

A user may read questions for an active Found Listing they are allowed to claim.

---

## INSERT

Only the Finder who owns the Found Listing.

---

## UPDATE

Only Finder while the listing is editable.

---

## DELETE

Only Finder.

Prefer preventing modification after an active claim exists if doing so would create inconsistent verification history.

---

# 27. Match RLS

Table:

```text
matches
```

A match connects:

```text
LOST Item
↕
FOUND Item
```

---

## SELECT

A match should be visible only if the authenticated user owns at least one side.

Conceptually:

```text
lost_item.user_id = auth.uid()
OR
found_item.user_id = auth.uid()
```

---

## INSERT

Clients should not directly insert matches.

Matches should be created by:

```text
generate_matches()
```

or other trusted backend logic.

---

## UPDATE

Users may only perform limited actions such as:

```text
Dismiss Match
```

Prefer controlled function:

```text
dismiss_match(match_id)
```

rather than broad direct updates.

---

## DELETE

Not exposed to ordinary users.

---

# 28. Claim RLS

Table:

```text
claims
```

A claim involves:

```text
Claimant / Lost Item Owner
+
Finder / Found Item Owner
```

---

# 29. Claims SELECT

A claim may be read by:

```text
Claimant
```

or:

```text
Finder who owns the Found Listing
```

No unrelated user should see the claim.

---

# 30. Claims INSERT

Prefer claims to be created through:

```text
create_claim()
```

rather than direct table INSERT.

This function verifies:

- user is authenticated
- claimant owns Lost Report
- Found Listing exists
- user is not Finder
- item is available
- duplicate active claim does not exist

---

# 31. Claims UPDATE

Direct arbitrary claim updates should not be allowed.

Lifecycle transitions:

```text
PENDING → ACCEPTED

PENDING → REJECTED

PENDING → CANCELLED

ACCEPTED → COMPLETED
```

should occur through controlled backend functions.

---

# 32. Claim Acceptance Authorization

Only the Finder who owns:

```text
claims.found_item_id
```

may accept the claim.

The backend must verify:

```text
found_item.user_id = auth.uid()
```

---

# 33. Claim Rejection Authorization

Same rule:

```text
Finder owns Found Listing
```

and:

```text
claim.status = PENDING
```

---

# 34. Claim Cancellation Authorization

The claimant may cancel only their own eligible claim.

Example:

```text
claimant_id = auth.uid()
AND
status = PENDING
```

Accepted claims should go through recovery cancellation instead.

---

# 35. Claim Answers RLS

Table:

```text
claim_answers
```

Sensitive data.

---

## SELECT

Allowed only to:

```text
Claimant
```

and:

```text
Finder reviewing the claim
```

---

## INSERT

Prefer through:

```text
create_claim()
```

so answers and claim are created atomically.

---

## UPDATE

Normally not allowed after submission.

If editing claims is introduced later, a controlled function should manage it.

---

## DELETE

Not exposed directly.

---

# 36. Recoveries RLS

Table:

```text
recoveries
```

---

## SELECT

Only:

```text
owner_id = auth.uid()
OR
finder_id = auth.uid()
```

may view a recovery.

---

## INSERT

Clients must not create recovery records directly.

Created only through:

```text
accept_claim()
```

---

## UPDATE

Clients must not freely update:

```text
status

owner_id

finder_id

completed_at
```

Recovery transitions should use backend functions.

---

## DELETE

Not allowed to ordinary users.

---

# 37. Conversation RLS

Table:

```text
conversations
```

---

## SELECT

Only users listed in:

```text
conversation_members
```

for that conversation.

---

## INSERT

Not allowed to frontend clients.

Conversation creation belongs inside:

```text
accept_claim()
```

---

## UPDATE

Only system-controlled fields where necessary.

---

## DELETE

Not allowed to ordinary users.

---

# 38. Conversation Members RLS

Table:

```text
conversation_members
```

---

## SELECT

A user may read membership for conversations they participate in.

Do not expose membership for unrelated conversations.

---

## INSERT

Not allowed directly to client.

Participants are added by:

```text
accept_claim()
```

---

## UPDATE

A user may update limited personal membership state such as:

```text
last_read_at
```

for their own row.

Conceptual condition:

```text
user_id = auth.uid()
```

---

# 39. Messages RLS

Table:

```text
messages
```

This is a critical privacy boundary.

---

## SELECT

Allowed only when:

```text
auth.uid()
```

is a member of:

```text
message.conversation_id
```

---

## INSERT

User may send a message only when:

1. user belongs to the conversation
2. conversation is active
3. sender identity equals authenticated user

Conceptually:

```text
sender_id = auth.uid()
```

---

# 40. Prevent Sender Spoofing

The frontend must not be able to send:

```text
sender_id = another_user_id
```

RLS must enforce:

```text
sender_id = auth.uid()
```

---

# 41. Message UPDATE

For MVP:

Prefer no message editing.

If editing is later introduced:

```text
sender_id = auth.uid()
```

and editing should be time-limited if desired.

---

# 42. Message DELETE

For MVP:

Prefer no hard deletion.

Future deletion may use:

```text
deleted_at
```

and be restricted to the sender.

---

# 43. Handovers RLS

Table:

```text
handovers
```

---

## SELECT

Only recovery participants may read.

---

## INSERT

Not directly exposed.

Created as part of recovery creation or first handover action.

---

## UPDATE

Do not allow direct editing of:

```text
finder_confirmed

owner_confirmed
```

through arbitrary UPDATE.

Use:

```text
confirm_handover(recovery_id)
```

---

# 44. confirm_handover() Authorization

Function must:

1. verify authenticated user
2. fetch recovery
3. verify participant role
4. set only that participant's confirmation
5. prevent repeat side effects
6. complete recovery if both confirmed

---

# 45. Ratings RLS

Table:

```text
ratings
```

---

## SELECT

Public-safe reviews may be readable if product design allows.

Only safe columns should be exposed.

---

## INSERT

Prefer:

```text
submit_rating()
```

Function validates:

```text
Recovery completed

User participated

User is rating the other participant

No previous rating exists

Rating between 1 and 5
```

---

## UPDATE

Ratings should generally be immutable for MVP.

If editing is introduced later, define a limited edit window.

---

## DELETE

Users should not directly delete ratings if ratings contribute to trust history.

Moderation may remove invalid ratings through privileged workflows.

---

# 46. Notifications RLS

Table:

```text
notifications
```

---

## SELECT

User may read only:

```text
notifications.user_id = auth.uid()
```

---

## INSERT

Ordinary frontend users should not create arbitrary system notifications.

Notifications are generated by backend logic.

---

## UPDATE

Users may update only their own notification read state.

Example:

```text
read_at
```

---

## DELETE

Optional.

Prefer allowing old notifications to remain or be archived rather than direct hard deletion.

---

# 47. User Reports RLS

Table:

```text
user_reports
```

---

## INSERT

Authenticated users may create reports.

`reporter_id` must equal:

```text
auth.uid()
```

---

## SELECT

Users may view their own submitted reports if desired.

Moderators require separate privileged access.

---

## UPDATE

Ordinary users should not change:

```text
status
resolved_at
```

These are moderation-controlled fields.

---

# 48. Supabase Storage Security

Storage also requires authorization policies.

Buckets:

```text
avatars

item-images
```

---

# 49. Avatar Upload Policy

Users may upload only to:

```text
avatars/{auth.uid()}/...
```

They must not write into another user's directory.

---

# 50. Avatar Delete Policy

User may delete only files under their own avatar path.

---

# 51. Item Image Upload Policy

Recommended structure:

```text
item-images/{user_id}/{item_id}/{file_name}
```

Upload allowed only when:

```text
user_id = auth.uid()
```

and the item belongs to the user.

---

# 52. Item Image Delete Policy

Only the listing owner may delete its images.

---

# 53. Storage Path Security

Do not rely solely on folder names supplied by the client.

Policies must verify ownership.

A user should not be able to upload to:

```text
another_user_id/item_id
```

by manually changing the storage path.

---

# 54. Signed URLs

For private storage buckets, use:

```text
signed URLs
```

with short expiration.

Sensitive evidence must not use permanent public URLs.

---

# 55. Public Bucket Considerations

If `item-images` is public:

- users can potentially access files by URL
- sensitive details must never be uploaded
- listing images should contain only public-safe information

For better privacy, private storage with controlled signed URLs is safer.

---

# 56. Recommended Storage Strategy

For MVP:

```text
avatars
→ public or semi-public

item-images
→ controlled/public-safe

future claim evidence
→ private
```

---

# 57. Database Function Security

Functions handling sensitive state should verify:

```sql
auth.uid()
```

inside the function.

Do not rely only on the frontend to pass the correct user ID.

---

# 58. Never Accept Authoritative user_id Input

Avoid function signatures such as:

```text
accept_claim(claim_id, finder_user_id)
```

Instead use:

```text
accept_claim(claim_id)
```

and derive:

```text
finder_user_id = auth.uid()
```

inside the function.

---

# 59. SECURITY DEFINER Functions

Some functions may require elevated permissions.

Use:

```text
SECURITY DEFINER
```

only where necessary.

Such functions must:

- validate `auth.uid()`
- set a safe search path
- validate ownership
- validate state
- limit accessible tables
- avoid dynamic SQL where possible

---

# 60. Safe search_path

Security-definer functions should explicitly set:

```sql
SET search_path = public
```

or another safe explicit schema set.

This reduces function hijacking risk.

---

# 61. Critical Backend Functions

Recommended secure functions:

```text
create_claim()

accept_claim()

reject_claim()

cancel_claim()

dismiss_match()

confirm_handover()

cancel_recovery()

submit_rating()

generate_matches()

recalculate_user_trust()
```

---

# 62. create_claim() Security Checks

Must verify:

```text
auth.uid() IS NOT NULL

Lost item belongs to auth.uid()

Found item belongs to someone else

Lost item type = LOST

Found item type = FOUND

Found item status = ACTIVE

No duplicate eligible claim

No active recovery already exists
```

---

# 63. accept_claim() Security Checks

Must verify:

```text
auth.uid() owns Found Listing

Claim status = PENDING

Found Listing available

No active recovery exists

Claimant still owns Lost Report
```

Then atomically create recovery state.

---

# 64. reject_claim() Security Checks

Must verify:

```text
auth.uid() owns Found Listing

Claim = PENDING
```

Then reject.

---

# 65. confirm_handover() Security Checks

Must verify:

```text
auth.uid() = recovery.owner_id
OR
auth.uid() = recovery.finder_id
```

The function must set only the current user's confirmation.

---

# 66. submit_rating() Security Checks

Must verify:

```text
Recovery = COMPLETED

auth.uid() participated

No rating already exists from auth.uid()

Target user is other participant

rating between 1 and 5
```

---

# 67. Trust Score Protection

No client-facing policy should allow:

```text
UPDATE profiles
SET trust_score = ...
```

Trust must only change through:

```text
recalculate_user_trust()
```

or equivalent system logic.

---

# 68. Match Score Protection

Clients must not be able to modify:

```text
overall_score

category_score

location_score

time_score

description_score
```

These are backend-generated values.

---

# 69. Recovery Status Protection

Clients must not directly set:

```text
COMPLETED
```

A recovery becomes completed only through dual handover confirmation.

---

# 70. Listing RETURNED Protection

Users must not directly set:

```text
items.status = RETURNED
```

This state is assigned only after a valid completed recovery.

---

# 71. RLS and Views

Views may simplify public-safe access.

Recommended:

```text
public_profiles_view

public_items_view
```

These should expose only safe columns.

---

# 72. Public Profiles View

Expose:

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

Do not expose:

```text
email

authentication metadata

moderation fields
```

---

# 73. Public Items View

Expose:

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
```

Avoid precise location coordinates where unnecessary.

---

# 74. Approximate Location Security

Internally:

```text
latitude
longitude
```

may be stored.

Public interfaces should preferably use:

```text
location_text
```

or coarsened coordinates.

Exact meetup location should be discussed privately through chat.

---

# 75. Location Privacy Rule

The application must never assume that because latitude/longitude exist in the database they are safe to expose through SELECT.

RLS or views must control this explicitly.

---

# 76. Private Verification Answers

These should never be placed in:

```text
public item response

match card response

search result

notification body
```

---

# 77. Notification Privacy

Notifications should not include excessive sensitive details.

Good:

```text
A possible match was found for your wallet.
```

Avoid:

```text
The found wallet contains your ID card and ₹500.
```

---

# 78. Chat Privacy

Chat messages must never be accessible through generic public queries.

Every message query must resolve against conversation membership.

---

# 79. Search Privacy

Search must use:

```text
public-safe item data
```

not the private Found Item details table.

---

# 80. RLS Performance

RLS policies may execute frequently.

Important ownership columns should be indexed.

Examples:

```text
items.user_id

claims.claimant_id

recoveries.owner_id

recoveries.finder_id

conversation_members.user_id

notifications.user_id
```

---

# 81. Avoid Expensive RLS Policies

Avoid overly complex nested queries where simpler indexed relationships can be used.

For example, `conversation_members` exists partly to make chat authorization efficient and explicit.

---

# 82. Service Role Key

The Supabase service role key:

```text
bypasses RLS
```

Therefore it must only exist in trusted server-side environments.

Never expose it through:

```text
Vite environment variables

React bundle

browser localStorage

frontend code

public repository
```

---

# 83. Frontend Supabase Key

The frontend may safely use:

```text
Supabase anon/public key
```

because RLS is responsible for restricting access.

A public key is not a substitute for RLS.

---

# 84. Edge Function Authorization

Edge Functions acting for a user should receive and validate the user's access token.

Flow:

```text
React
 ↓
Authorization Header
 ↓
Edge Function
 ↓
Validate Supabase Session
 ↓
Determine auth.uid()
 ↓
Perform Authorized Action
```

---

# 85. Edge Function Service Role Usage

If an Edge Function uses service role:

```text
it bypasses RLS
```

so the function must manually enforce every relevant authorization rule.

---

# 86. Rate-Limited Operations

High-risk operations should later support rate limiting.

Examples:

```text
claim creation

user reporting

message sending

listing creation

AI matching requests
```

Rate limiting may use:

- Edge Functions
- PostgreSQL counters
- external rate-limit infrastructure

depending on scale.

---

# 87. Self-Interaction Prevention

The backend should prevent users from:

```text
claiming their own Found Listing

rating themselves

creating recovery with themselves

messaging themselves through recovery flow
```

---

# 88. Duplicate Claim Prevention

A unique or partial unique database constraint should prevent duplicate active claims.

Security should not depend only on:

```text
Disable Claim button
```

in React.

---

# 89. Multiple Recovery Prevention

Only one active recovery may exist for a Found Listing.

Enforce this through:

```text
database constraint
+
accept_claim() transaction
```

---

# 90. Concurrent Claim Acceptance

Two claim acceptance requests may arrive simultaneously.

Backend must ensure:

```text
only one succeeds
```

through:

- transaction
- row lock
- unique active recovery constraint

---

# 91. Idempotent Security Operations

Operations such as:

```text
confirm_handover()

accept_claim()

submit_rating()
```

must safely reject or ignore repeated duplicate calls.

---

# 92. Sensitive Logging

Never log:

```text
passwords

Supabase JWTs

service role key

verification answers

private item details

private chat content
```

unless a very specific secure diagnostic need exists.

---

# 93. Client Storage

Avoid placing sensitive information in:

```text
localStorage
```

Examples to avoid:

```text
verification answers

private Finder details

service credentials
```

Supabase session handling should follow its supported client mechanism.

---

# 94. Query Cache Security

After logout:

```text
TanStack Query cache
```

containing private:

```text
claims

messages

recoveries

notifications
```

should be cleared.

---

# 95. Browser History Security

Avoid putting sensitive data in URLs.

Bad:

```text
/claim?answer=wallet-has-VB-id
```

Good:

```text
/claims/{claimId}
```

Sensitive answers belong in request bodies/database records.

---

# 96. Error Privacy

Unauthorized users should receive generic responses.

Prefer:

```text
You do not have permission to access this resource.
```

rather than:

```text
This claim belongs to user XYZ and exists but you cannot access it.
```

Do not leak resource existence unnecessarily.

---

# 97. RLS Testing Strategy

Every RLS policy must be tested from at least:

```text
Resource Owner

Authorized Counterparty

Unrelated User

Unauthenticated User
```

---

# 98. Example Item RLS Test

Listing owner:

```text
SELECT → allowed
UPDATE → allowed for safe fields
```

Other authenticated user:

```text
SELECT public-safe data → allowed

UPDATE → denied
```

Unauthenticated:

Depends on public-listing product policy.

---

# 99. Private Detail RLS Test

Finder:

```text
SELECT → allowed
```

Claimant:

```text
SELECT → denied
```

Unrelated user:

```text
SELECT → denied
```

Unauthenticated:

```text
SELECT → denied
```

---

# 100. Claim RLS Test

Claimant:

```text
SELECT own claim → allowed
```

Finder:

```text
SELECT claim against own item → allowed
```

Unrelated user:

```text
SELECT → denied
```

---

# 101. Chat RLS Test

Conversation participant:

```text
SELECT → allowed
INSERT message → allowed
```

Unrelated authenticated user:

```text
SELECT → denied
INSERT → denied
```

Unauthenticated:

```text
denied
```

---

# 102. Recovery RLS Test

Owner:

```text
SELECT → allowed
```

Finder:

```text
SELECT → allowed
```

Third party:

```text
denied
```

---

# 103. Rating Security Test

Before recovery completion:

```text
submit rating → denied
```

After completion:

```text
participant rating other participant → allowed
```

Second rating from same user:

```text
denied
```

Self-rating:

```text
denied
```

---

# 104. Trust Security Test

Regular frontend user attempts:

```text
UPDATE profiles SET trust_score = 100
```

Expected:

```text
DENIED
```

---

# 105. Anonymous Access Strategy

Recommended MVP:

Public users may access:

```text
Landing

Login

Register
```

Authenticated users access application content.

Later, limited anonymous Explore may be introduced through public-safe views.

This simplifies early security.

---

# 106. Recommended MVP Authentication Scope

For MVP:

```text
Email/password authentication

Email verification if desired

Password recovery

Secure sessions

Profile creation trigger

Protected application routes
```

Google OAuth can be added without changing database ownership rules.

---

# 107. RLS Migration Organization

Recommended Supabase migration organization:

```text
001_enums.sql

002_profiles.sql

003_items.sql

...

020_rls_profiles.sql

021_rls_items.sql

022_rls_claims.sql

023_rls_chat.sql

024_rls_recoveries.sql
```

Alternatively, policies may live in the same table migration.

Choose one style and remain consistent.

---

# 108. Policy Naming Convention

Use explicit names.

Examples:

```text
profiles_select_public

profiles_update_own

items_select_visible

items_insert_own

items_update_own

claims_select_participants

messages_select_members

messages_insert_members

notifications_select_own
```

Avoid names like:

```text
policy1

allow_users

temp_policy
```

---

# 109. Avoid Overly Broad Policies

Do not write policies equivalent to:

```sql
USING (auth.role() = 'authenticated')
```

for sensitive tables.

Being authenticated does not mean being authorized.

---

# 110. Backend Function vs RLS

RLS is best for:

```text
Who may access a row?
```

Database functions are best for:

```text
Can this multi-step business transition happen now?
```

Use both together.

---

# 111. Example Security Division

### RLS

```text
Can this user see the claim?
```

### Database Function

```text
Can this claim currently be accepted?
```

These are different responsibilities.

---

# 112. Account Deletion

User account deletion requires careful treatment because recoveries and ratings may be historical records.

Initial MVP may defer self-service account deletion.

Future deletion flow should:

```text
Verify user

Remove unnecessary personal data

Anonymize public profile

Remove private uploads where appropriate

Preserve required recovery integrity
```

---

# 113. Banned/Suspended Users

Future moderation may introduce:

```text
profiles.account_status
```

Example:

```text
ACTIVE

SUSPENDED

BANNED
```

Sensitive functions should then verify account status.

This is not required for the first MVP but the architecture should allow it.

---

# 114. Security Events Worth Auditing

Future audit logging should record:

```text
Claim accepted

Claim rejected

Recovery cancelled

Finder handover confirmation

Owner receipt confirmation

Rating submitted

Moderation action

Trust override
```

---

# 115. Complete Authorization Flow

```text
               USER ACTION
                    │
                    ▼
              React Frontend
                    │
             authenticated?
                    │
                    ▼
              Supabase Client
                    │
                    ▼
                 JWT
                    │
                    ▼
              PostgreSQL
                    │
            ┌───────┴───────┐
            │               │
            ▼               ▼
           RLS        Database Function
            │               │
            │         Business Validation
            │               │
            └───────┬───────┘
                    │
               Authorized?
                    │
           ┌────────┴────────┐
           │                 │
          NO                YES
           │                 │
         Reject          Perform Action
```

---

# 116. Security Model by Feature

## Lost Reports

```text
Creator:
create / edit / close

Others:
public-safe read only
```

---

## Found Listings

```text
Finder:
create / edit / close / private details access

Others:
public-safe read only
```

---

## Matches

```text
Only owners of matched listings
```

---

## Claims

```text
Claimant + Finder only
```

---

## Verification Answers

```text
Claimant + Finder only
```

---

## Chat

```text
Conversation members only
```

---

## Recovery

```text
Owner + Finder only
```

---

## Handover

```text
Owner + Finder
but each confirms only own side
```

---

## Ratings

```text
Recovery participants only
after completion
```

---

## Notifications

```text
Recipient only
```

---

# 117. Security Definition of Done

Authentication and RLS are ready when the following guarantees hold:

1. A user cannot modify another user's profile.
2. A user cannot modify another user's listing.
3. A claimant cannot read Finder private details.
4. Unrelated users cannot read claim answers.
5. Unrelated users cannot read claims.
6. Unrelated users cannot access recovery records.
7. Unrelated users cannot read chat messages.
8. Users cannot spoof message sender identity.
9. Users cannot accept claims for listings they do not own.
10. Users cannot create arbitrary recovery sessions.
11. Users cannot fake handover confirmation for the other party.
12. Users cannot mark recovery complete directly.
13. Users cannot rate before recovery completion.
14. Users cannot rate themselves.
15. Users cannot rate twice.
16. Users cannot modify trust scores.
17. Users cannot modify match scores.
18. Service-role credentials never reach the browser.
19. Storage access respects ownership.
20. Logout clears private client-side cache.

---

# 118. Security Test Scenario

Use three users:

```text
User A — Owner

User B — Finder

User C — Unrelated User
```

Scenario:

```text
User A creates Lost Report

User B creates Found Listing

Match generated

User A creates Claim

User B reviews Claim

User B accepts Claim

Conversation created

User A and B chat

Handover completes

Ratings submitted
```

At every stage:

```text
User C
```

must be unable to access private recovery information.

---

# 119. Final Security Principle

The platform deals with:

- personal belongings
- approximate locations
- ownership evidence
- private conversations
- reputation

Therefore access control must be designed into the database rather than added after development.

The final authorization philosophy is:

```text
Authenticate the user
        ↓
Identify the resource
        ↓
Verify relationship
        ↓
Verify lifecycle state
        ↓
Perform only the permitted action
```

No sensitive action should rely solely on frontend behavior.

Supabase Auth identifies the user.

RLS determines which data they may access.

Database functions determine which critical lifecycle transitions they may perform.

Together, these systems form the security boundary of the Lost & Found Platform.