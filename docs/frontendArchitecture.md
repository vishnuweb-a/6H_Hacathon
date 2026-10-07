# Lost & Found Platform — Frontend Architecture

## 1. Purpose

This document defines the frontend architecture for the Lost & Found Platform.

It establishes how the React application should be organized, how frontend responsibilities are separated, how data flows between React and Supabase, how shared UI components are structured, how application state is managed, and how feature modules should remain isolated as the product grows.

The frontend architecture must support the full product lifecycle:

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
RATE
   ↓
TRUST
```

The architecture should prioritize:

- maintainability
- feature isolation
- type safety
- reusable components
- secure Supabase integration
- predictable state
- responsive UI
- accessibility
- controlled animations
- testability

---

# 2. Technology Stack

## Core Framework

```text
React
TypeScript
```

Recommended project setup:

```text
Vite + React + TypeScript
```

---

## Styling

```text
Tailwind CSS v4
```

---

## Component Library

```text
shadcn/ui
```

---

## Motion

```text
Anime.js
```

---

## Backend

```text
Supabase
```

Used for:

- authentication
- PostgreSQL database
- realtime messaging
- storage
- Row Level Security
- database functions
- Edge Functions where required

---

## Routing

Recommended:

```text
React Router
```

---

## Forms

Recommended:

```text
React Hook Form
```

with:

```text
Zod
```

for schema-based validation.

---

## Server State

Recommended:

```text
TanStack Query
```

for:

- fetching
- caching
- mutations
- invalidation
- loading/error states
- retry behavior

---

# 3. Architectural Philosophy

The frontend should use a:

```text
Feature-Based Architecture
```

instead of organizing everything purely by file type.

Avoid:

```text
components/
hooks/
services/
utils/
```

becoming giant folders containing unrelated application code.

Prefer:

```text
features/
├── auth/
├── listings/
├── matching/
├── claims/
├── chat/
├── recovery/
├── ratings/
└── profile/
```

Each feature should contain most of the code required for that domain.

---

# 4. High-Level Frontend Architecture

```text
                    React Application
                           │
                 Application Router
                           │
             ┌─────────────┼─────────────┐
             │             │             │
          Pages          Layouts       Features
                                         │
        ┌────────────────────────────────┼───────────────────────────────┐
        │          │          │          │         │         │           │
       Auth     Listings    Matches    Claims     Chat    Recovery     Ratings
        │          │          │          │         │         │           │
        └────────────────────────────────┼───────────────────────────────┘
                                         │
                               Data Access Layer
                                         │
                                      Supabase
                  ┌──────────────────────┼──────────────────────┐
                  │                      │                      │
                Auth                  Database               Storage
                                                               │
                                                           Realtime
```

---

# 5. Recommended Folder Structure

```text
src/
├── app/
│   ├── router/
│   ├── providers/
│   ├── layouts/
│   ├── guards/
│   └── config/
│
├── pages/
│   ├── landing/
│   ├── auth/
│   ├── home/
│   ├── explore/
│   ├── activity/
│   ├── messages/
│   ├── profile/
│   ├── notifications/
│   └── settings/
│
├── features/
│   ├── auth/
│   ├── profiles/
│   ├── listings/
│   ├── matching/
│   ├── claims/
│   ├── chat/
│   ├── recovery/
│   ├── ratings/
│   ├── notifications/
│   └── reports/
│
├── components/
│   ├── ui/
│   ├── shared/
│   ├── navigation/
│   ├── feedback/
│   └── layout/
│
├── hooks/
│
├── lib/
│   ├── supabase/
│   ├── query/
│   ├── validation/
│   └── animation/
│
├── services/
│
├── types/
│
├── constants/
│
├── utils/
│
├── styles/
│
├── assets/
│
├── main.tsx
└── App.tsx
```

---

# 6. App Layer

The `app/` directory contains application-level configuration.

```text
app/
├── router/
├── providers/
├── layouts/
├── guards/
└── config/
```

This layer should not contain feature-specific business logic.

---

# 7. Router Layer

Recommended:

```text
src/app/router/
├── index.tsx
├── routes.ts
└── route-paths.ts
```

Responsibilities:

- define route tree
- apply layouts
- apply authentication guards
- lazy-load pages
- define route constants

---

# 8. Route Constants

Avoid hardcoding URLs across components.

Use:

```ts
export const ROUTES = {
  HOME: "/home",
  EXPLORE: "/explore",
  REPORT_LOST: "/report/lost",
  REPORT_FOUND: "/report/found",
  MATCHES: "/matches",
  ACTIVITY: "/activity",
  MESSAGES: "/messages",
  PROFILE: "/profile",
} as const;
```

Dynamic route helpers may be defined separately.

Example:

```ts
item: (id: string) => `/items/${id}`
```

---

# 9. Providers

Recommended structure:

```text
app/providers/
├── AppProviders.tsx
├── QueryProvider.tsx
├── AuthProvider.tsx
└── ThemeProvider.tsx
```

`AppProviders` should compose all global providers.

Example hierarchy:

```text
QueryClientProvider
   ↓
