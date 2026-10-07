# Lost & Found Platform — Realtime Chat

## 1. Purpose

This document defines the realtime messaging system for the Lost & Found Platform.

Chat exists to help the Owner and Finder safely complete a recovery after ownership verification has progressed far enough for a claim to be accepted.

The chat system must support:

- private conversations
- realtime messaging
- message persistence
- unread state
- conversation authorization
- pagination
- retry behavior
- recovery context
- safe communication
- conversation closure
- abuse reporting

Chat is part of the lifecycle:

```text
MATCH
  ↓
CLAIM
  ↓
VERIFY
  ↓
CLAIM ACCEPTED
  ↓
PRIVATE CHAT
  ↓
HANDOVER
  ↓
RETURN
```

---

# 2. Core Principle

A conversation must not exist merely because two users interacted with the same listing.

Chat should become available only after:

```text
Valid Claim
      ↓
Finder Accepts Claim
      ↓
Recovery Created
      ↓
Private Conversation Created
```

This prevents:

- unsolicited messaging
- spam
- harassment
- premature sharing of contact details
- fraudulent claimants contacting Finders freely

---

# 3. Chat Technology

The chat system will use:

```text
Supabase PostgreSQL
+
Supabase Realtime
+
Row Level Security
```

PostgreSQL remains the authoritative message store.

Supabase Realtime provides live delivery.

---

# 4. Architecture Overview

```text
Owner
   │
   ▼
React Chat UI
   │
   ▼
Supabase Client
   │
   ├──────── INSERT message
   │
   ▼
PostgreSQL
   │
   ▼
messages table
   │
   ▼
Supabase Realtime
   │
   ▼
Finder Client
```

The reverse flow works identically.

---

# 5. Chat Entities

The chat system uses three primary tables:

```text
conversations

conversation_members

messages
```

Related recovery data comes from:

```text
recoveries
```

---

# 6. Conversation Lifecycle

Conversation lifecycle:

```text
Claim Accepted
      ↓
Recovery Created
      ↓
Conversation Created
      ↓
Owner Added
Finder Added
      ↓
Conversation Active
      ↓
Messages Exchanged
      ↓
Recovery Completed / Cancelled
      ↓
Conversation Closed or Read-Only
```

---

# 7. Conversation Creation

Conversation creation must be performed as part of:

```text
accept_claim()
```

The frontend must not independently create conversations.

Recommended operation:

```text
accept claim
      ↓
create recovery
      ↓
create conversation
      ↓
add owner
      ↓
add finder
      ↓
notify participants
```

This should happen atomically.

---

# 8. Conversation Table

Conceptual structure:

```text
conversations
├── id
├── recovery_id
├── is_active
├── created_at
└── closed_at
```

Each recovery should have at most one conversation.

Recommended constraint:

```text
UNIQUE(recovery_id)
```

---

# 9. Conversation Members

Table:

```text
conversation_members
```

Fields:

```text
conversation_id

user_id

joined_at

last_read_at
```

For MVP, each conversation normally contains exactly two users:

```text
Owner

Finder
```

---

# 10. Membership Is the Authorization Boundary

A user may access a conversation only if:

```text
conversation_members.user_id = auth.uid()
```

for that conversation.

No unrelated user may:

- read conversation metadata
- read messages
- send messages
- subscribe to realtime events

---

# 11. Messages Table

Recommended structure:

```text
messages
├── id
├── conversation_id
├── sender_id
├── content
├── created_at
├── edited_at
└── deleted_at
```

For MVP:

```text
edited_at
deleted_at
```

may exist but editing/deletion does not need to be enabled.

---

# 12. Message Type

Initial MVP supports:

```text
TEXT
```

only.

Future message types may include:

```text
IMAGE

SYSTEM

LOCATION

HANDOVER_EVENT
```

Do not introduce these unless required.

---

# 13. Why Text-Only MVP

Text chat is enough for:

- additional verification
- meetup planning
- timing coordination
- safe-location discussion

Keeping MVP text-only reduces:

- storage complexity
- moderation needs
- upload abuse
- privacy risks

---

# 14. Message Content Limit

Recommended maximum:

```text
3000 characters
```

The frontend and database should enforce a reasonable limit.

