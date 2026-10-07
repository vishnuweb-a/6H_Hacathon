# AGENTS.md — Lost & Found Engineering Contract

Permanent engineering contract for every coding agent working in this repository.
Read this file **before** any code change. It is not optional, and it is not
superseded by task urgency.

Companion file: [CLAUDE.md](CLAUDE.md) defines the mandatory **execution workflow**.
This file defines the **rules**. Read both.

---

## 1. Project Mission

A **trust-based Lost & Found recovery platform**. People report items they have lost,
people publish items they have found, the system suggests likely pairs, and the two
sides are brought together through a controlled, verified, auditable recovery.

The product lifecycle:

```
REPORT → DISCOVER → MATCH → CLAIM → VERIFY → CONNECT → RETURN → RATE → TRUST
```

Every feature must serve some stage of that lifecycle.

**This product is NOT:**

- not an ecommerce marketplace (no items-for-sale, no price, no cart, no checkout)
- not a borrowing or rental platform
- not a barter or swap platform
- not a generic social network (no followers, no feed-for-its-own-sake, no public DMs)

If a requested feature only makes sense in one of those products, flag the mismatch
before implementing it.

**The two roles** (`docs/requirements.md` §3):

- **Owner** — lost an item, searches, submits claims, proves ownership.
- **Finder** — found an item, publishes it, holds the private verification details,
  reviews claims, decides who gets the item back.

---

## 2. Source of Truth

Strict precedence. Higher wins. Always.

1. **`docs/`** — the authoritative specification.
2. **Existing database migrations / live schema** — what actually exists.
3. **Existing code architecture** — established patterns in the repo.
4. **The task-specific implementation request** — the immediate ask.

### Conflict rule

If the task, or your own preferred design, conflicts with documented architecture:

> **STOP. Name the conflict explicitly. Do not silently invent a second design.**

Report it as: *what the docs say* → *what the task implies* → *what you recommend*.
Then wait for a decision, or proceed only on the documented behavior.

A skill recommendation **never** outranks `docs/`. See §13.

---

## 3. Technology Stack

Verified against `docs/requirements.md` §2 and `docs/frontendArchitecture.md` §2.

### Frontend

| Concern | Choice |
| --- | --- |
| Framework | React + TypeScript |
| Build tool | Vite |
| Styling | **Tailwind CSS v4** (CSS-first `@theme`, no `tailwind.config.js`) |
| Components | shadcn/ui |
| Icons | Lucide |
| Motion | **Anime.js** |
| Routing | React Router |
| Server state | TanStack Query |
| Forms | React Hook Form + **Zod** |

### Backend — Supabase

Auth · PostgreSQL · Storage · Realtime · Row Level Security ·
Database functions / RPC · Edge Functions **only where justified**.

### Testing & deploy

Vitest (unit/component) · Playwright (E2E) · Vercel (hosting).

### Current repository state

The repository contains `docs/`, `.agents/skills/`, `.claude/`, `.mcp.json`,
`skills-lock.json`, `.env`, an empty `supabase/` scaffold (`migrations/`,
`functions/`, `seed.sql`) — and **`WebsitePages/`, which holds the existing,
visually approved Lovable frontend** (cloned from
`github.com/vishnuweb-a/kept-campus-finder`, 19 file routes, mock data only, no
backend). Frontend scaffolding is therefore **done**; `docs/developmentPlan.md`
Phase 0 no longer applies to the frontend.

**`WebsitePages/` is the frontend implementation. Do not rebuild it, redesign it,
replace its design system, or scaffold a second frontend.** Inspect the existing
Lovable code before creating any UI, and reuse what is there. The remaining work
is to replace its mock data with real Supabase access: inspect mock data →
services → hooks → Supabase → RLS-compatible flows → loading/error/empty states →
tests.

#### Stack divergence — recorded, not yet reconciled

The approved frontend differs from the documented stack above. Reality wins for
what exists; the docs remain authoritative for behavior, privacy and security:

| Documented | Actually in `WebsitePages/` |
| --- | --- |
| Vite | Vite via **TanStack Start** (SSR, Nitro output) |
| React Router | **TanStack Router** (file routes in `src/routes/`) |
| Anime.js | not installed (CSS-driven editorial styling in `src/styles.css`) |
| `src/features/**` layering | flat `src/components/kept-*.tsx` + `src/lib/kept-context.tsx` |

Reconciling these (or amending the docs) goes through §12. Do not silently
"fix" the frontend to match the table above.

