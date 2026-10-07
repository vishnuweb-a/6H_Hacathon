# Lost & Found Platform — Screens and Navigation

## 1. Purpose

This document defines the complete screen structure and navigation architecture for the Lost & Found Platform.

It covers:

- public screens
- authentication screens
- primary application screens
- lost and found reporting screens
- item detail screens
- matching screens
- claim screens
- chat screens
- handover screens
- ratings
- profile screens
- settings
- error and empty states
- route structure
- mobile navigation
- desktop navigation

The navigation should always support the core recovery lifecycle:

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
RETURN
   ↓
RATE
   ↓
TRUST
```

---

# 2. Navigation Principles

The application navigation should follow these principles.

## Simple

A user should immediately understand how to:

```text
Report Lost Item

Report Found Item

Search Listings

Review Matches

Check Claims
```

---

## Action-Oriented

Primary navigation should focus on what users want to do rather than internal system concepts.

For example:

Use:

```text
Activity
```

instead of:

```text
Transaction Management
```

---

## Recovery-Aware

When a recovery becomes active, the interface should prioritize it.

Example:

```text
Claim Accepted
      ↓
Active Recovery
      ↓
Chat
      ↓
Handover
```

---

## Mobile-First

The product should be designed primarily for mobile usage while scaling cleanly to desktop.

---

# 3. Application Navigation Structure

Recommended top-level application structure:

```text
Home

Explore

Post

Activity

Messages

Profile
```

For mobile, the primary bottom navigation should contain five items:

```text
Home

Explore

Post +

Activity

Profile
```

Messages can be accessed from:

- Home
- Activity
- notification center
- conversation shortcuts

Alternatively, if testing shows chat usage is frequent enough, Messages may replace Profile or become a sixth desktop navigation item.

---

# 4. Global Navigation Map

```text
                        APPLICATION
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
      HOME               EXPLORE              POST
        │                   │                   │
        │                   │           ┌───────┴───────┐
        │                   │           │               │
        │                   │           ▼               ▼
        │                   │      REPORT LOST      REPORT FOUND
        │                   │
        │                   ▼
        │               ITEM DETAIL
        │
        ▼
   POSSIBLE MATCHES

                    ACTIVITY
                       │
       ┌───────────────┼────────────────┐
       │               │                │
       ▼               ▼                ▼
    REPORTS          CLAIMS         RECOVERIES

                    MESSAGES
                       │
                       ▼
                  CONVERSATION

                     PROFILE
                       │
             ┌─────────┴─────────┐
             │                   │
             ▼                   ▼
        EDIT PROFILE          SETTINGS
```

---

# 5. Route Structure

Recommended React route structure:

```text
/
├── /
├── /login
├── /register
├── /forgot-password
│
├── /home
│
├── /explore
│
├── /items/:itemId
│
├── /report
│   ├── /lost
│   └── /found
│
├── /matches
├── /matches/:matchId
│
├── /claims
├── /claims/:claimId
│
├── /activity
│
├── /recoveries/:recoveryId
│
├── /messages
├── /messages/:conversationId
│
├── /profile
├── /profile/:userId
├── /profile/edit
│
├── /notifications
│
└── /settings
```

The exact router may vary depending on the chosen React setup, but the logical structure should remain consistent.

---

# 6. Public Screens

Public screens are accessible without authentication.

Initial public routes:

```text
/

 /login

 /register

 /forgot-password
```

Certain item-detail screens may later allow limited public viewing, but the MVP should prioritize authenticated access for sensitive interactions.

---

# 7. Landing Screen

## Route

```text
/
```

## Purpose

Introduce the product and explain the primary value proposition.

Primary message:

```text
Lost it.
Find it.
Get it back.
```

The page should communicate:

- what the application does
- how lost reports work
- how found listings work
- how matching works
- why ownership verification is safe

---

## Primary Actions

```text
Get Started

Login
```

Optional secondary actions:

```text
Learn How It Works

Explore Recent Returns
```

---

## Main Sections

Suggested structure:

```text
Hero

How It Works

Lost Something?

