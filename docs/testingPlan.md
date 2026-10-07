# Lost & Found Platform — Testing Plan

## 1. Purpose

This document defines the complete testing strategy for the Lost & Found Platform.

The product includes several security-sensitive and stateful workflows:

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
RETURN
   ↓
RATE
   ↓
TRUST
```

Testing must therefore verify more than UI correctness.

The test strategy must validate:

- business logic
- authorization
- privacy
- database integrity
- matching accuracy
- concurrency
- realtime messaging
- storage security
- recovery lifecycle
- ratings and trust
- notifications
- responsive UI
- accessibility
- deployment readiness

The primary testing goal is:

> A legitimate recovery should work end-to-end, while unauthorized or invalid actions must fail safely.

---

# 2. Testing Principles

## 2.1 Test Behavior, Not Implementation Details

Prefer testing:

```text
User can submit a valid claim.
```

rather than:

```text
Internal function X was called three times.
```

Implementation-specific assertions should be used only where they genuinely protect architecture.

---

## 2.2 Security Tests Are Product Tests

RLS and authorization tests are not optional backend extras.

A feature is incomplete until access rules are tested.

---

## 2.3 Test Negative Paths

Every important happy path should have corresponding failure cases.

Example:

```text
Finder accepts valid claim
```

also requires testing:

```text
Unrelated user attempts acceptance
Already accepted claim
Closed listing
Competing accepted claim
```

---

## 2.4 Use Realistic Multi-User Tests

Many features require at least:

```text
User A — Owner

User B — Finder

User C — Unrelated User
```

Some tests also require:

```text
Anonymous User
```

---

# 3. Testing Pyramid

Recommended strategy:

```text
            E2E
           /   \
      Integration
       /       \
   Unit       RLS/RPC
      \       /
       Component
```

Different layers protect different concerns.

---

# 4. Test Categories

The application should include:

```text
Unit Tests

Component Tests

Form Validation Tests

Service Tests

Database Function Tests

RLS Tests

Storage Policy Tests

Integration Tests

Realtime Tests

Concurrency Tests

Security Tests

Accessibility Tests

Responsive Tests

End-to-End Tests

Smoke Tests
```

---

# 5. Recommended Tooling

Frontend:

```text
Vitest

React Testing Library

user-event
```

Recommended E2E:

```text
Playwright
```

Backend/database:

```text
Supabase local environment

SQL tests / integration test helpers
```

Optional later:

```text
axe-core / jest-axe
```

for accessibility automation.

---

# 6. Test Environment Strategy

Use:

```text
Local
Staging
Production Smoke
```

as separate testing levels.

---

# 7. Local Environment

Used for:

```text
unit tests

component tests

database reset

RLS tests

RPC tests

integration tests

local E2E
```

The local environment should use synthetic data only.

---

# 8. Staging Environment

Used for:

```text
production-like Auth

Storage

Realtime

browser testing

deployment validation

full E2E
```

Staging should closely mirror production configuration.

---

# 9. Production Testing

Production testing should be limited to:

```text
smoke tests

health checks

critical read flows

non-destructive verification
```

Do not run destructive test resets against production.

---

# 10. Test Users

Standard test identities:

```text
User A — Owner

User B — Finder

User C — Unrelated User

User D — Additional claimant
```

Optionally:

```text
Moderator
```

when moderation exists.

---

# 11. Seed Dataset

Create deterministic fixtures for:

```text
Lost AirPods

Found AirPods

Lost Wallet

Found Wallet

Weak Match

Strong Match

Pending Claim

Accepted Claim

Active Recovery

Completed Recovery
```

---

# 12. Test Data Rule

Never depend on:

```text
production users

production messages

production listings
```

for automated tests.

Tests should be reproducible.

---

# 13. Unit Testing Scope

Unit tests should focus on pure logic.

Examples:

```text
match score calculation

date similarity

distance score mapping

match-strength labels

trust calculation

notification route mapping

validation helpers

DTO mappers

query-key factories
```

---

# 14. Matching Unit Tests

Test:

```text
category score

date score

time score

location score

description similarity

dynamic weight normalization

final weighted score
```

---

# 15. Category Score Tests

Cases:

```text
exact category
→ 100
```

```text
compatible category
→ configured reduced score
```

```text
incompatible category
→ reject / zero
```

---

# 16. Date Score Tests

Test:

```text
same day

1 day difference

3 day difference

7 day difference

14 day difference

