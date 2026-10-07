# Lost & Found Platform — Notifications

## 1. Purpose

This document defines the notification system for the Lost & Found Platform.

Notifications exist to help users stay aware of meaningful changes in the recovery lifecycle without requiring them to repeatedly check the application.

The notification system must support:

- possible match alerts
- claim updates
- new message alerts
- handover updates
- recovery completion
- rating reminders
- unread state
- notification history
- deep linking into relevant screens
- deduplication
- realtime delivery where appropriate
- future push/email delivery

The notification system supports the lifecycle:

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
```

---

# 2. Notification Philosophy

Notifications should be:

- meaningful
- timely
- low-noise
- actionable
- privacy-aware
- directly connected to user activity

The platform should avoid unnecessary notifications.

Users should not receive alerts for every internal system event.

---

# 3. Initial Notification Scope

MVP notification channel:

```text
IN-APP NOTIFICATIONS
```

Future channels:

```text
PUSH NOTIFICATIONS

EMAIL NOTIFICATIONS
```

Push and email should not block MVP release.

---

# 4. Notification Architecture

Recommended architecture:

```text
Backend Event
     ↓
Business Rule
     ↓
Create Notification Record
     ↓
notifications table
     ↓
Optional Realtime Event
     ↓
Frontend
     ↓
Notification Badge / Center
```

The database row is the authoritative notification record.

Realtime delivery is only a convenience layer.

---

# 5. Notifications Table

Existing schema:

```text
notifications
├── id
├── user_id
├── type
├── title
├── body
├── reference_type
├── reference_id
├── read_at
└── created_at
```

---

# 6. Notification Ownership

Each notification belongs to exactly one user.

```text
notifications.user_id
```

must reference the recipient.

Users must only be able to read their own notifications.

---

# 7. Notification Types

Initial supported types:

```text
MATCH_FOUND

CLAIM_RECEIVED

CLAIM_ACCEPTED

CLAIM_REJECTED

NEW_MESSAGE

HANDOVER_UPDATE

RECOVERY_COMPLETED

RATING_REQUEST

SYSTEM
```

Additional types may be introduced later if genuinely useful.

---

# 8. MATCH_FOUND

Used when the matching engine identifies a sufficiently strong potential match.

Example:

```text
Possible Match Found

A found item may match your lost report.
```

or for Finder:

```text
Possible Owner Found

A lost report may match the item you found.
```

---

# 9. Match Notification Threshold

Recommended initial notification threshold:

```text
overall_score >= 75
```

Matches between:

```text
60–74
```

may appear inside the Matches screen without triggering a notification.

This reduces notification noise.

---

# 10. Match Notification Privacy

Do not include sensitive information.

Good:

```text
A found wallet may match your lost report.
```

Avoid:

```text
The wallet contains your college ID and ₹500.
```

Private verification information must never appear in notification text.

---

# 11. Match Notification Deep Link

Owner notification:

```text
/matches/:matchId
```

Finder notification may also open:

```text
/matches/:matchId
```

with Finder-specific actions.

---

# 12. Match Notification Deduplication

A user should not receive repeated notifications for the same unchanged match.

Recommended:

```text
one notification
per user
per match
per notification type
```

If the match is recalculated from:

```text
81%
```

to:

```text
84%
```

do not create another notification.

---

# 13. Match Threshold Crossing

If a previously weak match becomes strong enough to cross the notification threshold:

```text
68%
→
82%
```

a notification may be created if the user has not previously been notified about that match.

---

# 14. Dismissed Match

If a match is:

```text
DISMISSED
```

do not generate new notifications for the same unchanged pair.

---

# 15. CLAIM_RECEIVED

Recipient:

```text
Finder
```

Trigger:

```text
New claim successfully created
```

Example:

```text
New Claim Received

Someone has submitted an ownership claim for your found wallet.
```

---

# 16. Claim Received Deep Link

```text
/claims/:claimId
```

The Finder should land directly on the claim review screen.

---

# 17. CLAIM_ACCEPTED

Recipient:

```text
Claimant / Owner
```

Trigger:

```text
Finder accepts claim
```

Example:

```text
Your Claim Was Accepted