---

# 15. Empty Message Validation

Reject messages containing only:

```text
empty string

spaces

line breaks
```

Normalize before submission.

---

# 16. Sender Identity

The client may submit a message request, but sender identity must always correspond to:

```text
auth.uid()
```

The backend/RLS must prevent:

```text
sender_id = another user
```

---

# 17. Send Message Flow

```text
User types message
      ↓
Trim input
      ↓
Empty?
      ↓
YES → Do nothing
      ↓
NO
      ↓
Check conversation membership
      ↓
Check conversation active
      ↓
INSERT message
      ↓
Persist database row
      ↓
Realtime event emitted
      ↓
Other participant receives message
```

---

# 18. Frontend Send Flow

Recommended architecture:

```text
MessageComposer
      ↓
useSendMessage()
      ↓
chat.service.ts
      ↓
Supabase INSERT
```

Do not put raw Supabase insert logic directly inside the message composer.

---

# 19. Message Fetching

Initial messages are loaded using a standard query.

```text
ConversationPage
      ↓
useMessages(conversationId)
      ↓
Supabase SELECT
      ↓
messages ordered by created_at
```

Realtime then handles newly arriving messages.

---

# 20. Message Ordering

Display messages chronologically:

```text
oldest
  ↓
newest
```

Database fetches may load newest pages first internally, but frontend display should remain chronological.

---

# 21. Stable Ordering

Use:

```text
created_at
```

plus:

```text
id
```

as a deterministic tiebreaker if necessary.

This prevents inconsistent ordering when messages are created very close together.

---

# 22. Message Pagination

Do not load the entire conversation indefinitely.

Recommended:

```text
Initial:
latest 30–50 messages
```

When user scrolls upward:

```text
Load older messages
```

---

# 23. Cursor Pagination

Prefer cursor-based pagination.

Possible cursor:

```text
created_at
+
message id
```

Example:

```text
Get messages older than oldest currently loaded message.
```

This performs better than deep offset pagination.

---

# 24. Pagination Flow

```text
Open Conversation
      ↓
Load Latest 40
      ↓
User Scrolls Up
      ↓
Near Top?
      ↓
Load Previous 40
      ↓
Prepend Messages
```

---

# 25. Scroll Preservation

When older messages are prepended:

```text
current visible message
```

should remain approximately in the same screen position.

Avoid jumping user to the top or bottom unexpectedly.

---

# 26. Initial Scroll Position

When opening an active conversation:

```text
scroll to newest message
```

unless the application later supports a first-unread anchor.

---

# 27. Realtime Subscription

Recommended flow:

```text
ConversationPage mounts
      ↓
Fetch existing messages
      ↓
Subscribe to INSERT events
      ↓
Filter by conversation_id
      ↓
Receive new message
      ↓
Update TanStack Query cache
```

---

# 28. Subscription Scope

Subscribe only to:

```text
messages
```

for the active:

```text
conversation_id
```

Avoid broad subscriptions such as:

```text
all messages in application
```

---

# 29. Subscription Cleanup

When the user:

```text
leaves conversation
changes conversation
logs out
```

the realtime subscription must be removed.

This prevents:

- duplicate message events
- memory leaks
- unauthorized stale subscriptions
- unnecessary realtime connections

---

# 30. Realtime Is Not the Source of Truth

Realtime is a delivery mechanism.

PostgreSQL remains authoritative.

If a realtime event is missed:

```text
page refresh
or
query refetch
```

must restore the complete conversation.

---

# 31. Realtime Event Handling

When a new message arrives:

```text
Check if message already exists in cache
```

If not:

```text
append message
```

This prevents duplicate rendering.

---

# 32. Duplicate Event Protection

Messages should be deduplicated using:

```text
message.id
```

Never rely solely on:

```text
content
timestamp
```

for deduplication.

---

# 33. Optimistic Messaging

Chat may use optimistic UI.

Flow:

```text
User sends
      ↓
Temporary message appears
      ↓
Database INSERT
```

If success:

```text
temporary message replaced by authoritative record
```

If failure:

```text
message marked failed
```

---

# 34. Optimistic Message Structure

Temporary client message may contain:

