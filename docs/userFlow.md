# Lost & Found Platform — User Flows

## 1. Purpose

This document defines the end-to-end user flows for the Lost & Found Platform.

It describes how users move through the application while:

- creating an account
- reporting a lost item
- listing a found item
- receiving potential matches
- claiming an item
- verifying ownership
- communicating with another user
- completing a handover
- rating the interaction
- building trust

This document acts as the behavioral reference for product, frontend, backend, database, and testing decisions.

---

# 2. Core Product Lifecycle

The complete recovery lifecycle is:

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

The system must support this lifecycle regardless of whether the Lost Report or Found Listing is created first.

---

# 3. Primary User Roles

A user can act as either role depending on the situation.

## Owner

The person who lost an item.

Main actions:

- create Lost Report
- review possible matches
- claim a Found Listing
- answer verification questions
- communicate with Finder
- confirm receipt
- rate Finder

---

## Finder

The person who found an item.

Main actions:

- create Found Listing
- review possible owner matches
- receive claims
- verify ownership
- accept/reject claim
- communicate with Owner
- confirm handover
- rate Owner

---

# 4. Application Entry Flow

```text
User opens application
        ↓
Is user authenticated?
        ↓
 ┌──────┴──────┐
 │             │
NO             YES
 │             │
 ▼             ▼
Landing      Home
 │
 ├── Login
 │
 └── Register
```

After successful authentication:

```text
Authentication Success
        ↓
Profile exists?
        ↓
 ┌──────┴──────┐
 │             │
YES            NO
 │             │
 ▼             ▼
Home       Create Profile
                ↓
               Home
```

---

# 5. Registration Flow

```text
Landing
   ↓
Register
   ↓
Enter Name
Email
Password
   ↓
Validate Input
   ↓
Valid?
   ↓
┌──┴──┐
│     │
NO    YES
│     │
▼     ▼
Show  Create Supabase
Error Auth User
          ↓
      Create Profile
          ↓
       Success
          ↓
         Home
```

Possible errors:

- email already exists
- invalid email
- weak password
- network failure
- profile creation failure

---

# 6. Login Flow

```text
Landing
   ↓
Login
   ↓
Enter Email
Enter Password
   ↓
Submit
   ↓
Credentials valid?
   ↓
┌──┴──┐
│     │
NO    YES
│     │
▼     ▼
Show  Create Session
Error      ↓
           Home
```

---

# 7. Home Flow

After login, the user lands on the Home screen.

The primary actions are:

```text
HOME

┌──────────────────────────┐
│ I Lost Something         │
│ Report a lost item       │
└──────────────────────────┘

┌──────────────────────────┐
│ I Found Something        │
│ Help return an item      │
└──────────────────────────┘
```

Additional sections may contain:

```text
Possible Matches

Recently Found

Recently Lost

Active Recoveries

Successful Returns
```

---

# 8. Create Lost Report Flow

The Owner starts from:

```text
Home
 ↓
I Lost Something
```

Full flow:

```text
Report Lost Item
      ↓
Select Category
      ↓
Enter Item Name
      ↓
Enter Brand / Color
      ↓
Enter Description
      ↓
Upload Image
      ↓
Select Date Lost
      ↓
Enter Approximate Time
      ↓
Enter Location
      ↓
Add Distinguishing Details
      ↓
Review Report
      ↓
Submit
```

Validation occurs before submission.

```text
Submit
  ↓
Valid?
  ↓
┌──┴──┐
│     │
NO    YES
│     │
▼     ▼
Highlight   Create
Errors      Lost Report
                ↓
          status = ACTIVE
                ↓
         Trigger Matching
                ↓
           Report Created
                ↓
           Lost Item Detail
```

---

# 9. Lost Report Creation Success Flow

After successful creation:

```text
Lost Report Created
        ↓
Show Confirmation
        ↓
"Your report is now active"
        ↓
Matching Engine Starts
        ↓
Possible immediate matches?
```

If no match exists:

```text
No Match
   ↓
Show:
"No matches yet"
   ↓
Report remains ACTIVE
```

If matches exist:

```text
Possible Matches Found
        ↓
Store Match Records
        ↓
Show Matches
        ↓
Notify Owner
```

---

# 10. Create Found Listing Flow

The Finder starts from:

```text
Home
 ↓
I Found Something
```

Full flow:

```text
Found Item Form
      ↓
Select Category
      ↓
Enter General Item Name
      ↓
Enter Public Description
      ↓
Upload Image
      ↓
Select Date Found
      ↓
Enter Approximate Time
      ↓
Enter Approximate Location
      ↓
Enter Hidden Verification Details
      ↓
Create Verification Questions
      ↓
Review Listing
      ↓
Submit
```

The system must clearly distinguish:

```text
PUBLIC INFORMATION

vs

PRIVATE VERIFICATION INFORMATION
```

---

# 11. Public vs Private Found Information Flow

During listing creation:

```text
Finder enters data
      ↓
Is information useful for ownership verification?
      ↓
┌──────────┴──────────┐
│                     │
NO                    YES
│                     │
▼                     ▼
Public Field       Private Field
│                     │
Visible             Hidden from
to users            public users
```

Example:

```text
PUBLIC

Black Wallet
Found near Library
October 7
```

Private:

```text
Brand: Nike
Initials: VB
College ID inside
Scratch near lower edge
```

---

# 12. Found Listing Creation Success

```text
Found Listing Created
        ↓
status = ACTIVE
        ↓
Trigger Matching Engine
        ↓
Search Existing Lost Reports
```

If potential owners are found:

```text
Possible Owners
      ↓
Rank Matches
      ↓
Finder sees:
"Possible owner found"
```

The Finder may choose:

```text
Notify Possible Owner
```

This must not automatically transfer ownership or reveal private details.

---

# 13. Explore Flow

Users may manually search even without automatic matching.

```text
Navigation
   ↓
Explore
   ↓
Search / Filters
```

Available controls:

```text
Search Keyword

Lost / Found

Category

Date

Location

Sort
```

Flow:

```text
User applies filters
        ↓
Query Listings
        ↓
Results found?
        ↓
┌────────┴────────┐
│                 │
NO                YES
│                 │
▼                 ▼
Empty State      Listing Grid
                  ↓
              Select Item
                  ↓
             Item Detail
```

---

# 14. Lost Listing Detail Flow

When viewing a Lost Report:

```text
Lost Item Detail
      ↓
Show:
Item information
Approximate location
Date
Description
Owner public profile
Status
```

A Finder who thinks they may have the item may:

```text
View related Found Listing
or
Create Found Listing
```

The application should avoid encouraging direct ownership claims against Lost Reports unless the claim model explicitly supports that direction.

---

# 15. Found Listing Detail Flow

When viewing a Found Listing:

```text
Found Item Detail
      ↓
Show:
Public information
Approximate location
Date
Finder profile
Status
```

If the logged-in user is not the Finder:

```text
Could this be yours?
      ↓
[ Claim This Item ]
```

If the user is the Finder:

```text
Manage Listing
Review Claims
View Possible Owners
Edit Listing
Close Listing
```

---

# 16. Matching Trigger Flow

Matching runs whenever:

```text
Lost Report Created
or
Found Listing Created
```

It may also run when relevant listing information changes.

```text
New / Updated Listing
        ↓
Determine Listing Type
        ↓
┌───────────────┴───────────────┐
│                               │
LOST                            FOUND
│                               │
▼                               ▼
Search Found Items          Search Lost Items
        ↓                       ↓
Candidate Filtering
        ↓
Match Scoring
        ↓
Ranking
        ↓
Store Matches
```

---

# 17. Match Candidate Flow

```text
Opposite Listings
      ↓
Filter by ACTIVE status
      ↓
Category compatibility
      ↓
Date proximity
      ↓
Location proximity
      ↓
Remaining candidates
      ↓
Calculate detailed score
```

No ownership decision is made here.

---

# 18. Match Result Flow

Example results:

```text
Possible Matches

1. Black AirPods
   92% Match

2. Wireless Earbuds
   78% Match

3. Earbuds Case
   64% Match
```

Possible actions:

```text
View Match

Dismiss Match

Claim Item
```

Future actions may include:

```text
Not My Item
Save for Later
```

---

# 19. Owner Match Discovery Flow

```text
Owner has Lost Report
        ↓
System detects Found Listing
        ↓
Match score exceeds threshold
        ↓
Create Notification
        ↓
Owner opens notification
        ↓
Possible Match Detail
        ↓
Review Found Listing
```