You can now contact the finder and arrange the return.
```

---

# 18. Claim Accepted Deep Link

Recommended destination:

```text
/recoveries/:recoveryId
```

rather than returning to the old claim page.

The recovery is now the user's primary context.

---

# 19. CLAIM_REJECTED

Recipient:

```text
Claimant
```

Trigger:

```text
Finder rejects claim
```

Example:

```text
Claim Not Accepted

This claim wasn't accepted by the finder. You can continue reviewing other possible matches.
```

---

# 20. Claim Rejection Privacy

Do not automatically reveal:

- exact failed answer
- expected verification answer
- private Finder reasoning

The notification should remain general.

---

# 21. Claim Rejected Deep Link

Recommended:

```text
/claims/:claimId
```

or:

```text
/matches
```

depending on UX.

Prefer claim detail so the user understands what happened.

---

# 22. NEW_MESSAGE

Recipient:

```text
Other conversation participant
```

Trigger:

```text
New chat message stored successfully
```

Example:

```text
New Message

Rahul sent you a message about Black Wallet.
```

---

# 23. Message Notification Body

Do not necessarily include full message content.

Recommended:

```text
Rahul sent you a new message.
```

or a short safe preview:

```text
"Can we meet near the library?"
```

For MVP, no preview is safer and simpler.

---

# 24. Message Notification Deep Link

```text
/messages/:conversationId
```

---

# 25. Message Notification Frequency

Creating one notification for every message can become noisy.

Initial simple implementation may create per-message notifications.

Better recommended behavior:

```text
if unread notification for conversation already exists
→ update or reuse it
```

instead of creating many rows.

---

# 26. Conversation Notification Grouping

Preferred future behavior:

```text
3 new messages from Rahul
```

instead of:

```text
Message 1
Message 2
Message 3
```

---

# 27. Active Conversation Behavior

If recipient is actively viewing the conversation:

The frontend may:

```text
immediately mark message notification read
```

or skip prominently showing the badge.

The backend may still persist the notification if implementation remains simple.

---

# 28. HANDOVER_UPDATE

Used when one participant confirms their side of the handover.

Example for Owner:

```text
Finder Confirmed Handover

The finder marked the item as handed over. Confirm when you receive it.
```

Example for Finder:

```text
Owner Confirmed Receipt

The owner confirmed receiving the item.
```

---

# 29. Handover Deep Link

```text
/recoveries/:recoveryId
```

This allows the user to immediately complete their required action.

---

# 30. Partial Confirmation

If only one party has confirmed:

```text
recovery = PARTIALLY_CONFIRMED
```

the notification should clearly state what the recipient needs to do.

Example:

```text
Action Needed

The finder confirmed handover. Confirm when you've received the item.
```

---

# 31. RECOVERY_COMPLETED

Recipients:

```text
Owner

Finder
```

Trigger:

```text
Both handover confirmations complete
```

Example:

```text
Item Returned Successfully

The recovery for Black Wallet is now complete.
```

---

# 32. Recovery Completed Deep Link

```text
/recoveries/:recoveryId
```

The page may then prominently show:

```text
Rate Experience
```

---

# 33. RATING_REQUEST

Recipients:

```text
Owner

Finder
```

Trigger:

```text
Recovery completed
AND
user has not yet submitted rating
```

Example:

```text
How Was Your Experience?

Rate the person who helped complete this recovery.
```

---

# 34. Rating Deep Link

Recommended:

```text
/recoveries/:recoveryId/rate
```

or the equivalent rating route.

---

# 35. Rating Reminder Timing

For MVP:

Create the rating request immediately after successful recovery.

Future reminder:

```text
24 hours later
```

may be added only if the user has not rated yet.

Do not repeatedly remind users.

---

# 36. SYSTEM Notifications

Used sparingly.

Examples:

```text
important maintenance

policy changes

account/security notice
```

Do not use SYSTEM as a generic fallback for all events.

---

# 37. Notification Priority

Possible internal priority model:

```text
LOW

NORMAL

HIGH
```

MVP does not need to expose this to users.

Recommended examples:

```text
Possible Match → NORMAL

Claim Received → HIGH

Claim Accepted → HIGH

New Message → NORMAL

Handover Action → HIGH

Recovery Complete → NORMAL
```

---

# 38. Notification Center

Route:

```text
/notifications
```

Purpose:

Provide persistent history of relevant events.

---

# 39. Notification Center Layout

Recommended grouping:

```text
Today

Earlier This Week

Older
```

Each notification item shows:

```text
icon