Found Something?

Matching & Verification

Community Trust

CTA
```

---

# 8. Login Screen

## Route

```text
/login
```

## Purpose

Allow existing users to authenticate.

## Components

```text
Email Field

Password Field

Show/Hide Password

Login Button

Forgot Password

Register Link
```

Optional later:

```text
Continue with Google
```

---

## States

```text
Default

Loading

Invalid Credentials

Network Error

Success
```

---

# 9. Registration Screen

## Route

```text
/register
```

## Components

```text
Name

Email

Password

Confirm Password

Terms Acceptance

Create Account
```

Optional:

```text
Google Authentication
```

---

## Successful Flow

```text
Register
   ↓
Account Created
   ↓
Profile Created
   ↓
Home
```

---

# 10. Forgot Password Screen

## Route

```text
/forgot-password
```

## Purpose

Allow users to request password recovery.

Components:

```text
Email

Send Recovery Link
```

Success state:

```text
Check your email for a recovery link.
```

---

# 11. Home Screen

## Route

```text
/home
```

## Purpose

The Home screen should immediately answer:

> What should I do next?

---

## Primary Hero Actions

Two main cards:

```text
I Lost Something

Report a lost item and let the platform search for possible matches.
```

and:

```text
I Found Something

List an item so its owner can find and claim it.
```

---

## Recommended Home Sections

```text
Welcome Header

Primary Actions

Possible Matches

Active Recovery

Recently Found

Recently Lost

Successful Returns
```

---

## Possible Matches Section

Shown only if matches exist.

Example:

```text
Possible Matches

Black AirPods
92% Match

[ View Match ]
```

---

## Active Recovery

If a claim has been accepted:

```text
Recovery in Progress

Black Wallet

Chat with Rahul

[ Continue Recovery ]
```

This should appear prominently.

---

# 12. Global Post Action

The center Post button should open a modal, sheet, or route.

## Interaction

```text
Post +
   ↓
What happened?
```

Options:

```text
I Lost Something

I Found Something
```

Selecting one routes to the appropriate report form.

---

# 13. Report Lost Screen

## Route

```text
/report/lost
```

## Purpose

Create a Lost Report.

Recommended implementation:

A multi-step form.

---

## Step 1 — Item Basics

Fields:

```text
Item Name

Category

Brand

Color
```

---

## Step 2 — Description

Fields:

```text
Description

Distinguishing Characteristics
```

---

## Step 3 — Image

```text
Upload Previous Item Photo
```

Optional.

---

## Step 4 — Date and Time

```text
Date Lost

Approximate Time

Time Unknown
```

---

## Step 5 — Location

```text
Location Name

Select Approximate Location
```

Optional location map may be introduced later.

---

## Step 6 — Review

Display all entered information.

Actions:

```text
Back

Edit

Submit Lost Report
```

---

# 14. Lost Report Success Screen

After report creation:

```text
Your Lost Report Is Active
```

Display:

```text
Item

Status

Matching Status

Report ID if useful
```

Primary action:

```text
View Report
```

Secondary:

```text
Explore Found Items
```

---

# 15. Report Found Screen

## Route

```text
/report/found
```

## Purpose

Allow a Finder to list an item they discovered.

Like the Lost Report, use a guided multi-step experience.

---

# 16. Found Item — Public Details Step

Fields:

```text
Item Name

Category

Color

Brand if appropriate

Public Description
```

The interface should clearly explain:

> Do not reveal details here that only the real owner would know.

---

# 17. Found Item — Image Step

Finder may upload an image.

The interface should warn the user not to expose sensitive information accidentally.

For example:

```text
Avoid uploading photos that clearly reveal:
serial numbers
IDs
private documents
ownership clues
```

---

# 18. Found Item — Location Step

Fields:

```text
Where was it found?

Date Found

Approximate Time
```

---

# 19. Found Item — Private Verification Step

This screen is critical.

Heading:

```text
Keep Some Details Private
```

Description:

```text
Add information that only the real owner is likely to know.
We'll use it during ownership verification.
```

Possible fields:

```text
Unique marks