beyond window

found-before-lost penalty
```

---

# 17. Time Score Tests

Test:

```text
same hour

1–3 hours

6 hours

12 hours

missing time

cross-day case
```

---

# 18. Location Score Tests

Test boundaries:

```text
0m

100m

250m

500m

1km

2km

5km

10km+

missing coordinates
```

---

# 19. Haversine Test

Use known coordinates and expected approximate distance.

Allow small tolerance.

Do not assert unrealistic exact floating-point equality.

---

# 20. Missing Signal Test

Example:

```text
location unavailable
```

Expected:

```text
remaining weights normalized
```

rather than:

```text
location contributes zero and unfairly lowers total
```

---

# 21. Match Threshold Tests

Verify:

```text
59.99
→ hidden
```

```text
60
→ POSSIBLE
```

```text
75
→ STRONG
```

```text
90
→ VERY_STRONG
```

---

# 22. Trust Unit Tests

Test:

```text
new user

one rating

many ratings

completed recoveries

account age

score bounds

idempotent recalculation
```

---

# 23. New User Trust Test

User:

```text
0 ratings
0 recoveries
```

Expected:

```text
neutral/default trust
```

not:

```text
0
```

---

# 24. Trust Bounds

Ensure trust remains:

```text
0 <= trust_score <= 100
```

under all valid inputs.

---

# 25. DTO Mapper Tests

Example:

Raw listing row includes:

```text
latitude
longitude
private database fields
```

Public mapper output must omit them.

---

# 26. Notification Route Tests

Verify:

```text
MATCH_FOUND
→ /matches/:id

CLAIM_RECEIVED
→ /claims/:id

NEW_MESSAGE
→ /messages/:id

HANDOVER_UPDATE
→ /recoveries/:id
```

---

# 27. Component Tests

Use React Testing Library.

Test user-visible behavior.

Examples:

```text
ListingCard

MatchCard

ClaimCard

RecoveryTimeline

StatusBadge

NotificationItem

RatingStars

EmptyState
```

---

# 28. ListingCard Tests

Verify:

```text
LOST badge

FOUND badge

title

location

date

image fallback

status
```

No sensitive information should appear.

---

# 29. MatchCard Tests

Verify:

```text
score shown

strength label shown

safe matched signals

correct item titles
```

Avoid testing hidden internal component scores unless intentionally displayed.

---

# 30. RecoveryTimeline Tests

Test states:

```text
active

partially confirmed

completed

cancelled
```

Timeline should visually reflect backend state correctly.

---

# 31. Rating Component Tests

Verify:

```text
select 1–5 stars

keyboard interaction

accessible labels

submit disabled without selection

existing rating state
```

---

# 32. Form Tests

Forms requiring testing:

```text
Register

Login

Lost Report

Found Listing

Claim

Profile

Rating

Report Abuse
```

---

# 33. Lost Report Validation

Test required:

```text
title

category

description

event date

location
```

Optional:

```text
brand

color

time

coordinates
```

---

# 34. Found Listing Validation

Also test:

```text
private verification fields

verification questions

image guidance
```

---

# 35. Form Length Limits

Test boundaries:

```text
title 120 chars

description 1000

verification question 300

claim answer 1000

rating review 500
```

---

# 36. Invalid Location Input

Test:

```text
latitude > 90

latitude < -90

longitude > 180

longitude < -180
```

Expected:

```text
rejected
```

---

# 37. Claim Form Tests

Verify:

```text
all required questions answered

empty answers rejected

lost report selection required

additional message optional
```

---

# 38. Service Tests

Test feature services against mocked or local Supabase.

Examples:

```text
createLostReport()

createFoundListing()

getMatches()

createClaim()

acceptClaim()

sendMessage()

confirmHandover()

submitRating()
```

---

# 39. Service Error Mapping

Raw backend errors should map to:

```text
AppError
```

Example:

```text
duplicate claim
```

must become:

```text
CLAIM_ALREADY_EXISTS
```

rather than exposing SQL constraint text.

---

# 40. Database Schema Tests

Verify:

```text
foreign keys

unique constraints

check constraints

enum restrictions

not-null requirements
```

---

# 41. Match Uniqueness

Attempt inserting same:

```text
lost_item_id
+
found_item_id
```

twice.

Expected:

```text
duplicate blocked
```

---

# 42. Rating Constraint Test

Attempt:

```text
rating = 0
rating = 6
```

Expected:

```text
rejected
```

---

# 43. Self-Rating Constraint

Attempt:

```text
from_user_id = to_user_id
```

Expected:

```text
rejected
```

---

# 44. Database Function Tests

Critical functions:

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

# 45. create_claim() Happy Path

Setup:

```text
User A owns Lost Report