title

short description

timestamp

unread indicator
```

---

# 40. Notification Item Interaction

Clicking a notification should:

```text
mark notification read
      ↓
navigate to referenced resource
```

If resource no longer exists:

```text
mark read
      ↓
show graceful unavailable state
```

---

# 41. Unread State

Notification is unread when:

```text
read_at IS NULL
```

Read when:

```text
read_at IS NOT NULL
```

---

# 42. Unread Badge

Global header may display:

```text
unread notification count
```

Example:

```text
Bell (3)
```

On mobile, a small indicator is sufficient.

---

# 43. Notification Badge Limit

If unread count is very high:

```text
99+
```

is preferable to showing huge numbers.

---

# 44. Mark Notification Read

User may mark a notification read by:

- opening it
- explicitly marking read

Only the notification owner may perform the update.

---

# 45. Mark All Read

Recommended P1 feature:

```text
Mark all as read
```

This should update only notifications belonging to:

```text
auth.uid()
```

---

# 46. Unread Query

Recommended query:

```text
WHERE user_id = auth.uid()
AND read_at IS NULL
```

Index:

```text
(user_id, read_at)
```

supports this efficiently.

---

# 47. Notification Ordering

Default:

```text
created_at DESC
```

Newest first.

---

# 48. Notification Pagination

Do not load unlimited notification history.

Recommended:

```text
20–30 notifications per page
```

Use pagination or infinite loading.

---

# 49. Persistent Notification Record

Notifications should remain in the database even if realtime delivery fails.

This guarantees:

```text
User returns later
      ↓
Notification still visible
```

---

# 50. Realtime Notifications

Supabase Realtime may subscribe to:

```text
notifications
```

for:

```text
user_id = current user
```

When a new row arrives:

```text
update notification list
update unread count
```

---

# 51. Realtime Is Optional for MVP

If notification realtime adds unnecessary complexity, initial MVP may:

```text
refetch periodically
+
refetch after important mutations
```

Chat realtime remains more important.

Realtime notification badges can be added after core flows work.

---

# 52. Recommended MVP Approach

Use:

```text
persistent database notifications
+
TanStack Query
+
query invalidation
```

Then optionally add Realtime once the primary workflow is stable.

---

# 53. Backend Notification Creation

Notifications should generally be created by backend operations.

Examples:

```text
create_claim()
→ CLAIM_RECEIVED
```

```text
accept_claim()
→ CLAIM_ACCEPTED
```

```text
reject_claim()
→ CLAIM_REJECTED
```

```text
confirm_handover()
→ HANDOVER_UPDATE
```

```text
complete_recovery()
→ RECOVERY_COMPLETED
→ RATING_REQUEST
```

---

# 54. Why Backend Creates Notifications

Avoid:

```text
Frontend updates claim
Frontend separately creates notification
```

because if the second request fails:

```text
state changes
but
notification missing
```

Notifications tied to critical transitions should be created in the same backend transaction whenever possible.

---

# 55. Notification Atomicity

Example:

```text
accept_claim()
```

should atomically:

```text
accept claim
create recovery
create conversation
create notifications
```

If transaction fails:

```text
none of these changes commit
```

---

# 56. Notification Helper Function

A reusable internal function may be created:

```text
create_notification(
  user_id,
  type,
  title,
  body,
  reference_type,
  reference_id
)
```

This should generally be internal backend logic rather than directly exposed to browser clients.

---

# 57. Clients Must Not Create Arbitrary Notifications

Normal users must not have INSERT access allowing:

```text
send fake "claim accepted" notification
```

to another user.

Notification creation is backend-controlled.

---

# 58. Notification RLS

Users may:

```text
SELECT own notifications

UPDATE own read_at
```

Users may not:

```text
SELECT another user's notifications

INSERT arbitrary notifications

change notification user_id
```

---

# 59. Notification Content Rules

Notification copy should be concise.

Recommended:

```text
Title:
3–7 words

Body:
one short sentence
```

Do not turn notifications into full detailed reports.

---

# 60. Notification Tone

Use:

```text
clear

calm

action-oriented
```

Avoid:

```text
alarmist language

excessive punctuation

marketing language

unverified certainty
```

---

# 61. Good Match Copy

```text
Possible Match Found

