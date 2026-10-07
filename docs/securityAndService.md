# Lost & Found Platform — Security and Privacy

## 1. Purpose

This document defines the security and privacy architecture for the Lost & Found Platform.

The platform handles potentially sensitive information including:

- user identity
- personal belongings
- approximate and precise locations
- ownership evidence
- private claim answers
- recovery conversations
- ratings and reputation
- user-generated images
- abuse reports

Security must therefore exist across:

```text
AUTHENTICATION
      ↓
AUTHORIZATION
      ↓
DATA ACCESS
      ↓
BUSINESS LOGIC
      ↓
STORAGE
      ↓
REALTIME
      ↓
LOGGING
      ↓
MODERATION
```

The platform must follow the principle:

> Assume the browser is untrusted. Every sensitive operation must be validated by the backend.

---

# 2. Security Goals

The security architecture must protect:

```text
Confidentiality
Integrity
Availability
Privacy
Authorization
Recovery State
User Trust
```

The system should prevent:

```text
Unauthorized data access

Ownership evidence leakage

Account impersonation

Claim manipulation

Recovery-state manipulation

Chat access by third parties

Rating manipulation

Trust-score manipulation

Storage abuse

Location leakage

Spam and harassment
```

---

# 3. Security Boundaries

The application consists of several security boundaries.

```text
Browser
   │
   ▼
Supabase Auth
   │
   ▼
RLS
   │
   ▼
Database Functions
   │
   ▼
PostgreSQL
   │
   ├──── Storage
   ├──── Realtime
   └──── Edge Functions
```

The browser should never be considered trusted.

---

# 4. Trust Model

## Untrusted

Treat the following as untrusted:

```text
Browser input

URL parameters

Form values

Client-provided user IDs

Client-provided statuses

Uploaded filenames

Uploaded files

Realtime payload assumptions

Search parameters

Query strings
```

---

## Trusted Only After Validation

```text
Supabase authenticated identity

RLS-authorized database reads

Validated database functions

Database constraints

Controlled Edge Functions
```

---

# 5. Authentication

Authentication uses:

```text
Supabase Auth
```

Initial method:

```text
Email + Password
```

Future:

```text
Google OAuth

Phone Authentication
```

Authorization must continue to use:

```sql
auth.uid()
```

regardless of authentication provider.

---

# 6. Identity Rule

Never accept client-provided:

```text
user_id
owner_id
finder_id
sender_id
from_user_id
notification recipient
```

as authoritative identity when the backend can derive it from:

```text
auth.uid()
```

---

# 7. Session Security

Supabase session handling should use supported SDK mechanisms.

The frontend must never:

```text
manually construct JWTs

store service-role credentials

log access tokens

send authentication tokens to unrelated services
```

---

# 8. Logout Security

On logout:

```text
Supabase sign out
      ↓
Clear Auth Context
      ↓
Clear TanStack Query Cache
      ↓
Remove Realtime Subscriptions
      ↓
Remove private UI state
      ↓
Redirect
```

Private:

```text
claims
messages
recoveries
notifications
```

must not remain visible from the previous session.

---

# 9. Authentication vs Authorization

Authentication answers:

```text
Who is this user?
```

Authorization answers:

```text
Can this user perform this action?
```

Being authenticated does not automatically grant access to:

```text
claims

messages

recoveries

private item information
```

---

# 10. Authorization Layer

Authorization is primarily enforced by:

```text
PostgreSQL Row Level Security
```

Critical transitions additionally use:

```text
Database Functions
```

Security model:

```text
RLS
→ row access

Database functions
→ business-state transitions
```

---

# 11. RLS Mandatory Tables

Enable RLS on:

```text
profiles

items

item_images

found_item_private_details

lost_item_private_details

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

user_reports
```

---

# 12. Default Deny Principle

RLS should follow:

```text
DENY
unless explicitly allowed
```

rather than:

```text
ALLOW authenticated users
then try to restrict later
```

---

# 13. Direct Client Database Access

Direct Supabase table access is acceptable only where:

```text
RLS completely defines allowed access
```

Examples:

```text
public-safe listing reads

user-owned profile updates

notification reads

authorized message reads
```

Critical lifecycle mutations should not rely on direct unrestricted table updates.

---

# 14. Critical Backend Operations

Use controlled functions for:

```text
create_claim()

accept_claim()

reject_claim()

cancel_claim()

confirm_handover()

cancel_recovery()

submit_rating()

dismiss_match()

generate_matches()
```

---

# 15. Client Must Not Control Lifecycle State

Never permit the client to directly determine:

```text
claim.status

recovery.status

items.status = RETURNED

trust_score

match_score

handover completion
```

The client expresses intent.

The backend determines state.

---

# 16. Data Classification

Application data should be classified into:

```text
PUBLIC

USER-SCOPED

SENSITIVE

HIGHLY SENSITIVE

SYSTEM
```

---

# 17. Public Data

Examples:

```text
display name

avatar

public Trust Score

average rating

successful return count

public-safe listing title

category

public-safe description

approximate location

public item photos
```

Public does not mean globally exposed by default.

It means safe for appropriate application display.

---

# 18. User-Scoped Data

Examples:

```text
own listings

Activity dashboard

own notifications

own account settings
```

Only the relevant authenticated user should access these.

---

# 19. Sensitive Data

