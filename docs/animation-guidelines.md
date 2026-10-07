# Lost & Found Platform — Animation Guidelines

## 1. Purpose

This document defines how motion and animation should be used throughout the Lost & Found Platform.

The application uses:

```text
Anime.js
```

for intentional UI motion.

Animation must support the product experience rather than decorate it.

The design goal is:

```text
Calm
Clear
Responsive
Helpful
Trustworthy
```

Animation should help users understand:

- what changed
- where content came from
- what action succeeded
- what requires attention
- what step comes next

It should never make the application feel like:

- a game
- a promotional landing page
- a flashy ecommerce store
- a motion-heavy showcase

---

# 2. Core Motion Principle

The main rule is:

> Motion should communicate state and continuity, not compete for attention.

Every animation should have a reason.

Before adding an animation, ask:

```text
Does this explain something?

Does this reinforce an important state change?

Does this help users understand navigation?

Does this make the interaction feel more responsive?
```

If the answer is no, do not animate it.

---

# 3. Motion Priorities

Animation is most valuable for:

```text
Page entry

Content reveal

Match discovery

Claim success

Recovery progress

Handover confirmation

Recovery completion

Trust score update

Loading transitions
```

Animation is less valuable for:

```text
Every text label

Every icon

Every card hover

Every navigation click

Static informational content
```

---

# 4. Technology

Primary animation library:

```text
Anime.js
```

CSS and Tailwind transitions may still be used for very small interactions.

Recommended split:

```text
Simple hover/focus/opacity transitions
→ CSS / Tailwind

Sequenced or state-driven animation
→ Anime.js
```

---

# 5. Where Anime.js Should Be Used

Recommended:

```text
Hero reveals

Staggered card entrances

Match-score reveal

Claim accepted state

Recovery timeline progress

Handover confirmation

Return success screen

Trust score count transition

Important modal state transitions
```

---

# 6. Where Anime.js Should Not Be Used

Avoid Anime.js for:

```text
Button color hover

Simple border changes

Input focus

Basic opacity hover

Navigation active state

Tiny icon rotation
```

These should normally use CSS transitions.

---

# 7. Motion Personality

Motion should feel:

```text
Soft

Controlled

Fast

Natural

Purposeful
```

Avoid:

```text
Bouncy

Elastic

Chaotic

Overdramatic

Slow cinematic effects
```

---

# 8. Timing Scale

Recommended durations:

```text
Micro interaction
120–200ms

Small component
180–260ms

Card / section reveal
250–400ms

Modal / sheet emphasis
250–350ms

Page reveal
300–500ms

Success sequence
450–800ms
```

Animations should rarely exceed:

```text
800ms
```

for functional UI.

---

# 9. Default Durations

Recommended defaults:

```text
Fast
160ms

Default
240ms

Medium
320ms

Slow
480ms
```

These may become shared motion tokens.

---

# 10. Easing

Prefer natural deceleration.

Recommended:

```text
easeOutQuad

easeOutCubic

easeOutExpo
```

or equivalent Anime.js easing.

Use stronger easing only for major success moments.

Avoid excessive:

```text
spring
bounce
elastic
```

behavior.

---

# 11. Entry Animation

Recommended pattern:

```text
opacity: 0 → 1

translateY: 8–16px → 0
```

Duration:

```text
250–400ms
```

This is suitable for:

- cards
- sections
- form groups
- result blocks

---

# 12. Exit Animation

Exit animations should be shorter than entry animations.

Recommended:

```text
opacity: 1 → 0

translateY: 0 → -4px
```

Duration:

```text
120–200ms
```

Users should not wait for content to disappear.

---

# 13. Avoid Large Movement

Most interface motion should remain within:

```text
4–24px
```

Avoid moving components across large portions of the viewport unless the interaction itself requires it.

---

# 14. Staggered Animation

Use stagger when displaying small groups.

Example:

```text
Match cards
Recent listings
Activity cards
```

Recommended stagger:

```text
40–80ms
```

between items.

---

# 15. Stagger Limits

Do not stagger very large lists.

Bad:

