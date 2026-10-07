# CLAUDE.md — Claude Development Workflow

Mandatory execution workflow for every coding task in this repository.

**Rules live in [AGENTS.md](AGENTS.md). This file is how you execute them.** Read
AGENTS.md first; it is the engineering contract. This file is the procedure.

This workflow is **mandatory for every future feature**. You do not need to be
reminded to read the docs. You do not need to ask which skill to use when the
repository can tell you.

---

## The Pipeline

```
TASK
  ↓
REPOSITORY INSPECTION
  ↓
DOCUMENT ROUTING
  ↓
SKILL DISCOVERY
  ↓
SKILL LOADING
  ↓
EXISTING IMPLEMENTATION INSPECTION
  ↓
IMPLEMENTATION PLAN
  ↓
IMPLEMENT
  ↓
VALIDATE
  ↓
SECURITY REVIEW
  ↓
FINAL REPORT
```

---

## PHASE A — Task Classification

Before editing a single file, classify the task. Categories:

`frontend UI` · `React architecture` · `responsive design` · `Supabase database` ·
`auth/RLS` · `storage` · `matching` · `realtime` · `chat` · `notifications` ·
`trust/rating` · `animation` · `testing` · `deployment` · `bug fix` · `refactor`

A task may belong to several categories at once. Classify generously — the
classification drives Phases B and C.

Also decide: **does this change cross the frontend/backend boundary?** If yes, the
API/data contract doc is mandatory in Phase B.

---

## PHASE B — Document Routing

Read the relevant docs **before** implementing. Load only what is relevant, plus the
mandatory ones.

### Always load when applicable

- the **requirements** section covering the feature
- the **architecture** doc for the layer you are touching
- **`docs/apiAndDataContracts.md`** whenever data crosses frontend ↔ backend
- **`docs/securityAndService.md`** whenever the task touches user data, auth, RLS,
  claims, chat, storage, recovery, trust, or notifications

### Documents in this repository

Discovered by inspection — re-list `docs/` if anything looks stale.

| Group | Files |
| --- | --- |
| Product | `productreview.md` (overview), `requirements.md`, `userFlow.md` |
| Frontend | `frontendArchitecture.md`, `screensAndNavigation.md`, `ui-design-system.md`, `animation-guidelines.md` |
| Backend | `supabaseArchitecture.md`, `database.md`, `authAndRls.md`, `storageAndMedia.md` |
| Domain engines | `matchingEngine.md`, `realTimeChat.md`, `notifications.md`, `trustAndRating.md` |
| Contracts & security | `apiAndDataContracts.md`, `securityAndService.md` |
| Process | `developmentPlan.md`, `testingPlan.md`, `deployment.md` |

### Routing table

| Task category | Load |
| --- | --- |
| Frontend feature | `frontendArchitecture.md`, `ui-design-system.md`, `screensAndNavigation.md`, + `animation-guidelines.md` if motion |
| Database / Auth / RLS | `supabaseArchitecture.md`, `database.md`, `authAndRls.md`, `securityAndService.md` |
| Matching | `matchingEngine.md`, `database.md`, `apiAndDataContracts.md`, `securityAndService.md` |
| Chat / realtime | `realTimeChat.md`, `database.md`, `authAndRls.md`, `securityAndService.md`, `apiAndDataContracts.md` |
| Storage / images | `storageAndMedia.md`, `securityAndService.md`, `authAndRls.md` |
| Notifications | `notifications.md`, `database.md`, `authAndRls.md`, `apiAndDataContracts.md` |
| Trust / rating | `trustAndRating.md`, `database.md`, `securityAndService.md` |
| Animation | `animation-guidelines.md`, `ui-design-system.md` |
| Testing | `testingPlan.md` + the doc for the area under test |
| Deployment | `deployment.md`, `securityAndService.md` |
| Scaffolding / Phase 0 | `developmentPlan.md`, `frontendArchitecture.md`, `deployment.md` |

These docs are large (20k–50k each). Outline first (`grep -n '^# '`), then read the
relevant sections — do not blind-read a whole file when three sections answer the
question.

**Do not treat this table as a closed filename list.** Discover the real contents of
`docs/` each time.

---

## PHASE C — Skill Discovery

Before implementing, inspect **`.agents/skills/`**.

1. **List** the skill directories actually installed.
2. **Identify** which are relevant to this task's categories.
3. **Read** each relevant skill's `SKILL.md` (and the `references/` or `rules/` file
   it directs you to).
4. **Follow** those instructions while implementing.

**Do NOT load all skills blindly. Use the minimum relevant set.**

### Routing approach (verify against the live directory — the installed set changes)