```text
temporary_id

content

status = SENDING

created_at
```

Once database confirms:

```text
id = database UUID

status = SENT
```

---

# 35. Message Status

Frontend-only delivery states may include:

```text
SENDING

SENT

FAILED
```

These do not necessarily need to be stored in PostgreSQL.

---

# 36. Retry Failed Message

If sending fails:

```text
Message failed to send.
```

Show:

```text
Retry
```

Retry should not create duplicate messages if the original request actually succeeded but the client lost the response.

Use client IDs/idempotency later if this becomes a problem.

---

# 37. Simple MVP Retry

For MVP:

- insert failure clearly marks message failed
- user may retry
- query/refetch should reconcile messages

This is sufficient initially.

---

# 38. Read State

The system should support unread messages.

Recommended MVP approach:

```text
conversation_members.last_read_at
```

rather than storing a read receipt row for every message.

---

# 39. last_read_at

Each member has:

```text
last_read_at
```

When viewing conversation:

```text
last_read_at = current time
```

or latest visible message timestamp.

---

# 40. Unread Count

Unread count can be calculated as:

```text
messages
WHERE conversation_id = X
AND sender_id != current user
AND created_at > last_read_at
```

---

# 41. Why Conversation-Level Read State

For two-user recovery conversations, this is simpler than:

```text
message_reads
```

and provides enough information for:

- unread badge
- conversation ordering
- notification behavior

---

# 42. Future Per-Message Read Receipts

If product later wants:

```text
Seen
```

on individual messages, a more detailed model can be introduced.

Not required for MVP.

---

# 43. Mark Conversation Read

When user actively views conversation:

```text
update own conversation_members.last_read_at
```

Only the user's own membership row may be updated.

---

# 44. Unread Messages Badge

Messages screen may display:

```text
3
```

next to a conversation.

Global navigation may show total unread count.

---

# 45. Messages Screen

Route:

```text
/messages
```

Should display:

```text
Conversation partner

Associated item

Last message preview

Last message time

Unread count

Recovery status
```

---

# 46. Conversation Sorting

Recommended:

```text
latest message first
```

If a conversation contains no messages:

```text
conversation created_at
```

may determine order.

---

# 47. Last Message Preview

Example:

```text
"Can we meet near the library?"
```

Limit preview to one line.

Do not expose message previews in contexts where screen privacy is a concern beyond normal app expectations.

---

# 48. Conversation Header

The chat header should include:

```text
User avatar

User name

Item title

Recovery status
```

Possible actions:

```text
View Recovery

View Item

Report User
```

---

# 49. Recovery Context

Users should always know which item the conversation relates to.

Example:

```text
Recovery: Black Wallet
```

This prevents confusion if a user participates in multiple recoveries.

---

# 50. Chat Safety Banner

Display a subtle safety reminder.

Example:

```text
Meet in a public place and avoid sharing unnecessary personal information.
```

This may appear:

- at top of conversation
- when conversation begins
- near handover planning

---

# 51. Contact Information

The platform should not automatically reveal:

```text
phone number

email address

home address

social handles
```

Users should communicate inside the application by default.

---

# 52. Contact Sharing

For MVP, the application does not need a dedicated contact-sharing feature.

Users may type contact information themselves, but UI should encourage keeping communication inside the platform.

---

# 53. Location Sharing

Exact realtime location sharing is outside MVP.

Users can discuss meetup locations using text.

Future location-sharing should undergo a separate privacy review.

---

# 54. Safe Meetup Guidance

Recommended guidance:

```text
Meet in a public location.

Use a campus or building security desk where possible.

Avoid private residences.

Do not send money to recover your item.

Keep important communication inside the app.
```

---

# 55. Money / Reward Requests

Chat should not encourage payments.

If someone requests money suspiciously, users should be able to:

```text
Report User
```

The platform does not process recovery rewards in MVP.

---

# 56. Conversation Active State

Conversation:

```text
is_active = true
```

during an active recovery.

Messages may be sent.

---

# 57. Completed Recovery Behavior

After recovery completes, recommended behavior:

```text
Conversation remains readable
```

but may become:

```text
read-only
```

after a reasonable point.

For MVP, either of these approaches is acceptable:

### Option A