AuthProvider
   ↓
ThemeProvider
   ↓
RouterProvider
```

---

# 10. Layout Architecture

Recommended layouts:

```text
app/layouts/
├── PublicLayout.tsx
├── AuthLayout.tsx
├── AppLayout.tsx
└── RecoveryLayout.tsx
```

---

## PublicLayout

Used for:

```text
Landing
Login
Register
Forgot Password
```

---

## AppLayout

Used for authenticated application screens.

Contains:

```text
Desktop Navigation

Mobile Navigation

Page Container

Notification Access

Profile Access
```

---

## RecoveryLayout

Optional specialized layout for:

```text
Claim
Chat
Recovery
Handover
```

This can provide contextual item/recovery information.

---

# 11. Route Guards

Recommended:

```text
app/guards/
├── AuthGuard.tsx
├── GuestGuard.tsx
└── RecoveryGuard.tsx
```

---

## AuthGuard

Ensures the user is authenticated.

```text
Authenticated?
     ↓
YES → Render Route

NO → Login
```

---

## GuestGuard

Prevent logged-in users from unnecessarily accessing:

```text
Login
Register
```

---

## RecoveryGuard

May verify frontend-visible recovery conditions.

Example:

```text
Conversation requires accepted claim.
```

However:

> Frontend route guards are not security boundaries.

Supabase RLS and backend authorization remain authoritative.

---

# 12. Pages Layer

Pages should compose feature components.

A page should not contain large amounts of business logic.

Example:

```text
pages/explore/ExplorePage.tsx
```

should primarily compose:

```text
SearchBar
FilterBar
ListingGrid
Pagination
```

rather than manually implementing all Supabase queries.

---

# 13. Feature Module Pattern

Each feature may follow:

```text
features/listings/
├── components/
├── hooks/
├── services/
├── schemas/
├── types/
├── utils/
├── constants/
└── index.ts
```

Not every feature requires every folder.

Only create directories when required.

---

# 14. Authentication Feature

```text
features/auth/
├── components/
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   └── PasswordResetForm.tsx
│
├── hooks/
│   ├── useAuth.ts
│   ├── useLogin.ts
│   └── useRegister.ts
│
├── services/
│   └── auth.service.ts
│
├── schemas/
│   ├── login.schema.ts
│   └── register.schema.ts
│
└── types/
```

---

# 15. Listings Feature

This is one of the largest feature modules.

```text
features/listings/
├── components/
│   ├── ListingCard.tsx
│   ├── ListingGrid.tsx
│   ├── ListingBadge.tsx
│   ├── ListingDetails.tsx
│   ├── LostReportForm.tsx
│   ├── FoundListingForm.tsx
│   ├── LocationField.tsx
│   ├── ItemImageUploader.tsx
│   └── ListingStatusBadge.tsx
│
├── hooks/
│   ├── useListings.ts
│   ├── useListing.ts
│   ├── useCreateLostReport.ts
│   ├── useCreateFoundListing.ts
│   ├── useUpdateListing.ts
│   └── useCloseListing.ts
│
├── services/
│   └── listings.service.ts
│
├── schemas/
│   ├── lost-report.schema.ts
│   └── found-listing.schema.ts
│
├── types/
│   └── listing.types.ts
│
└── utils/
```

---

# 16. Matching Feature

```text
features/matching/
├── components/
│   ├── MatchCard.tsx
│   ├── MatchScore.tsx
│   ├── MatchComparison.tsx
│   ├── MatchStrengthBadge.tsx
│   └── MatchList.tsx
│
├── hooks/
│   ├── useMatches.ts
│   ├── useMatch.ts
│   └── useDismissMatch.ts
│
├── services/
│   └── matching.service.ts
│
├── types/
└── utils/
```

The frontend must only display match results.

Authoritative matching calculations belong in backend/database logic.

---

# 17. Claims Feature

```text
features/claims/
├── components/
│   ├── ClaimCard.tsx
│   ├── ClaimForm.tsx
│   ├── VerificationQuestion.tsx
│   ├── ClaimReview.tsx
│   └── ClaimStatusBadge.tsx
│
├── hooks/
│   ├── useClaim.ts
│   ├── useClaims.ts
│   ├── useCreateClaim.ts
│   ├── useAcceptClaim.ts
│   └── useRejectClaim.ts
│
├── services/
│   └── claims.service.ts
│
├── schemas/
├── types/
└── utils/
```

---

# 18. Chat Feature

```text
features/chat/
├── components/
│   ├── ConversationList.tsx
│   ├── ConversationCard.tsx
│   ├── ChatWindow.tsx
│   ├── MessageBubble.tsx
│   ├── MessageComposer.tsx
│   └── ChatHeader.tsx
│
├── hooks/
│   ├── useConversations.ts
│   ├── useMessages.ts
│   ├── useSendMessage.ts
│   └── useRealtimeMessages.ts
│
├── services/
│   └── chat.service.ts
│
├── types/
└── utils/
```

Realtime subscription logic should remain isolated from UI components.

---

# 19. Recovery Feature

Use `recovery` as the frontend domain covering accepted claims and handover lifecycle.

```text
features/recovery/
├── components/
│   ├── RecoveryCard.tsx
│   ├── RecoveryTimeline.tsx
│   ├── HandoverConfirmation.tsx
│   ├── RecoveryStatus.tsx
│   └── RecoverySuccess.tsx
│
├── hooks/
│   ├── useRecovery.ts
│   ├── useConfirmHandover.ts
│   └── useConfirmReceipt.ts
│
├── services/
│   └── recovery.service.ts
│
└── types/
```

---

# 20. Ratings Feature

```text
features/ratings/
├── components/
│   ├── RatingForm.tsx
│   ├── StarRating.tsx
│   ├── ReviewCard.tsx
│   └── RatingSummary.tsx
│
├── hooks/
│   ├── useRatings.ts
│   └── useSubmitRating.ts
│
├── services/
├── schemas/
└── types/
```

---

# 21. Notifications Feature

```text
features/notifications/
├── components/
│   ├── NotificationItem.tsx
│   ├── NotificationList.tsx
│   └── NotificationBadge.tsx
│
├── hooks/
│   ├── useNotifications.ts
│   └── useMarkNotificationRead.ts
│
├── services/
└── types/
```

---

# 22. Profiles Feature

```text
features/profiles/
├── components/
│   ├── ProfileHeader.tsx
│   ├── ProfileStats.tsx
│   ├── TrustScore.tsx
│   ├── BadgeList.tsx
│   └── PublicReviewList.tsx
│
├── hooks/
│   ├── useProfile.ts
│   └── useUpdateProfile.ts
│
├── services/
├── schemas/
└── types/
```

---

# 23. Shared Components

Shared components belong in:

```text
components/shared/
```

Only components genuinely reused across features should live here.

Examples:

```text
EmptyState