User B owns active Found Listing
```

Action:

```text
A creates claim
```

Expected:

```text
claim created

answers created

claim status = PENDING

Finder notification created
```

---

# 46. create_claim() Self-Claim

Setup:

```text
User A owns Found Listing
```

Action:

```text
A claims it
```

Expected:

```text
denied
```

---

# 47. create_claim() Duplicate

Create same eligible claim twice.

Expected:

```text
one active claim
```

Second call:

```text
CLAIM_ALREADY_EXISTS
```

---

# 48. create_claim() Wrong Lost Owner

User C passes User A's Lost Report.

Expected:

```text
denied
```

---

# 49. accept_claim() Happy Path

Expected atomic changes:

```text
claim ACCEPTED

recovery created

handover created

conversation created

owner/finder memberships created

items RECOVERY_IN_PROGRESS

notification created
```

---

# 50. accept_claim() Unauthorized

User C attempts acceptance.

Expected:

```text
denied
```

No partial changes.

---

# 51. accept_claim() Wrong Finder

Finder owning different listing attempts acceptance.

Expected:

```text
denied
```

---

# 52. accept_claim() Duplicate Call

Call twice.

Expected:

```text
one recovery

one conversation

no duplicate members

no duplicate notifications
```

---

# 53. reject_claim() Tests

Verify:

```text
Finder can reject own listing claim

Unrelated user denied

Accepted claim cannot be rejected normally

notification created once
```

---

# 54. confirm_handover() Finder Test

Finder calls function.

Expected:

```text
finder_confirmed = true

owner_confirmed unchanged

status = PARTIALLY_CONFIRMED
```

---

# 55. confirm_handover() Owner Test

After Finder:

Owner calls function.

Expected:

```text
owner_confirmed = true

recovery COMPLETED

claim COMPLETED

items RETURNED

conversation closed

rating requests created
```

---

# 56. confirm_handover() Duplicate

Finder confirms twice.

Expected:

```text
no duplicate side effects
```

---

# 57. submit_rating() Happy Path

After completed recovery:

```text
Owner rates Finder
```

Expected:

```text
rating inserted

Finder average updated

rating count updated

trust recalculated
```

---

# 58. submit_rating() Before Completion

Expected:

```text
RATING_NOT_ALLOWED
```

---

# 59. submit_rating() Duplicate

Expected:

```text
RATING_ALREADY_SUBMITTED
```

---

# 60. RLS Testing

RLS testing is mandatory.

For each sensitive table, test:

```text
Owner

Counterparty

Unrelated User

Anonymous
```

---

# 61. Profiles RLS

User A:

```text
read public User B profile
→ allowed where intended
```

User A:

```text
update User B profile
→ denied
```

User A:

```text
change own trust_score
→ denied
```

---

# 62. Items RLS

Owner:

```text
update own active item
→ allowed safe fields
```

Other user:

```text
update
→ denied
```

---

# 63. Private Details RLS

Finder:

```text
SELECT own found private details
→ allowed
```

Claimant:

```text
direct SELECT
→ denied
```

Unrelated:

```text
denied
```

---

# 64. Verification Questions RLS

Eligible claimant:

```text
read question text
→ allowed
```

Expected secret answer:

```text
never exposed
```

---

# 65. Matches RLS

User owning Lost side:

```text
allowed
```

User owning Found side:

```text
allowed
```

User C:

```text
denied
```

---

# 66. Claims RLS

Claimant:

```text
read own claim
→ allowed
```

Finder:

```text
read claims for own found item
→ allowed
```

User C:

```text
denied
```

---

# 67. Claim Answers RLS

Claimant:

```text
allowed
```

Finder:

```text
allowed
```

User C:

```text
denied
```

---

# 68. Recoveries RLS

Owner/Finder:

```text
allowed
```

User C:

```text
denied
```

Anonymous:

```text
denied
```

---

# 69. Conversation RLS

Owner/Finder:

```text
allowed
```

User C:

```text
denied
```

---

# 70. Message RLS

Conversation member:

```text
SELECT
→ allowed