A found item closely matches your lost report.
```

---

# 62. Bad Match Copy

```text
WE FOUND YOUR ITEM!!!
```

This falsely suggests certainty.

---

# 63. Good Claim Copy

```text
New Claim Received

Someone submitted a claim for your found item.
```

---

# 64. Good Recovery Copy

```text
Action Needed

The finder confirmed handover. Confirm after receiving the item.
```

---

# 65. Notification Icons

Use consistent icons.

Examples:

```text
Match
→ Search / Sparkles

Claim
→ File Check

Message
→ Message Circle

Handover
→ Package Check

Recovery Complete
→ Check Circle

Rating
→ Star
```

Icons must support text, not replace it.

---

# 66. Notification Visual States

Unread:

```text
slightly stronger surface
bold/medium title
small unread dot
```

Read:

```text
standard surface
normal text weight
```

Do not rely only on color.

---

# 67. Deep Link Mapping

Recommended:

```text
MATCH_FOUND
→ /matches/:matchId

CLAIM_RECEIVED
→ /claims/:claimId

CLAIM_ACCEPTED
→ /recoveries/:recoveryId

CLAIM_REJECTED
→ /claims/:claimId

NEW_MESSAGE
→ /messages/:conversationId

HANDOVER_UPDATE
→ /recoveries/:recoveryId

RECOVERY_COMPLETED
→ /recoveries/:recoveryId

RATING_REQUEST
→ /recoveries/:recoveryId/rate
```

---

# 68. Reference Type

Recommended values:

```text
MATCH

CLAIM

CONVERSATION

RECOVERY

RATING
```

stored in:

```text
reference_type
```

---

# 69. Reference ID

```text
reference_id
```

stores the UUID of the corresponding entity.

The frontend should map:

```text
notification type
+
reference type
+
reference ID
```

to route.

---

# 70. Avoid Hardcoded URLs in Database

Do not store:

```text
"/recoveries/abc-123"
```

as authoritative notification target.

Store entity references and generate route in frontend.

This keeps routing changes easier.

---

# 71. Notification Route Helper

Frontend may use:

```text
getNotificationRoute(notification)
```

to determine destination.

This logic should remain centralized.

---

# 72. Invalid Reference

If the referenced entity has been removed/unavailable:

Display:

```text
This item is no longer available.
```

Do not crash navigation.

---

# 73. Deduplication

Notifications requiring deduplication include:

```text
MATCH_FOUND

NEW_MESSAGE grouping

RATING_REQUEST
```

Critical state-change notifications such as:

```text
CLAIM_ACCEPTED
```

naturally occur once if backend operations are idempotent.

---

# 74. Deduplication Key

Future schema may include:

```text
dedupe_key
```

Example:

```text
match:{match_id}:user:{user_id}
```

or:

```text
rating-request:{recovery_id}:{user_id}
```

Unique index may prevent duplicate rows.

---

# 75. MVP Deduplication

If `dedupe_key` is not added initially, backend may query for an existing notification before insertion.

However, a database uniqueness constraint is safer under concurrency.

Recommended:

Add:

```text
dedupe_key text nullable
```

if implementation remains simple.

---

# 76. Recommended Notifications Schema Addition

Optional but recommended:

```text
dedupe_key
```

and:

```text
metadata jsonb
```

---

# 77. metadata

`metadata` may store non-sensitive display context.

Example:

```json
{
  "item_title": "Black Wallet"
}
```

Do not place:

- verification answers
- private location
- private contents
- message history

inside notification metadata.

---

# 78. Notification Expiration

Most notifications do not need explicit expiry.

If referenced action is no longer actionable:

Example:

```text
Claim Received
```

after claim already accepted/rejected.

The notification can remain historical but the destination UI should show current state.

---

# 79. Notifications Reflect Current State

Notifications are historical events, not authoritative current state.

Example:

A user may have an old:

```text
Claim Pending
```

notification even though the claim is now:

```text
ACCEPTED
```

The destination page should always use current database state.

---

# 80. Notification Preferences

P1/P2 feature.

Possible settings:

```text
Match Notifications

Claim Notifications

Message Notifications

Recovery Notifications

Rating Reminders
```

For MVP, all relevant in-app notifications may be enabled by default.

---

# 81. Mandatory Notifications

Some security-critical notifications should not be fully disabled.

Future examples:

```text
account security alerts