ErrorState

LoadingState

ConfirmDialog

PageHeader

SectionHeader

AvatarWithStatus

RelativeTime

SearchInput

ResponsiveContainer
```

Avoid moving feature-specific components into shared folders prematurely.

---

# 24. shadcn/ui Components

Generated shadcn components should live in:

```text
components/ui/
```

Examples:

```text
button.tsx
card.tsx
dialog.tsx
sheet.tsx
tabs.tsx
input.tsx
textarea.tsx
badge.tsx
avatar.tsx
dropdown-menu.tsx
select.tsx
skeleton.tsx
toast.tsx
```

These components should remain low-level UI primitives.

Business-specific logic should not be placed inside shadcn components.

---

# 25. Navigation Components

Recommended:

```text
components/navigation/
├── DesktopNav.tsx
├── MobileBottomNav.tsx
├── MobileHeader.tsx
├── NotificationButton.tsx
├── ProfileMenu.tsx
└── PostAction.tsx
```

---

# 26. Feedback Components

```text
components/feedback/
├── LoadingSpinner.tsx
├── PageSkeleton.tsx
├── EmptyState.tsx
├── ErrorState.tsx
├── SuccessState.tsx
└── OfflineBanner.tsx
```

Every important screen should have explicit:

```text
Loading
Empty
Error
Success
```

states.

---

# 27. Data Access Architecture

Components should not directly call:

```ts
supabase.from(...)
```

everywhere.

Use a service layer.

Preferred:

```text
React Component
      ↓
Feature Hook
      ↓
Feature Service
      ↓
Supabase Client
```

Example:

```text
ListingPage
    ↓
useListing()
    ↓
getListing()
    ↓