```text
50 search results
each delayed by 80ms
```

This creates unnecessary waiting.

Recommended:

```text
animate first visible 4–8 items
```

or skip stagger entirely for large lists.

---

# 16. Page Entry

A page may animate:

```text
Page heading

Primary content container
```

Avoid animating every individual child.

Recommended:

```text
Heading
↓ 40ms
Supporting text
↓ 60ms
Primary content
```

Total sequence should remain quick.

---

# 17. Route Changes

Route navigation should feel immediate.

Do not block route changes behind an animation.

Recommended:

```text
Navigate immediately
      ↓
New page performs subtle entry
```

Avoid:

```text
Play 500ms exit
      ↓
Then navigate
```

---

# 18. Landing Page Motion

The landing page can contain slightly richer motion than authenticated product screens.

Possible:

```text
Hero headline reveal

CTA reveal

Small illustrative movement

Section entrance
```

However, it should still remain restrained.

---

# 19. Home Screen Animation

Recommended entry:

```text
Greeting
      ↓
Lost / Found primary cards
      ↓
Possible Matches section
      ↓
Active Recovery
```

Do not replay the full sequence every time data refetches.

---

# 20. Primary Action Cards

Home:

```text
Report Lost Item

Report Found Item
```

may appear with:

```text
opacity + small translateY
```

They should not continuously float or pulse.

---

# 21. Explore Animation

When Explore loads:

```text
Search area
      ↓
Filters
      ↓
Results
```

Search result updates should generally not trigger large entrance animations.

A light fade is enough.

---

# 22. Search Result Changes

When filters change:

Avoid:

```text
all cards slide dramatically off screen
```

Prefer:

```text
small opacity transition
```

or immediate update with skeleton/loading state.

---

# 23. Listing Card Hover

Desktop only.

Recommended:

```text
translateY: 0 → -2px

shadow slightly increases
```

Duration:

```text
150–180ms
```

Prefer CSS rather than Anime.js.

---

# 24. Listing Card Press

Mobile may use:

```text
scale: 1 → 0.985
```

very briefly.

Use sparingly.

---

# 25. Image Hover

Avoid unnecessary image zoom.

If used:

```text
scale: 1 → 1.02
```

maximum.

Do not create ecommerce-style dramatic zoom effects.

---

# 26. Report Form Transitions

For multi-step Lost/Found forms:

Recommended step transition:

```text
Current step
fade out

Next step
fade + small horizontal or vertical movement
```

Duration:

```text
180–280ms
```

---

# 27. Form Direction

Optional:

Next:

```text
translateX: 8px → 0
```

Back:

```text
translateX: -8px → 0
```

Keep the movement small.

---

# 28. Form Errors

Do not shake inputs aggressively.

Preferred:

```text
error border appears
error message fades in
```

A tiny horizontal movement may be used only if subtle.

---

# 29. Field Validation Success

Do not animate every valid field.

Validation feedback should remain calm.

Use:

```text
icon fade-in
```

only where necessary.

---

# 30. Upload Animation

Image upload may use:

```text
progress indicator

preview fade-in

success check transition
```

Avoid looping decorative animation after upload finishes.

---

# 31. Image Preview

When an image is selected:

```text
opacity 0 → 1
scale 0.98 → 1
```

Duration:

```text
180–250ms
```

---

# 32. Match Discovery

Match discovery is one of the product's most important motion moments.

When a strong match becomes visible:

```text
Match card reveal
      ↓
Score reveal
      ↓
Matched signals
```

This may use a controlled sequence.

---

# 33. Match Card Reveal

Recommended:

```text
opacity: 0 → 1

translateY: 12px → 0
```

Duration:

```text
300ms
```

---

# 34. Match Score Animation

Example:

```text
0 → 92
```

count-up.

Duration:

```text
500–700ms
```

Use only when the score first appears.

Do not replay on every render.

---

# 35. Match Progress Indicator

If using a circular or linear indicator:

Animate from:

```text
0
```

to:

```text
match score
```

at the same time as the count.

The final value must come from backend data.

Animation must never calculate the actual score.

---

