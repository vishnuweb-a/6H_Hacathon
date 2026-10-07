# Lost & Found Platform — Development Plan

## 1. Purpose

This document defines the implementation plan for the Lost & Found Platform.

It converts the product and technical architecture into:

- development phases
- feature milestones
- implementation order
- dependencies
- branch strategy
- database migration order
- frontend build order
- backend build order
- testing checkpoints
- security gates
- deployment readiness
- AI/coding-agent instructions

The goal is to build the platform incrementally without creating disconnected features.

The core development sequence is:

```text
FOUNDATION
   ↓
AUTH
   ↓
LISTINGS
   ↓
EXPLORE
   ↓
MATCHING
   ↓
CLAIMS
   ↓
RECOVERY
   ↓
CHAT
   ↓
HANDOVER
   ↓
RATINGS
   ↓
TRUST
   ↓
NOTIFICATIONS
   ↓
SECURITY
   ↓
TESTING
   ↓
PRODUCTION
```

---

# 2. Development Principle

The application should be built around complete vertical flows rather than isolated screens.

Bad approach:

```text
Build all screens
      ↓
Build backend later
      ↓
Connect everything at end
```

Preferred:

```text
Build small complete flow
      ↓
Connect frontend + backend
      ↓
Test
      ↓
Continue
```

---

# 3. First Working Milestone

The first important milestone should prove:

```text
User A creates LOST item
          ↓
User B creates FOUND item
          ↓
Matching engine compares them
          ↓
92% Possible Match appears
```

This validates:

- authentication
- listings
- database
- Storage
- matching
- frontend/backend integration

before claim/chat complexity is introduced.

---

# 4. Second Working Milestone

After matching works:

```text
Possible Match
      ↓
Claim
      ↓
Verification
      ↓
Finder Accepts
      ↓
Recovery Created
      ↓
Private Chat
```

---

# 5. Third Working Milestone

Complete the product loop:

```text
Chat
 ↓
Meet
 ↓
Finder Confirms Handover
 ↓
Owner Confirms Receipt
 ↓
Recovery Completed
 ↓
Rating
 ↓
Trust Updated
```

At this point the core MVP exists.

---

# 6. Recommended Technology Baseline

Frontend:

```text
React

TypeScript

Tailwind CSS v4

shadcn/ui

Anime.js

TanStack Query

React Hook Form

Zod
```

Backend:

```text
Supabase Auth

Supabase PostgreSQL

Supabase Storage

Supabase Realtime

PostgreSQL Functions

PostgreSQL Triggers

Supabase Edge Functions when needed
```

Deployment:

```text
Vercel
+
Supabase
```

---

# 7. Recommended Repository Structure

```text
/
├── README.md
├── AGENTS.md
├── CLAUDE.md
├── .env.example
├── package.json
│
├── docs/
│   ├── 01-product-overview.md
│   ├── 02-requirements.md
│   ├── 03-user-flows.md
│   ├── 04-screens-and-navigation.md
│   ├── 05-frontend-architecture.md
│   ├── 06-ui-design-system.md
│   ├── 07-supabase-backend.md
│   ├── 08-database-schema.md
│   ├── 09-auth-and-rls.md
│   ├── 10-storage-and-media.md
│   ├── 11-matching-engine.md
│   ├── 12-realtime-chat.md
│   ├── 13-notifications.md
│   ├── 14-trust-and-rating.md
│   ├── 15-animation-guidelines.md
│   ├── 16-api-and-data-contracts.md
│   ├── 17-security-and-privacy.md
│   ├── 18-development-plan.md
│   ├── 19-testing-plan.md
│   └── 20-deployment.md
│
├── src/
│
└── supabase/
    ├── migrations/
    ├── functions/
    └── seed.sql
```

---

# 8. Development Phases

Recommended implementation phases:

```text
Phase 0
Project Foundation

Phase 1
Authentication + Profiles

Phase 2
Listings + Media

Phase 3
Explore + Search

Phase 4
Matching Engine

Phase 5
Claims + Verification

Phase 6
Recovery Creation

Phase 7
Realtime Chat

Phase 8
Handover

Phase 9
Ratings + Trust

Phase 10
Notifications

Phase 11
Security Hardening

Phase 12
Testing

Phase 13
Production Deployment
```

---

# 9. Phase 0 — Project Foundation

Goal:

Create a stable project foundation before feature development.

Tasks:

```text
Initialize React project

Configure TypeScript

Install Tailwind CSS v4

Configure shadcn/ui

Install Anime.js

Install TanStack Query

Install React Hook Form

Install Zod

Install Supabase JS client

Configure routing

Create base layouts

Create environment configuration

Initialize Supabase
```

---

# 10. Phase 0 — Frontend Setup

Recommended dependencies:

```text
react

react-dom

react-router-dom

@supabase/supabase-js

@tanstack/react-query

react-hook-form

zod

@hookform/resolvers

animejs

lucide-react
```

shadcn/ui dependencies are added through its setup.

---

# 11. Phase 0 — Global Structure

Create:

```text
src/
├── app/
├── components/
├── features/
├── hooks/
├── lib/
├── types/
├── styles/
└── assets/
```

Do not begin by placing everything inside:

```text
src/components/
```

Feature ownership should remain clear.

---

# 12. Phase 0 — Supabase Initialization

Initialize:

```text
supabase/
```

with:

```text
migrations/

functions/

seed.sql
```

Set up separate development project or local Supabase.

---

# 13. Phase 0 — Environment Variables

Create:

```text
.env.example
```

containing:

```text
VITE_SUPABASE_URL=

VITE_SUPABASE_ANON_KEY=
```

Never place:

```text
SUPABASE_SERVICE_ROLE_KEY
```

inside frontend environment.

---

# 14. Phase 0 — Design System

Implement:

```text
Color tokens

Typography

Spacing

Radius

Buttons

Inputs

Cards

Badges

Dialogs

Sheets

Tabs

Skeletons

Empty states

Error states
```

Avoid building feature-specific one-off design styles before the shared system exists.

---

# 15. Phase 0 Exit Criteria

Phase 0 is complete when:

```text
App runs locally

Supabase client works

Router works

Tailwind works

shadcn components work

TanStack Query provider exists

Environment validation exists

Base layout works

Responsive shell exists
```

---

# 16. Phase 1 — Authentication

Goal:

A user can securely create an account and enter the application.

Implement:

```text
Register

Login

Logout

Forgot Password

Auth Session Provider

Protected Routes
```

---

# 17. Phase 1 — Database

Create:

```text
profiles
```

table.

Add:

```text
handle_new_user()
```

trigger from:

```text
auth.users
```

---

# 18. Phase 1 — Profile

Implement:

```text
Own Profile

Edit Profile

Avatar Upload

Public Profile
```

Initial fields:

```text
display_name

username

avatar
```

Trust fields exist but are backend-controlled.

---

# 19. Phase 1 — RLS

Implement and test:

```text
profiles SELECT

profiles UPDATE own
```

Users must not update:

```text
trust_score

average_rating

successful_returns
```

---

# 20. Phase 1 Exit Criteria

```text
Register → Profile created

Login works

Session persists correctly

Logout clears private state

Protected routes redirect correctly

User edits own profile

User cannot edit another profile
```

---

# 21. Phase 2 — Listing Foundation

Goal:

Users can report Lost and Found items.

Create database:

```text
items

item_images

found_item_private_details

verification_questions
```

---

# 22. Phase 2 — Lost Report Flow

Implement multi-step form:

```text
Item Details

Description

Images

Date / Time

Location

Review

Publish
```

---

# 23. Phase 2 — Found Listing Flow

Implement:

```text
Public Item Details

Images

Found Date

Found Location

Private Verification Details

Verification Questions

Review

Publish
```

---

# 24. Phase 2 — Found Privacy

The Finder must understand:

```text
Public Information
```

versus:

```text
Private Verification Information
```

UI should clearly mark private fields.

---

# 25. Phase 2 — Storage

Implement:

```text
avatars

item-images
```

with ownership policies.

Client should:

```text
validate
resize
compress
upload
store storage path
```

---

# 26. Phase 2 — Listing Management

Users should be able to:

```text
View own report

Edit active report

Close report
```

Do not allow arbitrary lifecycle status mutation.

---

# 27. Phase 2 Exit Criteria

```text
Create Lost Report

Create Found Listing

Upload images

Private Found details remain hidden

Edit own listing

Close listing

Other users cannot edit listing
```

---

# 28. Phase 3 — Explore

Goal:

Users can manually discover Lost and Found listings.

Implement:

```text
Explore Screen

Search

Lost / Found filter

Category filter

Date filter

Location-text filter

Sorting

Pagination
```

---

# 29. Phase 3 — Listing Cards

Create reusable:

```text
ListingCard
```

variants:

```text
default

compact

horizontal
```

---

# 30. Phase 3 — Item Detail

Build:

```text
Lost Item Detail

Found Item Detail
```

Actions depend on:

```text
current user

listing type

ownership

listing status
```

---

# 31. Phase 3 — Public Safety

Verify Explore never returns:

```text
precise coordinates

Finder private details

claim answers

private verification clues
```

---

# 32. Phase 3 Exit Criteria

```text
Search works

Filters work

Pagination works

Listing Detail works

Safe public DTO used

Private data cannot be queried
```

---

# 33. Phase 4 — Matching Engine

Goal:

Automatically connect Lost Reports with Found Listings.