Contents

Exact model

Hidden color

Serial fragment

Other identifying information
```

These fields must visually show:

```text
PRIVATE
```

---

# 20. Found Item — Verification Questions

Finder may create questions.

Example:

```text
What brand is the wallet?

What was inside it?

What unique mark does it have?
```

The Finder can:

```text
Add Question

Remove Question
```

---

# 21. Found Listing Review Screen

Before publishing:

```text
Public Information Preview
```

and:

```text
Private Verification Information
Only visible to you
```

Actions:

```text
Edit

Publish Listing
```

---

# 22. Found Listing Success Screen

After submission:

```text
Found Item Listed
```

Messages:

```text
We'll check existing lost reports for possible owners.
```

Actions:

```text
View Listing

View Possible Owners
```

---

# 23. Explore Screen

## Route

```text
/explore
```

## Purpose

Allow users to manually discover Lost Reports and Found Listings.

---

## Main Components

```text
Search Bar

Lost / Found Toggle

Category Filter

Location Filter

Date Filter

Sort
```

---

## Listing Tabs

Potential layout:

```text
All

Found

Lost
```

---

# 24. Explore Card

A listing card may display:

```text
Image

LOST / FOUND Badge

Title

Category

Approximate Location

Date

Status
```

Example:

```text
FOUND

Black Wallet

Main Library

Found today
```

Private identifying details must never appear on cards.

---

# 25. Explore Empty State

Example:

```text
No listings match your search.

Try changing your filters or search terms.
```

---

# 26. Item Detail Screen

## Route

```text
/items/:itemId
```

The screen changes depending on whether the listing is:

```text
LOST
```

or:

```text
FOUND
```

---

# 27. Lost Item Detail Screen

Show:

```text
LOST Badge

Title

Image

Description

Category

Brand

Color

Date Lost

Approximate Location

Owner Public Profile

Status
```

Possible actions vary by user.

---

## Owner Actions

If the current user owns the report:

```text
Edit Report

View Matches

Close Report
```

---

## Other User Actions

Possible:

```text
I Found This Item
```

This may route the user into the Found Listing creation flow with optional prefilled contextual information.

---

# 28. Found Item Detail Screen

Display:

```text
FOUND Badge

Title

Image

Public Description

Category

Date Found

Approximate Location

Finder Public Profile

Status
```

Critical message:

```text
Some identifying details are hidden to help verify the real owner.
```

---

## Claimant Actions

```text
Claim This Item
```

If a match exists:

```text
92% Match With Your Lost Report
```

---

## Finder Actions

If current user owns the listing:

```text
Edit Listing

View Possible Owners

Review Claims

Close Listing
```

---

# 29. Possible Matches Screen

## Route

```text
/matches
```

## Purpose

Show ranked Lost ↔ Found matches associated with the user's reports.

---

## Tabs

```text
For My Lost Items

For Items I Found
```

---

## Match Card

Display:

```text
Image

Found / Lost Item

Match Score

Match Strength

Location

Date

Matched Attributes
```

Example:

```text
Black AirPods

92% Possible Match

Strong similarities:
Category
Location
Date
Description
```

Actions:

```text
View Match

Not My Item
```

---

# 30. Match Detail Screen

## Route

```text
/matches/:matchId
```

Purpose:

Compare both listings without revealing private verification data.

Suggested layout:

```text
Your Lost Report
        ↔
Found Listing
```

Comparison:

```text
Category

Color

Brand

Date

Location

Description
```

Then:

```text
Match Confidence
92%
```

---

## Actions

Owner:

```text
Claim This Item

Not My Item
```

Finder:

```text
Notify Possible Owner

Dismiss Match
```

---

# 31. Claim Start Screen

When Owner selects:

```text
Claim This Item
```

The application opens a claim flow.

If the user already has a relevant Lost Report:

```text
Select Lost Report
```

Otherwise:

```text
Create Lost Report First
```

---

# 32. Select Lost Report Screen

Show user's active Lost Reports.

Example:

```text
Which lost report belongs to this item?