INSERT own sender ID
→ allowed
```

Unrelated:

```text
denied
```

---

# 71. Sender Spoof Test

User A inserts:

```text
sender_id = User B
```

Expected:

```text
denied
```

---

# 72. Notifications RLS

User A:

```text
own notifications
→ allowed
```

User B notification:

```text
denied
```

---

# 73. Storage Policy Tests

Buckets:

```text
avatars

item-images
```

must be tested independently.

---

# 74. Avatar Storage Test

User A upload:

```text
A/avatar.webp
→ allowed
```

User A upload:

```text
B/avatar.webp
→ denied
```

---

# 75. Item Storage Test

User A owns item X.

Upload:

```text
A/X/file.webp
→ allowed
```

Upload:

```text
B/Y/file.webp
→ denied
```

---

# 76. Delete Storage Test

User A deleting User B media:

```text
denied
```

---

# 77. File Validation Tests

Attempt:

```text
SVG

EXE renamed JPEG

oversized image

invalid MIME

unsupported format
```

Expected:

```text
rejected
```

---

# 78. Explore Integration Tests

Verify:

```text
browse listings

Lost filter

Found filter

category filter

date filter

search

pagination

empty results
```

---

# 79. Public Data Integration Test

Explore response must not contain:

```text
precise coordinates

private details

claim answers

private recovery data
```

---

# 80. Matching Integration Test

Create:

```text
Lost AirPods

Found AirPods
```

with known matching signals.

Run:

```text
generate_matches()
```

Expected:

```text
match created
score expected range
```

---

# 81. Bidirectional Matching Test

Case A:

```text
Lost first
Found later
```

Case B:

```text
Found first
Lost later
```

Both must result in valid match.

---

# 82. Match Recalculation Test

Change:

```text
location
description
date
```

Expected:

```text
existing match updated
```

not duplicated.

---

# 83. Dismissal Test

User dismisses match.

Run matching again without meaningful change.

Expected:

```text
remains dismissed
```

---

# 84. Weak Match Test

Score:

```text
55
```

Expected:

```text
may persist internally
not shown in normal UI
no notification
```

---

# 85. Strong Match Notification Test

Score:

```text
80
```

Expected:

```text
match visible
notification once
```

Recalculate unchanged:

```text
no duplicate notification
```

---

# 86. Realtime Chat Tests

Realtime should be tested separately from persistence.

---

# 87. Realtime Message Delivery

User A and B open same conversation.

A sends:

```text
Hello
```

Expected:

```text
message stored once

A sees it

B receives without refresh
```

---

# 88. Realtime Duplicate Test

Simulate:

```text
mutation response
+
realtime INSERT event
```

Expected:

```text
one rendered message
```

Deduplicate by:

```text
message.id
```

---

# 89. Realtime Reconnection Test

```text
B disconnects

A sends 3 messages

B reconnects
```

Expected:

```text
refetch restores all three
```

---

# 90. Conversation Close Test

After recovery completion:

Attempt sending message.

Expected:

```text
CONVERSATION_CLOSED
```

---

# 91. Unread Count Test

A sends three messages while B is away.

Expected:

```text
B unread = 3
```

B opens conversation.

Expected:

```text
last_read_at updates
unread returns 0
```

---

# 92. Notification Tests

Test every notification type.

```text
MATCH_FOUND

CLAIM_RECEIVED

CLAIM_ACCEPTED

CLAIM_REJECTED

NEW_MESSAGE

HANDOVER_UPDATE

RECOVERY_COMPLETED

RATING_REQUEST
```

---

# 93. Notification Deep-Link Tests

Each notification must navigate to correct route.

Also test referenced resource:

```text
already completed

closed

unavailable

unauthorized
```

---

# 94. Notification Deduplication

Critical:

```text
match notification
rating request
recovery completion
```

should not duplicate under repeated backend operations.

---

# 95. Concurrency Testing

Concurrency is critical for state integrity.

---

# 96. Competing Claim Acceptance

Setup:

```text
Claim A

Claim B
```

for same Found Listing.

Trigger acceptance near-simultaneously.

Expected:

```text
one accepted

one fails

one active recovery
```

---

# 97. Dual Handover Race

Owner and Finder confirm simultaneously.

Expected:

```text
both confirmations stored

recovery completes exactly once
```

---

# 98. Duplicate Request Race

Send two:

```text
submit_rating()
```

requests simultaneously.

Expected:

```text
one rating
```

---

# 99. Match Generation Race

Two matching processes evaluate same pair.

Expected:

```text
one match row
```

due to uniqueness/upsert.

---

# 100. Security Tests

Test malicious/manual behavior rather than only UI restrictions.

---

# 101. URL Enumeration

Randomly request:

```text
/claims/:uuid