Create:

```text
matches
```

table.

Enable extensions as needed:

```text
pg_trgm
```

---

# 34. Phase 4 — Candidate Filtering

Implement:

```text
opposite listing type

active status

compatible category

date window

location window
```

---

# 35. Phase 4 — Score Components

Implement:

```text
category_score

location_score

time_score

description_score
```

---

# 36. Phase 4 — Initial Formula

Use:

```text
Category      25%

Location      25%

Date / Time   20%

Description   30%
```

---

# 37. Phase 4 — Missing Data

Implement dynamic weight normalization.

Do not treat:

```text
missing field = zero similarity
```

---

# 38. Phase 4 — Match Thresholds

```text
< 50
Do not persist

50–59
Persist internally

60–74
Possible Match

75–89
Strong Match

90–100
Very Strong Match
```

---

# 39. Phase 4 — Matching Function

Implement:

```text
generate_matches(item_id)
```

Requirements:

```text
idempotent

bidirectional

deduplicated

safe under rerun
```

---

# 40. Phase 4 — Match UI

Build:

```text
Possible Matches

Match Card

Match Detail

Dismiss Match
```

Display:

```text
score

strength

safe matched signals
```

---

# 41. Phase 4 — Matching Trigger

Run after:

```text
Lost Report creation

Found Listing creation

relevant listing update
```

Listing creation must not fail if matching fails.

---

# 42. Phase 4 Exit Criteria

Prove:

```text
Lost AirPods
+
Found AirPods
↓
Strong match generated
```

Verify:

```text
pair is not duplicated

score is stable

dismissal persists

private data not leaked
```

---

# 43. Milestone A

At this point the platform should support:

```text
REGISTER
   ↓
REPORT LOST
   ↓
REPORT FOUND
   ↓
EXPLORE
   ↓
AUTOMATIC MATCH
```

This is the first major demo milestone.

---

# 44. Phase 5 — Claim System

Goal:

Allow an Owner to submit ownership claim against a Found Listing.

Create:

```text
claims

claim_answers
```

---

# 45. Phase 5 — Claim Flow

Build:

```text
Claim This Item

Select Lost Report

Answer Verification Questions

Additional Message

Review

Submit Claim
```

---

# 46. Phase 5 — Claim RPC

Implement:

```text
create_claim()
```

Function must validate:

```text
authenticated user

Lost Report ownership

Found Listing validity

self-claim prevention

duplicate claim prevention

question ownership
```

---

# 47. Phase 5 — Finder Review

Implement:

```text
Claims Received

Claim Detail

Verification Answers

Claimant Trust Summary

Accept

Reject
```

---

# 48. Phase 5 — Claim Actions

Implement:

```text
accept_claim()

reject_claim()

cancel_claim()
```

---

# 49. Phase 5 — Claim State UI

Support:

```text
PENDING

ACCEPTED

REJECTED

CANCELLED

COMPLETED
```

---

# 50. Phase 5 Exit Criteria

```text
Owner can submit claim

Finder sees claim

Finder sees answers

Unrelated user cannot see claim

Finder can reject

Finder can accept only own listing's claims
```

---

# 51. Phase 6 — Recovery Creation

Goal:

Turn accepted claim into a structured recovery.

Create:

```text
recoveries

handovers

conversations

conversation_members
```

---

# 52. Phase 6 — accept_claim()

This is a critical transaction.

Function should atomically:

```text
validate claim

lock relevant state

claim → ACCEPTED

items → RECOVERY_IN_PROGRESS

create recovery

create handover

create conversation

add conversation members

create notifications
```

---

# 53. Phase 6 — Concurrency

Test two claims accepted at nearly the same time.

Expected:

```text
one succeeds

one fails safely
```

---

# 54. Phase 6 — Recovery Screen

Build:

```text
Recovery Detail

Partner Summary

Item Summary

Recovery Timeline

Open Chat

Safety Guidance
```

---

# 55. Phase 6 Exit Criteria

```text
Accepted claim creates recovery once

Conversation created once

Correct participants added

Item enters recovery state

Second active recovery prevented
```

---

# 56. Phase 7 — Realtime Chat

Goal:

Enable private communication between Owner and Finder.

Create:

```text
messages
```

---

# 57. Phase 7 — Chat Queries

Implement:

```text
getConversations()

getConversation()

getMessages()

sendMessage()

markConversationRead()
```

---

# 58. Phase 7 — Realtime

Subscribe only to:

```text
messages
```

for active:

```text
conversation_id
```

---

# 59. Phase 7 — Message UI

Build:

```text
Messages List

Conversation Screen

Message Bubble

Composer

Unread State

Safety Banner
```

---

# 60. Phase 7 — Message Pagination

Initial:

```text
40 messages
```

Load older messages when scrolling upward.