○ Black AirPods
○ White Earbuds
○ Black Headphones
```

Primary action:

```text
Continue
```

---

# 33. Claim Verification Screen

## Route

Could be implemented under:

```text
/items/:itemId/claim
```

or internally within the claim flow.

Display:

```text
Prove This Item Belongs to You
```

Finder-defined questions appear here.

Example:

```text
What brand is the wallet?

What was inside it?

Describe a unique mark.
```

Additional field:

```text
Anything else the finder should know?
```

---

# 34. Claim Review Screen

Before submission:

```text
Found Item

Your Lost Report

Verification Answers

Additional Information
```

Actions:

```text
Back

Submit Claim
```

---

# 35. Claim Submitted Screen

Success:

```text
Claim Submitted
```

Message:

```text
The finder will review your ownership details.
We'll notify you when they respond.
```

Actions:

```text
View Claim

Return Home
```

---

# 36. Claims Screen

## Route

```text
/claims
```

May also be embedded in Activity.

Tabs:

```text
Sent

Received
```

---

# 37. Claims Sent Screen

Displays:

```text
Item

Finder

Submitted Date

Claim Status
```

Possible statuses:

```text
Pending

Accepted

Rejected

Cancelled

Completed
```

---

# 38. Claims Received Screen

Finder sees:

```text
Claimant

Item

Submitted Time

Status
```

Pending claims should appear first.

Action:

```text
Review Claim
```

---

# 39. Claim Detail Screen

## Route

```text
/claims/:claimId
```

Different layouts for claimant and finder.

---

# 40. Finder Claim Review Screen

Finder sees:

```text
Claimant Profile

Associated Lost Report

Answers

Additional Evidence

Private Finder Notes
```

Actions:

```text
Reject Claim

Accept Claim
```

The acceptance action should require confirmation.

---

# 41. Claim Acceptance Confirmation

Dialog:

```text
Accept this claim?

This will start a private recovery conversation with the claimant.
```

Actions:

```text
Cancel

Accept Claim
```

---

# 42. Claim Rejection Screen

Finder may optionally choose a reason:

```text
Details do not match

Insufficient proof

Wrong item

Other
```

Then:

```text
Reject Claim
```

Avoid revealing which verification answers were wrong if doing so could help fraudulent claimants.

---

# 43. Activity Screen

## Route

```text
/activity
```

## Purpose

Central hub for all user recovery activity.

Recommended tabs:

```text
Reports

Claims

Recoveries
```

Alternative:

```text
Overview
Lost
Found
Claims
Returns
```

The first option is simpler.

---

# 44. Activity Overview

Possible sections:

```text
Active Lost Reports

Active Found Listings

Pending Claims

Active Recoveries

Completed Returns
```

Cards should always show current state clearly.

---

# 45. My Lost Reports Screen

Can be part of Activity.

Each card shows:

```text
Item

Created Date

Status

Matches Count
```

Actions:

```text
View

Edit

Matches
```

---

# 46. My Found Listings Screen

Each card:

```text
Item

Found Date

Status

Claims Count

Possible Owners Count
```

Actions:

```text
View

Edit

Claims
```

---

# 47. Active Recoveries Screen

Displays accepted claims currently progressing toward handover.

Card example:

```text
Black Wallet

Recovery with Rahul

Claim Accepted

[ Open Recovery ]
```

---

# 48. Recovery Detail Screen

## Route

```text
/recoveries/:recoveryId
```

This is one of the most important screens.

It should show the full recovery progress.

Example:

```text
Claim Accepted
      ✓

Chat Started
      ✓

Handover
      •

Both Confirm
      ○

Completed
      ○
```

---

## Recovery Detail Information

Show:

```text
Item

Recovery Partner

Claim Summary

Current Status

Chat Shortcut

Safety Guidance
```

---

## Primary Action

Depending on state:

```text
Open Chat
```

or:

```text
Confirm Handover
```

---

# 49. Messages Screen

## Route

```text
/messages
```

Shows all active and previous conversations.

Conversation card:

```text
Avatar

User Name

Item

Last Message

Timestamp