Decision:

```text
Does Owner think it may be their item?
        ↓
┌──────────┴──────────┐
│                     │
NO                    YES
│                     │
▼                     ▼
Dismiss Match       Claim Item
```

---

# 20. Finder Match Discovery Flow

The reverse path must also work.

```text
Finder has Found Listing
        ↓
System detects Lost Report
        ↓
Match score exceeds threshold
        ↓
Finder sees:
"Possible owner found"
```

Finder may:

```text
View Lost Report
```

and optionally:

```text
Notify Possible Owner
```

Flow:

```text
Finder clicks
Notify Possible Owner
        ↓
System creates notification
        ↓
Owner receives:
"Someone may have found your item"
        ↓
Owner reviews Found Listing
        ↓
Owner decides whether to claim
```

---

# 21. Claim Creation Flow

From a Found Listing:

```text
Owner clicks:
Claim This Item
      ↓
Claim Introduction
      ↓
Verification Questions
      ↓
Enter Answers
      ↓
Enter Additional Explanation
      ↓
Review Claim
      ↓
Submit
```

Before submission:

```text
Check Eligibility
      ↓
Is claimant listing owner?
      ↓
YES → Block

Is listing active?
      ↓
NO → Block

Existing active claim?
      ↓
YES → Block
```

If valid:

```text
Create Claim
      ↓
status = PENDING
      ↓
Notify Finder
```

---

# 22. Claim Submission Success Flow

Owner sees:

```text
Claim Submitted

The finder will review your answers.
```

The claim appears in:

```text
Activity
  ↓
Claims Sent
```

State:

```text
PENDING
```

The Owner cannot open private chat yet.

---

# 23. Finder Claim Review Flow

Finder receives:

```text
New Claim Notification
        ↓
Open Claim
```

The Finder sees:

```text
Claimant Profile

Claim Answers

Lost Location

Distinguishing Details

Additional Message
```

Finder compares answers against private item information.

Decision:

```text
Does the claim appear valid?
      ↓
┌──────────┴──────────┐
│                     │
NO                    YES
│                     │
▼                     ▼
Reject              Accept
```

---

# 24. Claim Rejection Flow

```text
Finder clicks Reject
        ↓
Optional reason
        ↓
Confirm
        ↓
claim.status = REJECTED
        ↓
Notify Claimant
```

Owner sees:

```text
Claim Rejected

This claim was not accepted by the finder.
```

The user may still review other possible matches.

---

# 25. Claim Acceptance Flow

```text
Finder clicks Accept
        ↓
Confirmation Dialog
        ↓
Accept Claim
        ↓
claim.status = ACCEPTED
        ↓
Create Recovery Session
        ↓
Create Conversation
        ↓
Notify Owner
```

Found Listing state becomes approximately:

```text
RECOVERY_IN_PROGRESS
```

The exact database implementation will be defined separately.

---

# 26. Multiple Claims Flow

A Found Listing may receive multiple claims.

Example:

```text
Found Wallet
   ↓
Claim A
Claim B
Claim C
```

Finder reviews each.

Once a claim is accepted:

```text
Accepted Claim
      ↓
Recovery Starts
```

Other claims should no longer be freely accepted unless the current recovery is cancelled.

Possible behavior:

```text
Other Claims
   ↓
Remain Pending
or
Automatically become unavailable
```

Final behavior will be defined in claims/database implementation.

The system must prevent two simultaneous successful recovery flows for the same item.

---

# 27. Private Chat Creation Flow

Chat becomes available only after accepted claim.

```text
Claim Accepted
      ↓
Conversation Created
      ↓
Participants Added
      ↓
Owner
Finder
      ↓
Realtime Subscription Begins
```

---

# 28. Private Chat User Flow

```text
Messages
   ↓
Conversation
   ↓
Load Message History
   ↓
Subscribe to Realtime
   ↓
Send / Receive Messages
```

Users may discuss:

- further item verification
- meeting time
- meeting location
- safe handover details

---

# 29. Send Message Flow

```text
User enters message
        ↓
Message empty?
        ↓
YES → Disable Send

NO
 ↓
Submit
 ↓
Check Conversation Membership
 ↓
Authorized?
 ↓
NO → Reject

YES
 ↓
Insert Message
 ↓
Broadcast / Realtime
 ↓
Update UI
```

