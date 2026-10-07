# Lost & Found Platform — Product Overview

## 1. Product Summary

The Lost & Found Platform is a community-driven application designed to help people recover lost belongings through structured reporting, intelligent matching, secure ownership verification, private communication, confirmed handovers, and a reputation-based trust system.

The platform supports two primary entry points:

- A user can report an item they have lost.
- A user can list an item they have found.

The platform then attempts to connect relevant lost and found listings through a matching engine using item characteristics, location, date/time, and description similarity.

The system does not automatically decide ownership. It identifies possible matches and assists both parties through a controlled verification and recovery process.

---

# 2. Problem Statement

Traditional lost-and-found systems are often fragmented and inefficient.

People commonly rely on:

- WhatsApp groups
- College notice boards
- Social media posts
- Security offices
- Word of mouth
- Local community groups

These approaches have several problems:

- Lost and found reports are scattered across different platforms.
- There is no intelligent mechanism for connecting lost items with found items.
- Users must manually search through posts.
- Item ownership is difficult to verify.
- Contact information may need to be publicly exposed.
- There is little protection against fraudulent claims.
- There is no structured handover process.
- People who repeatedly help return belongings receive no reputation or recognition.

The platform solves these problems by creating a single structured recovery system.

---

# 3. Product Vision

Create a trusted digital network where lost belongings can efficiently find their way back to their rightful owners.

The platform should transform the traditional:

Lost → Search → Hope

process into:

Report → Match → Verify → Connect → Return

The goal is not simply to create a listing platform.

The goal is to create an end-to-end **item recovery system**.

---

# 4. Core Product Principle

The central principle of the platform is:

> Technology helps identify possible matches, but humans verify ownership.

The system should assist users rather than automatically deciding whether an item belongs to someone.

Every recovery should maintain:

- privacy
- security
- human verification
- controlled communication
- mutual confirmation

---

# 5. Product Tagline

Primary tagline:

**Lost it. Find it. Get it back.**

Alternative positioning:

**Helping lost belongings find their way home.**

---

# 6. Target Users

## 6.1 Students

Students frequently lose:

- ID cards
- wallets
- earphones
- chargers
- books
- keys
- bags
- water bottles
- electronic accessories

Campuses are therefore ideal environments for the initial version of the platform.

---

## 6.2 Universities and Colleges

Institutions can use the platform as a centralized digital lost-and-found system.

Potential users include:

- students
- faculty
- security staff
- administration staff
- hostel residents

---

## 6.3 Offices and Workspaces

Employees can report or return:

- access cards
- electronic devices
- chargers
- bags
- documents
- personal belongings

---

## 6.4 Residential Communities

Residents can use the platform to recover belongings lost inside:

- apartment complexes
- gated communities
- parks
- common spaces

---

## 6.5 Public Communities

Future versions may support:

- malls
- airports
- metro stations
- public events
- railway stations
- festivals
- conferences

---

# 7. Primary User Roles

The application does not require permanently separate roles.

A single user may act as different roles depending on the situation.

## Owner

A person who has lost an item.

Responsibilities:

- create a lost report
- review possible matches
- submit ownership claims
- answer verification questions
- communicate with the finder
- confirm receipt
- provide ratings

---

## Finder

A person who has found an item.

Responsibilities:

- create a found listing
- protect identifying information
- review ownership claims
- verify possible owners
- communicate with accepted claimant
- complete handover
- confirm return

---

## Platform

The system acts as an intermediary.

Responsibilities:

- store listings
- discover possible matches
- calculate match scores
- manage claims
- protect private information
- enable secure communication
- manage handover states
- calculate trust indicators
- generate notifications

---

# 8. Core Product Flow

The complete product lifecycle is:

```text
REPORT
   ↓
DISCOVER
   ↓
MATCH
   ↓
CLAIM
   ↓
VERIFY
   ↓
CONNECT
   ↓
MEET
   ↓
RETURN
   ↓
RATE
   ↓
BUILD TRUST
```

---

# 9. Lost Item Flow

When a user loses an item:

```text
User loses item
      ↓
Create Lost Report
      ↓
Enter item information
      ↓
Upload optional image
      ↓
Enter approximate location
      ↓
Submit report
      ↓
Matching engine searches Found Listings
      ↓
Possible matches generated
      ↓
User reviews matches
      ↓
User submits claim
      ↓
Finder verifies claim
      ↓
Claim accepted
      ↓
Private chat opens
      ↓
Users arrange handover
      ↓
Item returned
      ↓
Both users confirm
      ↓
Rating and trust update
```

---

# 10. Found Item Flow

A finder does not need to wait for someone to report an item as lost.

They can directly create a found listing.

```text
User finds item
      ↓
Create Found Listing
      ↓
Enter public information
      ↓
Store private identifying information
      ↓
Submit listing
      ↓
Matching engine searches Lost Reports
      ↓
Possible owners discovered
      ↓
Finder can review possible matches
      ↓
Possible owner receives notification
      ↓
Owner submits claim
      ↓
Finder verifies claim
      ↓
Claim accepted
      ↓
Private chat
      ↓
Handover
      ↓
Return confirmed
```

This makes matching bidirectional.

---

# 11. Two-Way Matching

The platform should work regardless of which listing was created first.

### Scenario A

```text
Lost Report exists
       ↓
Found Listing created later
       ↓
System detects match
```

### Scenario B

```text
Found Listing exists
       ↓
Lost Report created later
       ↓
System detects match
```

Both users may be notified when a sufficiently strong match is found.

---

# 12. Lost Report

A Lost Report represents an item a user is trying to recover.

Typical fields include:

- item name
- category
- brand
- color
- description
- image
- date lost
- approximate time lost
- approximate location
- distinguishing characteristics

Example:

```text
Item:
AirPods Pro

Category:
Electronics

Color:
White

Case:
Black silicone cover

Location:
Main Library

Date:
7 October

Time:
Around 11:00 AM
```

---

# 13. Found Listing

A Found Listing represents an item discovered by another user.

Typical public information:

- category
- general appearance
- image if appropriate
- approximate location
- date/time found
- general description

The finder should also be able to store private details.

Example:

```text
PUBLIC

Black wallet
Found near Main Library
7 October
```

Private information:

```text
PRIVATE

Brand:
Nike

Initials:
VB

Contents:
College ID card

Unique mark:
Scratch near bottom corner
```

Private information must not be publicly visible.

It exists to assist ownership verification.

---

# 14. Matching System

The platform compares Lost Reports with Found Listings.

Initial matching factors include:

- category similarity
- location proximity
- date/time proximity
- description similarity

Example initial weighting:

```text
Category Similarity       25%
Location Similarity       25%
Date/Time Similarity      20%
Description Similarity    30%
```

Example result:

```text
Black AirPods
Found near Main Library

92% Possible Match
```

The match score represents similarity, not proof of ownership.

The platform must always use wording such as:

- Possible Match
- Strong Match
- Potential Match

It must not say:

- Confirmed Owner
- Definitely Your Item

until ownership has actually been verified.

---

# 15. Match Categories

Possible matching ranges:

```text
90–100%
Very Strong Match

75–89%
Strong Match

60–74%
Possible Match

Below 60%
Do not proactively notify
```

These values may change after testing.

---

# 16. Claim System

When an owner believes a Found Listing may belong to them, they can submit a claim.

The claim process may include questions such as:

- Where exactly did you lose the item?
- What unique marks does the item have?
- What brand/model is it?
- What was inside it?
- What color is a hidden part of the item?
- What distinguishing feature does it have?

The finder receives the claim and reviews the answers.

Possible claim states:

```text
PENDING
ACCEPTED
REJECTED
CANCELLED
COMPLETED
```

---

# 17. Ownership Verification

Ownership verification is controlled by the finder.

The platform assists but does not automatically approve claims.

Verification can use:

- hidden item characteristics
- exact brand/model
- scratches or marks
- contents
- serial information
- purchase evidence
- location details
- previous item photos

The finder chooses:

```text
Accept Claim
```

or:

```text
Reject Claim
```

Only an accepted claim should proceed into the recovery stage.

---

# 18. Private Communication

Once the claim is accepted, the platform creates a private conversation between:

```text
Owner ↔ Finder
```

