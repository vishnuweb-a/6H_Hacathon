# Lost & Found Platform — UI Design System

## 1. Purpose

This document defines the visual design system for the Lost & Found Platform.

It establishes:

- visual language
- typography
- spacing
- sizing
- radius
- shadows
- colors
- semantic status styles
- component patterns
- Tailwind CSS v4 tokens
- shadcn/ui customization rules
- responsive behavior
- accessibility expectations
- motion-aware states

The design system should support the product's core emotional qualities:

- trust
- safety
- clarity
- calmness
- helpfulness
- community

The product should not feel like:

- an ecommerce marketplace
- a classified ads platform
- a social network
- a gaming application

It should feel like a reliable community recovery tool.

---

# 2. Design Principles

## 2.1 Trust First

The interface should feel credible and safe.

Avoid:

- overly playful visuals
- excessive gradients
- unnecessary glowing effects
- cluttered cards
- loud promotional design

Prefer:

- clean spacing
- strong hierarchy
- clear labels
- readable status indicators
- calm surfaces

---

## 2.2 Action Clarity

Important actions should always be obvious.

Examples:

```text
Report Lost Item
Report Found Item
Claim This Item
Accept Claim
Open Chat
Confirm Handover
```

Primary actions should not compete with multiple equally strong buttons.

---

## 2.3 Calm Feedback

The platform deals with stressful situations.

Someone may have lost:

- a wallet
- ID card
- phone
- keys
- personal documents

The UI should therefore feel reassuring rather than urgent.

Use messages such as:

```text
We'll keep checking for possible matches.
```

instead of:

```text
NO MATCH FOUND!
```

---

## 2.4 Progressive Disclosure

Only show information when necessary.

Example:

A Found Listing should show:

```text
Black Wallet
Found near Library
October 7
```

but should not show:

```text
Nike brand
VB initials
College ID inside
```

until verification requires it.

---

## 2.5 State Visibility

The user should always understand what is happening.

Examples:

```text
Active

Possible Match

Claim Pending

Claim Accepted

Recovery in Progress

Returned
```

---

# 3. Visual Personality

The visual language should be:

```text
Minimal
Warm
Modern
Human
Trustworthy
Soft
Structured
```

Avoid overly corporate or overly playful styling.

A useful reference direction is:

```text
calm civic utility
+
modern consumer app
+
community trust platform
```

---

# 4. Design Token Strategy

The design system should use semantic tokens instead of hardcoded colors throughout the app.

Use CSS variables and Tailwind-compatible tokens.

Core token groups:

```text
background
foreground
surface
surface-muted
border
primary
primary-foreground
secondary
muted
accent
destructive
success
warning
info

lost
found
match
pending
returned
trust
```

---

# 5. Base Color Philosophy

Use a light neutral base with one primary brand color.

Suggested direction:

```text
Background:
soft off-white

Surface:
white

Primary:
deep indigo / blue

Secondary:
muted slate

Success:
soft green

Warning:
muted amber

Destructive:
muted red
```

Avoid highly saturated colors across large surfaces.

---

# 6. Semantic Color Roles

## Primary

Used for:

```text
main CTA
selected navigation
links
focus states
important highlights
```

Example:

```text
Report Lost Item
Continue
Submit Claim
```

---

## Success

Used for:

```text
Returned
Claim Accepted
Recovery Completed
Successful Save
```

---

## Warning

Used for:

```text
Pending
Awaiting Confirmation
Needs Attention
```

---

## Destructive

Used for:

```text
Delete
Reject
Cancel
Report Abuse
```

---

## Info

Used for:

```text
Possible Match
System Guidance
Non-critical notices
```

---

# 7. Lost / Found Semantic Colors

Lost and Found should be visually distinguishable, but color must not be the only indicator.

Use:

```text
LOST
```

with:

- text badge
- icon
- semantic color

and:

```text
FOUND
```

with:

- text badge
- icon
- semantic color

Suggested direction:

```text
Lost:
muted amber / orange tone

Found:
muted teal / green-blue tone
```

Do not use aggressive red for Lost because red should remain reserved for errors/destructive states.