Supabase
```

---

# 28. Supabase Client Structure

```text
lib/supabase/
├── client.ts
├── auth.ts
├── database.types.ts
└── helpers.ts
```

---

## client.ts

Contains the browser Supabase client.

Only public client-safe values should be used:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Never expose:

```text
SUPABASE_SERVICE_ROLE_KEY
```

in frontend code.

---

# 29. Generated Database Types

Supabase-generated TypeScript types should be used wherever possible.

Example location:

```text
lib/supabase/database.types.ts
```

Frontend types should derive from database types where appropriate.

This prevents frontend assumptions from drifting away from the database schema.

---

# 30. Service Layer

Example:

```text
features/listings/services/listings.service.ts
```

Possible functions:

```ts
getListings()
getListingById()
createLostReport()
createFoundListing()
updateListing()
closeListing()
```

The service layer should:

- execute Supabase requests
- map raw errors
- return typed data
- avoid UI-specific logic

---

# 31. Hook Layer

Hooks connect the data layer to React.

Example:

```ts
useListing(itemId)
```

Responsibilities:

- call service
- manage query key
- expose loading/error state
- handle caching
- invalidate relevant data

Do not duplicate complex business rules inside React components.

---

# 32. TanStack Query Architecture

Recommended query keys:

```text
profiles
listings
matches
claims
conversations
messages
recoveries
ratings
notifications
```

Use query-key factories.

Example:

```ts
export const listingKeys = {
  all: ["listings"] as const,
  detail: (id: string) => ["listings", id] as const,
  mine: (userId: string) => ["listings", "mine", userId] as const,
};
```

This improves cache consistency.

---

# 33. Query Responsibilities

Use queries for server-owned state.

Examples:

```text
Listings
Matches
Claims
Messages
Profiles
Ratings
Notifications
```

Do not copy server data unnecessarily into global frontend state.

---

# 34. Mutation Responsibilities

Mutations include:

```text
Create Lost Report

Create Found Listing

Submit Claim

Accept Claim

Reject Claim

Send Message

Confirm Handover

Submit Rating
```

Each successful mutation should invalidate only the relevant queries.

---

# 35. Local State

Use React local state for UI-specific temporary state.

Examples:

```text
Modal open state

Current form step

Search field draft

Expanded accordion

Temporary filter panel state
```

---

# 36. Global Client State

Avoid adding a global state library unless the application clearly needs it.

Most state can be managed through:

```text
TanStack Query
React Context
Local State
URL State
```

If later required, a small client-state library can be introduced.

Do not add one prematurely.

---

# 37. URL State

Search filters should preferably be reflected in the URL.

Example:

```text
/explore?type=found&category=electronics&sort=newest
```

Benefits:

- shareable searches
- back-button compatibility
- persistent filters
- predictable navigation

---

# 38. Authentication State

Authentication should be centrally managed.

Recommended:

```text
AuthProvider
```

Exposed values:

```ts
user
session
profile
isLoading
isAuthenticated
signOut()
```

Supabase authentication events should keep this state synchronized.

---

# 39. Profile Loading

Authentication and profile are related but distinct.

Flow:

```text
Supabase Session
      ↓
Authenticated User
      ↓
Fetch Profile
```

The frontend must handle:

```text
Authenticated but profile loading
```

without incorrectly treating the user as logged out.

---

# 40. Form Architecture

Use:

```text
React Hook Form
+
Zod
```

Each major form should have its own schema.

Examples:

```text
lost-report.schema.ts

found-listing.schema.ts

claim.schema.ts

rating.schema.ts

profile.schema.ts
```

---

# 41. Multi-Step Forms

Lost and Found reports should use multi-step forms.

Recommended architecture:

```text
FormProvider
      ↓
Step Components
```

Example:

```text
LostReportForm
├── BasicsStep
├── DetailsStep
├── MediaStep
├── LocationStep
└── ReviewStep
```

Do not maintain independent form state in each step.

Use one shared form context.

---

# 42. Form Draft Persistence

For longer forms, optionally persist drafts temporarily.

Possible approach:

```text
sessionStorage
```

This helps prevent accidental form loss during navigation or refresh.

Do not store highly sensitive verification details indefinitely in local storage.

---

# 43. Form Validation Layers

Validation should occur at multiple levels.

```text
Client Schema Validation
        ↓
Supabase / Database Constraints
        ↓
RLS / Authorization
        ↓
Backend Business Rules
```

Client validation improves UX.

It must not replace backend enforcement.

---

# 44. Error Handling

Frontend errors should be normalized.

Create shared application errors such as:

```ts
type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "NETWORK_ERROR"
  | "CONFLICT"
  | "UNKNOWN";
```

Service-layer errors should map Supabase-specific errors into understandable application errors where appropriate.

---

# 45. User-Facing Error Messages

Do not expose raw messages such as:

```text
duplicate key value violates unique constraint
```

Use:

```text
You've already submitted a claim for this item.
```

---

# 46. Toast Usage

Use toasts for lightweight feedback.

Good examples:

```text
Report published successfully.

Claim submitted.

Profile updated.