Use cursor-based pagination.

---

# 61. Phase 7 — Chat Security

Test:

```text
Owner → allowed

Finder → allowed

User C → denied
```

Sender spoofing must fail.

---

# 62. Phase 7 Exit Criteria

```text
A sends message

B sees without refresh

Messages persist

Unread state works

Reconnect refetches missed messages

User C cannot access chat
```

---

# 63. Milestone B

The product now supports:

```text
MATCH
 ↓
CLAIM
 ↓
VERIFY
 ↓
ACCEPT
 ↓
PRIVATE CHAT
```

This is the second major demo milestone.

---

# 64. Phase 8 — Handover

Goal:

Complete the physical return with dual confirmation.

Build:

```text
Finder Handover View

Owner Receipt View

Partial Confirmation State

Completed Recovery State
```

---

# 65. Phase 8 — Backend

Implement:

```text
confirm_handover(recovery_id)
```

Backend determines role.

---

# 66. Finder Action

```text
I Handed Over the Item
```

sets only:

```text
finder_confirmed = true
```

---

# 67. Owner Action

```text
I Received My Item
```

sets only:

```text
owner_confirmed = true
```

---

# 68. Phase 8 — Completion

When both true:

```text
recovery → COMPLETED

claim → COMPLETED

Lost Item → RETURNED

Found Item → RETURNED

conversation → read-only

completion timestamp set
```

---

# 69. Phase 8 — Idempotency

Retrying confirmation must not create duplicate:

```text
completion

notifications

return counters
```

---

# 70. Phase 8 Exit Criteria

```text
Finder confirms

Owner sees pending action

Owner confirms

Recovery completes

Item status updates

Chat becomes read-only

Double confirmation is safe
```

---

# 71. Phase 9 — Rating and Trust

Goal:

Close the trust loop.

Implement:

```text
ratings
```

and:

```text
submit_rating()
```

---

# 72. Phase 9 — Rating UI

Build:

```text
Rating Screen

Stars

Optional Review

Success State

Public Review List
```

---

# 73. Phase 9 — Trust

Implement:

```text
recalculate_user_trust()
```

Inputs:

```text
ratings

rating count

completed recoveries

account age
```

---

# 74. Phase 9 — New User State

New users should display:

```text
New Member
```

or:

```text
Limited History
```

not:

```text
0 Trust
```

---

# 75. Phase 9 — Profile

Add:

```text
Trust Score

Average Rating

Rating Count

Successful Returns

Reviews
```

---

# 76. Phase 9 Exit Criteria

```text
Rating allowed only after completion

Self-rating blocked

Duplicate rating blocked

Profile aggregates update

Trust recalculation is idempotent
```

---

# 77. Phase 10 — Notifications

Goal:

Keep users aware of lifecycle events.

Create persistent notification system.

---

# 78. Phase 10 — Event Types

Implement:

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

# 79. Phase 10 — Notification UI

Build:

```text
Notification Center

Unread Badge

Notification Item

Mark Read

Mark All Read
```

---

# 80. Phase 10 — Deep Links

Map:

```text
MATCH
→ Match Detail

CLAIM
→ Claim Detail

MESSAGE
→ Conversation

HANDOVER
→ Recovery

RATING
→ Rating Screen
```

---

# 81. Phase 10 — Notification Deduplication

Prevent duplicate:

```text
Match notifications

Rating requests

Recovery completion alerts
```

---

# 82. Phase 10 — Realtime

Realtime notification updates are optional.

Recommended:

Start with:

```text
persistent notifications
+
query invalidation
```

Then add realtime badge updates.

---

# 83. Phase 10 Exit Criteria

```text
All important lifecycle events notify correct user

Unread count works

Deep links work

Duplicate notifications controlled

User cannot read another user's notifications
```

---

# 84. Milestone C

The complete core product flow now works:

```text
REPORT
 ↓
MATCH
 ↓
CLAIM
 ↓
VERIFY
 ↓
CHAT
 ↓
HANDOVER
 ↓
RETURN
 ↓
RATE
 ↓
TRUST
```

This is the MVP functional milestone.

---

# 85. Phase 11 — Security Hardening

Goal:

Verify the architecture works under malicious/manual requests.

Do not treat this phase as the first time security is implemented.

RLS should already exist.

This phase audits it.

---

# 86. Phase 11 — RLS Audit

Test every sensitive table with:

```text
User A

User B

User C

Anonymous
```

---

# 87. Phase 11 — Critical Security Tests

Verify:

```text
Cannot edit another user's listing

Cannot read Finder private details

Cannot read unrelated claims

Cannot read unrelated chat

Cannot spoof sender

Cannot mark another user handover

Cannot modify trust score

Cannot self-rate

Cannot duplicate ratings
```

---