---

# 8. Match Colors

Match confidence should use restrained styling.

Suggested mapping:

```text
60–74%
Possible Match
Neutral / muted blue

75–89%
Strong Match
Indigo

90–100%
Very Strong Match
Deep green / strong indigo
```

Avoid using bright green solely because the score is high.

A match is still not proof of ownership.

---

# 9. Status Color Mapping

Recommended semantic mapping:

```text
ACTIVE
Neutral / Primary

MATCH_FOUND
Info

CLAIM_PENDING
Warning

ACCEPTED
Success

RECOVERY_IN_PROGRESS
Primary

RETURNED
Success

CLOSED
Muted

REJECTED
Destructive

CANCELLED
Muted / Destructive
```

---

# 10. Typography

Use one clean sans-serif family.

Recommended options:

```text
Inter
Geist
Manrope
```

Recommended default:

```text
Inter
```

because it is readable and neutral.

---

# 11. Typography Scale

Suggested scale:

```text
Display
48–64px

H1
36–48px

H2
28–36px

H3
22–28px

H4
18–22px

Body Large
18px

Body
16px

Body Small
14px

Caption
12px
```

---

# 12. Font Weight

Recommended usage:

```text
400
Body text

500
Secondary emphasis

600
Labels / buttons / card titles

700
Major headings
```

Avoid excessive 800/900 weights.

---

# 13. Line Height

Use generous line heights.

Recommended:

```text
Headings
1.1–1.25

Body
1.5–1.65

Small Text
1.4–1.5
```

---

# 14. Spacing System

Use a consistent spacing scale.

Recommended base:

```text
4px
```

Common steps:

```text
4
8
12
16
20
24
32
40
48
64
80
```

Tailwind utility spacing should map naturally to this system.

---

# 15. Page Padding

Recommended mobile:

```text
16px
```

Tablet:

```text
24px
```

Desktop:

```text
32–48px
```

Do not allow content to stretch edge-to-edge unnecessarily.

---

# 16. Content Width

For standard content:

```text
max-width: 1200px
```

For forms:

```text
max-width: 640–720px
```

For readable content:

```text
max-width: 720px
```

---

# 17. Border Radius

The product should feel soft but not overly bubbly.

Suggested:

```text
Small
8px

Medium
12px

Large
16px

XL
20px
```

Primary cards:

```text
16px
```

Buttons:

```text
10–12px
```

Dialogs:

```text
16px
```

---

# 18. Shadows

Use subtle shadows.

Recommended:

```text
Card:
very soft elevation

Dialog:
medium elevation

Floating action:
moderate elevation
```

Avoid:

- heavy blur
- neon glow
- dramatic drop shadows

Prefer borders plus soft shadow.

---

# 19. Surface Hierarchy

Recommended:

```text
Page Background
↓
Primary Surface
↓
Nested Surface
↓
Interactive Surface
```

Example:

```text
Page
  Card
    Input
```

Use subtle contrast rather than strong borders everywhere.

---

# 20. Tailwind CSS v4 Token Direction

Use CSS variables.

Example:

```css
:root {
  --background: 0 0% 98%;
  --foreground: 222 20% 14%;

  --card: 0 0% 100%;
  --card-foreground: 222 20% 14%;

  --primary: 230 75% 55%;
  --primary-foreground: 0 0% 100%;

  --muted: 220 14% 96%;
  --muted-foreground: 220 9% 46%;

  --border: 220 13% 91%;

  --destructive: 0 72% 51%;
  --success: 145 55% 42%;
  --warning: 38 90% 50%;

  --lost: 32 88% 56%;
  --found: 171 55% 40%;
  --match: 230 75% 55%;
}
```

Exact values may be tuned after visual testing.

---

# 21. Dark Mode

Dark mode should not be required for MVP.

If implemented later:

- preserve semantic contrast
- do not simply invert colors
- maintain Lost/Found distinction
- ensure status badges remain readable

For MVP:

```text
Light Mode First
```

---

# 22. shadcn/ui Customization

Use shadcn components as foundations, not final visual identity.

Customize:

```text
Button
Card
Badge
Input
Textarea
Dialog
Sheet
Tabs
Select
Dropdown
Toast
Avatar
Skeleton
```

---

# 23. Button System

Use clear button hierarchy.

## Primary

Used for main action.

Examples:

```text
Continue
Submit Claim
Accept Claim
Confirm Handover
```

---

## Secondary

Used for alternative actions.

Examples:

```text
Edit
View Details
Back
```

---

## Ghost

Used for low-priority actions.

Examples:

```text
Cancel
Dismiss
More
```

---

## Destructive

Used only for:

```text
Delete
Reject Claim
Cancel Recovery
Report
```

---

# 24. Button Sizing

Recommended:

```text
Small
32–36px

Default
40–44px

Large
48–52px
```

Mobile primary CTAs should generally be at least:

```text
44px
```

for tap accessibility.

---

# 25. Icon Buttons

Icon-only buttons must have:

- accessible label
- tooltip where appropriate
- minimum hit target

Examples:

```text
Back
Notifications
More
Close
```

---

# 26. Card System

Cards are central to the product.

Main card types:

```text
Listing Card
Match Card
Claim Card
Recovery Card
Profile Card
Notification Card
Review Card
```

---

# 27. Listing Card

Should contain:

```text
Image

LOST / FOUND badge

Title

Category

Approximate location

Date

Status
```

Optional:

```text
match indicator
```

Keep cards concise.

Do not show full descriptions.

---

# 28. Listing Card Structure

Recommended:

```text
Image
↓
Badge + Date
↓
Item Title
↓
Category
↓
Location
↓
Status / Action
```

---

# 29. Match Card

Should emphasize:

```text
Match Score
Item
Reason for match
```

Example:

```text
92%

Strong Possible Match

Black AirPods

Matched on:
Location • Date • Description
```

---

# 30. Claim Card

Finder-facing Claim Card:

```text
Claimant avatar

Name

Trust summary

Item

Submitted time

Status
```

Primary action:

```text
Review Claim
```

---

# 31. Recovery Card

Should emphasize current progress.

Example:

```text
Black Wallet

Recovery with Rahul

Claim Accepted

Next Step:
Arrange handover
```

---

# 32. Badge System

Badges should be concise.

Examples:

```text
LOST

FOUND

ACTIVE

MATCH FOUND

PENDING

ACCEPTED

RETURNED

TRUSTED FINDER
```

Avoid oversized badges.

---

# 33. Badge Variant Strategy

Suggested semantic variants:

```text
default
secondary
success
warning
destructive
lost
found
match
muted
```

Implement through component variants rather than custom classes everywhere.

---

# 34. Form Inputs

Form inputs should be simple and highly readable.

Use:

```text
Label
Input
Helper text
Error
```

Example:

```text
Item Name

[ Black AirPods Pro ]

Use a simple name people would recognize.
```

---

# 35. Required Fields

Use:

```text
*
```

or:

```text
Required
```

consistently.

Do not mix styles.

---

# 36. Input Height

Recommended:

```text
44–48px
```

for standard inputs.

Text areas:

```text
minimum 120px
```

---

# 37. Input Errors

Error states should:

- explain what is wrong
- be near the field
- not rely only on red border

Example:

```text
Please enter the location where you lost the item.
```

---

# 38. Form Section Layout

Multi-step forms should use clear grouping.

Example:

```text
Item Details
─────────────

Item Name
Category
Brand
Color
```

Then:

```text
When and Where
──────────────

Date
Time
Location
```

---

# 39. Multi-Step Form Progress

Use progress text:

```text
Step 2 of 5
```

and optional segmented progress indicator.

Do not create complex animated steppers for simple forms.

---

# 40. Search Bar

Explore search should feel prominent.

Recommended:

```text
Search lost or found items...
```

Include:

```text
search icon
clear button
```

---

# 41. Filter Chips

Common filters can use compact chips.

Examples:

```text
Found

Electronics

Today

Nearby
```

Active filters should be visibly selected.

---

# 42. Filter Sheet

Mobile filtering should use a bottom sheet.

Desktop may use:

- sidebar
- popover
- inline controls

Avoid overcrowding the main search page.

---

# 43. Tabs

Tabs may be used for:

```text
All / Lost / Found

Claims Sent / Received

Reports / Claims / Recoveries
```

Keep tab counts small.

Avoid more than 4–5 primary tabs in a single row.

---

# 44. Dialogs

Use dialogs for:

```text
Accept Claim Confirmation

Reject Claim Confirmation

Close Report

Confirm Handover

Discard Changes
```

Dialog copy should clearly explain consequences.

---

# 45. Sheets

Use sheets for:

```text
Mobile Filters

Post Menu

Quick Actions

Profile Menu
```

---

# 46. Toasts

Use toasts for lightweight confirmation.

Examples:

```text
Report published.

Claim submitted.

Profile updated.
```

Do not use toast-only confirmation for major lifecycle transitions.

---

# 47. Skeleton Loading

Use skeletons for:

```text
Listing cards

Profile blocks

Message list

Activity cards

Match cards
```

Keep skeletons close to the final layout.

---

# 48. Empty States

Empty states should always include:

- clear explanation
- helpful next action

Example:

```text
No lost reports yet.

If you've lost something, create a report and we'll start looking for possible matches.

[ Report Lost Item ]
```

---

# 49. Error States

Error screens should be calm.

Example:

```text
We couldn't load your matches.

Please try again.
```

Actions:

```text
Retry
```

Avoid technical error language.

---

# 50. Notification UI

Notification items should show:

```text
Icon

Title

Short description

Timestamp

Unread indicator
```

Example:

```text
Possible Match Found

A found wallet closely matches your report.

2 min ago
```

---

# 51. Unread State

Use subtle visual emphasis:

- slightly stronger background
- small dot
- stronger text weight

Avoid bright notification colors.

---

# 52. Profile UI

Profile should emphasize trust without over-gamification.

Recommended hierarchy:

```text
Avatar

Name

Trust Summary

Successful Returns

Average Rating

Badges

Reviews
```

---

# 53. Trust Score Presentation

Preferred:

```text
Trust Score
92 / 100
```

paired with contextual stats:

```text
8 Successful Returns

4.9 Average Rating
```

Avoid giant leaderboard-style presentation.

---

# 54. Trust Badge Style

Badges may include:

```text
Trusted Finder

5 Returns

Verified Member
```

Use understated pill styling.

---

# 55. Recovery Timeline

A recovery detail screen should use a clear step timeline.

Example:

```text
Claim Accepted        ✓

Conversation Started  ✓

Handover              •

Confirmation          ○

Completed             ○
```

---

# 56. Timeline States

Use:

```text
Completed
Current
Upcoming
```

Do not create a separate color for every step.

---

# 57. Chat UI

Chat should feel simple.

Message bubbles:

```text
Owner

Finder
```

Need clear alignment distinction.

Avoid excessive bubble styling.

Use:

- readable width
- simple radius
- subdued background
- clear timestamps

---

# 58. Chat Header

Should show:

```text
Recovery Partner

Item

Recovery Status
```

Optional:

```text
View Recovery
```

---

# 59. Chat Safety Banner

Use a calm info surface.

Example:

```text
Meet in a public place and avoid sharing unnecessary personal information.
```

---

# 60. Handover UI

Primary action should be unmistakable.

Finder:

```text
I Handed Over the Item
```

Owner:

```text
I Received My Item
```

Use confirmation dialog before committing.

---

# 61. Recovery Success Screen

Should feel rewarding but restrained.

Example:

```text
✓ Item Returned Successfully
```

Then:

```text
Thanks for helping complete the recovery.
```

Optional small Anime.js success motion may be used.

---

# 62. Rating UI

Use a simple star selector.

```text
☆ ☆ ☆ ☆ ☆
```

Selected:

```text
★ ★ ★ ★ ★
```

Include optional text review.

---

# 63. Image Style

Listing images should use:

```text
rounded corners

consistent aspect ratio

object-fit: cover
```

Suggested card image ratio:

```text
4:3
```

or:

```text
1:1
```

Choose one consistently.