Unread Count
```

---

# 50. Conversation Screen

## Route

```text
/messages/:conversationId
```

Components:

```text
Header

Recovery Context

Message History

Message Composer
```

---

## Header

Show:

```text
Recovery Partner

Item

Recovery Status
```

Actions may include:

```text
View Item

View Recovery

Report User
```

---

# 51. Message Composer

Components:

```text
Text Input

Send Button
```

Future:

```text
Image Attachment
```

Images should not be part of MVP unless necessary.

---

# 52. Chat Safety Banner

Optionally show:

```text
For your safety, meet in a public location and avoid sharing unnecessary personal information.
```

---

# 53. Handover Screen

Accessible from Recovery Detail.

The content depends on role.

---

## Finder View

```text
Have you handed over the item?

[ I Handed Over the Item ]
```

---

## Owner View

```text
Have you received your item?

[ I Received My Item ]
```

---

# 54. Partial Confirmation Screen

If one party confirms first:

```text
Your Confirmation
✓ Complete

Waiting for Rahul
```

Do not mark recovery complete yet.

---

# 55. Recovery Completed Screen

Once both confirm:

```text
Item Returned Successfully
```

Visual success moment may use controlled Anime.js motion.

Show:

```text
Black Wallet

Returned successfully

October 7, 2026
```

Actions:

```text
Rate Experience

View Recovery
```

---

# 56. Rating Screen

Shown after completion.

Components:

```text
Recovery Partner

1–5 Star Rating

Optional Review
```

Action:

```text
Submit Rating
```

---

# 57. Rating Success Screen

```text
Thanks for helping build a more trusted community.
```

Action:

```text
Done
```

---

# 58. Notifications Screen

## Route

```text
/notifications
```

Accessible through notification icon.

Notifications grouped by time:

```text
Today

Earlier This Week

Older
```

---

## Notification Types

```text
Possible Match

Claim Received

Claim Accepted

Claim Rejected

New Message

Handover Update

Item Returned

Rating Reminder
```

Each notification must link to the corresponding screen.

---

# 59. Notification Navigation Examples

```text
Match Found
      ↓
Match Detail
```

```text
Claim Received
      ↓
Claim Review
```

```text
Claim Accepted
      ↓
Recovery Detail
```

```text
New Message
      ↓
Conversation
```

```text
Rating Requested
      ↓
Rating Screen
```

---

# 60. Profile Screen

## Route

Own profile:

```text
/profile
```

Other user:

```text
/profile/:userId
```

---

# 61. Own Profile Screen

Display:

```text
Avatar

Name

Username

Member Since

Trust Score

Average Rating

Successful Returns

Badges

Recent Reviews
```

Actions:

```text
Edit Profile

Settings

Logout
```

---

# 62. Other User Profile

Display only safe public information:

```text
Name

Avatar

Trust Score

Average Rating

Successful Returns

Badges

Reviews
```

Do not display:

```text
Email

Phone Number

Private Activity

Exact Location
```

---

# 63. Edit Profile Screen

## Route

```text
/profile/edit
```

Editable:

```text
Display Name

Username

Avatar
```

Potential future fields:

```text
Bio
```

Users cannot manually edit:

```text
Trust Score

Average Rating

Return Count

Badges
```

---

# 64. Settings Screen

## Route

```text
/settings
```

Possible sections:

```text
Account

Notifications

Privacy

Appearance

Security

About
```

---

# 65. Notification Settings

Potential options:

```text
Match Notifications

Claim Notifications

Message Notifications

Recovery Notifications

Rating Reminders
```

Push notification settings may be introduced later.

---

# 66. Privacy Settings

Potential future controls:

```text
Profile Visibility

Approximate Location Preferences

Review Visibility
```

MVP privacy defaults should remain conservative.

---

# 67. Report User Screen

Can be shown as a dialog or sheet.

Accessible from:

```text
Profile

Conversation

Recovery
```

Fields:

```text
Reason

Optional Description
```

Action:

```text
Submit Report
```

---

# 68. Report Listing Screen

Accessible from listing detail.

Reasons:

```text
Fake Listing