# 88. Phase 11 — Storage Audit

Verify:

```text
cross-user uploads denied

cross-user deletes denied

private media inaccessible

invalid file types rejected

oversized uploads rejected
```

---

# 89. Phase 11 — Secrets Audit

Search repository for:

```text
service role keys

API keys

real passwords

Supabase secrets
```

Production secret values must not exist in Git.

---

# 90. Phase 11 — Security Headers

Configure deployment headers:

```text
CSP

X-Content-Type-Options

Referrer-Policy

Permissions-Policy
```

based on deployed resources.

---

# 91. Phase 11 — Rate Limits

Prioritize:

```text
claims

reports

messages

Notify Possible Owner
```

if public testing shows spam risk.

---

# 92. Phase 11 Exit Criteria

No known P0 authorization or privacy failure remains.

---

# 93. Phase 12 — Testing

Goal:

Verify full product behavior before production.

Testing strategy is defined fully in:

```text
19-testing-plan.md
```

---

# 94. Phase 12 — Minimum Test Levels

Required:

```text
Unit Tests

Component Tests

Backend Function Tests

RLS Tests

Integration Tests

End-to-End Tests
```

---

# 95. Critical E2E Test

Primary scenario:

```text
User A registers

User B registers

A creates Lost AirPods

B creates Found AirPods

System generates match

A submits claim

B accepts

Conversation created

A and B chat

B confirms handover

A confirms receipt

Recovery completes

Both rate

Trust updates
```

This flow must pass before launch.

---

# 96. Phase 12 — Negative E2E

Also test:

```text
User C tries reading A/B conversation

A tries claiming own Found Listing

A submits duplicate claim

B accepts two competing claims

A rates before completion

A rates twice
```

All must fail safely.

---

# 97. Phase 12 Exit Criteria

```text
Critical flow passes

Critical authorization tests pass

No blocking UI bug

No known data-integrity bug

No private-data exposure

Mobile and desktop work
```

---

# 98. Phase 13 — Production Deployment

Deployment details belong in:

```text
20-deployment.md
```

High-level order:

```text
Provision production Supabase

Apply migrations

Apply RLS

Create buckets

Set production secrets

Deploy frontend

Configure production URLs

Run smoke tests

Enable monitoring
```

---

# 99. Branch Strategy

Recommended simple strategy:

```text
main

develop

feature/*
fix/*
```

If the team is small, `develop` may be omitted.

---

# 100. Recommended Small-Team Strategy

Use:

```text
main
```

as production-ready branch.

Feature work:

```text
feature/auth

feature/listings

feature/matching

feature/claims

feature/chat

feature/recovery
```

Open PRs into:

```text
main
```

after tests pass.

---

# 101. Branch Naming

Examples:

```text
feature/auth-profile

feature/lost-report

feature/found-listing

feature/matching-engine

feature/claim-flow

feature/realtime-chat

feature/handover

feature/trust-rating

fix/chat-rls
```

---

# 102. Commit Strategy

Prefer focused commits.

Examples:

```text
feat: add lost report creation flow

feat: add matching score RPC

fix: prevent duplicate active claims

security: restrict message insert policy

test: add claim acceptance race tests
```

---

# 103. Database Migration Strategy

Never modify production schema manually without migration.

Each schema change should create:

```text
supabase/migrations/<timestamp>_<description>.sql
```

---

# 104. Migration Order

Recommended:

```text
01 extensions

02 enums

03 profiles

04 items

05 item_images

06 found_private_details

07 verification_questions

08 matches

09 claims

10 claim_answers

11 recoveries

12 conversations

13 conversation_members

14 messages

15 handovers

16 ratings

17 notifications

18 user_reports

19 functions

20 triggers

21 indexes

22 views

23 RLS
```

Actual timestamps may replace numeric prefixes.

---

# 105. Migration Testing

Before merging backend migration:

```text
reset local database
      ↓
apply all migrations from zero
      ↓
seed
      ↓
run backend tests
```

This ensures migrations do not depend on hidden manual state.

---

# 106. Type Generation

After migration changes:

```text
Generate Supabase TypeScript types
```

Commit updated:

```text
database.types.ts
```

if repository policy includes generated types.

---

# 107. Seed Data

Create development seed scenarios.

Recommended users:

```text
Owner A

Finder B

Unrelated C
```

Seed:

```text
Lost Wallet

Found Wallet

Strong Match

Weak Match

Pending Claim

Active Recovery

Completed Recovery
```

---

# 108. Seed Security

Do not use real personal data.

Use synthetic:

```text
names

locations

images

emails
```

---

# 109. Feature Completion Checklist

A feature is not complete when only the UI works.

For every feature verify:

```text
Database

RLS

Types

Service

Query/Mutation Hook

UI

Loading State

Empty State

Error State

Responsive State

Tests

Documentation
```