# 36. Match Label Timing

The label:

```text
Very Strong Possible Match
```

may fade in after the score begins.

Example sequence:

```text
card reveal
      ↓
score
      ↓
label
      ↓
match factors
```

Keep the total experience under roughly:

```text
800ms
```

---

# 37. No Match Animation

No-match state should use a simple fade.

Do not create sad or dramatic animations.

Recommended tone:

```text
No possible matches yet.

We'll keep checking new listings.
```

---

# 38. Claim Submission

After successful claim submission:

```text
Submit button
      ↓
Loading
      ↓
Success check
      ↓
Claim Submitted state
```

Use a small success transition.

---

# 39. Claim Success Motion

Recommended:

```text
check icon scale:
0.85 → 1

opacity:
0 → 1
```

Duration:

```text
300–450ms
```

Avoid confetti.

---

# 40. Claim Acceptance

Claim acceptance is significant.

Finder presses:

```text
Accept Claim
```

After backend confirmation:

```text
status badge changes
      ↓
recovery card appears
      ↓
chat available
```

These may animate sequentially.

---

# 41. Claim Acceptance Animation

Recommended:

```text
Success icon

"Claim Accepted"

Recovery next steps
```

Duration:

```text
400–600ms
```

Keep interaction professional.

---

# 42. Claim Rejection

Rejection should not have celebratory motion.

Use:

```text
small fade
```

and status change only.

Avoid:

```text
red shake animation

dramatic cross animation
```

---

# 43. Chat Animation

Chat should prioritize speed.

New message:

```text
opacity 0 → 1

translateY 4px → 0
```

Duration:

```text
120–180ms
```

---

# 44. Chat Message Animation

Do not animate entire conversation when new message arrives.

Only the newly inserted message should receive subtle motion.

---

# 45. Optimistic Message State

When sending:

```text
message enters
```

with slightly reduced opacity.

When confirmed:

```text
opacity → full
```

If failed:

```text
error indicator appears
```

Avoid shaking the message.

---

# 46. Conversation Opening

Conversation page may:

```text
fade in header
```

while messages display immediately.

Do not stagger every historical message.

---

# 47. Unread Badge Motion

When unread count increases:

Optional:

```text
scale 0.9 → 1
```

Duration:

```text
120–160ms
```

No repeated pulsing.

---

# 48. Notification Arrival

For in-app realtime notification:

```text
Notification item
fade + small translateY
```

If a toast appears:

```text
slide/fade in
```

quickly.

---

# 49. Notification Badge

Bell badge may use one short emphasis animation when:

```text
0 unread → 1 unread
```

Do not animate continuously.

---

# 50. Recovery Timeline

Recovery progression is a strong candidate for meaningful animation.

Example:

```text
Claim Accepted      ✓

Chat Started        ✓

Handover            •

Confirmation        ○

Completed           ○
```

When progress advances:

```text
timeline connector fills
      ↓
new step activates
```

---

# 51. Timeline Step Transition

Recommended:

```text
connector progress
250–350ms

step indicator
scale 0.9 → 1

label
opacity transition
```

---

# 52. Timeline Motion Rules

Only animate:

```text
changed step
```

Do not replay the full timeline each time the page opens.

---

# 53. Handover Confirmation

When Finder confirms:

```text
I Handed Over the Item
```

after backend success:

```text
Finder step becomes complete
```

with a small check animation.

---

# 54. Partial Confirmation

If only one participant confirmed:

```text
✓ Finder confirmed

○ Waiting for Owner
```

Animate only the completed side.

Avoid making the waiting state pulse continuously.

---

# 55. Recovery Completion

This is the largest success moment in the product.

When both users confirm:

```text
Recovery completed
```

the UI may use a slightly richer sequence.

---

# 56. Recovery Completion Sequence

Recommended:

```text
Timeline completes
      ↓
Success icon appears
      ↓
"Item Returned Successfully"
      ↓
Supporting text
      ↓
Rating CTA
```

Total duration:

```text
600–900ms
```

Do not delay access to the next action.

---

# 57. Recovery Success Icon

Possible animation:

```text
circle scale:
0.8 → 1

check path / icon:
opacity 0 → 1
```

Use restrained easing.

---

# 58. Confetti

Do not use large confetti effects for MVP.

The product deals with real personal belongings and trust.

A calm confirmation is more appropriate.

---

# 59. Rating Interaction

Star selection may use:

```text
small scale
```

on the selected star.

Example:

```text
1 → 1.08 → 1
```

Duration:

```text
120–160ms
```

Prefer CSS.

---

# 60. Rating Success

After successful submission:

```text
stars remain selected
      ↓
success message fades in
```

No major animation is necessary.

---

# 61. Trust Score Update

After a recovery/rating changes trust:

Example:

```text
78 → 82
```

A count transition may be used.

Duration:

```text
500–700ms
```

---

# 62. Trust Animation Rules

Animate only when:

```text
the score actually changed
```

Do not count from zero every time a profile page loads.

---

# 63. Trust Badge Reveal

If a user earns a new badge:

```text
Trusted Finder
```

the badge may:

```text
fade + small scale
```

once.

Do not create a game-style unlock screen unless product direction changes.

---

# 64. Modal Animation

Dialogs should normally rely on Radix/shadcn transitions.

If Anime.js is used:

```text
opacity 0 → 1

scale 0.98 → 1
```

Duration:

```text
180–250ms
```

---

# 65. Bottom Sheet Animation

Mobile sheets naturally slide from the bottom.

Duration:

```text
220–320ms
```

Avoid overshoot.

---

# 66. Dropdown Animation

Use simple CSS/Radix transitions.

No need for Anime.js.

---

# 67. Tab Changes

Prefer:

```text
active indicator transition
```

and immediate content update.

Do not slide large content areas back and forth aggressively.

---

# 68. Skeleton to Content

When data finishes loading:

```text
Skeleton
      ↓
Content
```

use:

```text
short crossfade
```

if desired.

Duration:

```text
150–200ms
```

---

# 69. Avoid Layout Shift

Animations must not cause large unexpected layout movement.

Prefer transform and opacity instead of repeatedly animating:

```text
width
height
top
left
margin
```

when possible.

---

# 70. Performance-Friendly Properties

Prefer animating:

```text
transform

opacity
```

These are generally more performant.

---

# 71. Avoid Heavy Layout Animation

Use caution with:

```text
width

height

margin

padding

position
```

because they may trigger layout recalculation.

---

# 72. GPU-Friendly Motion

Recommended:

```text
translate

scale

opacity
```

for most motion.

Do not add unnecessary:

```text
filter blur animations
```

across large areas.

---

# 73. Large Blur Effects

Avoid animating:

```text
blur(0 → 30px)
```

on large containers.

This can be expensive, especially on mobile devices.

---

# 74. Animation Cleanup

Anime.js instances must be cleaned up when:

- component unmounts
- route changes
- animation target disappears

Do not leave animations referencing removed DOM elements.

---

# 75. React Integration

Animation should integrate with React through:

```text
refs

effects

dedicated hooks
```

not by manually querying arbitrary DOM nodes globally.

---

# 76. Recommended Pattern

Example architecture:

```text
Component
   ↓
ref
   ↓
useEffect
   ↓
Anime.js
```

Cleanup occurs in the effect return.

---

# 77. Avoid Global Selectors

Avoid:

```text
anime(".card")
```

across the whole app where possible.

Prefer animation scoped to the component.

This prevents accidental animation of unrelated elements.

---

# 78. Animation Utilities

Recommended structure:

```text
src/lib/animation/
├── presets.ts
├── reduced-motion.ts
├── animate-entry.ts
├── animate-success.ts
└── types.ts
```

---

# 79. Shared Presets

Possible presets:

```text
fadeIn

fadeUp

fadeScale

successPop

staggerCards

countValue
```

Avoid recreating slightly different timings everywhere.

---

# 80. Motion Tokens

Recommended constants:

```text
FAST = 160

DEFAULT = 240

MEDIUM = 320

SLOW = 480
```

And:

```text
STAGGER_SMALL = 40

STAGGER_DEFAULT = 60
```

---

# 81. Reduced Motion

The application must respect:

```text
prefers-reduced-motion
```

This is mandatory.

---

# 82. Reduced Motion Behavior

When enabled:

Disable:

```text
page entrance movement

staggered motion

score count-up

timeline movement

success scale effects
```

Prefer:

```text
immediate final state
```

or very short opacity changes.

---

# 83. Detecting Reduced Motion

Frontend should provide a reusable mechanism such as:

```text
useReducedMotion()
```

which reads:

```text
window.matchMedia(
  "(prefers-reduced-motion: reduce)"
)
```

---

# 84. Reduced Motion Is Dynamic

If possible, respond when the user's system setting changes.

Do not assume the preference never changes during a session.

---

# 85. Motion and Accessibility

Animation must never be required to understand:

```text
status

success

failure

progress
```

Example:

If a recovery completes:

```text
check animation
```

is optional.

Text:

```text
Item Returned Successfully
```

is required.

---

# 86. Flashing

Never create rapidly flashing animations.

Avoid any effect that could present seizure risk.

---

# 87. Continuous Motion

Avoid continuously looping elements.

Examples to avoid:

```text
floating cards

pulsing buttons

rotating decorative shapes

constant background particles
```

---

# 88. Loading Animation

Loading indicators may loop while loading.

This is one of the few acceptable continuous motion states.

Still respect reduced-motion preferences where practical.

---

# 89. Progress Indicators

When actual progress is available:

```text
upload 64%
```

show real progress.

Do not animate fake progress indefinitely.

---

# 90. Button Loading

Primary action may change:

```text
Submit Claim
```

to:

```text
Submitting...
```

with spinner.

Do not animate the entire button across the screen.

---

# 91. Disable During Submission

Loading animation should accompany:

```text
disabled interaction
```

to prevent duplicate actions.

---

# 92. Animation and Backend State

Important rule:

> Animation must follow backend success, not assume it.

Bad:

```text
User clicks Confirm Handover
      ↓
Success animation immediately
      ↓
Backend request fails
```

Good:

```text
User clicks Confirm Handover
      ↓
Loading
      ↓
Backend confirms success
      ↓
Success animation
```

---

# 93. Optimistic Exceptions

Chat messages may use optimistic animation because failure is recoverable.

Critical operations should not.

Avoid optimistic success for:

```text
Claim Accepted

Recovery Completed

Trust Updated

Rating Submitted
```

unless the architecture explicitly supports rollback.

---

# 94. Animation Replay Rules

Animations should normally play:

```text
once per meaningful state transition
```

not every render.

---

# 95. Prevent Replay

Store awareness through:

```text
component lifecycle

state transition comparison

animation ref

session UI state
```

as appropriate.

---

# 96. Score Replay

Example:

Do not animate:

```text
0 → 92
```

every time TanStack Query refetches the same match.

Animate only when:

```text
score first appears
```

or meaningfully changes.

---

# 97. Recovery Replay

Do not replay the full recovery success sequence whenever the completed recovery page is reopened.

On later visits:

```text
show completed state immediately
```

A tiny entry fade is enough.

---

# 98. Navigation Animation

Bottom navigation should not have moving indicators that travel long distances.

A small active-state transition is sufficient.

---

# 99. Mobile Motion

Mobile animations should generally be:

```text
shorter

smaller

less complex
```

than desktop due to:

- smaller screens
- touch interactions
- device performance variation

---

# 100. Desktop Motion

Desktop may allow slightly larger:

```text
hover feedback

section transitions

split-panel transitions
```

but the core timing system should remain consistent.

---

# 101. Responsive Motion

Animation must not rely on fixed pixel assumptions that break across screen sizes.

Use refs and current element dimensions where necessary.

---

# 102. Scroll-Based Animation

Use scroll-based animation sparingly.

Good place:

```text
public landing page
```

Avoid on functional authenticated screens where users need immediate access.

---

# 103. Intersection-Based Reveals

For long landing pages, reveal sections once as they enter viewport.

