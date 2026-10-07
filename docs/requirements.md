# Lost & Found Platform — Requirements

## 1. Purpose

This document defines the functional, non-functional, validation, security, state-management, and acceptance requirements for the Lost & Found Platform.

The platform allows users to:

- report lost items
- list found items
- discover possible matches
- submit ownership claims
- verify ownership
- communicate privately
- complete item handovers
- rate other users
- build a community trust profile

This document should be treated as the implementation contract for the product.

---

# 2. Technology Constraints

The application will use the following technology stack.

## Frontend

- React
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Anime.js

## Backend

- Supabase

Supabase will provide:

- PostgreSQL database
- Authentication
- Storage
- Realtime
- Row Level Security
- Database functions
- Edge Functions where required

---

# 3. User Types

The application does not require permanently assigned user roles.

Every authenticated user can operate as:

## Owner

A user who has lost an item.

## Finder

A user who has found an item.

The same account may act as an Owner in one recovery flow and as a Finder in another.

---

# 4. Authentication Requirements

## FR-AUTH-001 — User Registration

The system shall allow a user to create an account.

Required information may include:

- name
- email
- password

Optional authentication methods may later include:

- Google OAuth
- phone authentication

### Acceptance Criteria

- valid users can register successfully
- duplicate email registrations are rejected
- invalid email addresses are rejected
- password rules are enforced
- successful registration creates a corresponding user profile

---

## FR-AUTH-002 — User Login

The system shall allow registered users to log in.

### Acceptance Criteria

- valid credentials authenticate the user
- invalid credentials display an appropriate error
- authenticated session persists according to Supabase session behavior
- the user is redirected to the application after successful login

---

## FR-AUTH-003 — User Logout

The system shall allow authenticated users to log out.

### Acceptance Criteria

- active session is terminated
- protected routes become inaccessible
- user is returned to an unauthenticated state

---

## FR-AUTH-004 — Password Recovery

The system should support password reset through email.

### Acceptance Criteria

- users can request a reset email
- reset links cannot be reused indefinitely
- new password must satisfy security requirements

---

## FR-AUTH-005 — Protected Routes

Authenticated-only pages must not be accessible to unauthenticated users.

Protected areas include:

- creating reports
- creating found listings
- matches
- claims
- chat
- activity
- handovers
- ratings
- profile management

---

# 5. User Profile Requirements

## FR-PROFILE-001 — Profile Creation

A profile shall automatically be created when a new account is registered.

Profile information may include:

- user ID
- display name
- username
- avatar
- joined date
- trust score
- average rating
- completed returns count

---

## FR-PROFILE-002 — Profile Editing

Users shall be able to update permitted profile fields.

Editable fields may include:

- display name
- avatar
- username

Users must not be able to directly modify:

- trust score
- successful returns
- average rating
- account creation date

---

## FR-PROFILE-003 — Public Profile

Users shall have a public-facing profile containing safe information.

Public information may include:

- display name
- avatar
- average rating
- trust score
- successful returns
- public reviews
- badges
- member since

Sensitive personal information must not be publicly displayed.

---

# 6. Lost Report Requirements

## FR-LOST-001 — Create Lost Report

Authenticated users shall be able to report a lost item.

Required fields:

- title
- category
- description
- date lost
- approximate location

Optional fields:

- brand
- color
- approximate time
- image
- location coordinates
- distinguishing information

---

## FR-LOST-002 — Lost Item Categories

The application shall support standardized categories.

Initial categories may include:

- Electronics
- Wallets
- Cards / IDs
- Keys
- Bags
- Clothing
- Books
- Documents
- Accessories
- Other

Categories should be configurable in the future.

---

## FR-LOST-003 — Lost Item Image

Users may upload one or more images related to their lost item.

Examples:

- previous photo of the item
- product photo
- identifying image

Image limits are defined in the storage documentation.

---

## FR-LOST-004 — Location Information

The user shall provide the approximate location where the item was lost.

The system may store:

- location name
- latitude
- longitude

Exact location coordinates should not automatically be displayed publicly.

---

## FR-LOST-005 — Lost Item Status

New lost reports shall begin with the status:

```text
ACTIVE
```