Close immediately after recovery completion.

### Option B

Leave active briefly and close when case is formally completed.

Recommended MVP:

```text
Complete recovery
→ conversation read-only
```

This prevents unrelated continued messaging.

---

# 58. Cancelled Recovery

If recovery is cancelled:

```text
conversation.is_active = false
```

Messages remain readable by participants for context.

No new messages should be accepted.

---

# 59. Closed Conversation UI

Display:

```text
This recovery is closed.
You can view previous messages but can't send new ones.
```

Disable composer.

---

# 60. Conversation Authorization

Only conversation members may:

```text
SELECT conversation

SELECT messages

INSERT messages

subscribe to realtime events
```

---

# 61. RLS — Conversations

Conceptually:

```text
Allow SELECT
if auth.uid() exists in conversation_members
```

No direct client INSERT.

Conversation creation is backend-controlled.

---

# 62. RLS — Conversation Members

Users may:

```text
SELECT relevant membership rows
```

for conversations they belong to.

They may update only:

```text
their own last_read_at
```

---

# 63. RLS — Messages SELECT

Allow if:

```text
EXISTS (
  conversation_members
  where conversation_id = messages.conversation_id
  and user_id = auth.uid()
)
```

---

# 64. RLS — Messages INSERT

Require:

```text
sender_id = auth.uid()
```

and current user must be a conversation member.

Also require:

```text
conversation.is_active = true
```

if inactive conversations are read-only.

---

# 65. Message Update RLS

Recommended MVP:

```text
No message UPDATE policy
```

unless necessary.

Messages should be immutable.

---

# 66. Message Delete RLS

Recommended MVP:

```text
No direct DELETE
```

This preserves recovery history.

Moderation may later support controlled removal.

---

# 67. Message Editing

Message editing is not required for MVP.

Advantages of no editing:

- simpler audit history
- fewer realtime events
- reduced abuse/moderation complexity

---

# 68. Message Deletion

Not required for MVP.

If later introduced, prefer:

```text
soft deletion
```

using:

```text
deleted_at
```

rather than hard deletion.

---

# 69. System Messages

Future system messages may represent:

```text
Claim accepted

Finder confirmed handover

Owner confirmed receipt

Recovery completed
```

These should not be user-generated messages.

---

# 70. System Message Strategy

Two options:

### Option A

Render recovery events separately from chat messages.

### Option B

Store:

```text
message_type = SYSTEM
```

in the messages table.

Recommended MVP:

> Render recovery events from recovery state rather than adding system-message complexity.

---

# 71. Message Notifications

If recipient is not actively viewing the conversation:

```text
New Message
      ↓
Create notification
```

Type:

```text
NEW_MESSAGE
```

---

# 72. Notification Deduplication

Do not create dozens of notification rows for a rapid sequence of messages if avoidable.

Possible MVP:

```text
one notification per message
```

is acceptable at small scale.

Future:

```text
group unread messages by conversation
```

for better UX.

---

# 73. Active Conversation Detection

The backend normally does not know whether a user currently has the conversation open.

Therefore in-app notification creation may occur regardless.

Frontend can immediately mark it read if the user is currently viewing the conversation.

---

# 74. Notification Link

New-message notification should route to:

```text
/messages/:conversationId
```

---

# 75. Realtime Notification vs Realtime Message

Message delivery:

```text
messages realtime channel
```

Notification badge:

```text
notifications realtime channel
```

These are separate concerns.

The app does not necessarily need both enabled initially.

---

# 76. Presence

Supabase Realtime Presence may support:

```text
online

typing
```

but neither is required for MVP.

---

# 77. Typing Indicator

Potential future feature:

```text
Rahul is typing...
```

Can use Realtime Broadcast or Presence.

Do not persist typing state in PostgreSQL.

---

# 78. Online Status

Online/offline indicators are not needed for MVP.

They introduce:

- presence state
- privacy questions
- stale-state handling
- extra realtime traffic

---

# 79. Chat Attachments

Not required for MVP.

If added later:

```text
chat-media
```

should be a private storage bucket.

Access must be limited to conversation members.

---

# 80. Why Avoid Attachments Initially

Attachments increase risk of:

- sensitive document sharing
- inappropriate content
- storage abuse
- malware
- personal information leakage

Text-only is safer for MVP.

---

# 81. Chat Search

Not required for MVP.

Users can scroll through a relatively short recovery conversation.

---

# 82. Conversation History

Conversation history should remain visible after recovery completion unless:

- legal/privacy requirements demand removal
- moderation removes specific content
- account deletion policy requires anonymization

---

# 83. Realtime Connection Loss

If realtime connection disconnects:

```text
Messages already persisted remain safe.
```

Frontend should:

```text
show connectivity state if necessary
reconnect
refetch messages
```

---

# 84. Reconnection Flow

```text
Realtime disconnected
      ↓
Supabase reconnects
      ↓
Refetch latest messages
      ↓
Reconcile cache
```

This prevents missing messages during the disconnected period.

---

# 85. Network Offline Send

If the user is offline:

Recommended MVP:

```text
Send fails
```

and UI displays:

```text
Couldn't send message.
Check your connection and try again.
```

Offline message queues are not required.

---

# 86. Message Retry Safety

If user retries after uncertain network result:

Frontend should refetch latest messages where appropriate to reduce accidental duplicates.

Future idempotency tokens may improve this.

---

# 87. Message Rate Limiting

To reduce spam:

Consider limits such as:

```text
messages per minute
```

Exact thresholds should be based on usage.

For MVP, basic anti-spam may be added later unless abuse appears.

---

# 88. Message Burst Protection

If implemented, do not silently discard messages.

Return a clear error:

```text
You're sending messages too quickly. Please try again shortly.
```

---

# 89. Abuse Reporting

Conversation header/menu should allow:

```text
Report User
```

Possible reasons:

```text
Harassment

Scam attempt

Threatening behavior

False ownership claim

Spam

Requesting money

Other
```

---

# 90. Blocking

Full user blocking is not required for MVP.

Recovery cancellation plus reporting is sufficient initially.

A block system may be introduced later.

---

# 91. Sensitive Content

Do not automatically log or expose message content outside the conversation except where required for:

- moderation
- abuse investigation
- legal/security requirements

Moderation access must be privileged.

---

# 92. Logging Rules

Application logs must not contain:

```text
message content

JWT token

private claim answers

private contact details
```

Avoid:

```ts
console.log(message)
```

in production code.

---

# 93. Message Sanitization

React escapes normal string rendering by default.

Messages should be treated as plain text for MVP.

Do not render message content through:

```text
dangerouslySetInnerHTML
```

---

# 94. Markdown

Do not support arbitrary Markdown/HTML in MVP.

Plain text avoids:

- XSS complexity
- confusing formatting
- malicious links

Automatic safe linkification may be added later.

---

# 95. Links

If URLs become clickable:

- use safe anchors
- use `rel="noopener noreferrer"`
- make external destination clear

Do not render raw HTML from messages.

---

# 96. Conversation Page Architecture

Recommended:

```text
ConversationPage
├── ChatHeader
├── SafetyBanner
├── MessageList
│   └── MessageBubble
└── MessageComposer
```

---

# 97. Chat Hooks

Recommended:

```text
useConversation()

useMessages()

useSendMessage()

useRealtimeMessages()

useMarkConversationRead()
```

---

# 98. Chat Services

Recommended:

```text
chat.service.ts
```

Functions:

```text
getConversations()

getConversation()

getMessages()

sendMessage()

markConversationRead()
```

Realtime subscription logic may remain in a dedicated hook/service.

---

# 99. Query Keys

Example:

```text
["conversations"]

["conversation", conversationId]

["messages", conversationId]
```

Use query-key factories.

---

# 100. Realtime Cache Integration

When realtime receives a new message:

```text
queryClient.setQueryData(...)
```

may append it directly.

Avoid maintaining:

```text
messages in TanStack Query
+
duplicate messages array in Context
```

TanStack Query should remain the primary server-state cache.

---

# 101. Cache Invalidation

Sending/receiving a message may update:

```text
messages

conversation list

unread counts
```

Only invalidate what is necessary.

---

# 102. Conversation Preview Cache

When a new message arrives:

Update:

```text
last_message

last_message_at
```

in UI cache if available.