Do not repeatedly replay when scrolling up and down.

---

# 104. Parallax

Avoid parallax for MVP.

It adds complexity and does not improve the recovery workflow.

---

# 105. Drag Animations

Drag-and-drop is not required for MVP.

If image ordering later supports drag:

motion should primarily provide positional feedback.

---

# 106. Toast Animation

Toast may:

```text
fade + translateY
```

Duration:

```text
180–240ms
```

Exit:

```text
120–160ms
```

---

# 107. Error Motion

Error feedback should be clear but calm.

Recommended:

```text
message fade-in

border transition
```

Avoid:

```text
large shake

flashing red

rapid vibration
```

---

# 108. Unauthorized Screen

No special motion necessary.

Use a simple page fade.

---

# 109. 404 / Error Screens

Illustrative animation is not required.

If included, it should remain subtle and non-looping.

---

# 110. Empty States

Empty-state illustration may have one entrance animation.

Do not loop.

---

# 111. Safety Notices

Safety notices should not pulse or demand attention aggressively.

Their importance comes from:

```text
placement

icon

copy

contrast
```

not repeated motion.

---

# 112. Private Field Indicators

Private/locked field labels do not need animation.

A simple lock icon and helper text are sufficient.

---

# 113. Match Strength Change

If a match score updates:

```text
76 → 88
```

a subtle numeric transition is acceptable.

Do not dramatically recolor or celebrate the increase.

A higher match remains only a possible match.

---

# 114. Status Badge Changes

When status changes:

```text
PENDING
→
ACCEPTED
```

use:

```text
short crossfade
```

rather than removing and reinserting the entire page.

---

# 115. Recommended Motion Presets

### Fade In

```text
opacity:
0 → 1

duration:
240ms
```

### Fade Up

```text
opacity:
0 → 1

translateY:
12 → 0

duration:
320ms
```

### Fade Scale

```text
opacity:
0 → 1

scale:
0.98 → 1

duration:
240ms
```

### Success Pop

```text
opacity:
0 → 1

scale:
0.88 → 1

duration:
400ms
```

---

# 116. Suggested Anime.js Helper API

Conceptually:

```text
animateFadeIn(element)

animateFadeUp(element)

animateSuccess(element)

animateMatchScore(element, score)

animateStagger(elements)

animateTimelineStep(element)
```

Central helpers keep behavior consistent.

---

# 117. Animation Hooks

Possible:

```text
useAnime()

useReducedMotion()

useEntryAnimation()

useCountAnimation()
```

Do not create hooks unless they genuinely reduce duplication.

---

# 118. Anime.js and React State

Anime.js should manipulate presentation.

React should remain authoritative for:

```text
visibility

status

route

business data

loading

errors
```

Do not use Anime.js callbacks as the source of business-state changes.

---

# 119. Bad Pattern

Avoid:

```text
animation completes
→ claim status becomes accepted
```

---

# 120. Correct Pattern

Use:

```text
Backend says accepted
      ↓
React state updates
      ↓
Anime.js visualizes accepted state
```

---

# 121. Cleanup on Rapid Navigation

If a user quickly leaves during animation:

```text
stop / cleanup animation
```

Do not generate errors because the target disappeared.

---

# 122. Async Data and Motion

Data may arrive after page load.

Animate newly appearing meaningful content only if:

```text
user has not already seen it
```

Do not animate entire page again after every query invalidation.

---

# 123. Skeleton Interaction

Skeleton itself should not use complicated shimmer if reduced-motion is enabled.

A static muted skeleton is acceptable.

---

# 124. Shimmer

If using shimmer:

- low contrast
- slow
- subtle

Disable or simplify under reduced motion.

---

# 125. Performance Budget

Animation must never noticeably:

```text
delay interaction

drop frames

block scrolling

make typing lag

increase chat latency
```

The target is approximately:

```text
60 FPS
```

on normal supported devices where practical.

---

# 126. Heavy Animations

Avoid animating many large elements simultaneously.

Example:

Bad:

```text
20 cards
+
blur
+
scale
+
shadow
+
background
```

all at once.

---