/recoveries/:uuid

/messages/:uuid
```

Expected:

```text
no private leakage
```

---

# 102. Status Manipulation

Directly attempt:

```text
UPDATE item
SET status = RETURNED
```

as browser user.

Expected:

```text
denied
```

---

# 103. Trust Manipulation

Attempt:

```text
trust_score = 100
```

Expected:

```text
denied
```

---

# 104. Match Manipulation

Attempt updating:

```text
overall_score = 100
```

Expected:

```text
denied
```

---

# 105. Ownership Manipulation

Attempt changing:

```text
items.user_id
```

Expected:

```text
denied
```

---

# 106. HTML / XSS Input

Use values such as:

```html
<script>alert(1)</script>
```

inside:

```text
listing description

review

message

display name
```

Expected:

```text
rendered safely as text
```

No execution.

---

# 107. Long Input Abuse

Send strings significantly above allowed limits.

Expected:

```text
backend rejects
```

not just frontend.

---

# 108. Invalid Enum Test

Attempt:

```text
listing_type = ADMIN
```

Expected:

```text
rejected
```

---

# 109. Invalid UUID Test

Routes and RPC input:

```text
not-a-uuid
```

Expected:

```text
safe validation error
```

not internal crash.

---

# 110. Accessibility Testing

Accessibility must be tested manually and automatically where possible.

---

# 111. Keyboard Navigation

Every major flow should work using:

```text
Tab

Shift+Tab

Enter

Space

Escape
```

where semantically appropriate.

---

# 112. Focus Testing

Verify:

```text
dialogs trap focus

dialog close returns focus

route/page headings are reachable

errors don't move focus unpredictably
```

---

# 113. Form Accessibility

Every field must have:

```text
visible label

accessible error message

required-state indication
```

---

# 114. Status Accessibility

Do not communicate:

```text
Lost

Found

Pending

Completed
```

through color alone.

Text/icon must accompany state.

---

# 115. Rating Accessibility

Stars require accessible labels:

```text
1 star — Very Poor

5 stars — Excellent
```

---

# 116. Image Accessibility

Listing images should have meaningful alt text.

Decorative images should use empty alt appropriately.

---

# 117. Reduced Motion Testing

Enable:

```text
prefers-reduced-motion: reduce
```

Verify:

```text
match count animation removed

page motion simplified

recovery success usable

no information lost
```

---

# 118. Contrast Testing

Check:

```text
body text

buttons

badges

input borders

status indicators

error text
```

against intended WCAG AA targets.

---

# 119. Responsive Testing

Required viewport families:

```text
Mobile

Tablet

Desktop
```

---

# 120. Recommended Viewports

Test approximately:

```text
375 × 812

390 × 844

768 × 1024

1280 × 800

1440 × 900
```

---

# 121. Mobile Critical Screens

Prioritize:

```text
Home

Lost form

Found form

Explore

Item Detail

Match Detail

Claim

Recovery

Chat

Handover
```

---

# 122. Mobile Keyboard Test

On chat and forms:

Verify virtual keyboard does not:

```text
hide composer

hide active input

cover sticky action
```

---

# 123. Desktop Critical Screens

Test:

```text
Explore grid

Match comparison

Claims review

Messages split layout

Recovery detail

Profile
```

---

# 124. Overflow Testing

Use long:

```text
item titles

user names

locations

notification text
```

Ensure layouts do not break.

---

# 125. Image Testing

Test:

```text
portrait

landscape

square

very wide

missing image

failed image
```

---

# 126. Loading-State Testing

Every async screen should test:

```text
initial loading

background refetch

slow network
```

---

# 127. Empty-State Testing

Examples:

```text
No listings

No matches

No claims

No conversations

No notifications

No ratings
```

Each should provide a meaningful next action where appropriate.

---

# 128. Error-State Testing

Simulate:

```text
network failure

Supabase failure

storage failure

RPC rejection

realtime failure
```

UI should remain usable.

---

# 129. Offline / Network Testing

MVP should handle:

```text
slow connection

temporary disconnection

retry
```

Chat offline queue is not required.

---

# 130. Upload Failure Test

Scenario:

```text
listing form valid

image upload fails
```

Expected:

```text
form data preserved