important moderation notices
```

These are separate from product activity preferences.

---

# 82. Push Notifications — Future

Push notifications may later use:

```text
Web Push

FCM

APNs
```

depending on platform.

For web MVP, browser push is optional.

---

# 83. Push Architecture

Future:

```text
Backend Event
     ↓
Notification Record
     ↓
Delivery Worker / Edge Function
     ↓
Push Provider
     ↓
User Device
```

Persistent in-app notification should normally be created regardless of push delivery success.

---

# 84. Push Failure

If push fails:

```text
in-app notification still exists
```

Push is not the source of truth.

---

# 85. Push Permission

Browser/device push permission must be user-controlled.

Do not immediately request push permission on first page load.

Ask after the user understands the value.

---

# 86. Good Push Permission Moment

Example:

After user creates a Lost Report:

```text
Want to be alerted when we find a possible match?
```

This is contextually relevant.

---

# 87. Email Notifications — Future

Potential email use cases:

```text
Strong match

Claim accepted

Important recovery update

Password recovery
```

Password recovery remains Supabase Auth functionality.

---

# 88. Email Frequency

Do not email users for every chat message.

Email should remain reserved for important or missed events.

---

# 89. Future Delivery Preferences

Potential model:

```text
notification_preferences
```

Fields:

```text
user_id

in_app_matches
push_matches
email_matches

in_app_messages
push_messages

...
```

Not required for MVP.

---

# 90. Scheduled Rating Reminder

Future logic may run:

```text
Recovery completed
      ↓
24 hours passes
      ↓
No rating?
      ↓
Create one reminder
```

Do not send repeated daily reminders indefinitely.

---

# 91. Match Reminder

Do not repeatedly remind users about the same match unless there is genuinely new information.

A match remaining unresolved is not itself sufficient reason to spam.

---

# 92. Claim Pending Reminder

Not needed initially.

The Finder should see pending claims inside:

```text
Activity
```

A reminder may later be added for claims ignored for a long time.

---

# 93. Notification Center Empty State

Example:

```text
You're all caught up.

Important matches, claims, messages, and recovery updates will appear here.
```

---

# 94. Notification Error State

Example:

```text
We couldn't load your notifications.

[ Retry ]
```

---

# 95. Notification Loading State

Use skeleton rows approximating final notification items.

Avoid a blank notification panel.

---

# 96. Header Notification Menu

Desktop may show a popover containing:

```text
latest 5 notifications
```

plus:

```text
View all notifications
```

Mobile may navigate directly to:

```text
/notifications
```

---

# 97. Realtime Query Cache

When realtime notification arrives:

```text
append to notifications query cache
```

and update unread count.

Avoid separately maintaining a duplicate notifications state in Context.

---

# 98. Query Keys

Recommended:

```text
["notifications"]

["notifications", "unread-count"]
```

or a centralized key factory.

---

# 99. Mark Read Mutation

Flow:

```text
User opens notification
      ↓
markNotificationRead()
      ↓
UPDATE read_at
      ↓
Update/invalidate notification cache
      ↓
Navigate
```

Navigation should not depend on the read update succeeding perfectly.

---

# 100. Mark All Read Mutation

Potential backend operation:

```text
mark_all_notifications_read()
```

that updates:

```text
WHERE user_id = auth.uid()
AND read_at IS NULL
```

---

# 101. Notification Pagination Query

Recommended:

```text
ORDER BY created_at DESC
```

with either:

```text
range pagination
```

or later:

```text
cursor pagination
```

Cursor pagination is preferable at larger scale.

---

# 102. Message Notification Race

Possible sequence:

```text
message created
notification created
user opens conversation immediately
```

The system may briefly show an unread notification.

This is acceptable if read state quickly reconciles.

Do not overengineer presence detection for MVP.

---

# 103. Backend Function Example

Conceptual:

```text
accept_claim()
      ↓
claim ACCEPTED
      ↓
recovery created
      ↓
conversation created
      ↓
notification:
CLAIM_ACCEPTED
```

All within one transaction.

---

# 104. Recovery Completion Notifications

When both confirmations exist:

```text
complete recovery
```

should generate for Owner:

```text
RECOVERY_COMPLETED
RATING_REQUEST
```

and Finder:

```text
RECOVERY_COMPLETED
RATING_REQUEST
```

Ensure idempotency prevents duplicate rows.

---

# 105. Match Notification Generation

Matching flow:

```text
Generate Match
      ↓