**Do not substitute** a documented choice (Next.js for Vite, Framer Motion for
Anime.js, Zustand for TanStack Query, Tailwind v3 syntax for v4) without going
through §12.

### Supabase project

`.mcp.json` wires a Supabase MCP server to project ref `iufnpiesyioqsysvqmja`.
`.env` holds `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ANON_KEY`,
`SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

> **Only the URL and the publishable/anon key may ever reach frontend code or a
> `VITE_`-prefixed variable.** `SUPABASE_SECRET_KEY` and
> `SUPABASE_SERVICE_ROLE_KEY` are server-only. Never import them, never log them,
> never commit them, never expose them through Vite env. See §5.

---

## 4. Architecture Rules

Reference: `docs/frontendArchitecture.md`.

### Layering

```
Component  →  Hook  →  Service  →  Supabase
```

Each arrow is a one-way dependency. Never skip a layer upward.

- **Pages compose features.** A page wires layout + feature components + route
  params. A page is **not** a business-logic dump: no scoring, no Supabase calls,
  no multi-step mutation orchestration inside a page file.
- **Feature-based architecture.** Domain code lives in `src/features/<domain>/`
  (`auth`, `profiles`, `listings`, `matching`, `claims`, `chat`, `recovery`,
  `ratings`, `notifications`, `reports`), each with its own components, hooks,
  services, types, and schemas. Cross-feature imports go through a feature's public
  surface, not into its internals.
- **Never scatter raw Supabase queries through UI components.** Queries live in
  feature-specific services.
- **One service per domain.** Do not create a second parallel data-access layer, a
  "helpers" shadow service, or a generic `api.ts` god-module.

### Folder structure (`docs/frontendArchitecture.md` §5)

Target structure for **new** backend-facing code. The existing Lovable frontend in
`WebsitePages/` does not follow it (see §3) — extend what is there rather than
restructuring it wholesale.

```
src/
  app/         router, providers, layouts, guards, config
  pages/       landing, auth, home, explore, activity, messages,
               profile, notifications, settings
  features/    auth, profiles, listings, matching, claims, chat,
               recovery, ratings, notifications, reports
  components/  ui (shadcn), shared, navigation, feedback, layout
  hooks/  lib/ (supabase, query, validation, animation)
  services/  types/  constants/  utils/  styles/  assets/