Message failed to send.
```

Do not use toasts as the only feedback for critical lifecycle changes.

For critical events, update the page state clearly.

---

# 47. Listing Type Model

Use explicit types.

Example:

```ts
type ListingType = "LOST" | "FOUND";
```

Avoid arbitrary strings throughout components.

---

# 48. Listing Status Model

Example:

```ts
type ListingStatus =
  | "ACTIVE"
  | "MATCH_FOUND"
  | "CLAIM_PENDING"
  | "RECOVERY_IN_PROGRESS"
  | "RETURNED"
  | "CLOSED"
  | "CANCELLED";
```

The final enum must match the database schema.

---

# 49. Claim Status Model

```ts
type ClaimStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";
```

---

# 50. Status Presentation

Create centralized helpers instead of hardcoding status styling everywhere.

Example:

```ts
getListingStatusLabel(status)
getListingStatusVariant(status)
```

This ensures consistent UI.

---

# 51. Date and Time Handling

Store authoritative dates in a consistent backend format.

Frontend responsibilities:

- parse safely
- show local date/time
- show relative dates where useful

Example:

```text
Today

Yesterday

Oct 7, 2026
```

Avoid relying on browser string parsing for inconsistent date formats.

---

# 52. Location Presentation

Frontend should distinguish:

```text
Internal precise coordinates
```

from:

```text
Public approximate location
```

The UI should not accidentally render precise coordinates when only approximate location should be visible.

---

# 53. Sensitive Verification Data

Sensitive Finder data should be represented using separate types/models where possible.

Do not use a broad generic listing object that includes hidden verification fields everywhere.

Prefer:

```text
PublicFoundListing
```

and:

```text
FinderPrivateListingData
```

This reduces accidental leaks.

---

# 54. Public vs Private DTOs

Frontend should consume purpose-specific payloads.

Example:

```text
Public Item Detail
```

should not include:

```text
hidden_identifying_details
verification_answers
private_notes
```

even if the UI chooses not to render them.

Security should not rely only on hiding JSX.

---

# 55. Matching UI Architecture

Frontend matching components should display backend-generated information.

Example:

```ts
type MatchViewModel = {
  id: string;
  score: number;
  strength: "possible" | "strong" | "very_strong";
  categoryScore?: number;
  locationScore?: number;
  timeScore?: number;
  descriptionScore?: number;
};
```

The frontend may explain why items matched but must not recompute authoritative scores.

---

# 56. Match Comparison Component

Recommended component:

```text
MatchComparison
```

Accepts:

```text
Lost Item Summary

Found Item Summary

Match Metadata
```

Desktop:

```text
side-by-side
```

Mobile:

```text
stacked
```

---

# 57. Realtime Architecture

Realtime should primarily be used for:

```text
Chat messages
Unread message state
Selected notification updates
```

Avoid subscribing globally to every database table.

---

# 58. Realtime Subscription Pattern

Preferred:

```text
Conversation Screen
      ↓
useRealtimeMessages(conversationId)
      ↓
Subscribe
      ↓
Receive Event
      ↓
Update Query Cache
```

On unmount:

```text
Unsubscribe
```

Always clean up subscriptions.

---

# 59. Realtime and Query Cache

Realtime data should integrate with TanStack Query rather than building a second parallel state system.

Example:

```text
Realtime message event
      ↓
Insert into message query cache
```

or invalidate the relevant query when simpler.

---

# 60. Optimistic Updates

Use optimistic updates selectively.

Good candidate:

```text
Send chat message
```

Potentially:

```text
Mark notification as read
```

Avoid aggressive optimistic behavior for critical operations such as:

```text
Accept Claim

Complete Handover

Trust Score Update
```

These should wait for authoritative backend confirmation.

---

# 61. Upload Architecture

Image uploads should use a dedicated abstraction.

Example:

```text
ItemImageUploader
      ↓
uploadItemImage()
      ↓
Supabase Storage
```

Responsibilities:

- validate type
- validate size
- preview image
- upload
- handle failure
- return storage reference

---

# 62. Image Preview

Use local object URLs for previews where appropriate.

Always revoke them when no longer needed.

---

# 63. Image Loading

Use:

```text
lazy loading
```

for listing images.

Cards should not download large original assets if thumbnails are available.

Future storage transformations may be introduced.

---

# 64. Component Responsibility Rules

A component should ideally have one clear responsibility.

Bad:

```text
FoundItemPage.tsx
```

containing:

- Supabase query
- realtime subscription
- claim mutation
- image upload
- dialog state
- routing logic
- 500 lines of JSX

Preferred:

```text
FoundItemPage
├── FoundItemDetails
├── FinderProfileCard
├── ClaimAction
└── RelatedMatches
```

with logic in hooks/services.

---

# 65. Smart vs Presentational Components

Prefer a small number of data-aware components.

Example:

```text
ListingDetailContainer
      ↓