They may discuss:

- further verification
- meeting location
- meeting time
- handover details

The platform should not require users to publicly expose:

- phone numbers
- email addresses
- personal social profiles

Communication should happen inside the application whenever possible.

---

# 19. Handover System

Once both users meet:

Finder selects:

```text
I Handed Over the Item
```

Owner selects:

```text
I Received My Item
```

The recovery should only be marked successful when both parties confirm.

```text
Finder Confirmation
        +
Owner Confirmation
        ↓
Item Successfully Returned
```

---

# 20. Rating and Review System

After successful handover, both users may rate each other.

Example:

```text
★★★★★

"Returned my wallet safely and responded quickly."
```

Ratings help establish community trust.

Possible rating factors may include:

- honesty
- communication
- responsiveness
- successful handover
- overall experience

---

# 21. Trust System

Each user develops a reputation based on successful activity.

Example profile:

```text
Vishnu Bhardwaj

Trust Score
92 / 100

Rating
4.9 / 5

Items Returned
8

Successful Handovers
11

Badge
Trusted Finder
```

The exact trust-score algorithm will be defined separately in:

```text
14-trust-and-rating.md
```

---

# 22. User Profile

The user profile may contain:

- name
- profile photo
- username
- member since
- trust score
- average rating
- items returned
- successful handovers
- badges
- public reviews

Sensitive personal information should not be publicly displayed.

---

# 23. Main Application Navigation

The initial application navigation should be simple.

```text
Home
Explore
Post
Activity
Messages
Profile
```

The main Post action presents:

```text
What happened?

I Lost Something

I Found Something
```

---

# 24. Home Screen Purpose

The Home screen should immediately communicate what the platform does.

Primary actions:

```text
Lost something?

[ Report Lost Item ]
```

and:

```text
Found something?

[ Report Found Item ]
```

Additional sections may include:

- Possible Matches
- Recently Found
- Recently Lost
- Successful Returns

---

# 25. Explore

Explore allows users to manually search listings even when no automatic match exists.

Users may search/filter by:

- lost/found
- category
- date
- location
- keyword
- status

This ensures the application remains useful even if automatic matching does not identify the correct item.

---

# 26. Activity Center

The Activity section acts as the user's recovery dashboard.

It may contain:

```text
My Lost Reports

My Found Listings

Possible Matches

Claims Sent

Claims Received

Active Recoveries

Completed Returns
```

---

# 27. Listing Lifecycle

An item may pass through several states.

```text
ACTIVE
   ↓
MATCH_FOUND
   ↓
CLAIM_PENDING
   ↓
CLAIM_ACCEPTED
   ↓
HANDOVER_PENDING
   ↓
RETURNED
   ↓
CLOSED
```

The exact database states will be defined in:

```text
08-database-schema.md
```

---

# 28. Notification Events

Users should receive notifications for important events.

Examples:

- possible match found
- new claim received
- claim accepted
- claim rejected
- new message
- handover requested
- handover confirmed
- item returned
- rating requested

Example:

```text
Possible Match Found

Someone listed an item that closely matches
the wallet you reported as lost.
```

---

# 29. Privacy Principles

Privacy must be built into the product from the beginning.

Important rules:

### Do not expose precise user locations unnecessarily.

Public listings should generally display approximate locations.

### Do not expose ownership-verification details publicly.

Information that proves ownership must remain private.

### Do not expose personal contact information by default.

Use in-app communication.

### Users should only access conversations they belong to.

### Users should only access sensitive claim information when authorized.

Detailed rules will be defined in:

```text
17-security-and-privacy.md
```

---

# 30. Safety Principles

The platform should encourage safe handovers.

Possible guidance:

- meet in public locations
- prefer campus/security checkpoints
- avoid sharing home addresses
- do not send money for an item
- report suspicious users
- keep communication inside the platform

The platform should never guarantee that another user is trustworthy solely because of a trust score.

---

# 31. MVP Features

The Minimum Viable Product includes:

### Account

- Sign up
- Login
- Logout
- Profile

### Listings

- Create Lost Report
- Create Found Listing
- Upload item image
- Edit active listing
- Close listing
- Explore listings

### Matching