Possible future states include:

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

## FR-LOST-006 — Edit Lost Report

Users shall be able to edit their own active Lost Reports.

Editing may include:

- description
- date/time
- category
- image
- location
- item characteristics

Users shall not be able to edit another user's report.

---

## FR-LOST-007 — Close Lost Report

Users shall be able to manually close a Lost Report.

Possible reasons:

- item recovered outside the platform
- report created by mistake
- user no longer wishes to search

---

# 7. Found Listing Requirements

## FR-FOUND-001 — Create Found Listing

Authenticated users shall be able to list an item they have found.

Required information:

- title or general item description
- category
- date found
- approximate location

Optional information:

- image
- color
- brand
- public description
- hidden identifying information

---

## FR-FOUND-002 — Public vs Private Information

Found listings must support two types of information.

### Public Information

Visible to users browsing the platform.

Examples:

- general item type
- approximate location
- general color
- date found

### Private Information

Visible only to the finder and authorized verification flows.

Examples:

- serial number
- hidden markings
- wallet contents
- exact identifiers
- unique damage
- confidential information

---

## FR-FOUND-003 — Hidden Ownership Information

The finder shall be able to store details specifically intended for ownership verification.

These details must not be exposed in:

- public listings
- search results
- public APIs
- match cards

---

## FR-FOUND-004 — Found Item Status

New Found Listings shall begin as:

```text
ACTIVE
```

Possible states include:

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

## FR-FOUND-005 — Edit Found Listing

The finder shall be able to edit their own active listing.

---

## FR-FOUND-006 — Close Found Listing

The finder shall be able to close the listing manually.

---

# 8. Explore and Search Requirements

## FR-EXPLORE-001 — Browse Listings

Users shall be able to browse active listings.

The interface should distinguish:

- Lost
- Found

---

## FR-EXPLORE-002 — Search

Users shall be able to search listings using keywords.

Search may consider:

- title
- category
- brand
- description
- location

---

## FR-EXPLORE-003 — Filters

Users should be able to filter by:

- Lost / Found
- category
- date
- location
- status

---

## FR-EXPLORE-004 — Sorting

Listings should support sorting by:

- newest
- oldest
- nearest
- relevance

Nearest sorting should only be used when sufficient location information exists.

---

## FR-EXPLORE-005 — Listing Details

Each listing shall have a detailed view.

The detail page may include:

- item image
- listing type
- title
- description
- category
- date
- approximate location
- user information
- claim action
- matching information where applicable

Private verification information must never appear.

---

# 9. Matching Requirements

## FR-MATCH-001 — Automatic Matching

Creating a new Lost Report or Found Listing shall trigger matching against opposite-type listings.

```text
Lost → search Found

Found → search Lost
```

---

## FR-MATCH-002 — Candidate Filtering

Before scoring, the system should reduce the candidate set using:

- opposite listing type
- active status
- category compatibility
- date proximity
- location proximity

---

## FR-MATCH-003 — Match Factors

The first matching implementation shall consider:

- category
- location
- date/time
- text similarity

Initial weighting:

```text
Category          25%
Location          25%
Date / Time       20%
Description       30%
```

The exact weights must remain configurable.

---

## FR-MATCH-004 — Match Score

Each candidate pair shall have a normalized similarity score.

Example:

```text
92%
```

The score indicates probability of similarity and must not represent verified ownership.

---

## FR-MATCH-005 — Match Thresholds

Initial thresholds may be:

```text
90–100 → Very Strong Match

75–89 → Strong Match

60–74 → Possible Match

Below 60 → Not proactively shown
```

Thresholds may be adjusted based on testing.

---

## FR-MATCH-006 — Ranked Results

Potential matches shall be ranked by match score.

Highest-confidence matches should appear first.

---

## FR-MATCH-007 — Bidirectional Matching

Matching must work regardless of whether the Lost Report or Found Listing was created first.

---

## FR-MATCH-008 — Match Persistence

Generated matches shall be stored so that:

- they can be reviewed later
- match history can be tracked
- users are not repeatedly notified about identical results
- match quality can be evaluated

---

## FR-MATCH-009 — Match Recalculation

Relevant edits to a listing should allow the system to recompute matches.