ListingDetails
```

`ListingDetails` should largely render props.

---

# 66. Component Size

There is no strict line limit, but large components should be reviewed.

Signals for extraction:

- repeated markup
- multiple unrelated responsibilities
- complex data fetching
- multiple dialogs
- nested conditions
- difficult testing

---

# 67. Conditional UI

Avoid deeply nested ternaries.

Instead of:

```text
status === A ? X : status === B ? Y : ...
```

prefer helper functions or dedicated status components.

---

# 68. Feature Public APIs

Each feature may expose a controlled public surface through:

```text
features/listings/index.ts
```

Example exports:

```ts
export { ListingCard } from "./components/ListingCard";
export { useListing } from "./hooks/useListing";
export type { Listing } from "./types/listing.types";
```

This reduces deep import paths.

---

# 69. Import Rules

Prefer:

```text
@/features/listings
@/components/ui/button
@/lib/supabase/client
```

instead of:

```text
../../../../features/listings/components/ListingCard
```

Configure path aliases.

---

# 70. Dependency Direction

Recommended direction:

```text
Pages
  ↓
Features
  ↓
Shared Components
  ↓
Libraries / Utilities
```

Avoid lower-level modules depending on page-level code.

---

# 71. Cross-Feature Dependencies

Cross-feature relationships should happen through clear APIs.

Example:

```text
Claims
   ↓
Recovery
```

Do not tightly couple feature internals.

Where possible, depend on:

```text
types
service interfaces
shared events
route navigation
```

instead of importing deeply into another feature.

---

# 72. Styling Architecture

Tailwind CSS v4 should be the primary styling system.

Use:

```text
utility classes
CSS variables
design tokens
shadcn primitives
```

Avoid introducing another styling framework.

---

# 73. Design Tokens

Semantic tokens should represent meaning rather than isolated colors.

Examples:

```text
background
foreground
muted
border
primary
secondary
destructive
success
warning
lost
found
match
```

Exact values will be defined in:

```text
06-ui-design-system.md
```

---

# 74. Tailwind Utility Rules

Avoid extremely long repeated class strings.

When UI patterns repeat, extract:

- reusable components
- variants
- class helpers

Recommended:

```text
class-variance-authority
```

where useful.

---

# 75. `cn()` Utility

Use a shared class merging helper.

Example:

```ts
cn("base-classes", condition && "conditional-class")
```

This is standard with shadcn/ui architecture.

---

# 76. Responsive Design

Mobile-first Tailwind usage:

```text
base
sm:
md:
lg:
xl:
```

Build mobile behavior first.

Desktop layouts should progressively enhance the experience.

---

# 77. Accessibility Architecture

Every feature must consider:

```text
keyboard access
focus management
screen readers
form labels
semantic markup
dialog accessibility
contrast
reduced motion
```

Prefer shadcn/Radix primitives for interactive elements because they already provide useful accessibility foundations.

---

# 78. Anime.js Architecture

Anime.js should be abstracted away from feature business logic.

Recommended:

```text
lib/animation/
├── animations.ts
├── motion-preference.ts
└── presets.ts
```

---

# 79. Animation Hooks

Optional reusable hook:

```text
useReducedMotion()
```

or:

```text
useAnimeAnimation()
```

Components should not directly duplicate complex Anime.js configuration.

---

# 80. Recommended Animation Targets

Use Anime.js for:

```text
Page reveals

Match-card reveal

Success confirmation

Recovery completion

Trust-score count-up

Micro-interactions
```

Avoid unnecessary motion for:

```text
ordinary text

every button

every card

every navigation event
```

---

# 81. Animation Cleanup

Animations must be cleaned up when components unmount.

Avoid animation code that continues operating on removed DOM nodes.

---

# 82. Reduced Motion

Before triggering non-essential motion:

```text
Check prefers-reduced-motion
```

When enabled:

```text
Show final UI state immediately
```

---

# 83. Performance Strategy

Key frontend performance requirements:

```text
Route-based code splitting

Lazy-loaded heavy pages

Optimized images

Limited realtime subscriptions

Query caching

Pagination

Avoid unnecessary rerenders
```

---

# 84. Route Lazy Loading

Major route components should be lazily loaded where useful.

Example:

```ts
const ExplorePage = lazy(() => import("@/pages/explore/ExplorePage"));
```

---

# 85. Pagination

Do not load unlimited listing datasets.

Use:

```text
pagination
```

or:

```text
cursor-based loading
```

depending on final Supabase query strategy.

---

# 86. Search Debouncing

Explore search should use a short debounce for network-based search.

Example:

```text
250–400ms
```

Avoid sending a new database query on every keystroke instantly.

---

# 87. Re-render Control

Use memoization only when it solves a demonstrated problem.

Avoid overusing:

```text
useMemo
useCallback
React.memo
```

without need.

Keep components simple first.

---

# 88. Error Boundaries

Application-level error boundaries should prevent total app crashes.

Recommended levels:

```text
Global Error Boundary