score >= threshold?
      ↓
NO
Persist only

YES
      ↓
notification already exists?
      ↓
YES
Do nothing

NO
Create notification
```

---

# 106. User-Triggered Owner Notification

Finder may select:

```text
Notify Possible Owner
```

Backend must verify:

```text
Finder owns Found Listing

Match exists

Match is active
```

Then create a safe Owner notification.

---

# 107. User-Triggered Notification Abuse

The Finder should not be able to repeatedly press:

```text
Notify Possible Owner
```

and spam the same user.

Use deduplication.

---

# 108. Notification Security

Notifications must not expose:

```text
private claim answers

Finder private details

precise coordinates

private message history

email

phone number
```

unless explicitly required and authorized.

---

# 109. Notification Logs

Avoid logging full notification payloads if they contain user-generated data.

At minimum, logs may safely record:

```text
notification type

notification id

delivery success/failure
```

without sensitive content.

---

# 110. Notification Retention

For MVP, keep notification history.

Future retention could remove very old records.

Potential:

```text
6–12 months
```

depending on product/legal requirements.

No retention automation is required initially.

---

# 111. Delete Notification

Users do not need deletion for MVP.

Mark-as-read is sufficient.

Future:

```text
archive
```

may be preferable to hard delete.

---

# 112. Notification Accessibility

Each notification row should:

- be keyboard accessible
- have meaningful text
- not rely only on icon/color
- expose unread state accessibly

Example screen-reader label:

```text
Unread notification: Possible Match Found
```

---

# 113. Notification Timestamp

Examples:

```text
2 min ago

3 hours ago

Yesterday

Oct 3
```

Use exact timestamp inside accessible metadata/tooltips where appropriate.

---

# 114. Notification Design

Keep visual design compact.

Recommended hierarchy:

```text
Icon

Title        Timestamp

Body

Unread indicator
```

---

# 115. No Marketing Notifications in MVP

Do not use notifications for:

```text
engagement tricks

random feature promotion

"Come back!" messages

gamification spam
```

Notifications exist to advance the recovery lifecycle.

---

# 116. Event-to-Notification Matrix

| Event | Recipient | Type | Destination |
|---|---|---|---|
| Strong match created | Owner | MATCH_FOUND | Match Detail |
| Strong match created | Finder | MATCH_FOUND | Match Detail |
| Claim submitted | Finder | CLAIM_RECEIVED | Claim Detail |
| Claim accepted | Owner | CLAIM_ACCEPTED | Recovery |
| Claim rejected | Owner | CLAIM_REJECTED | Claim Detail |
| New chat message | Other participant | NEW_MESSAGE | Conversation |
| Finder confirms handover | Owner | HANDOVER_UPDATE | Recovery |
| Owner confirms receipt | Finder | HANDOVER_UPDATE | Recovery |
| Recovery completed | Both | RECOVERY_COMPLETED | Recovery |
| Recovery completed | Both | RATING_REQUEST | Rating |

---

# 117. Notification Event Source

Recommended source ownership:

```text
Matching Engine
→ MATCH_FOUND

create_claim()
→ CLAIM_RECEIVED

accept_claim()
→ CLAIM_ACCEPTED

reject_claim()
→ CLAIM_REJECTED

message creation
→ NEW_MESSAGE

confirm_handover()
→ HANDOVER_UPDATE

complete recovery
→ RECOVERY_COMPLETED
→ RATING_REQUEST
```

---

# 118. Frontend Notification Architecture

Recommended:

```text
features/notifications/
├── components/
│   ├── NotificationItem.tsx
│   ├── NotificationList.tsx
│   ├── NotificationBadge.tsx
│   └── NotificationEmptyState.tsx
│
├── hooks/
│   ├── useNotifications.ts
│   ├── useUnreadNotificationCount.ts
│   ├── useMarkNotificationRead.ts
│   └── useRealtimeNotifications.ts
│
├── services/
│   └── notifications.service.ts
│
├── types/
└── utils/
    └── getNotificationRoute.ts
```

---

# 119. Notification Services

Potential functions:

```text
getNotifications()

getUnreadNotificationCount()

markNotificationRead()

markAllNotificationsRead()
```

Clients should not expose:

```text
createArbitraryNotification()
```

---

# 120. Realtime Subscription Cleanup

If realtime notification subscription is implemented:

On:

```text
logout