---

# 30. Unread Message Flow

```text
New Message
   ↓
Recipient currently viewing conversation?
```

If yes:

```text
Mark / treat as read
```

If no:

```text
Increase unread state
      ↓
Create notification if required
```

---

# 31. Recovery / Handover Preparation Flow

After communication:

```text
Owner + Finder agree on meetup
        ↓
Recovery remains active
```

The application may show safety guidance:

```text
Meet in a public place.

Avoid sharing unnecessary personal information.

Prefer campus/security checkpoints when available.
```

---

# 32. Finder Handover Confirmation

After handing over the item:

```text
Finder opens recovery
        ↓
Click:
"I Handed Over the Item"
        ↓
Confirmation Dialog
        ↓
finder_confirmed = true
```

If Owner has not yet confirmed:

```text
Waiting for Owner Confirmation
```

---

# 33. Owner Receipt Confirmation

After receiving the item:

```text
Owner opens recovery
        ↓
Click:
"I Received My Item"
        ↓
Confirmation Dialog
        ↓
owner_confirmed = true
```

If Finder has not yet confirmed:

```text
Waiting for Finder Confirmation
```

---

# 34. Completed Handover Flow

When:

```text
finder_confirmed = true

AND

owner_confirmed = true
```

Then:

```text
Complete Recovery
      ↓
Item status = RETURNED
      ↓
Claim status = COMPLETED
      ↓
Handover status = COMPLETED
      ↓
Close active recovery
      ↓
Enable Ratings
      ↓
Update return statistics
```

---

# 35. Partial Handover State

If only one person confirms:

```text
PARTIALLY_CONFIRMED
```

Example:

```text
Finder: Confirmed
Owner: Waiting
```

The recovery must not be marked complete yet.

---

# 36. Rating Flow

After successful recovery:

```text
Recovery Completed
      ↓
Prompt User:
"How was your experience?"
      ↓
Select Rating
1–5
      ↓
Optional Review
      ↓
Submit
```

Validation:

```text
Already rated?
  ↓
YES → Prevent Duplicate

Rating self?
  ↓
YES → Prevent

Recovery complete?
  ↓
NO → Prevent
```

---

# 37. Trust Update Flow

After valid rating and/or completed return:

```text
Completed Recovery
      ↓
Backend Trust Logic
      ↓
Recalculate Reputation
      ↓
Update Profile Statistics
```

Possible changes:

```text
Successful Returns +1

Completed Handovers +1

Average Rating updated

Trust Score recalculated

Badge eligibility checked
```

The client must not calculate authoritative trust values.

---

# 38. Activity Dashboard Flow

Navigation:

```text
Activity
```

Sections:

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

# 39. My Lost Reports Flow

```text
Activity
   ↓
My Lost Reports
   ↓
Select Report
```

User may:

```text
View Report

View Matches

Edit

Close

View Recovery Status
```

---

# 40. My Found Listings Flow

```text
Activity
   ↓
My Found Listings
   ↓
Select Listing
```

Finder may:

```text
Edit Listing

Review Matches

Review Claims

Close Listing

Open Active Recovery
```

---

# 41. Claims Sent Flow

```text
Activity
   ↓
Claims Sent
```

Possible states:

```text
Pending

Accepted

Rejected

Cancelled

Completed
```

Selecting a claim opens its status/detail view.

---

# 42. Claims Received Flow

Finder sees:

```text
Activity
   ↓
Claims Received
```

Pending claims should be prioritized.

Actions:

```text
Review

Accept

Reject
```

---

# 43. Active Recovery Flow

After a claim is accepted:

```text
Activity
   ↓
Active Recoveries
   ↓
Recovery Detail
```

Possible actions:

```text
Open Chat

View Item

View User

Confirm Handover

Report Problem
```

---

# 44. Completed Returns Flow

```text
Activity
   ↓
Completed Returns
```

Users can review:

- returned item
- recovery partner
- completion date
- rating
- review
- recovery history

---

# 45. Notification Center Flow

```text
Notification Icon
      ↓
Notification Center
```

Notification types:

```text
Possible Match

New Claim

Claim Accepted

Claim Rejected

New Message

Handover Update

Item Returned

Rating Reminder
```

Selecting a notification should route directly to the relevant context.

Example:

```text
Possible Match Notification
      ↓
Match Detail
```

---

# 46. Match Notification Flow

```text
Matching Engine
      ↓
Score ≥ Notification Threshold
      ↓
Check Existing Notification
      ↓
Duplicate?
```

If yes:

```text
Do not notify again
```

If no:

```text
Create Notification
      ↓
Show Badge / Notification
```

---

# 47. Edit Lost Report Flow

```text
My Lost Reports
      ↓
Select Report
      ↓
Edit
      ↓
Update Relevant Fields
      ↓
Validate
      ↓
Save
```

If match-relevant information changes:

```text
Trigger Match Recalculation
```

Examples:

- category
- date
- location
- description

---

# 48. Edit Found Listing Flow

```text
My Found Listings
      ↓
Select Listing
      ↓
Edit
      ↓
Save Changes
```

If public or matching information changes:

```text
Recalculate Matches
```

If private verification information changes:

```text
Do not expose it to existing claimants automatically
```

---

# 49. Manual Close Lost Report Flow

```text
Lost Report Detail
      ↓
Close Report
      ↓
Select Reason
```

Possible reasons:

```text
Recovered outside platform

Created by mistake

No longer searching

Other
```

Then:

```text
Confirm
      ↓
status = CLOSED
      ↓
Stop New Claims / Matches
```

---

# 50. Manual Close Found Listing Flow

```text
Found Listing Detail
      ↓
Close Listing
      ↓
Select Reason
      ↓
Confirm
```

Potential reasons:

```text
Returned outside platform

Transferred to authority/security desk

Listing mistake

Other
```

---

# 51. Cancel Claim Flow

An Owner may cancel their pending claim.

```text
Claim Detail
      ↓
Cancel Claim
      ↓
Confirmation
      ↓
status = CANCELLED
```

Accepted claims should follow a stricter recovery-cancellation flow rather than simple cancellation.

---

# 52. Recovery Cancellation Flow

If an accepted claim cannot continue:

```text
Active Recovery
      ↓
Cancel / Report Problem
      ↓
Select Reason
```

Examples:

```text
Claim accepted by mistake

Ownership uncertain

User unavailable

Suspicious behavior

Item no longer available
```

The backend should transition all dependent states consistently.

---

# 53. Report User Flow

```text
User Profile / Chat / Recovery
      ↓
Report User
      ↓
Choose Reason
```

Possible reasons:

```text
Harassment

Scam attempt

False ownership claim

Suspicious behavior

Spam

Other
```

Then:

```text
Add Optional Details
      ↓
Submit
      ↓
Report Created
```

---

# 54. Report Listing Flow

```text
Listing Detail
      ↓
Report Listing
      ↓
Choose Reason
```

Possible reasons:

```text
Fake listing

Spam

Inappropriate content

Personal information exposed

Suspicious item

Other
```

---

# 55. Profile Flow

```text
Navigation
   ↓
Profile
```

User sees:

```text
Avatar

Display Name

Trust Score

Average Rating

Successful Returns

Badges

Member Since

Reviews
```

Own profile also allows:

```text
Edit Profile

Settings

Logout
```

---

# 56. Profile Edit Flow

```text
Profile
   ↓
Edit Profile
   ↓
Update Allowed Fields
   ↓
Validate
   ↓
Save
```

Users cannot manually edit:

```text
Trust Score

Average Rating

Returns Count

Badges
```

---

# 57. Search-to-Claim Flow

A user does not have to start from their own Lost Report.

Possible flow:

```text
Explore
   ↓
Search "wallet"
   ↓
Found Listings
   ↓
Select Listing
   ↓
Could this be yours?
   ↓
Claim This Item
```

If no Lost Report exists, the application may:

```text
Ask user to create/link a Lost Report
```

Preferred architecture:

```text
Claim should be linked to a Lost Report
```

This creates better traceability and improves matching analytics.

---

# 58. Recommended Claim Requirement Flow

When claiming:

```text
Claim This Item
      ↓
Existing Lost Report for this item?
```

If yes:

```text
Select Lost Report
      ↓
Continue Claim
```

If no:

```text
Create Lost Report
      ↓
Return to Claim
```

This is recommended because every successful recovery should connect:

```text
Lost Report
      ↕
Match
      ↕
Found Listing
```

---

# 59. No Match Flow

If the system finds no candidate:

```text
Matching Complete
      ↓
No suitable candidates
      ↓
Show:
"No matches yet"
```

The report remains active.

Future Found Listings should still be compared against it.

---

# 60. Weak Match Flow

If score is below proactive notification threshold but above minimum storage threshold:

```text
Weak Candidate
      ↓
Store Match
      ↓
Do not notify
```

It may still appear under:

```text
More Possible Matches
```

depending on final product decisions.

---

# 61. Dismiss Match Flow

Owner selects:

```text
Not My Item
```

Then:

```text
Insert match_dismissals(match_id, auth.uid())
Hide only for this participant; shared match.status unchanged
```

The same pairing stays hidden for this participant across recalculation and edits until they restore it. The other participant can still see it.

---

# 62. Matching Recalculation Flow

```text
Listing updated
      ↓
Did relevant matching data change?
```

If no:

```text
Do nothing
```

If yes:

```text
Recalculate Candidate Matches
      ↓
Compare Previous Results
      ↓
Create New Notifications only when appropriate
```

---

# 63. Image Upload Flow

Used during listing creation/editing.

```text
Select Image
      ↓
Validate File Type
      ↓
Validate File Size
      ↓
Optional Compression
      ↓
Upload to Supabase Storage
      ↓
Receive File Reference
      ↓
Attach to Listing
```

If upload fails:

```text
Show Retry
```

The form should not silently lose uploaded data.

---

# 64. Authentication Expiry Flow

If session expires:

```text
User performs protected action
      ↓
Session invalid
      ↓
Attempt Supabase session refresh
```

If refresh succeeds:

```text
Continue
```

If refresh fails:

```text
Redirect Login
      ↓
Preserve safe return destination if possible
```

---

# 65. Network Error Flow

For major actions:

```text
Action
   ↓
Network Failure
   ↓
Show Error
```

Example:

```text
"We couldn't submit your claim.
Please try again."
```

The UI must distinguish:

```text
Loading

Success

Failure
```

---

# 66. Empty State Flows

## No Lost Reports

```text
You haven't reported anything lost.

[ Report Lost Item ]
```

## No Found Listings

```text
You haven't listed any found items.

[ Report Found Item ]
```

## No Matches

```text
No possible matches yet.

We'll keep checking new listings.
```

## No Messages

```text
No conversations yet.

Chats appear after a claim is accepted.
```

## No Notifications

```text
You're all caught up.
```

---

# 67. Successful Recovery Flow

This is the most important end-to-end scenario.

```text
USER A
Owner

Loses AirPods
      ↓
Creates Lost Report
      ↓
Report ACTIVE


USER B
Finder

Finds AirPods
      ↓
Creates Found Listing
      ↓
Listing ACTIVE


SYSTEM

Compares Listings
      ↓
92% Potential Match
      ↓
Creates Match
      ↓
Notifies Users


USER A

Reviews Match
      ↓
Claims Found Listing
      ↓
Answers Verification Questions


USER B

Reviews Claim
      ↓
Checks Hidden Details
      ↓
Accepts Claim


SYSTEM

Creates Conversation
      ↓
Recovery Begins


USER A ↔ USER B

Private Chat
      ↓
Arrange Meeting


USER B

Hands Over Item
      ↓
Confirms Handover


USER A

Receives Item
      ↓
Confirms Receipt


SYSTEM

Both Confirmed
      ↓
Item RETURNED
      ↓
Claim COMPLETED
      ↓
Recovery COMPLETED


USERS

Rate Each Other
      ↓

SYSTEM

Update Ratings
      ↓
Update Trust
      ↓
Case Closed
```

---

# 68. Found-First Recovery Flow

The product must also support this scenario:

```text
USER B finds Wallet
      ↓
Creates Found Listing
      ↓
No Lost Report exists
      ↓
Listing remains ACTIVE
```

Later:

```text
USER A loses / reports Wallet
      ↓
Creates Lost Report
      ↓
Matching Engine Runs
      ↓
Existing Found Listing discovered
      ↓
Potential Match
      ↓
Claim
      ↓
Verification
      ↓
Recovery
```