Spam

Inappropriate Content

Personal Information Exposed

Suspicious Item

Other
```

---

# 69. Search Screen Behavior

Search should be directly available inside Explore.

On mobile, clicking the search bar may expand into a focused search state.

Suggested behavior:

```text
Search
   ↓
Recent Searches
   ↓
Suggestions
   ↓
Results
```

Recent search history is optional for MVP.

---

# 70. Filter Sheet

On mobile:

```text
Filters
   ↓
Bottom Sheet
```

Fields:

```text
Listing Type

Category

Date Range

Location

Sort
```

Buttons:

```text
Clear

Apply Filters
```

---

# 71. Desktop Navigation

Recommended desktop structure:

```text
Logo

Home
Explore
Activity
Messages

[ Post + ]

Notifications

Profile
```

The Post action should remain visually prominent.

---

# 72. Mobile Bottom Navigation

Recommended:

```text
┌───────────────────────────────────┐
│ Home  Explore   +   Activity Profile │
└───────────────────────────────────┘
```

Center button:

```text
+
```

opens:

```text
Report Lost

Report Found
```

---

# 73. Mobile Header

Context-dependent header:

```text
Page Title

Notification Icon

Optional contextual action
```

Example Home:

```text
Logo                     Notifications
```

Example Activity:

```text
Activity
```

Example Item:

```text
← Back                  More
```

---

# 74. Back Navigation

Nested screens should always provide predictable back behavior.

Example:

```text
Explore
   ↓
Found Listing
   ↓
Claim
```

Back should return:

```text
Claim
→ Listing
→ Explore
```

The application should not unexpectedly return users to Home.

---

# 75. Authentication Redirects

Unauthenticated users attempting a protected action should be redirected to Login.

Example:

```text
Public Listing
   ↓
Claim This Item
   ↓
Not Logged In
   ↓
Login
   ↓
Return to Item
   ↓
Continue Claim
```

Preserving return destination improves UX.

---

# 76. Global Status Badges

Use consistent labels throughout the application.

## Listing Status

```text
Active

Match Found

Claim Pending

Recovery in Progress

Returned

Closed
```

---

## Claim Status

```text
Pending

Accepted

Rejected

Cancelled

Completed
```

---

## Match Status

```text
Possible Match

Strong Match

Dismissed
```

---

# 77. Lost vs Found Visual Identification

The application should visually differentiate:

```text
LOST
```

and:

```text
FOUND
```

But the color system must remain accessible.

Do not rely on color alone.

Always include a text badge or icon.

---

# 78. Loading Screens

Major screens should have skeleton/loading states.

Examples:

```text
Home

Explore

Item Detail

Activity

Messages

Profile
```

Avoid blank pages during loading.

---

# 79. Error Screens

Common reusable error states:

```text
Something Went Wrong

Couldn't Load This Item

Couldn't Load Messages

Connection Lost

Action Failed
```

Each should provide an appropriate recovery action:

```text
Retry
```

or:

```text
Return Home
```

---

# 80. 404 Screen

If a route does not exist:

```text
Page Not Found
```

Actions:

```text
Go Home

Explore Items
```

---

# 81. Listing Not Available Screen

If an item was closed, deleted, or made unavailable:

```text
This listing is no longer available.
```

Where appropriate, show:

```text
This item has already been returned.
```

---

# 82. Unauthorized Screen

If the user attempts to access content they do not own or participate in:

```text
You don't have permission to view this page.
```

Do not expose whether sensitive data exists.

---

# 83. Core Navigation Journeys

## Lost Item Journey

```text
Home
 ↓
Report Lost
 ↓
Lost Report
 ↓
Matches
 ↓
Match Detail
 ↓
Claim
 ↓
Claim Submitted
 ↓
Recovery
 ↓
Chat
 ↓
Handover
 ↓
Rating
```

---

## Found Item Journey

```text
Home
 ↓
Report Found
 ↓
Found Listing
 ↓
Possible Owners
 ↓
Claims Received
 ↓
Claim Review
 ↓