Route Error Boundary
```

Feature-specific boundaries may be added around unstable integrations if needed.

---

# 89. Logging

Production frontend should not indiscriminately log:

```text
user personal data

verification answers

tokens

sessions

private chat content
```

Development logging should also be reviewed before release.

---

# 90. Environment Configuration

Frontend environment values may include:

```text
VITE_SUPABASE_URL=

VITE_SUPABASE_ANON_KEY=
```

Optional future values:

```text
VITE_APP_ENV=

VITE_PUBLIC_APP_URL=
```

Never place backend secrets in `VITE_` variables.

Anything exposed through Vite is potentially available to browser users.

---

# 91. Configuration Module

Use:

```text
app/config/env.ts
```

to read and validate frontend environment variables.

This avoids using:

```ts
import.meta.env
```

throughout the entire codebase.

---

# 92. Supabase Authorization Philosophy

Frontend components may hide unavailable actions.

Example:

```text
Only Finder sees Accept Claim button.
```

But this is UX only.

Actual permission must be enforced by:

```text
Supabase RLS

Database functions

Edge Functions
```

where appropriate.

---

# 93. Database Mutation Strategy

Simple CRUD may call Supabase directly through service functions.

Sensitive multi-step operations should use authoritative backend functions.

Examples:

```text
Accept Claim

Complete Handover

Update Trust Score
```

The frontend should ideally call one backend operation instead of manually modifying several tables.

---

# 94. Example Claim Acceptance Architecture

Avoid:

```text
Frontend:
update claim
create conversation
update listing
create notification
```

as four independent requests.

Preferred:

```text
Frontend
    ↓
acceptClaim()
    ↓
Database Function / Edge Function
    ↓
Atomic backend operation
```

This prevents partial state corruption.

---

# 95. Recovery Completion Architecture

Similarly:

```text
Owner confirms receipt
        ↓
Backend checks:
finder confirmation?
owner confirmation?
        ↓
If both true:
complete recovery
update item
complete claim
enable ratings
create notifications
```

The frontend should only display the resulting state.

---

# 96. Testing-Friendly Architecture

Business logic should be testable independently from visual components.

Good:

```text
calculateDisplayStatus()
formatMatchStrength()
canUserClaim()
```

as pure functions.

Avoid embedding all decisions directly in JSX.

---

# 97. Component Testing Targets

High-value frontend components include:

```text
Lost Report Form

Found Listing Form

Match Card

Claim Form

Claim Review

Conversation

Recovery Timeline

Handover Confirmation

Rating Form
```

---

# 98. Feature Hook Testing

Important hooks include:

```text
useCreateLostReport

useCreateFoundListing

useCreateClaim

useAcceptClaim

useSendMessage

useConfirmHandover

useSubmitRating
```

---

# 99. Loading Strategy

Avoid one global loading spinner for everything.

Use localized loading states.

Example:

```text
Page shell loaded
      ↓
Match section skeleton
      ↓
Activity section skeleton
```

This improves perceived performance.

---

# 100. Empty State Strategy

Every feature list should provide a useful next action.

Example:

```text
No Lost Reports

[ Report Lost Item ]
```

```text
No Matches Yet

We'll keep checking new found listings.
```

```text
No Conversations