retry available
```

---

# 131. Partial Upload Test

3 images:

```text
1 succeeds
2 fails
3 succeeds
```

Expected:

```text
successful uploads retained

failed upload retryable
```

---

# 132. Performance Testing

Initial performance review should focus on:

```text
Explore query

Match generation

Messages

Notifications

Images
```

---

# 133. Query Pagination Test

Ensure no screen accidentally loads:

```text
all messages

all notifications

all listings
```

without pagination.

---

# 134. Image Performance Test

Verify:

```text
compressed uploads

lazy loading

correct dimensions

reasonable payload size
```

---

# 135. Matching Performance Test

Seed increasing candidate sets.

Example:

```text
100

1,000

10,000
```

where practical.

Verify candidate filtering prevents full expensive comparisons.

---

# 136. Database Index Review

Use query plans where needed for:

```text
items

matches

claims

messages

notifications
```

especially before production scale.

---

# 137. Animation Testing

Verify:

```text
no animation delays navigation

success animations wait for backend

animations clean up

no replay on ordinary refetch

mobile stays smooth
```

---

# 138. Backend Failure + Animation

Simulate failed:

```text
Accept Claim
```

Expected:

```text
no success animation

error shown

state unchanged
```

---

# 139. End-to-End Test Suite

E2E tests should cover complete user journeys.

---

# 140. E2E 01 — Authentication

```text
Register User

Profile automatically created

Logout

Login

Protected route accessible
```

---

# 141. E2E 02 — Create Lost Report

```text
Login Owner
      ↓
Report Lost Item
      ↓
Upload Image
      ↓
Fill Details
      ↓
Publish
      ↓
View Activity
```

Expected:

```text
listing ACTIVE
```

---

# 142. E2E 03 — Create Found Listing

```text
Login Finder
      ↓
Report Found Item
      ↓
Public Details
      ↓
Private Details
      ↓
Verification Questions
      ↓
Publish
```

Verify claimant cannot access private details.

---

# 143. E2E 04 — Automatic Match

Using Lost and Found fixture:

```text
matching runs
      ↓
match appears
      ↓
score displayed
```

Expected:

```text
Strong or Very Strong
```

---

# 144. E2E 05 — Match Dismissal

Owner:

```text
Not My Item
```

Expected:

```text
match disappears

does not immediately reappear
```

---

# 145. E2E 06 — Claim

Owner:

```text
opens Found Listing

Claim This Item

selects Lost Report

answers questions

submits
```

Finder receives claim.

---

# 146. E2E 07 — Reject Claim

Finder rejects.

Owner sees:

```text
Claim Not Accepted
```

Owner can continue searching.

---

# 147. E2E 08 — Accept Claim

Finder accepts valid claim.

Expected:

```text
Recovery created

Conversation created

Claim ACCEPTED

Items RECOVERY_IN_PROGRESS
```

---

# 148. E2E 09 — Chat

Owner sends:

```text
Can we meet at the library?
```

Finder receives realtime.

Finder responds.

Both messages persist after refresh.

---

# 149. E2E 10 — Finder Handover

Finder:

```text
I Handed Over the Item
```

Expected:

```text
PARTIALLY_CONFIRMED
```

Owner receives notification.

---

# 150. E2E 11 — Owner Confirmation

Owner:

```text
I Received My Item
```

Expected:

```text
Recovery COMPLETED

Items RETURNED

Claim COMPLETED

Chat read-only
```

---

# 151. E2E 12 — Rating

Owner rates Finder.

Finder rates Owner.

Expected:

```text
ratings created

profiles updated

trust updated
```

---

# 152. E2E 13 — Unrelated User Privacy

User C attempts to access:

```text
claim

recovery

conversation
```

Expected:

```text
no access
```

---

# 153. E2E 14 — Found-First Flow

Finder creates Found Listing first.

Later Owner creates Lost Report.

Expected:

```text
same matching behavior
```

---

# 154. E2E 15 — No Match

Owner creates uncommon Lost Report.

Expected:

```text
No possible matches yet
```

Report remains active.

---

# 155. E2E 16 — Duplicate Claim

Owner submits claim twice.

Expected:

```text
one active claim
```

---

# 156. E2E 17 — Competing Claims

User A and User D claim same Found Listing.

Finder accepts A.

Expected:

```text
A recovery starts