| Need | Skill |
| --- | --- |
| React component design / API correctness | `react-expert` |
| React / Vercel performance, bundle, re-renders | `vercel-react-best-practices` |
| Supabase anything (auth, realtime, storage, client, CLI/MCP, debugging) | `supabase` |
| Postgres: schema, migrations, RLS policies, indexes, functions, query plans | `supabase-postgres-best-practices` |
| Tailwind v4 + shadcn/ui components | `tailwind-css-v4-shadcn-ui` |
| Tailwind v4 fundamentals, `@theme`, `@utility` | `tailwindcss-fundamentals-v4` |
| Theme tokens / dark mode setup or repair | `tailwind-theme-builder` |
| UX guidelines, palettes, typography, a11y, motion presets | `ui-ux-pro-max` |
| High-quality UI, visual hierarchy, design critique | `ui-taste` |
| UI validation walkthrough / screenshot review | `ui-walkthrough` |
| Native iOS surface (rare here — web app) | `ios-design` |

**Do not hardcode this mapping without verifying the actual installed directories.**
Always discover first. See AGENTS.md §13 for the authoritative skill inventory and the
precedence rule.

---

## PHASE D — Pre-Implementation Inspection

Before writing code, inspect what already exists. **The frontend lives in
`WebsitePages/` and is already built — start there** (`src/routes/`,
`src/components/kept-*.tsx`, `src/components/ui/`, `src/lib/kept-context.tsx`,
`src/lib/kept-data.ts`):

- related existing components
- the feature directory for this domain
- existing hooks
- the service layer
- types (generated and domain)
- existing Supabase queries and RPCs
- database migrations
- existing reusable UI in `components/ui/` and `components/shared/`
- existing test coverage for this area

**Search before creating. Prefer reuse over replacement. Do not create duplicate
systems.**

If the repository is still unscaffolded for this area, say so and follow
`docs/developmentPlan.md` Phase 0 rather than inventing a structure.

---

## PHASE E — Plan

Create a concise internal implementation plan identifying:

1. files to modify
2. files to create
3. database changes
4. RLS / security changes
5. API / type changes
6. UI states (loading, empty, error, long content)
7. tests to add or update
8. skills being applied

**Plan only enough to implement correctly.** No long speculative plans, no
alternative-architecture essays.

---

## PHASE F — Implementation Order

For full-stack features, work in this order where applicable:

```
DATABASE / MIGRATION
  ↓
RLS
  ↓
RPC / BACKEND LOGIC
  ↓
GENERATED / DOMAIN TYPES
  ↓
SERVICE
  ↓
QUERY / MUTATION HOOK
  ↓
UI COMPONENT
  ↓
PAGE INTEGRATION
  ↓
LOADING / EMPTY / ERROR STATES
  ↓
ANIMATION / POLISH
  ↓
TESTS
```

**Do not build a frontend that assumes backend behavior which does not exist**, unless
the task explicitly asks for a mock. If you must stub, label the stub and list it under
*Remaining* in the final report.

---

## PHASE G — Skill-Driven Implementation

For each selected skill:

- read its instructions
- apply the relevant recommendations
- reconcile conflicts against repository docs

**Priority: repository docs > repository architecture > skill recommendation.**

Skills provide implementation expertise. They do **not** have authority to rewrite the
product architecture. If a skill suggests something that conflicts with `docs/`,
**follow `docs/`** and note the divergence in the final report.

---

## PHASE H — Security Check

For every feature, answer all eight. Reference: AGENTS.md §5 and §7.

| Question | Ask |
| --- | --- |
| **AUTHENTICATION** | Who is the user? Is identity derived from `auth.uid()`? |
| **AUTHORIZATION** | Who may access this data? Is that enforced server-side? |
| **OWNERSHIP** | Who owns this resource? Is ownership checked, not assumed? |
| **PRIVACY** | Is any private information exposed — coordinates, verification answers, Finder details, another user's records? |
| **MUTATION AUTHORITY** | Is the client trying to control backend state — status, score, sender, recipient, participant ids? |
| **RLS** | Is direct database access protected, including the denial case? |
| **STORAGE** | Are uploaded and read files properly scoped by path and policy? |
| **LOGGING** | Are secrets or private values being logged anywhere? |

**If any answer is unclear, the feature is not complete.** Say which answer is unclear.

---

## PHASE I — Testing

Run the relevant verification. At minimum, when available:

```
npm run lint
npm run typecheck
npm run test
npm run build
```

For database changes, also run the relevant:

- Supabase migration / `supabase db reset`
- RPC tests
- RLS tests (including negative cases)

For major product-flow changes, run the relevant E2E tests (Playwright).

### Rules

- **Do not hide failing tests.**
- **Do not disable or skip a test to get green.**
- If an unrelated pre-existing test fails, **state that clearly** and separately.
- If a script does not exist in this repository yet, say so rather than reporting a
  run that did not happen.

---

## PHASE J — UI Review

For UI work, verify:

- mobile · tablet · desktop
- loading · empty · error states
- long content / overflow / truncation
- keyboard navigation
- focus visibility
- `prefers-reduced-motion`
- image fallbacks (missing, broken, slow)

When the `ui-walkthrough` skill is installed and relevant, use it. Note that it assumes
a pre-existing Playwright harness — adapt to what this repository actually has.

---

## PHASE K — Completion Report

End every implementation with this report. Keep it concise.

```
Implemented:
<what changed>

Files:
<important files>

Database:
<migrations / RPC / RLS changes, or "none">

Skills used:
<skills whose instructions you actually read>

Validation:
<commands and tests actually run, with results>

Security:
<important authorization and privacy checks performed>

Remaining:
<known issues, stubs, deferred work — or "none">
```

**Do not claim a test passed if it was not run.**
**Do not claim a skill was used if its instructions were not read.**

---

## Autonomous Feature Flow

For a prompt like *"Implement the Lost Report feature"*, perform all of this without
being asked:

1. Understand the task and classify it (Phase A).
2. Inspect the relevant docs (Phase B).
3. Inspect `.agents/skills/` (Phase C).
4. Load the relevant skills (Phase C).
5. Inspect the existing implementation (Phase D).
6. Check the current database / schema state.
7. Plan (Phase E).
8. Implement backend if needed (Phase F).
9. Implement frontend.
10. Add loading / empty / error states.
11. Apply the UI design system.
12. Apply animation guidelines where relevant.
13. Verify RLS and security (Phase H).
14. Add or update tests.
15. Run validation (Phase I).
16. Report (Phase K).

**Do NOT ask the user which skill to use** when the right skill can be determined from
the repository. **Do NOT require the user to remind you to read the docs.**

---

## Feature Implementation Loop

```
          USER REQUEST
               │
               ▼
        CLASSIFY FEATURE
               │
               ▼
        FIND RELEVANT DOCS
               │
               ▼
        DISCOVER SKILLS
               │
               ▼
        LOAD SKILL RULES
               │
               ▼
        INSPECT CURRENT CODE
               │
               ▼
          PLAN CHANGES
               │
               ▼
           IMPLEMENT
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
    BACKEND          FRONTEND
       │                │
       └───────┬────────┘
               │
               ▼
           INTEGRATE
               │
               ▼
        SECURITY REVIEW
               │
               ▼
             TEST
               │
               ▼
        BUILD / TYPECHECK
               │
               ▼
          FINAL REVIEW
               │
               ▼
            COMPLETE
```

---

## Important Prohibitions

Claude must **not**:

- invent tables without checking `docs/database.md`
- invent statuses (final sets are in AGENTS.md §6)
- change the lifecycle casually
- bypass RLS
- place service-role secrets in frontend code
- calculate an authoritative match score in the frontend
- calculate an authoritative Trust Score in the frontend
- expose exact coordinates publicly
- expose Finder private verification details
- create generic DMs
- allow chat before an accepted claim
- directly mutate critical statuses from the browser
- create redundant service layers
- introduce unnecessary dependencies
- create an Edge Function for normal CRUD without justification
- use `any` casually when a proper type can be derived
- duplicate existing UI components
- ignore mobile behavior
- ignore loading / error / empty states
- disable tests to make CI pass
- modify docs silently to justify an implementation

---

## Repository Quick Facts

- **Stack:** React + TypeScript + Vite · Tailwind CSS v4 · shadcn/ui · Lucide ·
  Anime.js · React Router · TanStack Query · React Hook Form + Zod · Supabase ·
  Vitest + Playwright · Vercel. (AGENTS.md §3)
- **Current state:** `WebsitePages/` holds the **existing, visually approved Lovable
  frontend** (TanStack Start + TanStack Router, 19 file routes, mock data via
  `src/lib/kept-context.tsx`, no backend). `supabase/` exists but is empty.
  Frontend scaffolding is done — Phase 0 does not apply to it.
- **Do not rebuild or redesign the frontend.** Inspect `WebsitePages/src/` before
  creating any UI; reuse its components and design system. See AGENTS.md §3 for the
  recorded stack divergence (docs say Vite/React Router/Anime.js; the frontend uses
  TanStack Start/TanStack Router and no Anime.js).
- **Next work:** mock data → services → hooks → Supabase → RLS flows →
  loading/error/empty states → tests. `docs/` stays authoritative for behavior,
  privacy and security.
- **Layering:** Component → Hook → Service → Supabase. (AGENTS.md §4)
- **Supabase MCP** is configured in `.mcp.json` (project ref `iufnpiesyioqsysvqmja`)
  and enabled in `.claude/settings.local.json`. Use it to inspect live schema,
  advisors, and logs — but **migrations remain the system of record**, not ad-hoc SQL.
- **`.env` contains service-role and secret keys.** Frontend may use only the URL and
  publishable/anon key. Never read a secret into client code, never log one.