---

# 64. Image Placeholders

If no image exists:

```text
category icon
```

or:

```text
neutral illustration
```

Do not show broken image states.

---

# 65. Avatar System

Use:

```text
image if available
initials fallback
```

Common sizes:

```text
32px
40px
48px
64px
96px
```

---

# 66. Icons

Use one icon family.

Recommended:

```text
Lucide React
```

Icons should support text, not replace important labels.

---

# 67. Icon Usage Examples

```text
Search
Map Pin
Clock
Message Circle
Bell
Shield
Check Circle
Package
Circle Alert
Star
User
```

---

# 68. Navigation Icons

Bottom navigation should use familiar symbols.

Example:

```text
Home

Search

Plus

Activity / Clipboard

User
```

Always show text labels under icons on mobile.

---

# 69. Mobile Navigation Style

Bottom navigation should:

- stay fixed
- have clear safe-area spacing
- avoid covering page content
- highlight active route

Center Post button may be visually elevated but should not look overly promotional.

---

# 70. Desktop Navigation Style

Use a clean top navigation.

Recommended:

```text
Logo

Home
Explore
Activity
Messages

Post +

Bell
Avatar
```

---

# 71. Page Headers

Standard header should contain:

```text
Title
Optional subtitle
Primary action
```

Example:

```text
Possible Matches

Items that may match your lost reports.

[ Explore ]
```

---

# 72. Section Headers

Use:

```text
Title
Optional description
Optional action
```

Example:

```text
Recent Found Items
Items reported by the community.

View All →
```

---

# 73. Data Density

Prefer moderate data density.

Do not show every field in every card.

Cards should show only information needed for the user's next decision.

Detailed data belongs on detail pages.

---

# 74. Content Hierarchy

A typical card hierarchy:

```text
Status

Title

Primary metadata

Secondary metadata

Action
```

---

# 75. Language Style

UI copy should be:

```text
Clear
Human
Reassuring
Direct
```

Avoid:

```text
technical language
legalistic language
overly casual slang
marketing-heavy copy
```

---

# 76. Example Copy

Good:

```text
No matches yet.
We'll keep checking new found listings.
```

Avoid:

```text
Oops! Looks like our AI couldn't find your lost item :(
```

---

# 77. Security Copy

Good:

```text
Some details are hidden to help verify the real owner.
```

Avoid:

```text
Secret details hidden.
```

---

# 78. Claim Copy

Good:

```text
Answer these questions so the finder can verify that the item belongs to you.
```

---

# 79. Rejection Copy

Good:

```text
This claim wasn't accepted.

You can continue reviewing other possible matches.
```

Do not expose which specific answer failed unless the Finder intentionally chooses to explain.

---

# 80. Accessibility

Every screen must support:

```text
keyboard navigation

focus indicators

screen reader labels

semantic buttons

form labels

sufficient contrast

reduced motion
```

---

# 81. Color Contrast

Text/background combinations should aim for:

```text
WCAG AA
```

at minimum.

Status badges must remain legible on both light and tinted surfaces.

---

# 82. Focus States

All interactive elements should have a visible focus style.

Use consistent ring treatment.

Example:

```text
focus-visible:ring
```

with primary semantic color.

---

# 83. Touch Targets

Minimum target size:

```text
44 × 44px
```

where practical.

Especially for:

- icon buttons
- navigation
- mobile actions

---

# 84. Reduced Motion

If user prefers reduced motion:

```text
No entrance transitions

No count-up animation

No celebratory motion
```

Use immediate final states.

---

# 85. Motion Principles

Motion should:

```text
clarify hierarchy
show state change
reinforce success
improve continuity
```

Motion should not:

```text
decorate every element
delay user action
create visual noise
```

Detailed Anime.js rules are defined in:

```text
15-animation-guidelines.md
```

---

# 86. Motion Timing

General guideline:

```text
Micro interaction
150–250ms

Card / section reveal
250–400ms

Page transition
300–500ms

Success moment
500–800ms
```

---

# 87. Motion Easing

Use natural easing.

Prefer:

```text
easeOut
```

for entrance and completion.