```

### State ownership — exactly one owner per kind of state

| State | Owner |
| --- | --- |
| Server state (fetch/cache/mutate/invalidate) | **TanStack Query** |
| Local UI state (open/closed, hover, step index) | **React local state** |
| Form state + validation | **React Hook Form + Zod** |
| Search / filter / sort / pagination | **URL state** (searchParams) |
| Session, current user, auth status | **Auth provider / context** |

- **Do not introduce a global state library** (Redux, Zustand, Jotai, MobX…) unless
  `docs/` documents a need the table above cannot serve. Wanting one is not a
  documented need.
- Do not mirror server state into local state. Derive it.

### Types

- Use **generated Supabase database types** as the base for all row/insert/update
  shapes once a schema exists. Regenerate rather than hand-editing.
- **Public/private DTO separation is mandatory.** A public DTO is a deliberately
  narrowed shape. Never return a raw row to a public surface and hope RLS covered
  it. See §7 and `docs/securityAndService.md` §22–24.
- `any` is not acceptable where a type can be derived. Prefer `unknown` + narrowing
  over a cast when a boundary is genuinely untyped.

---

## 5. Backend Rules

Reference: `docs/supabaseArchitecture.md`, `docs/authAndRls.md`,
`docs/securityAndService.md`.

- **RLS from the beginning.** Every table in an exposed schema gets RLS enabled in
  the same migration that creates it. Never "add RLS later."
- **Default deny.** Start from no access, then grant the specific access the model
  requires. Do not copy one `auth.uid()` policy onto every table reflexively — write
  the policy that matches the real access model.
- **The service role key NEVER appears in the frontend.** Not in a component, not in
  a hook, not in a service, not in a `VITE_` variable, not in a comment.
- **Derive identity from `auth.uid()`** server-side wherever possible. Never trust a
  client-supplied user id as proof of identity.
- **Critical lifecycle operations run through controlled RPC / database functions**,
  not a sequence of client-issued table writes. This includes at minimum: claim
  creation, claim acceptance, claim rejection, handover confirmation, recovery
  completion, trust/rating aggregation.
- **Critical multi-table transitions must be atomic.** One transaction, one function.
  A partially-applied recovery is a data-integrity incident.
- Completion-style operations must be **idempotent** — a double confirm must not
  double-apply (`docs/supabaseArchitecture.md` §51).
- **The frontend never authoritatively sets lifecycle status.** It requests a
  transition; the backend decides and writes it.
- **The frontend never sets:** match score · trust score · message sender identity ·
  rating target · notification recipient · recovery participant ids. All are
  system-controlled (`docs/securityAndService.md` §21).
- **All schema change goes through migrations.** No ad-hoc dashboard edits, no
  `execute_sql` DDL as the system of record. A migration file is the artifact.
- **Never fix a broken RLS policy by bypassing RLS with the service role key.** A
  policy that blocks a legitimate read is a policy bug. Fix the policy.
- **`SECURITY DEFINER` functions require** an explicit authorization check in the
  body *and* a pinned safe `search_path` (`docs/securityAndService.md` §44–45). A
  `SECURITY DEFINER` function without an internal authz check is a privilege
  escalation, not a convenience.
- **Do not create an Edge Function for ordinary CRUD.** Edge Functions need a stated
  justification (third-party secret, webhook, heavy/async work). Normal reads and
  writes go through PostgREST + RLS or an RPC.

---

## 6. Product State Rules

These are the **final** persisted states from `docs/database.md` §71–73. Note that
`docs/database.md` §8–11 lists longer *initial draft* enums; §71–73 supersede them to
prevent duplicated state. Use the final sets.

### `listing_status` (items)

```
ACTIVE
RECOVERY_IN_PROGRESS
RETURNED
CLOSED
CANCELLED
```

Derived, **not persisted**: `MATCH_FOUND` (derive from `matches`), `CLAIM_PENDING`
(derive from `claims`).

### `claim_status`

```
PENDING
ACCEPTED
REJECTED
CANCELLED
COMPLETED
```

### `recovery_status`

```
ACTIVE
PARTIALLY_CONFIRMED
COMPLETED
CANCELLED
```

Derived, **not persisted**: `HANDOVER_PENDING` (derive from an active recovery).

### Other enums

`listing_type` = `LOST` | `FOUND`. `match_status`, `notification_type`,
`report_target_type`, `report_status` are defined in `docs/database.md` §6–14 — read
it rather than guessing values.

### Rules

- **Do not invent additional persisted states.** If a state is derivable from a
  related table, derive it.
- Do not add a status value, rename one, or change a transition without §12.
- Status strings are a contract shared by DB enum, generated types, and UI copy.
  Change all three together or none.

---

## 7. Privacy and Security Rules

Reference: `docs/securityAndService.md`, `docs/authAndRls.md`.

### Location

- **Exact coordinates are private** unless a documented flow explicitly requires
  them (`docs/securityAndService.md` §60–61).
- **Public UI shows approximate location only** — area/neighborhood granularity.
  Never render precise coordinates, never ship them in a public DTO, never put them
  in a public map pin.

### Finder privacy

- **Finder private ownership details never appear publicly.** The whole verification
  model depends on only the true owner knowing them.
- **Verification answers never leak** — not to the claimant, not in an error message,
  not in a match explanation, not in a log line, not in a client-side comparison.
  Answers are compared server-side.

### Chat

- **Chat exists only for authorized recovery participants.** A conversation is
  created by the backend as a consequence of an **accepted claim**.
- **No generic user DMs.** There is no "message this user" affordance anywhere.
- **No chat before an accepted claim.** Ever.
- **Completed or cancelled recovery → the conversation becomes read-only**, per
  `docs/realTimeChat.md` and `docs/securityAndService.md` §39.
- Sender identity is set by the backend from `auth.uid()`, never by the client.

### Trust and matching are not proof

- **A high trust score does not prove ownership.**
- **A high match score does not prove ownership.**
- Only the Finder, via verification, decides a claim. UI copy must not imply
  otherwise (`docs/matchingEngine.md`, match language).

### Cross-user isolation

Never expose another user's private claims, messages, recoveries, notifications,
verification answers, or private Finder details — through a query, a join, an RPC
return shape, a realtime channel, or a cache key.

### Rendering and logging

- **User-generated content must render safely.**
- **Never use `dangerouslySetInnerHTML` for user content.** No exceptions.
- Validate and constrain user-supplied URLs before linking or fetching.
- **Never log** tokens, session data, claim answers, private Finder details, chat
  content, precise coordinates, or secrets — not to the console, not to an error
  tracker, not into a database audit row.

---

## 8. UI Rules

Reference: `docs/ui-design-system.md`, `docs/screensAndNavigation.md`,
`docs/animation-guidelines.md`.

- **Follow `docs/ui-design-system.md`** for tokens, color, type scale, spacing,
  radius, elevation, and component anatomy.
- **Use existing shadcn/ui primitives before creating a replacement.** Search
  `components/ui/` first. Extend; do not fork.
- **Tailwind CSS v4 only** — CSS-first `@theme` configuration,
  `@import "tailwindcss"`. No `tailwind.config.js`, no v3 directive syntax.
- **Lucide icons.** No emoji as icons.
- **Visual tone: calm, trustworthy, modern, clean.** This is a product people use on
  a bad day, after losing something. Avoid marketplace visual language — no urgency
  badges, no price-style emphasis, no "deal" framing, no countdown pressure.
- **Responsive from the start.** Mobile, tablet, and desktop must all work. Mobile is
  not a later pass. No horizontal page scroll.
- **Accessibility is not optional:** real labels, visible focus states, keyboard
  operability, correct semantics, ≥44×44px touch targets, **WCAG AA** contrast as the
  target.
- **Respect `prefers-reduced-motion`** in every animation you add.
- **Anime.js enhances presentation only.** Animation never owns business state, never
  gates a mutation, and never is the only signal that something succeeded.
- Every data-driven surface ships **loading, empty, and error** states. See §11.

---

## 9. Matching Rules

Reference: `docs/matchingEngine.md` (full algorithm) and `docs/requirements.md` §9.
Summary of invariants only — **do not reimplement the algorithm from this summary.**

### Direction

- Matching is **bidirectional LOST ↔ FOUND**.
- **Never LOST ↔ LOST.** **Never FOUND ↔ FOUND.**
- A user's item never matches their own item.

### Authority

- **Matching suggests. It never verifies ownership.** A match is a hypothesis.
- The authoritative score is computed **server-side**. The frontend displays it; the
  frontend never computes or submits it.

### Initial MVP weights (`docs/matchingEngine.md`, Recommended MVP weighting)

| Factor | Weight |
| --- | --- |
| Category | 25% |
| Location | 25% |
| Date / Time | 20% |
| Description | 30% |

Score range **0–100**. When a signal is unavailable, use the documented **dynamic
weight normalization** rather than scoring it zero (`docs/matchingEngine.md` §68).

### Thresholds

| Score | Label |
| --- | --- |
| 90–100 | Very Strong Match |
| 75–89 | Strong Match |
| 60–74 | Possible Match |
| below 60 | not surfaced |

Surface at **≥ 60**; notify at **≥ 75**. These are documented product thresholds — do
not retune them inline.

### Leakage

**Private ownership details must not leak through matching explanations.** A match
rationale may say *"category and area align"*. It may never reveal a verification
question, a verification answer, a private Finder detail, or exact coordinates.

---

## 10. Testing Rules

Reference: `docs/testingPlan.md`. Tooling: **Vitest**, **Playwright**.

Run what is relevant to the change, and run it before claiming completion:

- **typecheck** — `npm run typecheck`
- **lint** — `npm run lint`
- **unit tests** — `npm run test` (scoring, trust, DTO mappers, validation)
- **backend / RPC tests** — when a database function changed
- **RLS tests** — when a policy, table, or access path changed; assert the *negative*
  case (the wrong user must be denied)
- **component tests** — when component behavior changed
- **E2E tests** — for critical lifecycle changes (report, claim, accept, handover,
  recovery completion, rating)
- **production build** — `npm run build`

### Hard rules

- **Never mark a task complete while knowingly leaving a relevant test failing.**
- **Never disable, skip, or delete a test to make the suite pass.**
- If an *unrelated* pre-existing test fails, say so explicitly and separately.
- Never claim a command passed if it was not run. If tooling does not exist yet in
  this repository, say that plainly instead of reporting a phantom green run.

---

## 11. Definition of Done

A feature is complete only when **all** of the following hold:

1. Functionality works for the real documented flow.
2. Database changes exist as **migrations**.
3. **RLS is correct** — and verified, including a denial case.
4. **Types are synchronized** with the schema (regenerated, not hand-patched).
5. **Loading state** exists.
6. **Empty state** exists.
7. **Error state** exists — with a recovery path, not a dead end.
8. **Responsive** behavior works on mobile, tablet, desktop.
9. **Accessibility** considered — labels, focus, keyboard, contrast, reduced motion.
10. **Security reviewed** against §5 and §7 (see CLAUDE.md Phase H).
11. **Relevant tests pass.**
12. **Build passes.**
13. **No architecture drift** was introduced.

Anything missing is reported as remaining work, not quietly omitted.

---

## 12. Documentation Change Rule

`docs/` is the specification. **Do not casually edit it**, and never edit it to
retroactively justify an implementation shortcut.

If implementation genuinely requires an architecture change:

1. **Identify the conflict** — quote the doc and the requirement that collides.
2. **Explain the required change** — what must change, and why nothing smaller works.
3. **Update the relevant documentation** — deliberately, in a reviewable edit.
4. **Update schema / contracts** if the change touches them.
5. **Then implement.**

Never reverse that order. Never do step 5 and skip steps 1–4.

---

## 13. Agent Skill System

Specialized implementation skills are installed under **`.agents/skills/`**. Each is
a directory containing `SKILL.md` (plus `references/`, `rules/`, `scripts/`,
`assets/` in some cases). `skills-lock.json` at the root records their provenance.

### Rules

1. **Before implementing a task, inspect `.agents/skills/`.** List what is actually
   installed. The set changes over time — discover, do not assume.
2. **Select only the skills relevant to the task.** Minimum relevant set.
3. **Read the selected skill's `SKILL.md`** (and the specific `references/` file it
   points you to) before applying it.
4. **Never claim to have used a skill whose instructions you did not read.**
5. **Never load every skill blindly.** That is noise, not diligence.
6. **Precedence:** `docs/` > repository architecture > skill recommendation. Skills
   carry implementation expertise. They have **no authority to rewrite the product
   architecture.** When a skill conflicts with `docs/`, follow `docs/` and note the
   divergence.

### Currently installed skills

Verified by inspection. **Re-verify each session** — treat this table as a snapshot.

| Skill | Use it for |
| --- | --- |
| `react-expert` | Authoritative research on a React API/concept from source, tests, PRs — when correctness of a React behavior is in doubt. |
| `vercel-react-best-practices` | React performance: waterfalls, bundle size, re-render and rendering cost, client data-fetching patterns. Ships `rules/` plus its own `AGENTS.md`. |
| `supabase` | Any Supabase work: Auth, Database, Realtime, Storage, Edge Functions, `supabase-js`, CLI/MCP, RLS surprises, debugging, logs. |
| `supabase-postgres-best-practices` | Anything that lives *in* Postgres: schema, column types, migrations, RLS policies and their tests, indexes, triggers, functions, slow queries, EXPLAIN. |
| `tailwind-css-v4-shadcn-ui` | Tailwind v4 + shadcn/ui together: component install/customization, dark mode via CSS variables, v4 CSS-first setup. |
| `tailwindcss-fundamentals-v4` | Tailwind v4 fundamentals: install, `@theme`, `@utility`, `@variant`, v3→v4 migration, new v4 utilities. |
| `tailwind-theme-builder` | Standing up or repairing the themed Tailwind v4 + shadcn/ui token system and dark mode (`@theme inline` architecture). |
| `ui-ux-pro-max` | Searchable UI/UX intelligence: styles, palettes, font pairings, UX guidelines, icons, motion presets, chart types, per-stack guidance. Has a local search script. |
| `ui-taste` | Visual quality: layout choice, hierarchy, polish, design critique, final visual review. |
| `ui-walkthrough` | Enumerate and screenshot every view/state (empty, loading, error, dialogs, breakpoints, light/dark/RTL) via Playwright, then review. Supports `--fix`. |
| `ios-design` | Native/iPhone-specific design work (Apple HIG, SwiftUI/UIKit/React Native). **Not applicable to this web app** unless a native surface is explicitly requested. |

Note: several of these skills are written for other stacks (Next.js server
components, SwiftUI, a pre-existing Playwright harness). Adapt their *principles*; do
not import their *assumptions*. Rule 6 above governs.

---

## 14. Non-Negotiable Prohibitions

Do not:

- invent tables, columns, or statuses without checking `docs/database.md`
- change the product lifecycle casually
- bypass RLS, or "temporarily" use the service role to get past a policy
- place service-role or secret keys in frontend code or `VITE_` variables
- compute an authoritative match score in the frontend
- compute an authoritative trust score in the frontend
- expose exact coordinates publicly
- expose Finder private verification details or answers
- create generic user-to-user DMs
- allow chat before an accepted claim
- mutate critical statuses directly from the browser
- create redundant service layers or parallel data-access paths
- add dependencies that duplicate something already in the stack
- create an Edge Function for ordinary CRUD without justification
- use `any` where a proper type can be derived
- duplicate an existing UI component instead of reusing it
- ignore mobile behavior
- ship without loading / empty / error states
- disable or delete tests to make validation pass
- edit `docs/` silently to justify an implementation