Examples:

```text
claims

claim answers

recovery records

conversation membership

chat messages

precise item coordinates
```

Access must be restricted to directly involved users.

---

# 20. Highly Sensitive Data

Examples:

```text
Finder private ownership clues

claim evidence

private serial-number fragments

private contents

moderation evidence

future identity verification
```

These require the strictest access rules.

---

# 21. System-Controlled Data

Examples:

```text
trust_score

match score

average_rating aggregate

successful_returns aggregate

moderation status

notification creation

recovery completion
```

Ordinary browser users must not directly modify these.

---

# 22. Public vs Private Listing Data

The system must maintain a strict distinction between:

```text
Public Listing
```

and:

```text
Private Verification Information
```

Public listing example:

```text
Black Wallet

Found near Main Library

October 7
```

Private:

```text
VB initials inside

College ID present

Scratch under zipper
```

---

# 23. Private Information Architecture

Use separate storage:

```text
found_item_private_details
lost_item_private_details
```

rather than mixing private verification data into public listing payloads.

Each side of a listing keeps its private evidence in its own owner-only table: the
Finder's in `found_item_private_details`, the Owner's distinguishing
characteristics in `lost_item_private_details`. Neither is reachable by the other
party, and neither is a matching input.

---

# 24. Public DTO Safety

Public DTOs must not contain:

```text
latitude

longitude

private_notes

serial_fragment

private_contents

unique_markings

verification answers
```

These column names apply to both `found_item_private_details` and
`lost_item_private_details`.

Security must not depend on React simply hiding fields. In this implementation the
boundary is structural: `public_items_view` does not select the coordinate columns,
and `authenticated` holds no table-level SELECT on `items` at all — only a
column-level grant that excludes `latitude`, `longitude`, `closed_reason` and
`closed_at`.

---

# 25. Verification Questions

Questions may be visible to eligible claimants.

Expected/private answers must remain hidden.

Example:

```text
Question:
What was inside the wallet?
```

Do not expose:

```text
Expected answer:
SRM University ID
```

---

# 26. Verification Answer Access

Claim answers may only be accessed by:

```text
Claimant

Finder who owns the Found Listing

Authorized moderation/backend logic
```

No unrelated user.

---

# 27. Claim Security

Attack risks include:

```text
claiming another person's item

claiming own Found Listing

submitting duplicate claims

manipulating Lost Report IDs

viewing someone else's claim

changing claim status manually
```

---

# 28. Claim Creation Validation

`create_claim()` must verify:

```text
Authenticated user exists

Lost Report belongs to caller

Lost Report type = LOST

Found Listing type = FOUND

Finder != claimant

Found Listing is ACTIVE

No existing eligible duplicate claim

Verification questions belong to Found Listing
```

---

# 29. Self-Claim Prevention

The backend must reject:

```text
found_item.user_id = auth.uid()
```

during claim creation.

A user cannot claim their own Found Listing.

---

# 30. Claim Acceptance Security

Only:

```text
Finder who owns Found Listing
```

may accept a claim.

Function verifies:

```text
found_item.user_id = auth.uid()
```

and:

```text
claim.status = PENDING
```

---

# 31. Multiple Claim Race

Possible attack/concurrency:

```text
Claim A accepted
Claim B accepted
at same time
```

Backend must prevent this through:

```text
transaction

row locking

unique active recovery constraint
```

Only one acceptance succeeds.

---

# 32. Recovery Security

Recovery is private.

Only:

```text
owner_id
finder_id
```

may access the associated recovery.

Users must not be able to:

```text
create their own recovery record

change participants

mark recovery complete

fake another participant's confirmation
```

---

# 33. Handover Security

Each participant confirms only their own action.

Finder:

```text
I Handed Over the Item
```

Owner:

```text
I Received My Item
```

Backend identifies role from:

```text
auth.uid()
```

not client-submitted role.

---

# 34. Recovery Completion

Completion occurs only when:

```text
finder_confirmed = true
AND
owner_confirmed = true
```

Then backend atomically updates related state.

---

# 35. Idempotent Completion

Repeated requests must not:

```text
increment successful returns twice

create duplicate notifications

create duplicate rating eligibility

duplicate completion timestamps
```

---

# 36. Chat Security

Chat is available only after:

```text
Claim Accepted
```

and recovery/conversation creation.

There is no generic direct messaging.

---

# 37. Conversation Access

Only users in:

```text
conversation_members
```

may read:

```text
conversation
messages
```

or receive realtime updates.

---

# 38. Sender Spoofing Prevention

Message insert must require:

```text
messages.sender_id = auth.uid()
```

The user cannot submit:

```text
sender_id = another user
```

---

# 39. Closed Conversation

When recovery is:

```text
COMPLETED
or
CANCELLED
```

the conversation should become read-only.

New message inserts must be rejected.

---

# 40. Chat Content Security

For MVP, messages should be:

```text
plain text
```

Do not render:

```text
raw HTML

unsafe Markdown

user-provided script
```

Never use:

```text
dangerouslySetInnerHTML
```

for chat content.

---

# 41. XSS Protection

React's default escaped text rendering should be preserved.

User-generated content including:

```text
listing descriptions

reviews

messages

profile names
```

should render as text.

---

# 42. URL Handling

If message URLs become clickable:

Use safe links with:

```text
rel="noopener noreferrer"
```

External URLs should be clearly identifiable.

---

# 43. SQL Injection

Supabase SDK and parameterized PostgreSQL operations should be used.

Avoid dynamically building SQL strings from user input.

Especially in:

```text
SECURITY DEFINER
```

functions.

---

# 44. SECURITY DEFINER

Use only when required.

Every SECURITY DEFINER function must:

```text
validate auth.uid()

validate resource ownership

validate lifecycle state

set explicit search_path

avoid unsafe dynamic SQL
```

---

# 45. search_path Protection

Security-definer functions should explicitly define a safe search path.

Conceptually:

```sql
SET search_path = public
```

or the exact required schemas.

Do not rely on caller-controlled search resolution.

---

# 46. Service Role Security

The Supabase service-role key:

```text
BYPASSES RLS
```

It must never exist in:

```text
React code

Vite variables

localStorage

browser network configuration

public repositories
```

---

# 47. Service Role Allowed Locations

Only trusted backend environments:

```text
Supabase Edge Functions

secure server infrastructure

administrative backend jobs
```

---

# 48. Frontend Environment Variables

Safe browser configuration:

```text
VITE_SUPABASE_URL

VITE_SUPABASE_ANON_KEY
```

Never:

```text
VITE_SUPABASE_SERVICE_ROLE_KEY
```

---

# 49. Secret Management

Secrets must be:

```text
excluded from Git

stored in environment/secret manager

different between environments

rotated after exposure
```

---

# 50. `.env.example`

May contain:

```text
VITE_SUPABASE_URL=

VITE_SUPABASE_ANON_KEY=
```

but never real secrets.

---

# 51. Secret Exposure Response

If a sensitive secret is committed or exposed:

```text
Treat as compromised
      ↓
Rotate secret
      ↓
Remove from code
      ↓
Review usage/logs
      ↓
Update environment
```

Deleting the Git commit alone is not enough.

---

# 52. Storage Security

Supabase Storage policies must enforce ownership.

Users may not:

```text
upload into another user's folder

overwrite another user's file

delete another user's media
```

---

# 53. Storage Path Rule

Recommended:

```text
{user_id}/{resource_id}/{uuid}.webp
```

But the path itself is not an authorization mechanism.

RLS/policies must verify ownership.

---

# 54. File Type Validation

For item images accept only:

```text
JPEG

PNG

WebP
```

Reject arbitrary files.

User-uploaded SVG should be rejected for MVP.

---

# 55. File Size Validation

Recommended:

```text
Avatar:
2 MB input max

Item image:
5 MB input max
```

Validate before upload.

Storage-side limits should also be configured where available.

---

# 56. Image Metadata Privacy

Uploaded images may contain EXIF information such as:

```text
GPS coordinates

device model

capture time
```

Processed listing images should strip unnecessary metadata wherever practical.

---

# 57. Image Privacy

Found Item photos should not reveal ownership proof.

Users should be warned against exposing:

```text
full ID cards

phone numbers

addresses

bank cards

serial numbers

private contents

unique markings reserved for verification
```

---

# 58. Storage Visibility

Recommended:

```text
avatars
→ public or controlled

item-images
→ preferably private + signed URLs

claim evidence
→ private only
```

---

# 59. Signed URL Security

Signed URLs should:

```text
expire

be generated only for authorized content

not be stored as permanent database values
```

Canonical value:

```text
storage_path
```

---

# 60. Exact Location Privacy

Internally the application may store:

```text
latitude
longitude
```

to improve matching.

Public application interfaces should generally expose:

```text
location_text
```

instead.

Example:

```text
Near Main Library
```

rather than precise coordinates.

---

# 61. Public Location Rule

Never expose precise location merely because the database contains it.

Use:

```text
public-safe views

purpose-specific DTOs

RLS
```

to prevent accidental leakage.

---

# 62. Meetup Location

Exact meetup details belong in:

```text
private chat
```

between recovery participants.

They should not be placed in public listings.

---

# 63. Location Logging

Avoid logging precise user coordinates unnecessarily.

If diagnostic logs require location context, prefer coarse values or omit location entirely.

---

# 64. Matching Privacy

Matching may internally use:

```text
precise coordinates

normalized metadata
```

but public match response should expose only safe information.

---

# 65. Private Details and Matching

Private Finder verification clues should not be used in ways that reveal those clues through match explanations.

Example bad explanation:

```text
98% match because both contain an SRM ID card.
```

if the ID card was a secret verification detail.

---

# 66. Match Score Security

Clients may read authorized scores.

Clients must not update:

```text
overall_score

category_score

location_score

time_score

description_score
```

---

# 67. Match Does Not Prove Ownership

UI and API language must avoid:

```text
Confirmed Owner
```

based only on matching.

Use:

```text
Possible Match

Strong Match
```

until human verification succeeds.

---

# 68. Trust Score Security

Users must never directly modify:

```text
trust_score

average_rating

rating_count

successful_returns
```

These are derived from authoritative backend records.

---

# 69. Rating Security

Ratings are permitted only when:

```text
Recovery = COMPLETED

Current user participated

Target = other participant

No existing rating from current user
```

---

# 70. Self-Rating Prevention

Backend derives:

```text
from_user
to_user
```

from recovery.

Do not accept arbitrary rating target from frontend.