Avoid excessive bounce effects.

---

# 88. Recommended Anime.js Usage

Suitable:

```text
Home hero reveal

Match score reveal

Claim accepted transition

Recovery timeline progress

Returned success icon

Trust score update
```

Avoid:

```text
every button hover

all form fields

constant floating elements

looping decorative motion
```

---

# 89. Responsive Rules

## Mobile

Prioritize:

```text
single-column layout

full-width buttons

bottom navigation

bottom sheets

sticky actions

large tap targets
```

---

## Tablet

Allow:

```text
two-column cards

wider forms

split detail layout where useful
```

---

## Desktop

Use:

```text
multi-column layouts

comparison panels

persistent side filters

top navigation
```

---

# 90. Mobile Form Layout

Recommended:

```text
Title

Field

Field

Field

Sticky Continue Button
```

Do not put two small fields side by side unless they remain easy to use.

---

# 91. Desktop Form Layout

Related fields may be grouped into two columns.

Example:

```text
Brand       Color
```

but descriptions and location fields should remain full width.

---

# 92. Sticky Actions

On mobile, important long-form actions may use a sticky bottom area.

Examples:

```text
Continue

Submit Claim

Publish Listing

Confirm Handover
```

Ensure the sticky area does not hide content.

---

# 93. Loading Button States

When submitting:

```text
Submit Claim
```

becomes:

```text
Submitting...
```

and should be disabled.

Prevent accidental duplicate submission.

---

# 94. Disabled States

Disabled actions should remain readable.

Do not rely on opacity alone.

Where needed, explain why the action is disabled.

Example:

```text
Chat becomes available after the claim is accepted.
```

---

# 95. Confirmation Patterns

Critical actions require confirmation.

Examples:

```text
Accept Claim

Reject Claim

Close Listing

Confirm Handover

Cancel Recovery
```

---

# 96. Destructive Action Placement

Destructive actions should not sit directly beside the primary CTA without clear visual separation.

Example:

Preferred:

```text
[ Accept Claim ]

Reject Claim
```

rather than:

```text
[ Accept ] [ Reject ]
```

with equal prominence.

---

# 97. Privacy Indicators

Private fields should always have visual markers.

Example:

```text
🔒 Private

Only you and the verification system can use this information.
```

---

# 98. Approximate Location Indicator

Use wording like:

```text
Near Main Library
```

instead of displaying precise coordinates publicly.

Optionally:

```text
Approximate location
```

as helper text.

---

# 99. Match Explanation UI

Do not show only the percentage.

Provide supporting signals.

Example:

```text
92% Possible Match

Similar:
✓ Category
✓ Location
✓ Date
✓ Description
```

This builds trust in the matching system.

---

# 100. Match Score Progress Indicator

If using a visual meter:

- keep it subtle
- do not mimic financial risk meters
- always include text label

Example:

```text
92%
Strong Possible Match
```

---

# 101. Safety Callouts

Use subdued info cards.

Example:

```text
Safety Tip

Meet in a public place and keep communication inside the app when possible.
```

---

# 102. Success Callouts

Use soft green / success styling.

Example:

```text
Claim Accepted

You can now message the finder.
```

---

# 103. Warning Callouts

Use amber.

Example:

```text
Waiting for owner confirmation.
```

---

# 104. Destructive Callouts

Use red only for true errors or risk.

Example:

```text
This recovery has been cancelled.
```

---

# 105. Illustration Strategy

Use illustrations sparingly.

Best places:

```text
Landing

Empty states

Success screens
```

Avoid illustrative artwork inside every card.

---

# 106. Photography Strategy

User-generated item photos should remain the primary visual content.

Do not place decorative stock photos around item listings.

---

# 107. Home Visual Hierarchy

Recommended:

```text
Greeting

Primary Lost / Found actions

Possible Matches

Active Recovery

Recent Listings
```

The user should not have to scroll significantly to reach:

```text
I Lost Something

I Found Something
```

---

# 108. Home Action Cards

The two hero cards should feel related but distinct.

Example:

```text
Lost Something?
Report it and start searching.

[ Report Lost Item ]
```