Examples:

- category changed
- date corrected
- location corrected
- description expanded

---

## FR-MATCH-010 — Match Language

The UI must use uncertainty-aware language.

Allowed:

- Possible Match
- Potential Match
- Strong Match

Not allowed before verification:

- Confirmed Owner
- Definitely Yours
- Ownership Verified

---

# 10. Claim Requirements

## FR-CLAIM-001 — Submit Claim

An authenticated user shall be able to claim a Found Listing.

---

## FR-CLAIM-002 — Claim Eligibility

A user must not be able to:

- claim their own Found Listing
- claim a closed item
- claim a returned item
- submit duplicate active claims for the same listing

---

## FR-CLAIM-003 — Claim Evidence

Claimants shall provide ownership evidence.

Evidence may include:

- answer to verification questions
- detailed description
- exact location lost
- unique identifying characteristics
- supporting message

---

## FR-CLAIM-004 — Claim Status

Claims shall support:

```text
PENDING
ACCEPTED
REJECTED
CANCELLED
COMPLETED
```

---

## FR-CLAIM-005 — Finder Review

The finder shall be able to review submitted claims against their listing.

---

## FR-CLAIM-006 — Claim Acceptance

The finder shall be able to accept a valid claim.

Acceptance shall begin the recovery process.

---

## FR-CLAIM-007 — Claim Rejection

The finder shall be able to reject an invalid claim.

The system may optionally allow the finder to specify a reason.

---

## FR-CLAIM-008 — Claim Privacy

Claim answers must only be visible to authorized users involved in the verification process.

---

# 11. Ownership Verification Requirements

## FR-VERIFY-001 — Verification Questions

Finders should be able to define ownership-verification questions.

Examples:

- What brand is the item?
- What is inside the wallet?
- What unique mark does it have?
- What color is the inside?
- What exact model is it?

---

## FR-VERIFY-002 — Verification Answers

Claimants shall provide answers while submitting claims.

---

## FR-VERIFY-003 — Finder Decision

The finder remains responsible for accepting or rejecting the claim.

The application shall not automatically declare ownership solely from matching scores.

---

## FR-VERIFY-004 — Sensitive Verification Data

Hidden verification data must remain inaccessible to claimants until appropriately revealed by the finder.

---

# 12. Chat Requirements

## FR-CHAT-001 — Conversation Creation

A private conversation should be created only after a claim has been accepted.

---

## FR-CHAT-002 — Conversation Participants

Only users associated with the accepted claim may participate.

Typically:

```text
Owner
Finder
```

---

## FR-CHAT-003 — Send Message

Participants shall be able to send text messages.

---

## FR-CHAT-004 — Receive Realtime Messages

Messages should appear without requiring manual page refresh.

Supabase Realtime will be used.

---

## FR-CHAT-005 — Message Persistence

Messages shall persist in the database.

---

## FR-CHAT-006 — Message Ordering

Messages shall display chronologically.

---

## FR-CHAT-007 — Message Read State

The system should support:

- unread state
- read state

---

## FR-CHAT-008 — Chat Authorization

Users who are not conversation participants must not be able to:

- read messages
- send messages
- subscribe to the conversation

---

## FR-CHAT-009 — Closed Conversations

After recovery completion, chat may remain readable but may optionally become read-only.

---

# 13. Handover Requirements

## FR-HANDOVER-001 — Start Handover

An accepted claim shall allow the recovery process to proceed to handover.

---

## FR-HANDOVER-002 — Finder Confirmation

The finder shall be able to confirm:

```text
I handed over the item.
```

---

## FR-HANDOVER-003 — Owner Confirmation

The owner shall be able to confirm:

```text
I received the item.
```

---

## FR-HANDOVER-004 — Dual Confirmation

A recovery shall only be marked successfully completed when both confirmations are present.

---

## FR-HANDOVER-005 — Return Completion

After both confirmations:

```text
item.status = RETURNED
claim.status = COMPLETED
handover.status = COMPLETED
```

Equivalent implementation details may differ, but the resulting state must be consistent.

---

## FR-HANDOVER-006 — Duplicate Confirmation Prevention

Each user shall only be able to confirm their side once.