---

# 71. Duplicate Rating Prevention

Database constraint:

```text
UNIQUE(recovery_id, from_user_id)
```

---

# 72. Trust Abuse

Potential abuse:

```text
fake recoveries

multiple fake accounts

same-pair farming

coordinated ratings
```

Initial mitigations:

```text
ratings require completed recovery

diminishing trust benefit

account-age signal

no financial reward

monitor repeated interactions
```

---

# 73. Rejected Claims and Trust

A rejected claim must not automatically reduce trust.

Users can make honest mistakes.

Likewise, cancelled recoveries should not automatically imply misconduct.

---

# 74. Moderation-Driven Trust Changes

Future penalties should require:

```text
confirmed moderation outcome
```

rather than automatic suspicion.

---

# 75. Notifications Security

Users may only read notifications where:

```text
notification.user_id = auth.uid()
```

Clients must not create arbitrary system notifications.

---

# 76. Notification Privacy

Do not include:

```text
private claim answers

precise coordinates

Finder secret details

full private message content

private contents
```

in notification text.

---

# 77. Notification Links

Use:

```text
reference_type
reference_id
```

rather than storing untrusted arbitrary URLs.

Frontend generates the internal route.

---

# 78. Realtime Security

Supabase Realtime must not become a bypass around RLS.

Subscriptions must only expose rows the user is authorized to access.

Primary realtime tables:

```text
messages

notifications
```

---

# 79. Realtime Scope

Avoid subscriptions to:

```text
all messages

all claims

all recoveries
```

Subscribe as narrowly as possible.

---

# 80. Realtime Cleanup

Remove subscriptions when:

```text
conversation changes

component unmounts

user logs out

user session changes
```

---

# 81. Validation Layers

Every important mutation should have several layers:

```text
Frontend Validation
      ↓
Database Constraints
      ↓
RLS
      ↓
Business Function Validation
```

Frontend validation is UX.

Backend validation is security.

---

# 82. Zod

Use Zod for client-side validation.

Examples:

```text
listing schema

claim schema

rating schema

profile schema
```

Do not assume Zod prevents malicious manual API requests.

---

# 83. Length Limits

Enforce length limits on both client and backend.

Recommended:

```text
Listing title
120

Description
1000

Claim message
1000

Verification question
300

Verification answer
1000

Chat message
3000

Rating review
500

Display name
100
```

---

# 84. Input Normalization

Appropriate fields should be:

```text
trimmed

validated

normalized
```

Do not accidentally normalize sensitive values in ways that change ownership evidence meaning.

---

# 85. Mass Assignment

Avoid generic mutations such as:

```text
update("profiles", requestBody)
```

because clients may submit fields that were never intended to be editable.

Use explicit allowlists.

---

# 86. Safe Profile Mutation

Allowed:

```text
display_name
username
avatar
```

Not:

```text
trust_score
successful_returns
rating_count
```

---

# 87. Safe Item Mutation

Allow editable item fields only.

Do not allow arbitrary updates to:

```text
user_id

listing_type

RETURNED status

recovery state
```

---

# 88. Rate Limiting

High-risk operations should receive rate limiting as the product grows.

Priority candidates:

```text
authentication attempts

claim creation

message sending

listing creation

user reports

Notify Possible Owner

future AI operations
```

---

# 89. MVP Rate Limiting

At minimum:

- prevent rapid duplicate submissions in UI
- enforce database uniqueness
- make sensitive operations idempotent
- add server/Edge rate limiting to obvious abuse surfaces when exposed publicly

---

# 90. Login Abuse

Supabase Auth protections should be used.

Do not build custom password verification.

Future protections may include:

```text
CAPTCHA

additional rate limiting
```

if abuse warrants it.

---

# 91. Claim Spam

Potential attack:

```text
one user claims many items
```

Mitigations:

```text
require a Lost Report

duplicate prevention

claim frequency monitoring

rate limiting

reporting/moderation
```

---

# 92. Messaging Spam

Possible protections:

```text
chat exists only after accepted claim

two-member conversations

conversation closes after recovery

rate limiting if necessary
```

This naturally limits spam exposure.

---

# 93. Report Abuse

Users may report:

```text
users

listings

conversations

recoveries
```

Reports should be private.

Reported user must not be able to inspect the report details.

---

# 94. Reporting Abuse Prevention

A user should not be able to flood reports indefinitely.

Potential future controls:

```text
rate limits

duplicate target/reason detection

moderation abuse flags
```

---

# 95. Moderation

Initial moderation may be manual.

Moderators may eventually need access to:

```text
reported content

related listing

relevant conversation context

recovery status
```

Moderator access should use privileged roles separate from ordinary users.

---

# 96. Moderation Role

Do not create moderator access simply by exposing a boolean that the client can modify.

Use protected server-side role/claim management.

---

# 97. Admin / Moderator UI

Not required for MVP.

But backend should avoid design decisions that make future moderation impossible.

---

# 98. Abuse Evidence

Future abuse evidence should use:

```text
private storage
```

and restricted access.

---

# 99. Logging

Production logs should focus on:

```text
operation

resource ID

error code

timing

system context
```

not sensitive user content.

---

# 100. Never Log

Avoid:

```text
passwords

JWT tokens

service role key

verification answers

private Finder details

full chat messages

precise coordinates

private evidence
```