Accept
 ↓
Recovery
 ↓
Chat
 ↓
Handover
 ↓
Rating
```

---

# 84. Manual Discovery Journey

```text
Explore
 ↓
Search
 ↓
Found Listing
 ↓
Claim Item
 ↓
Verification
 ↓
Submit Claim
```

---

# 85. Match Notification Journey

```text
Notification
 ↓
Possible Match
 ↓
Match Detail
 ↓
Found Listing
 ↓
Claim
```

---

# 86. Claim Notification Journey

Finder:

```text
Notification
 ↓
Claim Received
 ↓
Claim Detail
 ↓
Accept / Reject
```

---

# 87. Accepted Claim Journey

Owner:

```text
Notification
 ↓
Claim Accepted
 ↓
Recovery Detail
 ↓
Chat
```

---

# 88. Handover Journey

```text
Recovery
 ↓
Meet
 ↓
Confirm
 ↓
Waiting for Other User
 ↓
Both Confirm
 ↓
Recovery Completed
 ↓
Rate User
```

---

# 89. Screen Priority for MVP

## P0 — Required

```text
Landing

Login

Register

Home

Report Lost

Report Found

Explore

Item Detail

Matches

Match Detail

Claim

Claim Review

Activity

Messages

Conversation

Recovery

Handover

Rating

Profile
```

---

## P1 — Important

```text
Notifications

Forgot Password

Edit Profile

Settings

Report User

Report Listing
```

---

## P2 — Enhancement

```text
Advanced Search

Map View

Organization Dashboard

Detailed Trust History

Badge Gallery

Recovery Analytics
```

---

# 90. Recommended Screen Build Order

Development should not follow navigation order blindly.

Recommended implementation sequence:

```text
1. Landing

2. Authentication

3. Home

4. Report Lost

5. Report Found

6. Item Detail

7. Explore

8. Activity

9. Matches

10. Match Detail

11. Claim Flow

12. Claim Review

13. Messages

14. Conversation

15. Recovery Detail

16. Handover

17. Rating

18. Profile

19. Notifications

20. Settings
```

This follows dependency order.

---

# 91. Screen State Requirements

Each major screen must consider:

```text
Loading

Loaded

Empty

Error

Unauthorized

Offline / Network Failure where relevant
```

Form screens additionally need:

```text
Default

Dirty

Submitting

Validation Error

Submission Error

Success
```

---

# 92. Responsive Behavior

## Mobile

Prioritize:

```text
Bottom Navigation

Full-width cards

Bottom sheets

Single-column forms

Sticky primary actions
```

---

## Tablet

Use:

```text
Wider content

Two-column cards where useful

Larger forms
```

---

## Desktop

Can use:

```text
Top navigation

Sidebar where useful

Two-column detail layouts

Split comparison views

Persistent filters
```

---

# 93. Desktop Match Detail Layout

A wider screen may show:

```text
┌────────────────────┬────────────────────┐
│ Your Lost Report   │ Found Listing      │
│                    │                    │
│ Black AirPods      │ AirPods Found      │
│ Library            │ Near Library       │
│ Oct 7              │ Oct 7              │
└────────────────────┴────────────────────┘

             92% Possible Match

             [ Claim Item ]
```

---

# 94. Mobile Match Detail Layout

Stack content vertically:

```text
Your Lost Report

↓

Match Score

↓

Found Listing

↓

Claim Item
```

Avoid horizontal comparisons that require excessive scrolling.

---

# 95. Forms Navigation

Multi-step forms should show progress.

Example:

```text
1 Basics
2 Details
3 Location
4 Verification
5 Review
```

Users should be able to move backward without losing previously entered information.

---

# 96. Form Exit Protection

If a user has entered significant unsaved information and tries to exit:

```text
Discard this report?

Your unsaved changes will be lost.
```

Options:

```text
Keep Editing

Discard
```

---

# 97. Sensitive Information UI

Private Found Listing information should always use an explicit protected visual treatment.

Example:

```text
🔒 Private Verification Detail