D cannot also become active recovery
```

---

# 157. E2E 18 — Realtime Reconnect

Disconnect Finder client.

Owner sends messages.

Reconnect.

Expected:

```text
messages recovered through refetch
```

---

# 158. E2E 19 — Close Listing

Owner closes active listing manually.

Expected:

```text
no new claims

no new proactive matching

listing shows closed state
```

---

# 159. E2E 20 — Logout Privacy

User A opens private conversation.

Logout.

Expected:

```text
private cache removed

login page shown

back navigation does not reveal active private UI
```

---

# 160. Critical Regression Suite

Every release should run at minimum:

```text
Auth

Create Lost

Create Found

Match

Claim

Accept

Chat

Handover

Complete Recovery

Rating

RLS privacy
```

---

# 161. CI Testing

Recommended CI stages:

```text
Install dependencies
      ↓
Lint
      ↓
Typecheck
      ↓
Unit tests
      ↓
Component tests
      ↓
Start/reset Supabase
      ↓
Backend/RLS tests
      ↓
Build
      ↓
E2E critical suite
```

---

# 162. Pull Request Gate

PR should not merge if:

```text
typecheck fails

build fails

unit tests fail

critical backend tests fail

security regression fails
```

---

# 163. Migration CI

For PRs with Supabase migration:

```text
create clean database
      ↓
apply all migrations
      ↓
apply seed
      ↓
run database tests
```

This ensures migration history works from zero.

---

# 164. Test Naming

Use behavior-oriented names.

Good:

```text
prevents unrelated user from reading recovery
```

Bad:

```text
testRecoveryPolicy2
```

---

# 165. Test Organization

Recommended frontend:

```text
src/
├── features/
│   └── claims/
│       ├── components/
│       ├── services/
│       └── __tests__/
```

or colocated:

```text
ClaimCard.test.tsx
```

Choose one convention consistently.

---

# 166. Backend Test Organization

Example:

```text
supabase/
└── tests/
    ├── auth/
    ├── listings/
    ├── matching/
    ├── claims/
    ├── chat/
    ├── recovery/
    ├── ratings/
    └── rls/
```

---

# 167. Flaky Test Policy

Do not accept:

```text
"just rerun it"
```

as normal behavior.

Flaky tests should be:

```text
fixed

or temporarily quarantined with documented reason
```

Critical security tests must never be silently skipped.

---

# 168. Time-Based Tests

For:

```text
dates

account age

notification times
```

use controlled test clocks where possible.

Avoid tests depending on real current wall-clock timing unnecessarily.

---

# 169. Realtime Test Stability

Do not rely on arbitrary:

```text
sleep(5000)
```

if avoidable.

Wait for:

```text
specific event

database row

UI state
```

with reasonable timeout.

---

# 170. Snapshot Testing

Use sparingly.

Do not rely heavily on giant UI snapshots.

Prefer explicit assertions about:

```text
text

state

actions

accessibility
```

---

# 171. Manual QA Checklist

Before release manually verify:

```text
Desktop Chrome

Mobile Chrome

Responsive layout

Forms

Images

Match flow

Claims

Chat

Handover

Ratings

Notifications
```

---

# 172. Browser Coverage

Minimum:

```text
Chrome / Chromium
```

Recommended:

```text
Chrome

Safari where available

Firefox
```

especially before broad public release.

---

# 173. Mobile Browser Coverage

At minimum test:

```text
Android Chrome

iOS Safari when available
```

for production release.

---

# 174. Accessibility Manual Review

Manual review should include:

```text
keyboard-only use

screen-reader spot checks

reduced motion

zoom at 200%

focus visibility
```

---

# 175. Security Release Gate

Production must be blocked if any test reveals:

```text
private detail leakage

cross-user chat access

cross-user claim access

cross-user storage modification

trust manipulation

fake recovery completion

service-role exposure
```

---

# 176. Severity Classification

## P0 — Critical

```text
authentication bypass

private data leak

RLS bypass

service-role exposure

recovery manipulation

cross-user chat access
```

Release blocked.

---

## P1 — High

```text
duplicate recovery

incorrect claim acceptance

broken handover

rating manipulation

major data corruption
```

Release blocked.

---

## P2 — Medium

```text
broken filter

bad empty state

notification mismatch

responsive layout issue
```

May block depending on scope.

---

## P3 — Low

```text
minor spacing

small animation issue

copy inconsistency
```

Can be scheduled after release if safe.

---

# 177. Regression Trigger

Run broader regression whenever changing:

```text
RLS