---

# 101. Error Logs

Safe example:

```text
accept_claim failed
claim_id=...
error_code=RECOVERY_ALREADY_ACTIVE
```

Avoid dumping entire request body.

---

# 102. User-Facing Errors

Do not expose:

```text
SQL errors

stack traces

policy names

database constraint internals
```

Map to stable application errors.

---

# 103. Resource Existence Privacy

Sometimes:

```text
NOT_FOUND
```

is preferable to:

```text
FORBIDDEN
```

when revealing that a private resource exists would itself leak information.

---

# 104. Example

User C requests another user's recovery ID.

Safe response:

```text
Recovery not found or unavailable.
```

rather than revealing:

```text
This recovery belongs to User A and B.
```

---

# 105. Error Codes

Use stable application codes such as:

```text
UNAUTHENTICATED

UNAUTHORIZED

NOT_FOUND

VALIDATION_ERROR

CLAIM_ALREADY_EXISTS

RECOVERY_ALREADY_ACTIVE

CONVERSATION_CLOSED

RATING_ALREADY_SUBMITTED
```

---

# 106. CSRF

Supabase bearer-token API interactions are not equivalent to traditional cookie-only server sessions.

Still:

- follow Supabase-supported auth patterns
- use appropriate SameSite/security behavior where cookies are introduced
- review CSRF if a custom cookie-based backend is added later

---

# 107. CORS

If Edge Functions are exposed to the browser:

CORS should allow only required origins and methods where practical.

Do not blindly use permissive CORS for sensitive endpoints.

---

# 108. Edge Function Authentication

User-scoped Edge Functions must validate:

```text
Authorization header
```

and derive the user through Supabase Auth.

Never trust:

```text
body.userId
```

as identity.

---

# 109. Edge Functions with Service Role

A service-role client bypasses RLS.

Therefore an Edge Function using service role must manually verify:

```text
caller

resource relationship

allowed operation

current state
```

before accessing data.

---

# 110. External APIs

Future AI/media/email providers should receive only the minimum required information.

Do not unnecessarily send:

```text
private claims

full profiles

chat messages

precise locations
```

to third parties.

---

# 111. Semantic Matching Privacy

Future embedding systems should prefer:

```text
public-safe listing metadata
```

for external AI requests.

Do not embed secret Finder verification details through external providers unless explicitly reviewed.

---

# 112. AI Output Trust

Future AI matching output is untrusted computation.

The backend should validate:

```text
score range

resource IDs

authorization

data type
```

before persisting external AI output.

---

# 113. Dependency Security

Frontend/backend dependencies should:

```text
remain updated

avoid abandoned packages

be reviewed for major security advisories
```

Do not add libraries when native/platform capabilities already solve the requirement.

---

# 114. Package Lockfile

Commit:

```text
package-lock.json
```

or equivalent lockfile.

Production builds should be reproducible.

---

# 115. Supply Chain

Avoid:

```text
unknown package sources

install scripts from untrusted repositories

copying arbitrary code snippets into production
```

Dependencies are part of the security boundary.

---

# 116. Browser Security

The app should avoid:

```text
dangerouslySetInnerHTML

eval()

dynamic script injection

untrusted iframe embedding
```

unless a specific reviewed requirement exists.

---

# 117. Security Headers

Production hosting should support appropriate headers such as:

```text
Content-Security-Policy

X-Content-Type-Options

Referrer-Policy

Permissions-Policy
```

Exact CSP must match deployed resources.

---

# 118. CSP

A production CSP should restrict:

```text
script sources

connect sources

image sources

frame sources
```

while allowing required:

```text
Supabase endpoints
```

and any approved asset providers.

---

# 119. Frame Protection

The application generally should not be embedded into arbitrary external websites.

Use CSP:

```text
frame-ancestors
```

appropriately.

---

# 120. Referrer Policy

Avoid leaking sensitive internal route information unnecessarily through browser referrers.

Use a conservative policy appropriate to hosting architecture.

---

# 121. HTTPS

Production application and Supabase communication must use:

```text
HTTPS
```

Do not allow production secrets or authentication traffic over plaintext HTTP.

---

# 122. Production Domains

Only approved frontend domains should be configured for:

```text
authentication redirects

OAuth redirects

password recovery redirects
```

Avoid broad wildcard redirects in production.

---

# 123. Development vs Production

Use separate:

```text
Development

Staging

Production
```

Supabase environments where practical.

Do not test destructive migrations against production.

---

# 124. Production Data

Do not copy production private user data into development environments unnecessarily.

Use synthetic or anonymized seed data.

---

# 125. Backups

Supabase production database backup capabilities should be configured according to deployment requirements.

Recovery planning should include:

```text
database state

storage objects

migration history
```

---

# 126. Database Migrations

All security changes should be version-controlled.

This includes:

```text
RLS

functions

constraints

triggers

views

indexes
```

Avoid undocumented manual dashboard-only policies.

---

# 127. RLS Regression Risk

Any schema change affecting:

```text
ownership column

foreign key

view

function
```

must be reviewed for RLS impact.

A feature is not complete simply because its query works with the service role.

---

# 128. Security Testing Users

Use at least:

```text
User A — Owner

User B — Finder

User C — Unrelated User

Anonymous User
```

for access tests.

---

# 129. Profile Security Test