---

# 110. Feature Definition of Done

Every feature should answer:

```text
Does it work?

Is it authorized correctly?

Does it handle failure?

Does it work on mobile?

Is its data contract typed?

Does it have tests?

Can another agent understand the implementation?
```

---

# 111. Frontend Implementation Order

Recommended:

```text
1. App shell

2. Auth

3. Profile

4. Shared listing components

5. Lost form

6. Found form

7. Listing detail

8. Explore

9. Matches

10. Claims

11. Activity

12. Recovery

13. Messages

14. Handover

15. Ratings

16. Notifications

17. Settings

18. Error/empty states
```

---

# 112. Backend Implementation Order

Recommended:

```text
1. Auth/Profile

2. Items

3. Storage

4. Matches

5. Claims

6. Recoveries

7. Conversations

8. Messages

9. Handovers

10. Ratings

11. Notifications

12. Reporting

13. Hardening
```

---

# 113. Shared Component Order

Build early:

```text
PageHeader

SectionHeader

StatusBadge

ListingCard

EmptyState

ErrorState

LoadingCard

UserSummary
```

Later:

```text
MatchScore

MatchCard

RecoveryTimeline

TrustBadge

RatingStars

SafetyNotice
```

---

# 114. Forms Strategy

Use:

```text
React Hook Form
+
Zod
```

Do not duplicate validation rules directly across page components.

---

# 115. Multi-Step Form Strategy

Lost/Found reports should use shared form state.

Recommended:

```text
useForm()
```

at parent step container.

Each step handles only its own fields.

Final submit validates the complete schema.

---

# 116. Draft Persistence

MVP does not require server-side draft listings.

If form persistence is desired:

Use temporary client-side draft state carefully.

Do not store highly sensitive Finder private details indefinitely in localStorage.

---

# 117. State Management Rules

Use:

```text
TanStack Query
→ server state

React state
→ local UI state

URL
→ filters/search state

React Hook Form
→ form state

Auth provider
→ session/user
```

Avoid global state libraries unless a real need appears.

---

# 118. Query Keys

Create centralized query-key factories.

Example domains:

```text
profile

items

matches

claims

recoveries

conversations

messages

notifications

ratings
```

---

# 119. Cache Invalidation

Every mutation must define:

```text
Which queries change?
```

before implementation.

Do not default to:

```text
invalidate everything
```

after every mutation.

---

# 120. Critical Mutation Rule

Sensitive mutations should:

```text
wait for backend success
      ↓
show success
      ↓
invalidate/refetch authoritative state
```

Do not optimistically complete:

```text
claim acceptance

handover

trust updates
```

---

# 121. Error Handling

Every service should map Supabase errors into:

```text
AppError
```

UI should never display raw:

```text
Postgres messages

RLS errors

stack traces
```

---

# 122. Loading States

Every async screen should define:

```text
Loading

Success

Empty

Error
```

before feature is considered complete.

---

# 123. Responsive Development

Do not build desktop-first and "fix mobile later."

For each screen test:

```text
375px

768px

1280px+
```

during development.

---

# 124. Accessibility During Development

Every feature should include:

```text
labels

keyboard navigation

focus states

semantic HTML

screen-reader names

reduced motion
```

from the beginning.

Do not postpone accessibility to the end.

---

# 125. Motion Development

Implement motion only after the interaction works without animation.

Sequence:

```text
Functionality
      ↓
Accessibility
      ↓
Motion
```

---

# 126. Anime.js Rule

Do not allow animation logic to control business state.

Correct:

```text
Backend success
↓
React state
↓
Animation
```

Not:

```text
Animation finish
↓
Set recovery complete
```

---

# 127. Coding Agent Rules

Coding agents must read relevant docs before implementing a feature.

Example:

For matching:

```text
01-product-overview.md

02-requirements.md

08-database-schema.md

09-auth-and-rls.md

11-matching-engine.md

16-api-and-data-contracts.md

17-security-and-privacy.md
```

---

# 128. AGENTS.md Principle

Root `AGENTS.md` should instruct agents:

```text
Do not invent tables.

Do not invent statuses.

Do not change lifecycle without updating docs.

Do not bypass RLS.

Do not use service role in frontend.

Do not expose private Finder details.

Do not introduce new packages unnecessarily.

Use existing components.

Run tests before completion.
```

---

# 129. CLAUDE.md Principle

`CLAUDE.md` may contain implementation workflow such as:

```text
Read docs first

Inspect existing code

Plan changes

Implement smallest coherent unit

Run lint/typecheck/tests

Review security

Report files changed
```

---

# 130. Documentation Conflict Rule

If code and docs conflict:

Do not silently invent a third design.

Instead:

```text
identify conflict

determine authoritative requirement

update documentation

then update code
```

---

# 131. No Architecture Drift

Before creating:

```text
new table

new enum

new status

new service

new global state

new dependency

new Edge Function
```

check whether the existing architecture already solves the need.

---

# 132. Package Addition Rule

Before adding dependency ask:

```text
Can React solve it?

Can the browser solve it?

Can Supabase solve it?

Can existing dependency solve it?
```

If yes, do not add a new package.

---

# 133. Edge Function Rule

Do not create Edge Functions for normal CRUD.

Use Edge Functions for:

```text
AI providers

external email/push

external APIs

privileged integration logic
```

---

# 134. Service Role Rule

If code requires service-role access merely to bypass failing RLS:

Stop.

Fix the authorization architecture.

Do not use service role as workaround.

---

# 135. SQL Function Rule

Critical functions must:

```text
validate auth.uid()

validate ownership

validate state

be transactional

be idempotent where needed

return stable outputs
```

---

# 136. Security-Definer Review

Every:

```text
SECURITY DEFINER
```

function should receive manual review before production.

---

# 137. Build Verification

After each feature:

```text
npm run build
```

must succeed.

Recommended additional scripts:

```text
npm run lint

npm run typecheck

npm run test
```

---

# 138. Suggested Package Scripts

Conceptually:

```text
dev

build

lint

typecheck

test

test:watch

test:e2e
```

Backend:

```text
supabase:start

supabase:reset

supabase:types
```

may be added as convenience scripts.

---

# 139. Pull Request Requirements

Every meaningful PR should include:

```text
Summary

What changed

Database changes

Security impact

Screens affected

Testing performed

Screenshots when UI changed
```

---

# 140. Database PR Requirements

If migration is included:

State:

```text
migration file

new tables/functions

RLS impact

rollback considerations

type generation status
```

---

# 141. Security-Sensitive PRs

PRs affecting:

```text
RLS

Auth

Claims

Recovery

Chat

Trust

Storage
```

should receive explicit security review.

---

# 142. Implementation Milestones

## Milestone 1 — Foundation

```text
App shell

Supabase

Design system

Auth
```

---

## Milestone 2 — Reporting

```text
Lost Report

Found Listing

Images

Profile
```

---

## Milestone 3 — Discovery

```text
Explore

Search

Listing Detail
```

---

## Milestone 4 — Matching

```text
Candidate generation

Scoring

Match UI
```

---

## Milestone 5 — Claim

```text
Claim

Verification

Accept / Reject
```

---

## Milestone 6 — Recovery

```text
Recovery state

Conversation creation

Activity
```

---

## Milestone 7 — Communication

```text
Realtime Chat

Unread Messages
```

---

## Milestone 8 — Return

```text
Dual Handover

Recovery Completion
```

---

## Milestone 9 — Reputation

```text
Ratings

Trust

Profile reputation
```

---

## Milestone 10 — Product Readiness

```text
Notifications

Security audit

Testing

Deployment
```

---

# 143. Recommended MVP Priority

## P0 — Required

```text
Auth

Profiles

Lost Report

Found Listing

Images

Explore

Matching

Claims

Verification

Recovery

Realtime Chat

Handover

Ratings

Trust

Notifications

RLS

Security
```

---

# 144. P1 — Soon After MVP

```text
Google OAuth

Advanced search

Trusted Finder badge

Better notification grouping

Moderation workflow

Browser push notifications

Rate limiting improvements
```

---

# 145. P2 — Future

```text
Semantic embeddings

Image similarity

AI moderation

Institution dashboards

Native mobile app

QR / NFC

Advanced identity verification

Organization tenancy
```

---

# 146. Explicitly Out of Current Scope

Do not implement during MVP:

```text
Borrowing

Barter

Payments

Blockchain

Reward marketplace

Generic direct messaging

Complex gamification

Public leaderboards

Advanced computer vision
```

---

# 147. Development Risk — Overbuilding Matching

Risk:

Trying to build AI semantic/image matching before deterministic matching works.

Mitigation:

```text
ship structured matching first
```

Then evaluate real match data.

---

# 148. Development Risk — RLS Late

Risk:

Building all features with permissive database access and adding RLS near launch.

Mitigation:

```text
write RLS alongside each table
```

---

# 149. Development Risk — Too Many Statuses

Risk:

Listing, match, claim, and recovery states conflict.

Mitigation:

Use status only on the entity that owns that lifecycle.

Derive UI state from related entities where possible.

---

# 150. Development Risk — Giant Components

Risk:

Pages become:

```text
1000+ line components
```

Mitigation:

Split by:

```text
feature

screen section

hook

service

domain component
```

---

# 151. Development Risk — Generic Service Layer

Avoid:

```text
database.service.ts
```

containing every Supabase query.