---

# 14. Rating Requirements

## FR-RATING-001 — Rating Availability

Ratings shall only become available after a completed handover.

---

## FR-RATING-002 — Rating Scale

The first version shall use a:

```text
1–5 star
```

rating system.

---

## FR-RATING-003 — Written Review

Users may optionally provide a written review.

---

## FR-RATING-004 — Mutual Rating

Both owner and finder may rate each other.

---

## FR-RATING-005 — Duplicate Rating Prevention

A user shall not be able to rate the same recovery participant multiple times for one transaction.

---

## FR-RATING-006 — Self-Rating Prevention

Users must not be able to rate themselves.

---

# 15. Trust Requirements

## FR-TRUST-001 — System-Controlled Trust

Trust score shall be calculated by backend logic.

Clients must not directly modify trust values.

---

## FR-TRUST-002 — Trust Inputs

Initial trust calculation may consider:

- successful item returns
- completed handovers
- average rating
- account history
- verified positive activity

The exact algorithm will be defined separately.

---

## FR-TRUST-003 — Trust Display

The profile may display:

- trust score
- average rating
- successful returns
- badges

---

## FR-TRUST-004 — Trust Disclaimer

The interface must not imply that trust score guarantees a user's safety or honesty.

---

# 16. Notification Requirements

## FR-NOTIFY-001 — In-App Notifications

The initial application shall support in-app notifications.

---

## FR-NOTIFY-002 — Match Notification

Users may be notified when a sufficiently strong potential match is found.

---

## FR-NOTIFY-003 — Claim Notification

Finder shall be notified when a new claim is submitted.

---

## FR-NOTIFY-004 — Claim Result Notification

Claimant shall be notified when a claim is:

- accepted
- rejected

---

## FR-NOTIFY-005 — Message Notification

Users shall be notified of new unread messages.

---

## FR-NOTIFY-006 — Handover Notification

Users shall receive relevant handover reminders or confirmations.

---

## FR-NOTIFY-007 — Rating Notification

After successful recovery, users should receive a request to rate the interaction.

---

# 17. Activity Requirements

## FR-ACTIVITY-001 — User Activity Dashboard

Users shall have an Activity area.

It should provide access to:

- Lost Reports
- Found Listings
- Possible Matches
- Claims Sent
- Claims Received
- Active Recoveries
- Completed Returns

---

## FR-ACTIVITY-002 — Status Visibility

Each activity item shall display its current state.

Example:

```text
Active

Match Found

Claim Pending

Claim Accepted

Handover Pending

Returned
```

---

# 18. Reporting and Abuse Requirements

## FR-REPORT-001 — Report User

Users should be able to report another user for suspicious or abusive behavior.

---

## FR-REPORT-002 — Report Listing

Users should be able to report a listing.

Possible reasons:

- spam
- fake listing
- inappropriate content
- scam attempt
- stolen item concern
- personal information exposure

---

## FR-REPORT-003 — Abuse Data

Reports should store:

- reporter
- target
- reason
- optional comment
- timestamp
- status

---

# 19. Validation Requirements

## VR-001 — Required Fields

Forms must validate required fields before submission.

---

## VR-002 — Text Length

Fields shall have reasonable maximum lengths.

Example initial limits:

```text
Title                120 characters
Short description    500 characters
Claim explanation    1000 characters
Review               500 characters
Chat message         3000 characters
```

Exact limits may be adjusted.

---

## VR-003 — Date Validation

Users should not be able to enter clearly invalid dates.

The system must handle cases where exact loss time is unknown.

---

## VR-004 — Coordinates

Latitude must be within:

```text
-90 to 90
```

Longitude must be within:

```text
-180 to 180
```

---

## VR-005 — Rating Validation

Ratings must be integer values between:

```text
1 and 5
```

---

## VR-006 — File Validation

Uploads must validate:

- file type
- file size
- number of files

---

# 20. State Requirements

The application should use explicit states rather than inferring important lifecycle conditions from unrelated fields.

## Item State

Example:

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

## Claim State

```text
PENDING
ACCEPTED
REJECTED
CANCELLED
COMPLETED
```

---

## Match State

Possible initial states:

```text
ACTIVE
DISMISSED
CLAIMED
EXPIRED
```

---

## Handover State

```text
PENDING
PARTIALLY_CONFIRMED
COMPLETED
CANCELLED
```

---

# 21. Non-Functional Requirements

## NFR-001 — Responsive Design

The interface must work on:

- mobile
- tablet
- desktop

Mobile should be treated as a primary experience.

---

## NFR-002 — Performance

Typical application pages should load quickly under normal conditions.

The frontend should:

- lazy-load unnecessary assets
- optimize images
- avoid excessive JavaScript
- paginate large datasets
- minimize unnecessary database queries

---

## NFR-003 — Accessibility

The application should support:

- keyboard navigation
- semantic HTML
- accessible forms
- sufficient contrast
- meaningful labels
- visible focus states

---

## NFR-004 — Reduced Motion

Animations shall respect:

```text
prefers-reduced-motion
```

Users who request reduced motion should receive a functional experience without unnecessary animation.

---

## NFR-005 — Reliability

Critical actions should not silently fail.

Examples:

- listing creation
- claim submission
- claim acceptance
- handover confirmation
- rating submission

Errors must provide clear feedback.

---

## NFR-006 — Data Consistency

Multi-step operations that affect several records should be atomic where appropriate.

Example:

Completing a handover should not update only the item while leaving the claim incomplete.

Database functions or transactions should be used where necessary.

---

## NFR-007 — Scalability

The architecture should allow later scaling without major redesign.

Particular attention should be given to:

- match generation
- location queries
- realtime chat
- notifications
- listing search

---

# 22. Security Requirements

## SEC-001 — Row Level Security

All sensitive Supabase tables must use Row Level Security.

---

## SEC-002 — Client Trust

The backend must not trust client-provided ownership or authorization decisions.

---

## SEC-003 — Sensitive Fields

Sensitive verification information must not be included in public queries.

---

## SEC-004 — Service Role Key

Supabase service-role credentials must never be exposed in the React frontend.

---

## SEC-005 — Environment Variables

Secrets must be managed through secure environment variables.

---

## SEC-006 — Authorization

Authorization must be checked on all sensitive actions.

Examples:

- accepting claims
- reading chats
- confirming handovers
- accessing private verification data
- submitting ratings

---

## SEC-007 — Rate Limiting

Rate limits should be applied where abuse is likely.

Candidates include:

- login attempts
- claim submission
- listing creation
- message sending
- report submission

---

## SEC-008 — Input Sanitization

User-generated text must be safely rendered to prevent injection or script execution.

---

# 23. Privacy Requirements

## PRV-001 — Location Privacy

Public interfaces should display approximate rather than precise location when possible.

---

## PRV-002 — Contact Privacy

Email addresses and phone numbers must not be publicly exposed by default.

---

## PRV-003 — Verification Privacy

Information capable of proving ownership shall not be publicly displayed.

---

## PRV-004 — Chat Privacy

Only authorized conversation participants may access chat messages.

---

## PRV-005 — Profile Privacy

Only explicitly designated public profile information should be visible to other users.

---

# 24. UI Requirements

## UI-001 — Clear Entry Actions

The main interface should prominently offer:

```text
I Lost Something

I Found Something
```

---

## UI-002 — Lost vs Found Distinction

Lost Reports and Found Listings must be visually distinguishable.

---

## UI-003 — Match Confidence

Potential matches should clearly display match confidence.

Example:

```text
92% Possible Match
```

---

## UI-004 — Status Indicators

Important states shall use consistent badges or labels.

Examples:

```text
Active
Match Found
Claim Pending
Accepted
Returned
```

---

## UI-005 — Feedback

All major user actions shall provide feedback.

Examples:

- loading
- success
- failure
- disabled state

---

## UI-006 — Empty States

Every major list should have an informative empty state.

Example:

```text
No possible matches yet.

We'll show them here when a similar found item appears.
```

---

# 25. Motion Requirements

Anime.js will be used for intentional motion.

Animations may be used for:

- page entry
- listing cards
- match reveal
- claim success
- chat transitions
- handover completion
- trust-score updates

Animations must not:

- block interaction
- delay critical information
- occur excessively
- ignore reduced-motion preferences

---

# 26. Error Handling Requirements

## ERR-001 — User-Friendly Errors

Users should receive meaningful error messages.

Avoid exposing:

- SQL errors
- internal IDs
- stack traces
- database internals

---

## ERR-002 — Network Failure

Relevant screens should gracefully handle temporary connection failures.

---

## ERR-003 — Retry

Safe retry behavior should be available for appropriate failed operations.

Duplicate-sensitive actions must be protected from accidental repeated submission.

---

# 27. Data Requirements

The system must persist data for:

```text
Profiles
Items
Item images
Matches
Claims
Verification questions
Verification answers
Conversations
Messages
Handovers
Ratings
Notifications
Reports
```

Detailed schema will be defined in:

```text
08-database-schema.md
```

---

# 28. MVP Requirements

The first launch is considered functionally complete when the following end-to-end flow works:

```text
User A registers
       ↓
User A reports lost AirPods
       ↓
User B registers
       ↓
User B lists found AirPods
       ↓
System generates potential match
       ↓
User A sees match
       ↓
User A submits claim
       ↓
User B reviews claim
       ↓
User B accepts
       ↓
Private conversation created
       ↓
Users communicate
       ↓
User B confirms handover
       ↓
User A confirms receipt
       ↓
Item becomes Returned
       ↓
Both users can rate each other
       ↓
Trust information updates
```

If this journey functions securely and consistently, the primary MVP is complete.

---

# 29. MVP Exclusions

The following are explicitly outside the first development scope:

- borrowing system
- barter system
- payments
- rewards marketplace
- blockchain
- cryptocurrency
- native mobile applications
- AI image recognition
- facial recognition
- government ID verification
- complex organization administration
- NFC recovery
- QR ownership tags
- physical tracking hardware
- advanced gamification

These features must not delay the primary lost-and-found workflow.

---

# 30. Definition of Done

A feature is considered complete only when:

- UI is implemented
- backend integration works
- authorization rules are implemented
- loading state exists
- error state exists
- empty state exists where relevant
- responsive behavior works
- core validation exists
- security implications have been reviewed
- tests exist where appropriate
- no sensitive information is unintentionally exposed

---

# 31. Product-Level Acceptance Criteria

The overall product is ready for MVP release when:

1. Users can authenticate securely.
2. Users can create Lost Reports.
3. Users can create Found Listings.
4. Listings can be browsed and searched.
5. Lost and Found items can be automatically matched.
6. Match scores are ranked and displayed.
7. Users can submit ownership claims.
8. Finders can review and accept/reject claims.
9. Private information remains protected.
10. Accepted claims create private conversations.
11. Realtime messaging works.
12. Both participants can confirm handover.
13. Completed returns close the recovery lifecycle.
14. Users can rate each other.
15. Trust information updates through backend-controlled logic.
16. Relevant notifications are generated.
17. Row Level Security protects sensitive data.
18. Application works on mobile and desktop.
19. No service-role credentials are exposed.
20. The complete recovery journey passes end-to-end testing.

---

# 32. Requirement Priority

Requirements can be prioritized using:

```text
P0 — Required for MVP
P1 — Important but can follow initial core flow
P2 — Enhancement
```

## P0

- Authentication
- User profiles
- Lost Reports
- Found Listings
- Search
- Basic matching
- Match display
- Claims
- Ownership verification
- Claim acceptance/rejection
- Private chat
- Handover confirmation
- Ratings
- RLS
- Core privacy protection

## P1

- Trust scoring
- detailed notification center
- advanced filtering
- badges
- reporting/abuse system
- password recovery
- unread chat indicators

## P2

- semantic embedding matching
- advanced map experience
- push notifications
- richer organization features
- automated moderation
- image-based matching

---

# 33. Requirement Philosophy

Every feature should support the primary recovery lifecycle:

```text
REPORT
   ↓
MATCH
   ↓
CLAIM
   ↓
VERIFY
   ↓
COMMUNICATE
   ↓
RETURN
   ↓
CONFIRM
   ↓
TRUST
```

Features that do not improve this lifecycle should not take priority over core recovery reliability, privacy, or security.