app provider unmount

user switch
```

unsubscribe from the old user's channel.

---

# 121. Logout

After logout:

```text
clear notification cache

clear unread count

unsubscribe realtime
```

No previous user's notification data should remain visible.

---

# 122. Notification Tests

Core tests should include:

```text
Strong match creates notification

Weak match does not notify

Duplicate matching does not duplicate notification

Claim creates Finder notification

Accepted claim notifies Owner

Rejected claim notifies Owner

New message notifies other participant

Handover notifies other participant

Recovery completion notifies both

Rating request generated once
```

---

# 123. Security Tests

User A must not be able to:

```text
read User B notifications

mark User B notification read

create fake notification for User B

change notification recipient
```

---

# 124. Deduplication Test

Run:

```text
generate_matches(item_id)
```

twice.

Expected:

```text
one MATCH_FOUND notification
```

for the same user/match.

---

# 125. Recovery Idempotency Test

Call final recovery completion logic twice.

Expected:

```text
one RECOVERY_COMPLETED notification

one RATING_REQUEST per user
```

not duplicates.

---

# 126. Deep Link Test

Every notification type must navigate to:

```text
valid existing application route
```

and correctly handle:

```text
unauthorized resource

deleted/unavailable resource

already-completed action
```

---

# 127. Realtime Failure Test

Disable realtime temporarily.

Generate notification.

Expected:

```text
notification still exists in database
```

After refresh:

```text
notification appears
```

---

# 128. Notification MVP Requirements

Required:

```text
Persistent notifications table

Unread/read state

Notification center

Unread badge

Match notification

Claim received

Claim accepted

Claim rejected

New message

Handover update

Recovery complete

Rating request

Deep linking

RLS

Deduplication for important events
```

---

# 129. Not Required for MVP

Do not delay launch for:

```text
Browser push notifications

Mobile push notifications

Email activity alerts

SMS

Complex preferences

Notification sounds

Advanced grouping

Scheduled reminders

Marketing notifications
```

---

# 130. Recommended Implementation Order

```text
1. notifications table

2. notification enum

3. RLS

4. Notification service/query

5. Notification center

6. Unread count

7. Mark read

8. Match notifications

9. Claim notifications

10. Chat notifications

11. Handover notifications

12. Recovery complete notifications

13. Rating requests

14. Deep links

15. Deduplication

16. Realtime enhancement

17. Future push/email
```

---

# 131. Notification Definition of Done

The MVP notification system is complete when:

1. Notifications persist in PostgreSQL.
2. Users see only their own notifications.
3. Important lifecycle events create notifications.
4. Weak matches do not create excessive alerts.
5. Match notifications are deduplicated.
6. Claim submission notifies the Finder.
7. Claim acceptance/rejection notifies the claimant.
8. New messages notify the other participant.
9. Handover actions notify the other participant.
10. Recovery completion notifies both users.
11. Rating requests are generated once.
12. Unread count is accurate.
13. Notifications can be marked read.
14. Notification items navigate to correct screens.
15. Stale notifications gracefully reflect current resource state.
16. Private ownership information is never exposed.
17. Unauthorized users cannot read or mutate another user's notifications.
18. Realtime failure does not lose notifications.
19. Repeated backend operations do not create duplicates.
20. Notification UI works on mobile and desktop.

---

# 132. Final Notification Architecture

```text
                 DOMAIN EVENT
                      │
       ┌──────────────┼──────────────┐
       │              │              │
     MATCH          CLAIM         RECOVERY
       │              │              │
       └──────────────┼──────────────┘
                      │
                      ▼
                BACKEND LOGIC
                      │
                      ▼
              CREATE NOTIFICATION
                      │
                      ▼
               PostgreSQL Record
                      │
             ┌────────┴─────────┐
             │                  │
             ▼                  ▼
      Notification Center    Realtime Event
             │                  │
             └────────┬─────────┘
                      │
                      ▼
                 USER SEES
                  UPDATE
                      │
                      ▼
                 DEEP LINK
                      │
                      ▼
                NEXT ACTION
```

The notification system should follow one central principle:

> Notify users when there is meaningful progress or required action in the recovery process, not simply because something happened internally.

Notifications should help move each recovery forward while remaining quiet enough that users continue to trust them.