Prefer feature-specific:

```text
listings.service.ts

claims.service.ts

chat.service.ts
```

---

# 152. Development Risk — Private Data Leakage

Risk:

Using one giant listing query for both:

```text
Finder
and
public Explore
```

Mitigation:

Use separate DTOs and queries.

---

# 153. Development Risk — Matching Blocking Creation

Matching is secondary.

If match generation fails:

```text
listing remains successfully created
```

A retry mechanism may run later.

---

# 154. Development Risk — Realtime Complexity

Build persisted chat first.

Then add Realtime.

Sequence:

```text
Send / Fetch Messages
      ↓
RLS
      ↓
Pagination
      ↓
Realtime
```

---

# 155. Development Risk — Trust Gaming

Do not expose powerful rewards tied to Trust Score during MVP.

Keep trust informational.

---

# 156. Development Risk — Premature Microservices

Do not split the product into:

```text
matching service

chat service

notification service

trust service
```

as independent infrastructure during MVP.

Supabase/PostgreSQL is sufficient.

---

# 157. Performance Optimization Timing

First ensure:

```text
correctness
security
```

Then optimize.

Initial optimizations:

```text
indexes

pagination

query select minimization

image compression

candidate filtering
```

---

# 158. Database Query Review

Before production, review:

```text
Explore

Match generation

Messages

Notifications

Claims

Activity
```

for missing indexes or unbounded reads.

---

# 159. Observability

At minimum monitor:

```text
Frontend errors

Supabase function failures

Edge Function errors

Storage failures

Matching failures

Auth failures
```

More advanced observability can be added after launch.

---

# 160. Development Environment

Recommended:

```text
React local server

Supabase local or development project

Synthetic users

Synthetic listings
```

Never use production credentials locally.

---

# 161. Staging Environment

Recommended before public launch.

Use for:

```text
migration testing

RLS testing

E2E

production-like deployment
```

---

# 162. Production Gate

Do not deploy production if any P0 issue exists in:

```text
Auth

RLS

Claims

Chat privacy

Recovery completion

Storage ownership

Secret exposure
```

---

# 163. Demo Scenario

Prepare one deterministic demo:

```text
Owner:
Lost Black AirPods

Finder:
Found Black AirPods

Same category
Nearby location
Same day
Similar description
```

Expected:

```text
~90%+ match
```

Then demonstrate complete recovery.

---

# 164. Demo Test Users

Recommended:

```text
owner@example.test

finder@example.test
```

only in development/staging.

Do not seed obvious test accounts into production.

---

# 165. MVP Completion Criteria

The MVP is complete only when this full loop works:

```text
REGISTER
   ↓
CREATE LOST REPORT
   ↓
CREATE FOUND LISTING
   ↓
MATCH GENERATED
   ↓
CLAIM SUBMITTED
   ↓
CLAIM REVIEWED
   ↓
CLAIM ACCEPTED
   ↓
CHAT
   ↓
HANDOVER
   ↓
DUAL CONFIRMATION
   ↓
RECOVERY COMPLETED
   ↓
RATING
   ↓
TRUST UPDATED
```

---

# 166. MVP Quality Criteria

Additionally:

```text
Responsive

Accessible

RLS secured

Private data protected

Errors handled

Loading states present

Empty states present

No service-role frontend exposure

Core tests passing
```

---

# 167. Final Recommended Build Sequence

```text
01. Project Setup
       ↓
02. Design System
       ↓
03. Supabase Setup
       ↓
04. Auth + Profiles
       ↓
05. Lost Reports
       ↓
06. Found Listings
       ↓
07. Storage
       ↓
08. Explore
       ↓
09. Matching
       ↓
10. Match UI
       ↓
11. Claims
       ↓
12. Verification
       ↓
13. Recovery Creation
       ↓
14. Realtime Chat
       ↓
15. Handover
       ↓
16. Recovery Completion
       ↓
17. Ratings
       ↓
18. Trust
       ↓
19. Notifications
       ↓
20. Security Audit
       ↓
21. E2E Tests
       ↓
22. Staging
       ↓
23. Production
```

---

# 168. Final Development Philosophy

The product should be developed around one question:

> Can a real user successfully recover a lost item through the platform?

Every technical decision should support this flow:

```text
REPORT
   ↓
DISCOVER
   ↓
MATCH
   ↓
VERIFY
   ↓
CONNECT
   ↓
RETURN
   ↓
TRUST
```

Do not optimize for the number of features.

Optimize for a reliable recovery experience.

The correct priority is:

```text
Correctness
   ↓
Security
   ↓
Usability
   ↓
Performance
   ↓
Polish
   ↓
Advanced Intelligence
```

A secure deterministic matching system with a complete recovery flow is more valuable than an advanced AI system attached to an incomplete product.