User A attempts:

```text
UPDATE User B profile
```

Expected:

```text
DENIED
```

---

# 130. Trust Manipulation Test

User A attempts:

```text
trust_score = 100
```

Expected:

```text
DENIED
```

---

# 131. Listing Ownership Test

User B attempts:

```text
UPDATE User A Lost Report
```

Expected:

```text
DENIED
```

---

# 132. Private Found Detail Test

Finder:

```text
READ
→ ALLOWED
```

Claimant:

```text
READ DIRECTLY
→ DENIED
```

Unrelated:

```text
DENIED
```

---

# 133. Claim Privacy Test

Claimant:

```text
read own claim
→ allowed
```

Finder:

```text
read claims for own Found Listing
→ allowed
```

User C:

```text
denied
```

---

# 134. Claim Acceptance Test

User C calls:

```text
accept_claim(claim_id)
```

Expected:

```text
DENIED
```

---

# 135. Self-Claim Test

User creates Found Listing then attempts claim with own Lost Report.

Expected:

```text
DENIED
```

---

# 136. Duplicate Claim Test

Same claimant submits same active claim twice.

Expected:

```text
one valid claim
second request rejected/idempotently resolved
```

---

# 137. Recovery Race Test

Two Finders/claim flows attempt conflicting state transitions.

Expected:

```text
only valid authorized transition commits
```

---

# 138. Conversation Privacy Test

User C attempts:

```text
SELECT messages
```

from A/B conversation.

Expected:

```text
no rows / denied
```

---

# 139. Sender Spoof Test

User A inserts:

```text
sender_id = User B
```

Expected:

```text
DENIED
```

---

# 140. Closed Conversation Test

Recovery completes.

Participant sends new message.

Expected:

```text
DENIED
```

---

# 141. Handover Spoof Test

Owner attempts to set:

```text
finder_confirmed = true
```

Expected:

```text
DENIED
```

Owner can confirm only Owner side.

---

# 142. Double Completion Test

Call completion path twice.

Expected:

```text
one recovery completion

one successful-return increment

one rating request per user
```

---

# 143. Rating Eligibility Test

Before recovery completion:

```text
submit_rating()
```

Expected:

```text
DENIED
```

---

# 144. Self-Rating Test

Manipulated target:

```text
to_user = current user
```

Expected:

```text
DENIED
```

---

# 145. Duplicate Rating Test

Submit rating twice.

Expected:

```text
second submission rejected/idempotent
```

---

# 146. Notification Privacy Test

User A attempts to query User B notifications.

Expected:

```text
DENIED
```

---

# 147. Storage Ownership Test

User A attempts:

```text
upload to User B path
```

Expected:

```text
DENIED
```

---

# 148. Storage Deletion Test

User A attempts to delete User B image.

Expected:

```text
DENIED
```

---

# 149. Public DTO Test

Public listing response must not contain:

```text
latitude

longitude

private notes

verification answers
```

---

# 150. Route Enumeration Test

User attempts random UUIDs:

```text
/claims/{uuid}

/messages/{uuid}

/recoveries/{uuid}
```

Unauthorized resources must not leak sensitive information.

---

# 151. Input Abuse Test

Test:

```text
very long text

HTML/script strings

invalid UUID

malformed date

invalid coordinates

negative pagination limits

unexpected enum values
```

Backend must safely reject invalid data.

---

# 152. Upload Abuse Test

Test:

```text
executable renamed .jpg

SVG upload

oversized image

incorrect MIME type

unauthorized path
```

Expected:

```text
rejected
```

---

# 153. Privacy-by-Design Principle

Collect only information needed for recovery.

Do not request:

```text
government ID

home address

phone number

real-time location
```

unless the product later has a clear justified requirement.

---

# 154. Data Minimization

For every new field ask:

```text
Why do we need this?

Who sees it?

How long is it retained?

Can the feature work without it?
```

---

# 155. Public Profile Minimization

Public profile should contain only:

```text
display name

avatar

trust summary

public reviews

membership age where useful
```

Not:

```text
email

phone

private claims

private recovery history
```

---

# 156. Contact Privacy

The application should not automatically expose:

```text
phone number

email

social handles
```

Chat exists specifically to avoid forcing users to expose personal contact information.

---

# 157. Safety Guidance

During recovery, show:

```text
Meet in a public place.

Prefer campus/security desks.

Do not send money.

Keep communication inside the app.

Report suspicious behavior.
```

---

# 158. Home Address

The UI should discourage sharing:

```text
home address
```

for handover.

Use public meetup locations.

---

# 159. Payment Scams

MVP contains no payment system.

Users should be warned:

```text
Do not send money to recover an item.
```

Suspicious reward/payment requests should be reportable.

---

# 160. Ownership Proof

Claimants should never be shown private answers in order to "help" them answer verification questions.

The purpose of verification is lost if the answers are disclosed.

---

# 161. Verification Failure

If a claim is rejected, do not automatically tell the claimant:

```text
which private answer was wrong
```

because repeated attempts could reveal secret details.

---

# 162. Claim Enumeration

Do not expose:

```text
all claims for a Found Listing
```

to unrelated users.

Only:

```text
Finder

individual claimant
```

have legitimate access.

---

# 163. Review Privacy

Public reviews should not reveal:

```text
exact meetup location

phone number

claim answers

private chat contents
```

Users should be encouraged to keep reviews general.

---

# 164. Privacy Retention

MVP may retain operational data needed for:

```text
recovery history

ratings

moderation

trust calculation
```

A formal retention policy should be defined before broader production scale.

---

# 165. Account Deletion

Self-service deletion requires careful handling because:

```text
ratings

recoveries

trust history
```

may involve other users.

Recommended future process:

```text
Verify Account
      ↓
Remove unnecessary private data
      ↓
Delete private media where permitted
      ↓
Anonymize historical references
      ↓
Preserve integrity of recovery history
```

---

# 166. Avoid Blind Cascade Deletion

Deleting `auth.users` should not unintentionally destroy records required to understand completed recoveries.

Account deletion schema behavior must be tested before enabling the feature.

---

# 167. Data Export

Future privacy tooling may support:

```text
user profile

user listings

claims

reviews
```

subject to excluding other people's private information.

Not required for MVP.

---

# 168. Browser Cache Privacy

Authenticated pages should not deliberately persist highly sensitive content outside necessary app/session state.

Sensitive claim/recovery data should primarily remain in application memory/query cache.

---

# 169. localStorage

Do not store:

```text
claim answers

Finder secret details

chat history

service-role secrets

private coordinates
```

in localStorage.

---

# 170. sessionStorage

May be used selectively for:

```text
non-sensitive form drafts
```

Avoid storing private verification information unless specifically reviewed.

---

# 171. Query Cache

TanStack Query may temporarily cache:

```text
claims

messages

recoveries
```

but must be cleared when the authenticated user changes or logs out.

---

# 172. Browser History

Never place sensitive values in URL parameters.

Bad:

```text
/claim?serial=ABC123
```

Good:

```text
/claims/{claimId}
```

---

# 173. Analytics Privacy

If analytics is introduced:

Avoid sending:

```text
claim answers

chat contents

exact coordinates

private notes

personal identifiers
```

as analytics properties.

---

# 174. Product Analytics

Safe examples:

```text
listing_created

match_viewed

claim_submitted

recovery_completed
```

with pseudonymous/internal IDs where necessary.

---

# 175. Threat Model — Account Takeover

Risk:

```text
Attacker gains account credentials
```

Impact:

```text
access to claims
chat
recovery context
```

Mitigations:

```text
Supabase Auth

secure password reset

optional future MFA

session revocation support

login rate limiting
```

---

# 176. Threat Model — Fake Claim

Risk:

```text
Attacker claims item they do not own.
```

Mitigations:

```text
Lost Report required

verification questions

private Finder clues

Finder human review

trust context

private chat only after acceptance
```

---

# 177. Threat Model — Private Detail Leakage

Risk:

```text
claimant discovers verification answer.
```

Mitigations:

```text
separate table

strict RLS

no public DTO field

no notification leakage

no match-explanation leakage
```

---

# 178. Threat Model — Exact Location Leakage

Risk:

```text
public user discovers precise location.
```

Mitigations:

```text
approximate public location

private coordinates

public-safe views

no coordinate logging
```

---

# 179. Threat Model — Chat Eavesdropping

Risk:

```text
unrelated user reads recovery messages.
```

Mitigations:

```text
conversation_members

RLS

filtered realtime subscription

no public message API
```

---

# 180. Threat Model — Recovery Manipulation

Risk:

```text
user manually marks item returned.
```

Mitigations:

```text
no direct state update

dual confirmation

backend function

transaction
```

---

# 181. Threat Model — Trust Manipulation

Risk:

```text
user sets own Trust Score.
```

Mitigation:

```text
system-controlled aggregates

restricted profile updates

trust recalculation function
```

---

# 182. Threat Model — Fake Ratings

Risk:

```text
user rates arbitrary account.
```

Mitigation:

```text
completed recovery required

participants derived by backend

unique rating constraint
```

---

# 183. Threat Model — Notification Spam

Risk:

```text
duplicate match/message events flood user.
```

Mitigation:

```text
dedupe keys

idempotent backend

thresholds

grouping where appropriate
```

---

# 184. Threat Model — Storage Abuse

Risk:

```text
user uploads malicious/unrelated files.
```

Mitigation:

```text
MIME restrictions

size limits

image-only MVP

ownership policies

future moderation/scanning if necessary
```

---

# 185. Threat Model — Enumeration

Risk:

```text
attacker tries random UUIDs.
```

UUIDs reduce guessing but are not authorization.

Mitigation:

```text
RLS

generic errors

resource membership verification
```

---

# 186. Threat Model — Replay / Duplicate Mutation

Risk:

```text
request retried
```

causes duplicate:

```text
claims

ratings

recovery completion

notifications
```

Mitigation:

```text
unique constraints

state validation

idempotent functions
```

---

# 187. Threat Model — Concurrency

Risk:

```text
two claims accepted simultaneously.
```

Mitigation:

```text
transaction

row locks

partial unique active-recovery constraint
```

---

# 188. Threat Model — Social Engineering

Technical controls cannot fully prevent users from:

```text
sharing OTPs

sending money

meeting unsafely
```

Therefore product UX must reinforce:

```text
no payment

public meetup

in-app communication

report suspicious users
```

---

# 189. Production Security Checklist

Before launch verify:

```text
RLS enabled

policies tested

service role absent from browser

private tables inaccessible

Storage policies active

exact coordinates hidden

critical transitions use RPCs

security-definer functions audited

inputs validated

uploads restricted

chat membership enforced

rating manipulation blocked

trust mutation blocked

realtime access tested

query cache clears on logout

production HTTPS configured

auth redirects restricted

secrets separated by environment

logs contain no sensitive payloads
```

---

# 190. MVP Security Priorities

## P0

Must be correct before real users:

```text
Authentication

RLS

Private Found Details

Claims authorization

Chat privacy

Recovery authorization

Handover integrity

Trust protection

Storage ownership

Secret management
```

---

## P1

Strongly recommended before public scale:

```text
Rate limiting

Security headers

Reporting

Moderation workflows

Expanded logging/observability

Automated RLS tests
```

---

## P2

Future:

```text
MFA

Advanced anti-fraud

Automated media moderation

Device/session management

Advanced abuse scoring

Identity verification
```

---

# 191. Security Testing Automation

RLS/security tests should become part of backend CI.

Test:

```text
owner

counterparty

unrelated authenticated user

anonymous user
```

for every sensitive resource.

---

# 192. Security Review Trigger

Perform security review whenever introducing:

```text
new private table

new RPC

new Storage bucket

new public view

new Edge Function

new third-party API

new authentication method

new role

new file upload type
```

---

# 193. Security Regression Rule

A new feature is not complete if:

```text
it works only with service-role access
```

or:

```text
RLS must be disabled to make it work.
```

That indicates an authorization design problem.

---

# 194. Privacy Review Trigger

Perform privacy review whenever collecting a new field involving:

```text
identity

location

contact information

ownership evidence

financial information

government documents

biometrics

private communication
```

---

# 195. Incident Response — Basic

If suspicious access or secret exposure occurs:

```text
Contain
      ↓
Rotate Credentials
      ↓
Disable Vulnerable Path
      ↓
Review Logs
      ↓
Patch
      ↓
Test
      ↓
Restore
```

Detailed incident-response procedures may be created later.

---

# 196. Security Ownership

Security is not only the backend developer's responsibility.

Frontend:

```text
safe rendering

no secret exposure

minimal public data

cache cleanup

safe uploads
```

Backend:

```text
RLS

constraints

functions

authorization

data integrity
```

Deployment:

```text
secrets

HTTPS

headers

environment isolation
```

All layers must align.

---

# 197. Complete Security Model

```text
                        USER
                         │
                         ▼
                  SUPABASE AUTH
                         │
                    auth.uid()
                         │
                         ▼
                        RLS
                         │
           ┌─────────────┴─────────────┐
           │                           │
           ▼                           ▼
        READ ACCESS              BUSINESS ACTION
                                       │
                                       ▼
                              DATABASE FUNCTION
                                       │
                                validate identity
                                validate ownership
                                validate state
                                       │
                                       ▼
                                  TRANSACTION
                                       │
                     ┌─────────────────┼──────────────────┐
                     │                 │                  │
                     ▼                 ▼                  ▼
                 DATABASE          STORAGE            REALTIME
                     │
                     ▼
              SAFE RESPONSE DTO
                     │
                     ▼
                   REACT
```

---

# 198. Security Definition of Done

The MVP is security-ready when:

1. Users cannot access another user's private profile data.
2. Users cannot edit another user's listings.
3. Precise coordinates are not exposed publicly.
4. Finder private details are inaccessible to claimants directly.
5. Claim answers are private.
6. Users cannot claim their own Found Listing.
7. Duplicate active claims are controlled.
8. Only Finder can accept/reject claims for their Found Listing.
9. Only one active recovery can exist for a Found Listing.
10. Only recovery participants can access recovery details.
11. Only conversation members can read/send messages.
12. Sender identity cannot be spoofed.
13. Closed conversations reject new messages.
14. Handover confirmation cannot be forged for the other user.
15. Recovery completion is backend-controlled.
16. Users cannot directly change trust or rating aggregates.
17. Ratings require completed recovery.
18. Self-ratings and duplicate ratings are prevented.
19. Notifications are user-scoped.
20. Clients cannot create arbitrary system notifications.
21. Storage ownership policies prevent cross-user modification.
22. Sensitive evidence uses private storage.
23. Service-role credentials never reach the browser.
24. Security-definer functions validate authorization.
25. User input is bounded and validated.
26. User-generated text is rendered safely.
27. Private state is cleared after logout.
28. Realtime does not expose unauthorized data.
29. Critical operations are safe under retries.
30. Security tests cover Owner, Finder, unrelated, and anonymous users.

---

# 199. Final Security Principle

The platform's security architecture should follow:

```text
MINIMIZE DATA
      ↓
AUTHENTICATE
      ↓
AUTHORIZE
      ↓
VALIDATE
      ↓
PERFORM ATOMIC ACTION
      ↓
RETURN MINIMUM DATA
      ↓
AUDIT WHERE NECESSARY
```

The most important rule is:

> Never rely on the frontend to protect sensitive information or enforce critical recovery rules.

React controls the experience.

Supabase Auth establishes identity.

RLS controls data access.

Database functions control important state transitions.

PostgreSQL constraints protect integrity.

Storage policies protect media.

Together, they form the security and privacy boundary for the Lost & Found Platform.