---

# 69. Lost-First Recovery Flow

```text
USER A loses Bag
      ↓
Creates Lost Report
      ↓
No Found Listing exists
      ↓
Report remains ACTIVE
```

Later:

```text
USER B finds Bag
      ↓
Creates Found Listing
      ↓
Matching Engine Runs
      ↓
Existing Lost Report discovered
      ↓
Potential Match
      ↓
Recovery Flow
```

---

# 70. Product Navigation Flow

Recommended navigation:

```text
              HOME
                │
     ┌──────────┼───────────┐
     │          │           │
     ▼          ▼           ▼
 Explore      Post       Activity
                │
          ┌─────┴─────┐
          │           │
          ▼           ▼
        Lost        Found

Messages

Profile
```

Mobile navigation may use:

```text
Home

Explore

Post +

Activity

Profile
```

Messages can be accessed through:

```text
Home
Activity
Notification
or dedicated navigation
```

depending on final UI design.

---

# 71. Main Screen Relationships

```text
Home
├── Report Lost
├── Report Found
├── Possible Matches
└── Recent Listings

Explore
├── Search
├── Filters
└── Listing Detail

Activity
├── My Lost Reports
├── My Found Listings
├── Matches
├── Claims
└── Recoveries

Messages
└── Conversation

Profile
├── Reviews
├── Trust
├── Edit Profile
└── Settings
```

---

# 72. User Flow Design Principles

All flows should follow these principles.

## 1. Never expose ownership answers too early

The system should preserve information that only the genuine owner is likely to know.

---

## 2. Matching is a suggestion

A high match score does not prove ownership.

---

## 3. Claim acceptance must be explicit

No recovery conversation should start without the Finder explicitly accepting the claim.

---

## 4. Chat should be private

Only authorized recovery participants should access the conversation.

---

## 5. Recovery requires both confirmations

One-sided handover confirmation must not close the case.

---

## 6. Trust comes after verified activity

Users should not gain trust merely from creating listings.

---

## 7. Important state changes must be visible

The user should always understand whether an item is:

```text
Active

Matched

Claimed

In Recovery

Returned

Closed
```

---

## 8. Manual discovery must always remain possible

Users should not depend entirely on the matching engine.

Search and Explore remain important fallback mechanisms.

---

# 73. Critical Flows for MVP Testing

The following flows must work before the MVP is considered complete:

### Flow 1

```text
Register
→ Login
→ Home
```

### Flow 2

```text
Create Lost Report
→ Report Active
```

### Flow 3

```text
Create Found Listing
→ Listing Active
```

### Flow 4

```text
Lost + Found
→ Match Generated
→ Match Displayed
```

### Flow 5

```text
Match
→ Claim
→ Verification Answers
→ Claim Pending
```

### Flow 6

```text
Claim Pending
→ Finder Accepts
→ Conversation Created
```

### Flow 7

```text
Conversation
→ Realtime Messages
```

### Flow 8

```text
Finder Confirms Handover
+
Owner Confirms Receipt
→ Recovery Completed
```

### Flow 9

```text
Recovery Completed
→ Rating
→ Trust Update
```

---

# 74. Final User Journey

The simplest representation of the entire product is:

```text
                 USER
                   │
        ┌──────────┴──────────┐
        │                     │
      LOST                  FOUND
        │                     │
        ▼                     ▼
 Lost Report           Found Listing
        │                     │
        └──────────┬──────────┘
                   │
                   ▼
             MATCHING ENGINE
                   │
                   ▼
             POSSIBLE MATCH
                   │
                   ▼
                  CLAIM
                   │
                   ▼
             VERIFICATION
                   │
                   ▼
              ACCEPTED
                   │
                   ▼
             PRIVATE CHAT
                   │
                   ▼
               HANDOVER
                   │
        ┌──────────┴──────────┐
        │                     │
Finder Confirms        Owner Confirms
        │                     │
        └──────────┬──────────┘
                   │
                   ▼
             ITEM RETURNED
                   │
                   ▼
              RATING
                   │
                   ▼
               TRUST
                   │
                   ▼
             CASE CLOSED
```

This flow is the foundation for the application's screen structure, state model, database design, matching system, authorization logic, and end-to-end tests.