database schema

status enums

critical RPCs

matching formula

Auth

Storage policies

Realtime setup

trust calculation
```

---

# 178. Matching Formula Change Testing

If weights change:

Re-run fixed fixture set.

Compare:

```text
old score

new score

expected rank
```

Document significant behavior changes.

---

# 179. Contract Regression Testing

If API DTO/RPC output changes:

Verify:

```text
service types

frontend mapping

query hooks

screens

tests

documentation
```

stay aligned.

---

# 180. Database Integrity Audit

Before launch inspect:

```text
orphan item images

duplicate matches

duplicate ratings

recoveries without claims

conversations without recoveries

messages without valid members
```

Expected:

```text
none
```

---

# 181. Production Smoke Test

After deployment verify:

```text
Landing loads

Login works

Authenticated Home loads

Explore loads

Supabase reachable

Storage images load

No major console errors
```

Use test/staging accounts where possible.

---

# 182. Post-Deployment Critical Check

Verify one safe non-production-like path or staging-first validation for:

```text
Auth

Database reads

RPC

Realtime

Storage
```

before considering release complete.

---

# 183. Test Metrics

Track:

```text
critical tests passing

E2E pass rate

RLS coverage

backend function coverage

flaky test count

open P0/P1 bugs
```

Code coverage percentage alone should not be the primary quality metric.

---

# 184. Coverage Priorities

High coverage priority:

```text
matching logic

claim functions

recovery functions

RLS

trust calculation

notification deduplication
```

Lower priority:

```text
simple visual wrappers

static text components
```

---

# 185. Testing Definition of Done

Testing is MVP-ready when:

1. Unit tests cover important pure domain logic.
2. Match scoring boundaries are verified.
3. Dynamic weight normalization is tested.
4. Trust calculation is tested.
5. Critical forms validate correctly.
6. Database constraints are tested.
7. `create_claim()` is tested.
8. `accept_claim()` is tested.
9. `confirm_handover()` is tested.
10. `submit_rating()` is tested.
11. Duplicate calls do not corrupt state.
12. RLS tests cover Owner, Finder, unrelated, and anonymous users.
13. Private Found details are inaccessible to claimants directly.
14. Claims are private.
15. Conversations and messages are private.
16. Sender spoofing is blocked.
17. Trust manipulation is blocked.
18. Storage ownership is enforced.
19. Bidirectional matching works.
20. Match notifications are deduplicated.
21. Realtime chat works without refresh.
22. Realtime reconnection restores missed messages.
23. Competing claim acceptance is concurrency-safe.
24. Handover completion occurs exactly once.
25. Ratings require completed recovery.
26. Self/duplicate ratings are blocked.
27. Critical screens work on mobile and desktop.
28. Keyboard navigation works.
29. Reduced motion works.
30. Full recovery E2E passes.

---

# 186. Final E2E Acceptance Scenario

The most important automated test should reproduce:

```text
USER A — OWNER
       │
       ▼
Creates Lost AirPods
       │
       ▼

USER B — FINDER
       │
       ▼
Creates Found AirPods
       │
       ▼

MATCHING ENGINE
       │
       ▼
92% Possible Match
       │
       ▼

USER A
Submits Claim
       │
       ▼

USER B
Reviews Answers
Accepts Claim
       │
       ▼

RECOVERY CREATED
       │
       ▼

PRIVATE CHAT
       │
       ▼

MEETUP
       │
       ▼

FINDER
Confirms Handover
       │
       ▼

OWNER
Confirms Receipt
       │
       ▼

RECOVERY COMPLETED
       │
       ▼

BOTH RATE
       │
       ▼

TRUST UPDATED
```

---

# 187. Final Testing Principle

The testing strategy should protect three things above everything else:

```text
CAN THE RIGHT USER
PERFORM THE RIGHT ACTION
AT THE RIGHT TIME?
```

and:

```text
CAN THE WRONG USER
BE PREVENTED FROM DOING IT?
```

and:

```text
DOES THE DATA REMAIN CONSISTENT
WHEN THINGS FAIL OR HAPPEN CONCURRENTLY?
```

A feature is not ready merely because its primary button works.

It is ready when:

```text
HAPPY PATH WORKS
      +
FAILURE PATH IS SAFE
      +
UNAUTHORIZED PATH IS BLOCKED
      +
STATE REMAINS CONSISTENT
```

That standard should be applied to every part of the Lost & Found Platform.