- candidate filtering
- match-score calculation
- ranked possible matches
- bidirectional matching

### Claims

- submit claim
- verification questions
- accept claim
- reject claim

### Communication

- private realtime chat

### Recovery

- handover confirmation
- item received confirmation
- case closure

### Trust

- rating
- review
- successful return tracking

### Notifications

- in-app notifications for major recovery events

---

# 32. Features Outside Initial MVP

The following should not block the initial launch:

- AI image matching
- advanced computer vision
- blockchain
- payments
- borrowing
- barter system
- public reward marketplace
- complex gamification
- institution administration dashboard
- native mobile applications
- QR-based recovery
- NFC integration
- advanced identity verification

These may be explored later.

---

# 33. Future Matching Improvements

The initial matching system can later evolve to support:

### Semantic embeddings

Understand descriptions with different wording.

Example:

```text
"Black Apple earbuds with rubber cover"
```

and:

```text
"AirPods inside dark silicone case"
```

may still be recognized as similar.

### Image similarity

Compare uploaded images with found-item photographs.

### Brand/model recognition

Extract structured information automatically.

### Location intelligence

Improve matching using geographic proximity.

### Behavioral learning

Adjust match weights based on successful recovery history.

---

# 34. Future Institutional Features

Future versions may support organizations such as universities.

Institution features could include:

- official lost-and-found desk accounts
- campus security accounts
- verified organization members
- organization-specific communities
- restricted campus listings
- administrative dashboards
- recovery analytics

---

# 35. Success Metrics

Product success should be measured using real recovery outcomes rather than only registrations.

Important metrics include:

### Recovery Rate

Percentage of Lost Reports that result in successful returns.

### Match Success Rate

Percentage of suggested matches that lead to valid claims.

### Average Time to Match

Time between listing creation and detection of a useful match.

### Average Time to Recovery

Time between Lost Report creation and confirmed handover.

### Claim Accuracy

Percentage of submitted claims accepted as legitimate.

### Return Completion Rate

Percentage of accepted claims resulting in completed handovers.

### Active Finder Participation

Number of users posting found items.

### Repeat Community Participation

Percentage of users returning to help with future recoveries.

---

# 36. Product Constraints

The initial product should prioritize:

- simplicity
- privacy
- recovery speed
- secure verification
- low infrastructure complexity
- mobile-responsive design

The platform should avoid unnecessary complexity during the MVP stage.

---

# 37. Technology Stack

The initial implementation will use:

### Frontend

React

### Styling

Tailwind CSS v4

### Component Library

shadcn/ui

### Motion

Anime.js

### Backend Platform

Supabase

### Database

PostgreSQL through Supabase

### Authentication

Supabase Auth

### File Storage

Supabase Storage

### Realtime Messaging

Supabase Realtime

### Backend Logic

Supabase database functions and/or Edge Functions where appropriate

---

# 38. Product Design Direction

The application should feel:

- trustworthy
- clean
- approachable
- modern
- community-oriented
- safe

The interface should avoid feeling like:

- an ecommerce marketplace
- an auction platform
- a classified-ad website

The product should visually reinforce the idea of:

```text
Recovery
Connection
Safety
Trust
Community
```

---

# 39. Core Product Differentiators

The main differentiators are:

### 1. Bidirectional Lost ↔ Found Matching

Both lost reports and found listings actively search for each other.

### 2. Intelligent Match Ranking

Users receive ranked possible matches instead of manually browsing everything.

### 3. Secure Ownership Verification

Sensitive item details help prevent fraudulent claims.

### 4. Private Communication

Users communicate without exposing personal contact information.

### 5. Confirmed Recovery Workflow

The process does not stop after matching.

It continues through:

```text
Match
→ Claim
→ Verification
→ Chat
→ Handover
→ Confirmation
```

### 6. Community Reputation

Successful recoveries help build long-term trust.

---

# 40. Product Definition

The product should ultimately be understood as:

> A trusted community platform that connects lost belongings with the people who find them and manages the complete recovery journey from reporting and matching to ownership verification, communication, handover, and reputation.

The simplest representation is:

```text
LOST
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

This lifecycle is the foundation upon which every technical and design decision in the project should be built.