Only you can see this.
```

This reduces accidental information disclosure.

---

# 98. Match Score UI

A percentage alone should not imply certainty.

Preferred:

```text
92%

Strong Possible Match
```

Avoid:

```text
92% Owner Probability
```

unless future statistical calibration supports such wording.

---

# 99. Trust UI

Trust indicators may appear on:

```text
Profiles

Claim Review

Recovery Detail
```

Example:

```text
4.9 ★

8 Successful Returns
```

Do not present reputation as a guarantee.

---

# 100. Successful Return UI

Successful recoveries should feel rewarding but not overly gamified.

Recommended:

```text
Item Returned Successfully ✓
```

Followed by:

```text
Thanks for helping make the community safer.
```

A lightweight Anime.js success animation may be used.

---

# 101. Navigation Guard Rules

Certain routes require specific states.

Example:

```text
Conversation
```

requires:

```text
Accepted Claim
+
Conversation Membership
```

---

```text
Handover
```

requires:

```text
Active Recovery
```

---

```text
Rating
```

requires:

```text
Completed Recovery
```

---

```text
Claim Review
```

requires:

```text
Current User = Finder
```

These conditions must be enforced by backend authorization, not only frontend routing.

---

# 102. Navigation and Security

Frontend navigation visibility does not define authorization.

For example:

Hiding:

```text
Accept Claim
```

from an unauthorized user is not sufficient.

The backend and Supabase RLS must also reject unauthorized requests.

---

# 103. Screen-to-Feature Mapping

```text
Landing
→ Product Discovery

Home
→ Primary Actions

Report Lost
→ Lost Reports

Report Found
→ Found Listings

Explore
→ Manual Discovery

Item Detail
→ Listing Information

Matches
→ Automatic Discovery

Claim
→ Ownership Request

Claim Review
→ Verification

Messages
→ Communication

Recovery
→ Recovery Management

Handover
→ Return Confirmation

Rating
→ Reputation

Profile
→ Trust Identity

Activity
→ Personal Management
```

---

# 104. Complete Screen Inventory

Initial complete screen list:

```text
01 Landing

02 Login

03 Register

04 Forgot Password

05 Home

06 Report Lost — Basics

07 Report Lost — Details

08 Report Lost — Location

09 Report Lost — Review

10 Lost Report Success

11 Report Found — Basics

12 Report Found — Location

13 Report Found — Private Details

14 Report Found — Verification Questions

15 Report Found — Review

16 Found Listing Success

17 Explore

18 Lost Item Detail

19 Found Item Detail

20 Possible Matches

21 Match Detail

22 Select Lost Report

23 Claim Verification

24 Claim Review

25 Claim Submitted

26 Claims Sent

27 Claims Received

28 Claim Detail

29 Claim Review — Finder

30 Activity

31 My Lost Reports

32 My Found Listings

33 Active Recoveries

34 Recovery Detail

35 Messages

36 Conversation

37 Handover

38 Partial Confirmation

39 Recovery Completed

40 Rating

41 Rating Success

42 Notifications

43 Profile

44 Public User Profile

45 Edit Profile

46 Settings

47 Report User

48 Report Listing

49 Unauthorized

50 Listing Unavailable

51 404

52 Generic Error
```

Not every multi-step form needs a completely separate URL. Some can exist as steps within the same route.

---

# 105. MVP Navigation Summary

The application's primary structure should remain easy to understand:

```text
                    HOME
                      │
       ┌──────────────┼──────────────┐
       │              │              │
       ▼              ▼              ▼
     LOST           FOUND         EXPLORE
       │              │              │
       └──────────────┼──────────────┘
                      ▼
                   LISTING
                      │
                      ▼
                    MATCH
                      │
                      ▼
                    CLAIM
                      │
                      ▼
                   VERIFY
                      │
                      ▼
                   RECOVERY
                      │
                      ▼
                     CHAT
                      │
                      ▼
                  HANDOVER
                      │
                      ▼
                   RETURNED
                      │
                      ▼
                    RATING
                      │
                      ▼
                    TRUST
```

This structure should remain the basis for the React routing system and all future UI work.