```text
Found Something?
Help return it safely.

[ Report Found Item ]
```

---

# 109. Explore Visual Hierarchy

Recommended:

```text
Search

Lost / Found Tabs

Filter chips

Results count

Listing grid
```

---

# 110. Item Detail Visual Hierarchy

Recommended:

```text
Status Badge

Image

Title

Primary Metadata

Description

Finder / Owner

Action

Safety / Verification Information
```

---

# 111. Match Detail Visual Hierarchy

Recommended:

```text
Match Confidence

Your Report

Found Listing

Matched Signals

Primary Action
```

---

# 112. Claim Review Visual Hierarchy

Finder should see:

```text
Claimant

Trust Summary

Lost Report

Verification Answers

Decision Actions
```

Do not bury verification answers below unrelated content.

---

# 113. Chat Visual Hierarchy

```text
Recovery Context

Messages

Composer
```

The associated item should always be visible from chat header or accessible with one tap.

---

# 114. Recovery Detail Visual Hierarchy

```text
Item

Recovery Partner

Current Status

Timeline

Primary Next Action

Chat

Safety Information
```

---

# 115. Profile Visual Hierarchy

```text
Identity

Trust

Return Stats

Badges

Reviews
```

---

# 116. Iconography Rules

Use consistent stroke-based icons.

Recommended size:

```text
16px
20px
24px
```

Avoid mixing filled and outline icon styles without a clear reason.

---

# 117. Divider Usage

Prefer spacing over excessive dividers.

Use separators only where sections need stronger distinction.

---

# 118. Borders

Default border:

```text
1px subtle neutral
```

Avoid thick borders unless indicating selection.

---

# 119. Selected States

Selected filters/cards may use:

```text
border-primary
background-primary/5
```

or similar subtle treatment.

---

# 120. Hover States

Desktop hover should provide gentle feedback.

Example:

```text
slightly stronger border
small translate or shadow change
```

Avoid dramatic scaling.

---

# 121. Card Hover Motion

If used:

```text
translateY(-2px)
```

or subtle shadow change.

Keep under:

```text
200ms
```

No bouncing.

---

# 122. Active Press State

Mobile interactive cards/buttons should provide immediate tactile feedback.

Example:

```text
scale(0.98)
```

may be used sparingly.

---

# 123. Design System Components

Reusable application-level components should include:

```text
PageHeader

SectionHeader

ListingCard

MatchCard

StatusBadge

TrustBadge

EmptyState

ErrorState

LoadingCard

UserSummary

RecoveryTimeline

SafetyNotice

PrivateFieldNotice

MatchScore

RatingStars
```

---

# 124. Component Variant Rules

Component variations should be explicit.

Example:

```text
ListingCard

variant:
default
compact
horizontal
```

Do not create endless one-off class overrides.

---

# 125. CSS Ownership

Global styles should be limited to:

```text
tokens

resets

base typography

body

root
```

Feature-specific styling should remain local through Tailwind classes and component variants.

---

# 126. Avoiding Design Drift

Before creating a new visual pattern, ask:

```text
Does an existing component already solve this?
```

If yes:

reuse it.

If no:

create a reusable component if the pattern will appear more than once.

---

# 127. Design QA Checklist

Every screen should be reviewed for:

```text
Spacing consistency

Typography hierarchy

Status clarity

Responsive behavior

Contrast

Loading state

Empty state

Error state

Focus state

Reduced motion

Touch targets
```

---

# 128. MVP Visual Priorities

Highest priority:

```text
Home

Report Lost

Report Found

Explore

Item Detail

Match Card

Match Detail

Claim Flow

Recovery

Chat

Handover

Profile
```

Lower priority:

```text
Decorative landing animations

Advanced illustration

Dark mode

Complex map visuals
```

---

# 129. Design System Summary

The application should visually communicate:

```text
"I can understand what is happening."

"I know what I should do next."

"My private information is protected."

"This platform feels trustworthy."

"This recovery process is structured."
```

The design system should reinforce the product lifecycle:

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

The UI should remain simple enough that a first-time user can report or recover an item without needing instructions.