Chats appear after a claim is accepted.
```

---

# 101. Frontend Security Rules

The frontend must never:

- expose service-role credentials
- assume hidden buttons provide security
- display private verification data to unauthorized users
- expose raw auth tokens in logs
- store sensitive information unnecessarily in localStorage
- compute authoritative trust scores
- declare ownership based purely on match score
- directly bypass backend recovery state rules

---

# 102. Recommended Root Structure

Final recommended frontend structure:

```text
src/
│
├── app/
│   ├── router/
│   │   ├── index.tsx
│   │   ├── route-paths.ts
│   │   └── routes.tsx
│   │
│   ├── providers/
│   │   ├── AppProviders.tsx
│   │   ├── AuthProvider.tsx
│   │   └── QueryProvider.tsx
│   │
│   ├── layouts/
│   │   ├── PublicLayout.tsx
│   │   └── AppLayout.tsx
│   │
│   ├── guards/
│   │   ├── AuthGuard.tsx
│   │   └── GuestGuard.tsx
│   │
│   └── config/
│       └── env.ts
│
├── pages/
│   ├── landing/
│   ├── auth/
│   ├── home/
│   ├── explore/
│   ├── activity/
│   ├── matches/
│   ├── claims/
│   ├── recovery/
│   ├── messages/
│   ├── profile/
│   ├── notifications/
│   └── settings/
│
├── features/
│   ├── auth/
│   ├── profiles/
│   ├── listings/
│   ├── matching/
│   ├── claims/
│   ├── chat/
│   ├── recovery/
│   ├── ratings/
│   ├── notifications/
│   └── reports/
│
├── components/
│   ├── ui/
│   ├── shared/
│   ├── navigation/
│   ├── feedback/
│   └── layout/
│
├── hooks/
│
├── lib/
│   ├── supabase/
│   ├── query/
│   ├── validation/
│   └── animation/
│
├── services/
│
├── types/
│
├── constants/
│
├── utils/
│
├── styles/
│
├── assets/
│
├── App.tsx
└── main.tsx
```

---

# 103. Development Rules

All frontend implementation should follow these rules.

## Rule 1

Pages compose features.

Pages should not become business-logic containers.

---

## Rule 2

Features own feature-specific UI and logic.

---

## Rule 3

Shared components must be genuinely reusable.

---

## Rule 4

Supabase requests belong in services.

Avoid database queries directly inside JSX components.

---

## Rule 5

TanStack Query manages server state.

Do not unnecessarily duplicate server data into Context.

---

## Rule 6

Local UI state remains local.

Do not create global state for modal visibility or single-form state.

---

## Rule 7

Sensitive operations rely on backend authorization.

Frontend checks are only UX enhancements.

---

## Rule 8

Multi-table critical operations should be atomic on the backend.

---

## Rule 9

Animation is presentation only.

Anime.js must never control application business state.

---

## Rule 10

Every major feature must support:

```text
Loading

Success

Empty

Error
```

where relevant.

---

# 104. Frontend Dependency Flow

The preferred dependency flow is:

```text
ROUTER
   ↓
PAGE
   ↓
FEATURE COMPONENT
   ↓
FEATURE HOOK
   ↓
SERVICE
   ↓
SUPABASE
```

And:

```text
FEATURE COMPONENT
   ↓
SHARED COMPONENT
   ↓
SHADCN UI
```

Animation should remain parallel:

```text
COMPONENT
   ↓
ANIMATION UTILITY / HOOK
   ↓
ANIME.JS
```

---

# 105. Example Lost Report Flow in Architecture

```text
LostReportPage
       ↓
LostReportForm
       ↓
React Hook Form + Zod
       ↓
useCreateLostReport()
       ↓
createLostReport()
       ↓
Supabase
       ↓
Success
       ↓
Invalidate:
My Lost Reports
Activity
Listings
Matches if needed
       ↓
Navigate:
Lost Report Detail
```

---

# 106. Example Claim Acceptance Flow

```text
ClaimReviewPage
       ↓
ClaimReview
       ↓
Accept Claim Button
       ↓
useAcceptClaim()
       ↓
acceptClaim()
       ↓
Backend Function
       ↓
Claim Accepted
Conversation Created
Recovery Created
Notifications Generated
       ↓
Invalidate:
Claim
Claims
Recovery
Activity
Notifications
       ↓
Navigate:
Recovery Detail
```

---

# 107. Example Realtime Chat Flow

```text
ConversationPage
       ↓
useMessages()
       ↓
Fetch Existing Messages
       ↓
useRealtimeMessages()
       ↓
Supabase Realtime
       ↓
New Message Event
       ↓
Update Query Cache
       ↓
Message Appears
```

---

# 108. Example Handover Flow

```text
RecoveryPage
      ↓
Confirm Handover
      ↓
useConfirmHandover()
      ↓
Backend Operation
      ↓
Recovery State Updated
      ↓
Both Confirmed?
      ↓
YES
      ↓
Recovery Completed
      ↓
Rating Enabled
```

---

# 109. Initial Implementation Order

Frontend implementation should follow this order:

```text
1. Project setup

2. Tailwind + shadcn

3. Router

4. Providers

5. Supabase client

6. Authentication

7. App layout/navigation

8. Profile

9. Lost Report flow

10. Found Listing flow

11. Explore

12. Item detail

13. Activity

14. Matches

15. Claims

16. Recovery

17. Chat

18. Handover

19. Ratings

20. Notifications

21. Motion polish

22. Responsive polish

23. Accessibility review

24. Production optimization
```

---

# 110. Architecture Goal

The frontend should remain understandable even as the product grows.

A developer should be able to identify:

```text
Where UI lives

Where business logic lives

Where Supabase calls live

Where validation lives

Where types live

Where animations live
```

without searching through the entire repository.

The final architecture should support this principle:

> Features should be independently understandable, backend interactions should be predictable, and critical product state should remain controlled by Supabase rather than duplicated throughout the React application.

This architecture forms the frontend foundation for all subsequent Lost & Found product development.