The actual schema may derive this dynamically until performance requires denormalization.

---

# 103. Denormalized Last Message

Not needed initially.

At larger scale, `conversations` may store:

```text
last_message_at
```

to make sorting efficient.

For MVP, queries can derive ordering from message data or maintain this through backend logic.

---

# 104. Mobile Chat Layout

Recommended:

```text
Sticky Header

Scrollable Messages

Sticky Composer
```

Respect mobile safe areas.

The composer must remain visible above the keyboard.

---

# 105. Desktop Chat Layout

Possible:

```text
Conversation List | Active Conversation
```

split-screen.

Example:

```text
┌──────────────────┬───────────────────────────────┐
│ Conversations    │ Rahul — Black Wallet         │
│                  │                               │
│ Rahul            │ Messages                      │
│ Priya            │                               │
│ Aman             │                               │
│                  │                               │
│                  │ Message composer              │
└──────────────────┴───────────────────────────────┘
```

---

# 106. Mobile Messages Screen

Use a separate:

```text
/messages
```

conversation list.

Selecting one opens:

```text
/messages/:conversationId
```

as full screen.

---

# 107. Message Bubble Layout

Current user:

```text
right aligned
```

Other user:

```text
left aligned
```

Use subtle distinction.

Do not rely only on color.

---

# 108. Message Bubble Content

Show:

```text
message text

timestamp
```

Sender name usually does not need to repeat on every message in a two-user conversation.

---

# 109. Group Consecutive Messages

Optional UI polish:

Messages from same sender within a short interval may visually group.

This is presentation-only.

---

# 110. Timestamp Display

Examples:

```text
11:42 AM
```

For older conversations:

```text
Oct 7, 11:42 AM
```

Use user's local timezone.

---

# 111. Date Separators

Add separators such as:

```text
Today

Yesterday

October 5
```

for easier navigation.

---

# 112. Sending State UI

Example:

```text
Can we meet at 4 PM?
Sending...
```

On success:

```text
Can we meet at 4 PM?
11:42 AM
```

---

# 113. Failed State UI

Example:

```text
Can we meet at 4 PM?
Failed to send · Retry
```

---

# 114. Empty Conversation

When a conversation has just been created:

```text
Start the conversation.

Use this chat to verify remaining details and arrange a safe handover.
```

---

# 115. Chat Entry Notification

After claim acceptance:

```text
Your claim was accepted.
You can now message the finder.
```

Action:

```text
Open Chat
```

---

# 116. Recovery Page Chat Access

Recovery detail should include:

```text
Open Chat
```

while recovery is active.

---

# 117. Conversation Item Link

Chat header should link to the associated item/recovery.

This ensures users can quickly recheck:

- item
- status
- claim information

---

# 118. Chat Does Not Replace Verification

Finder should accept the claim only after enough verification to justify opening the conversation.

Chat may be used for:

```text
additional verification
```

but it should not be the first line of contact for every claimant.

---

# 119. No Public Messaging

There is no:

```text
Message Finder
```

button on public Found Listings before claim acceptance.

This is intentional.

---

# 120. No User-to-User Generic DM

The application is not a social network.

Users should not have the ability to send generic direct messages unrelated to a recovery.

All conversations should be linked to:

```text
recovery_id
```

---

# 121. Recovery Cancellation from Chat

Chat menu may provide:

```text
View Recovery
```

then cancellation/report actions live in recovery flow.

Avoid placing destructive recovery controls directly beside the message composer.

---

# 122. Completed Recovery Conversation

Recommended:

```text
✓ Item Returned

This conversation is now read-only.
```

Rating CTA may be displayed nearby.

---

# 123. Database Indexes

Required:

```text
messages(conversation_id, created_at)

conversation_members(user_id)

conversation_members(conversation_id)

conversations(recovery_id)
```

These support:

- message history
- membership authorization
- conversation lookup

---

# 124. Realtime Publication

Enable Supabase Realtime only for the required tables.

At minimum:

```text
messages
```

Optional:

```text
notifications
```

Avoid enabling every backend table.

---

# 125. Realtime Security Testing

Test with:

```text
User A — Owner

User B — Finder

User C — Unrelated
```

User C must not:

```text
read conversation

read messages

insert message

receive realtime message events
```

---

# 126. Conversation State Testing

Test:

```text
PENDING CLAIM
→ no conversation
```

```text
ACCEPTED CLAIM
→ conversation exists
```

```text
ACTIVE RECOVERY
→ messages allowed
```

```text
CANCELLED RECOVERY
→ messages blocked
```

```text
COMPLETED RECOVERY
→ read-only
```

---

# 127. Realtime Delivery Test

Scenario:

```text
User A and B open same conversation
```

User A sends:

```text
Hello
```

Expected:

```text
message stored once

A sees message

B receives message without refresh
```

---

# 128. Duplicate Event Test

Simulate:

```text
INSERT response
+
Realtime event
```

for same message.

Expected:

```text
one message rendered
```

Deduplicate through:

```text
message.id
```

---

# 129. Reconnect Test

```text
User B disconnects
User A sends messages
User B reconnects
```

Expected:

```text
refetch restores missed messages
```

---

# 130. Unauthorized Insert Test

User C manually attempts:

```text
INSERT message
conversation_id = A/B conversation
```

Expected:

```text
RLS DENIED
```

---

# 131. Sender Spoof Test

User A attempts:

```text
sender_id = User B
```

Expected:

```text
DENIED
```

---

# 132. Closed Conversation Test

After recovery closure:

User A attempts to insert message.

Expected:

```text
DENIED
```

or clearly rejected by backend policy.

---

# 133. Chat MVP Requirements

Required:

```text
Conversation auto-creation after claim acceptance

Two participants

Private message history

Text messages

Supabase Realtime

Message pagination

Unread state

Conversation list

Retry failures

Recovery context

Safety notice

RLS

Conversation closure
```

---

# 134. Not Required for MVP

Do not delay launch for:

```text
Typing indicators

Online presence

Voice messages

Video calls

Image messages

File attachments

Message reactions

Message editing

Message deletion

End-to-end encryption layer

Message search

Generic user DMs
```

---

# 135. Recommended Implementation Order

```text
1. conversations table

2. conversation_members

3. messages

4. RLS policies

5. conversation creation in accept_claim()

6. fetch conversations

7. fetch messages

8. send messages

9. realtime subscription

10. pagination

11. unread state

12. conversation list

13. failure/retry UI

14. closure behavior

15. safety/reporting integration

16. security tests
```

---

# 136. Realtime Chat Definition of Done

The chat system is MVP-ready when:

1. Pending claims cannot open chat.
2. Accepted claims automatically create one conversation.
3. Only Owner and Finder become members.
4. Conversation participants can read messages.
5. Unrelated users cannot read messages.
6. Participants can send text messages.
7. Users cannot spoof sender identity.
8. Messages persist in PostgreSQL.
9. New messages appear without refresh.
10. Duplicate realtime events do not duplicate messages.
11. Older messages can be paginated.
12. Unread counts work.
13. Opening chat updates read state.
14. Network failures show retry state.
15. Reconnecting restores missed messages.
16. Recovery context is visible.
17. Chat provides safety guidance.
18. Completed/cancelled recovery prevents new messages according to final policy.
19. Conversation history remains available to participants.
20. Users can report suspicious behavior.

---

# 137. Final Chat Architecture

```text
                   CLAIM ACCEPTED
                         │
                         ▼
                     RECOVERY
                         │
                         ▼
                   CONVERSATION
                         │
                ┌────────┴────────┐
                │                 │
                ▼                 ▼
              OWNER             FINDER
                │                 │
                └────────┬────────┘
                         │
                         ▼
                    MESSAGE SEND
                         │
                         ▼
                    RLS VALIDATION
                         │
                         ▼
                    POSTGRES INSERT
                         │
                  ┌──────┴──────┐
                  │             │
                  ▼             ▼
              PERSISTED      REALTIME
                                │
                                ▼
                         OTHER PARTICIPANT
                                │
                                ▼
                          QUERY CACHE
                                │
                                ▼
                              CHAT UI
```

The chat system should remain intentionally narrow:

> It exists to help two verified recovery participants safely coordinate the return of an item.

It should not evolve into a general-purpose messaging platform unless the product's core recovery model later requires it.