# 127. Mobile Testing

Test motion on:

```text
mid-range Android

small viewport

slower CPU mode
```

not only high-end developer machines.

---

# 128. Reduced Motion Testing

Every major animation flow must be tested with:

```text
prefers-reduced-motion: reduce
```

enabled.

---

# 129. Keyboard Interaction

Motion must not:

- move focus unexpectedly
- hide focused controls
- delay focus placement in dialogs

Focus behavior has higher priority than animation.

---

# 130. Dialog Focus

When a dialog opens:

```text
focus management
```

should work immediately.

Do not delay focus until the animation finishes.

---

# 131. Screen Reader Behavior

Animations do not need to be announced.

State changes do.

Example:

After handover confirmation:

```text
Finder confirmed handover.
```

should be available through accessible status messaging where appropriate.

---

# 132. Motion QA Checklist

For each animation, verify:

```text
Purpose is clear

Duration is short

Easing is consistent

No business logic depends on it

Reduced motion works

No layout shift

No focus problems

No performance degradation

Does not replay unnecessarily

Works on mobile
```

---

# 133. Product Motion Map

Recommended motion usage by area:

```text
Landing
Medium

Home
Low–Medium

Explore
Low

Listings
Low

Report Forms
Low–Medium

Matching
Medium

Claims
Medium

Chat
Very Low

Recovery
Medium

Handover
Medium

Success
Medium–High

Profile
Low

Notifications
Low
```

---

# 134. MVP Required Animations

Implement:

```text
Basic page fade/reveal

Report step transitions

Listing/card entry where appropriate

Match reveal

Match score count-up

Claim success

Realtime new message entry

Recovery timeline step update

Handover confirmation

Recovery completed success state

Trust score transition
```

---

# 135. Not Required for MVP

Do not spend development time on:

```text
3D animation

Particle effects

Complex page morphing

Parallax

Animated backgrounds

Continuous floating cards

Heavy SVG path animation

Cursor-following effects

Elaborate loading scenes
```

---

# 136. Recommended Implementation Order

```text
1. Reduced motion utility

2. Motion tokens

3. Shared Anime.js helpers

4. Page entry

5. Form step transition

6. Match reveal

7. Match score

8. Chat message entry

9. Claim success

10. Recovery timeline

11. Handover confirmation

12. Recovery success

13. Trust score transition

14. Performance audit

15. Accessibility audit
```

---

# 137. Animation Definition of Done

Animation implementation is ready when:

1. Anime.js is used only where it adds value.
2. Simple transitions remain CSS-based.
3. All core durations are consistent.
4. Major motion uses transforms and opacity where possible.
5. Match reveal feels noticeable but not dramatic.
6. Claims only animate success after backend confirmation.
7. Chat messages appear quickly.
8. Recovery progression clearly communicates state.
9. Handover confirmation has restrained feedback.
10. Recovery completion feels rewarding without excessive celebration.
11. Trust changes animate only when values actually change.
12. Animations do not replay on ordinary query refetches.
13. Route navigation is never delayed for animation.
14. Components clean up active animations on unmount.
15. Reduced-motion users receive immediate or simplified states.
16. Animations do not interfere with keyboard focus.
17. Mobile performance remains smooth.
18. Error states avoid aggressive motion.
19. Continuous decorative animations are absent.
20. Business state remains controlled by React and the backend.

---

# 138. Final Motion Architecture

```text
                APPLICATION STATE
                       │
                       ▼
                    REACT UI
                       │
                       ▼
               STATE HAS CHANGED
                       │
            ┌──────────┴──────────┐
            │                     │
            ▼                     ▼
      Reduced Motion?             No
            │                     │
           YES                    ▼
            │                Anime.js
            │                     │
            ▼                     ▼
      Final State           Visual Transition
            │                     │
            └──────────┬──────────┘
                       │
                       ▼
                 FINAL UI STATE
```

The fundamental rule is:

> State creates animation. Animation never creates state.

Motion should reinforce the core recovery journey:

```text
REPORT
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

The user should remember that the platform helped them recover an item—not that the interface contained a lot of animation.