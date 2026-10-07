# Lost & Found Platform — Deployment

## 1. Purpose

This document defines the deployment architecture and release process for the Lost & Found Platform.

It covers:

- environments
- Supabase project setup
- database migrations
- storage deployment
- secrets
- Vercel deployment
- domains
- CI/CD
- staging
- production releases
- rollback
- monitoring
- backups
- post-deployment checks
- release gates
- launch checklist

The deployment model is:

```text
React Frontend
      ↓
Vercel
      ↓
Supabase
├── Auth
├── PostgreSQL
├── Storage
├── Realtime
└── Edge Functions
```

---

# 2. Deployment Principles

The deployment process should follow:

```text
REPRODUCIBLE

SECURE

MIGRATION-DRIVEN

TESTED

REVERSIBLE

OBSERVABLE
```

Production must never depend on undocumented manual configuration.

---

# 3. Target Architecture

Recommended production architecture:

```text
                 USER
                   │
                   ▼
               HTTPS
                   │
                   ▼
                VERCEL
                   │
          React / Vite Frontend
                   │
                   ▼
                HTTPS
                   │
                   ▼
               SUPABASE
          ┌────────┼────────┐
          │        │        │
          ▼        ▼        ▼
        Auth   PostgreSQL  Storage
                    │
                 Realtime
                    │
              Edge Functions
```

---

# 4. Environments

Recommended environments:

```text
LOCAL

STAGING

PRODUCTION
```

Each environment should remain independent.

---

# 5. Local Environment

Used for:

- feature development
- migration development
- RLS tests
- backend functions
- integration tests
- local E2E tests

Prefer:

```text
Supabase Local Development
```

or a dedicated development project.

---

# 6. Staging Environment

Staging should closely mirror production.

Use it for:

```text
Production-like Auth

Database migrations

Storage policies

Realtime validation

Edge Functions

Vercel preview/staging deployment

E2E testing

Security regression
```

---

# 7. Production Environment

Production contains:

```text
Real user accounts

Real listings

Real claims

Private conversations

Recovery history

Trust data
```

Production must never be used as the primary testing environment.

---

# 8. Environment Isolation

Use separate:

```text
Supabase projects

database instances

Storage buckets

API credentials

domains

Edge Function secrets
```

for staging and production.

Do not share staging database with production.

---

# 9. Recommended Environment Mapping

Example:

```text
LOCAL

Frontend:
localhost:5173

Backend:
Supabase local
```

```text
STAGING

Frontend:
staging.example.com

Backend:
Supabase staging project
```

```text
PRODUCTION

Frontend:
app.example.com

Backend:
Supabase production project
```

---

# 10. Frontend Environment Variables

Required browser environment:

```text
VITE_SUPABASE_URL=

VITE_SUPABASE_ANON_KEY=
```

These may be configured separately in Vercel for:

```text
Development

Preview

Production
```

---

# 11. Server-Only Secrets

Potential backend-only secrets:

```text
SUPABASE_SERVICE_ROLE_KEY

AI_PROVIDER_API_KEY

EMAIL_PROVIDER_API_KEY

PUSH_PROVIDER_KEY
```

These must never use:

```text
VITE_
```

prefix.

Anything prefixed:

```text
VITE_
```

may become available to the browser bundle.

---

# 12. Secret Rule

Never expose:

```text
SUPABASE_SERVICE_ROLE_KEY
```

to React.

The service-role key bypasses RLS.

---

# 13. `.env.example`

Repository may include:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Do not include real production values.

---

# 14. `.gitignore`

Ensure:

```text
.env
.env.local
.env.production.local
.env.staging.local
```

and equivalent local secret files are ignored.

---

# 15. Supabase Project Setup

For each remote environment:

Create a Supabase project.

Then configure:

```text
Database

Auth

Storage

Realtime

Edge Functions

Secrets
```

through versioned configuration wherever possible.

---

# 16. Supabase Project Configuration

Record non-secret project configuration such as:

```text
site URL

allowed redirect URLs

authentication providers

password requirements

email confirmation behavior
```

in deployment documentation.

---

# 17. Database Deployment

All schema changes must come from:

```text
supabase/migrations/
```

Production database changes should not be made manually through dashboard SQL unless the emergency procedure explicitly requires it.

---

# 18. Migration Principle

Production schema should be reconstructable from:

```text
migration history
```

starting from an empty database.

---

# 19. Migration Workflow

Development:

```text
Change Schema
      ↓
Create Migration
      ↓
Reset Local Database
      ↓
Run Tests
      ↓
Commit Migration
```

Deployment:

```text
Deploy Staging
      ↓
Apply Migration
      ↓
Test
      ↓
Approve
      ↓
Apply Production
```

---

# 20. Migration Naming

Use descriptive migration names.

Example:

```text
20261007110000_create_profiles.sql

20261007111000_create_items.sql

20261007114000_add_claim_rls.sql
```

Avoid:

```text
fix.sql

new.sql

final2.sql
```

---

# 21. Migration Order

Expected broad order:

```text
Extensions
   ↓
Enums
   ↓
Tables
   ↓
Constraints
   ↓
Indexes
   ↓
Functions
   ↓
Triggers
   ↓
Views
   ↓
RLS
   ↓
Storage Policies
```

Exact ordering may differ when dependencies require it.

---

# 22. Migration Verification

Before production:

Run from an empty local database:

```text
supabase db reset
```

or equivalent.

Expected:

```text
all migrations apply successfully

seed succeeds

tests pass
```

---

# 23. Generated Types

After schema changes:

```text
Generate Supabase TypeScript types
```

Update:

```text
database.types.ts
```

before merging.

Frontend build must compile against the new schema.

---

# 24. Destructive Migrations

Examples:

```text
DROP TABLE

DROP COLUMN

rename important enum

change column type

delete data
```

require additional review.

Before production:

```text
verify usage

back up data

plan rollback

test staging migration
```

---

# 25. Expand-and-Contract Strategy

For risky schema changes, prefer:

```text
Add new structure
      ↓
Deploy compatible code
      ↓
Migrate data
      ↓
Verify
      ↓
Remove old structure later
```

instead of immediate destructive replacement.

---

# 26. Enum Migration Caution

PostgreSQL enum changes can be awkward to reverse.

Avoid repeatedly changing lifecycle enums without careful planning.

The finalized states should remain stable.

---

# 27. Final Listing Status

Production contract:

```text
ACTIVE

RECOVERY_IN_PROGRESS

RETURNED

CLOSED

CANCELLED
```

Do not reintroduce derived states such as:

```text
MATCH_FOUND

CLAIM_PENDING
```

as listing statuses without architecture review.

---

# 28. Final Recovery Status

Use:

```text
ACTIVE

PARTIALLY_CONFIRMED

COMPLETED

CANCELLED
```

---

# 29. RLS Deployment

RLS policies are part of the deployment.

Production launch must not occur with sensitive tables temporarily left unrestricted.

---

# 30. RLS Deployment Gate

Verify:

```text
RLS enabled

policies exist

Owner/Finder tests pass

unrelated-user tests pass

anonymous tests pass
```

before production traffic.

---

# 31. Never Disable RLS as Fix

If production code fails due to RLS:

Do not solve it with:

```text
ALTER TABLE ... DISABLE ROW LEVEL SECURITY;
```

Investigate the incorrect policy or query.

---

# 32. Database Functions

Critical functions deployed through migrations include:

```text
create_claim()

accept_claim()

reject_claim()

cancel_claim()

confirm_handover()

cancel_recovery()

submit_rating()

generate_matches()

recalculate_user_trust()
```

---

# 33. SECURITY DEFINER Audit

Before deployment, every:

```text
SECURITY DEFINER
```

function must be reviewed for:

```text
auth.uid() checks

ownership validation

lifecycle validation

safe search_path

unexpected privileges
```

---

# 34. Transaction Verification

Critical operations must remain atomic.

Especially:

```text
accept_claim()

confirm_handover()

submit_rating()
```

Deployment tests must verify no partial state is produced.

---

# 35. Storage Deployment

Buckets:

```text
avatars

item-images
```

must exist before users upload media.

Future:

```text
claim-evidence
```

only when needed.

---

# 36. Storage Policies

Deploy and verify policies for:

```text
upload

read

replace

delete
```

according to ownership and privacy rules.

---

# 37. Storage Configuration

Recommended initial constraints:

```text
avatars
→ images only

item-images
→ images only
```

Supported:

```text
JPEG

PNG

WebP
```

---

# 38. Private Storage

Sensitive future buckets must be:

```text
PRIVATE
```

and accessed through signed URLs.

---

# 39. Existing Objects During Policy Change

Whenever Storage policies change:

Test both:

```text
new uploads

existing objects
```

Do not assume policy updates affect application behavior exactly as expected without validation.

---

# 40. Supabase Auth Production Setup

Configure:

```text
Site URL

Redirect URLs

Password recovery redirect

Email confirmation redirect

OAuth callbacks if introduced
```

---

# 41. Production Auth URLs

Example:

```text
https://app.example.com/auth/callback

https://app.example.com/reset-password
```

Only approved URLs should be registered.

---

# 42. Avoid Wildcard Redirects

Do not broadly allow:

```text
https://*
```

for production Auth redirects.

Use explicit domains where possible.

---

# 43. Email Verification

If email verification is enabled:

Test:

```text
Registration
      ↓
Verification Email
      ↓
Callback
      ↓
Authenticated Session
```

on production domain before launch.

---

# 44. Password Recovery

Test:

```text
Forgot Password

Email delivery

Recovery URL

New password

Login
```

using the production/staging domain configuration.

---

# 45. Vercel Deployment

Recommended frontend host:

```text
Vercel
```

Build:

```text
Vite + React
```

---

# 46. Vercel Build Settings

Typical:

```text
Framework:
Vite

Build Command:
npm run build

Output Directory:
dist
```

Vercel normally detects this automatically.

---

# 47. Node Version

Pin a supported Node version.

Example via:

```text
package.json engines
```

or environment configuration.

Avoid local/production Node versions drifting significantly.

---

# 48. Dependency Installation

Use lockfile-based install in CI.

Preferred:

```text
npm ci
```

when using npm.

This ensures deterministic dependency installation.

---

# 49. Frontend Build Gate

Production deployment requires:

```text
npm run lint

npm run typecheck

npm run test

npm run build
```

to pass according to project scripts.

---

# 50. Vercel Environment Variables

Configure:

```text
VITE_SUPABASE_URL

VITE_SUPABASE_ANON_KEY
```

separately for:

```text
Preview

Production
```

Preview should point to staging Supabase, not production, wherever possible.

---

# 51. Preview Deployments

Each PR may receive a Vercel Preview deployment.

Use it for:

```text
UI review

responsive QA

functional testing

stakeholder review
```

Do not connect arbitrary preview branches to production database if avoidable.

---

# 52. Staging Deployment

Recommended persistent branch/domain:

```text
staging
```

or deployment environment.

Example:

```text
staging.example.com
```

---

# 53. Production Branch

Recommended:

```text
main
```

Production deploy occurs from approved `main` state.

---

# 54. Domain Setup

Production may use:

```text
app.example.com
```

or:

```text
example.com
```

according to product branding.

---

# 55. DNS

Typical Vercel domain setup may require:

```text
A record

or

CNAME
```

according to Vercel's instructions.

Use Vercel's current recommended records rather than hardcoding assumptions.

---

# 56. HTTPS

Production must use:

```text
HTTPS
```

Vercel automatically provisions certificates for correctly configured domains.

Verify certificate status before launch.

---

# 57. Canonical Domain

Choose one canonical hostname.

Example:

```text
https://app.example.com
```

Avoid having application behavior depend inconsistently on several domains.

---

# 58. Supabase Allowed Origins

Where origin restrictions exist, add:

```text
production domain

staging domain
```

only as required.

---

# 59. SPA Routing

Because the frontend uses React Router, verify direct visits such as:

```text
/items/:id

/matches/:id

/recoveries/:id
```

resolve correctly on Vercel.

Configure SPA fallback if required by deployment behavior.

---

# 60. Security Headers

Production should configure appropriate headers.

Recommended categories:

```text
Content-Security-Policy

X-Content-Type-Options

Referrer-Policy

Permissions-Policy
```

---

# 61. Content Security Policy

CSP should allow required:

```text
Vercel application

Supabase APIs

Supabase Storage

approved image sources
```

while blocking unnecessary script origins.

Test CSP thoroughly before enforcing strict production mode.

---

# 62. Header Deployment

Headers may be configured through:

```text
vercel.json
```

or platform settings.

Keep header configuration version-controlled where practical.

---

# 63. Edge Functions

Supabase Edge Functions should be introduced only where needed.

Possible future uses:

```text
AI matching

email delivery

push notifications

third-party integrations

privileged server workflows
```

---

# 64. Edge Function Deployment

Typical sequence:

```text
Develop locally
      ↓
Test
      ↓
Set staging secrets
      ↓
Deploy staging
      ↓
Test
      ↓
Set production secrets
      ↓
Deploy production
```

---

# 65. Edge Function Secrets

Store through Supabase secret management.

Never commit:

```text
provider API keys
service role keys
email secrets
```

to repository.

---

# 66. Edge Function CORS

If functions are browser-accessible:

Allow only necessary:

```text
origins

methods

headers
```

where practical.

---

# 67. CI/CD Overview

Recommended pipeline:

```text
Developer Push
      ↓
Pull Request
      ↓
CI
      ↓
Preview Deployment
      ↓
Review
      ↓
Merge Main
      ↓
Production Pipeline
```

---

# 68. Pull Request CI

Recommended:

```text
Install
      ↓
Lint
      ↓
Typecheck
      ↓
Unit Tests
      ↓
Component Tests
      ↓
Supabase Local
      ↓
Migrations
      ↓
RLS/RPC Tests
      ↓
Build
```

Critical PRs may also run:

```text
E2E
```

---

# 69. Production CI

Recommended release sequence:

```text
Checkout Main
      ↓
Install
      ↓
Validate
      ↓
Run Tests
      ↓
Apply Production Database Migrations
      ↓
Deploy Edge Functions
      ↓
Deploy Frontend
      ↓
Smoke Test
```

---

# 70. Database Before Frontend

When frontend depends on new schema:

Deploy:

```text
backward-compatible database changes
```

before frontend.

This avoids frontend requesting fields/functions that do not exist.

---

# 71. Compatibility Rule

Migrations and application deployments should remain compatible during rollout.

Example:

Bad:

```text
remove old column
      ↓
old frontend still running
      ↓
production failure
```

Prefer expand-and-contract.

---

# 72. Migration Failure

If production migration fails:

```text
STOP
```

Do not continue frontend deployment assuming the schema succeeded.

Investigate database state first.

---

# 73. CI Secrets

CI environment may require:

```text
SUPABASE_ACCESS_TOKEN

SUPABASE_PROJECT_REF
```

or equivalent deployment credentials.

These belong in repository CI secret storage.

---

# 74. Branch Protection

Recommended for:

```text
main
```

Require:

```text
pull request

successful CI

review for sensitive changes
```

before merge.

---

# 75. Security-Sensitive Review

Require explicit review for changes to:

```text
RLS

Auth

Database functions

Storage policies

Claims

Recovery

Chat

Trust
```

---

# 76. Deployment Version

Every production deployment should be traceable to:

```text
Git commit SHA
```

and preferably release metadata.

---

# 77. Release Tagging

Optional:

```text
v0.1.0

v0.2.0

v1.0.0
```

Semantic versioning can begin when releases become meaningful.

---

# 78. Release Notes

For each production release document:

```text
Features

Fixes

Database migrations

Security changes

Known issues
```

---

# 79. Rollback Philosophy

Frontend rollback and database rollback are different.

Frontend rollback is generally easier.

Database rollback may be dangerous.

---

# 80. Frontend Rollback

Vercel allows previous deployment promotion/rollback.

If new frontend has critical issue:

```text
Rollback frontend
```

to last known-good deployment.

---

# 81. Database Rollback

Do not blindly reverse migrations containing user data.

Prefer:

```text
forward-fix
```

for many production database problems.

---

# 82. When Database Rollback Is Safe

Possible when migration:

```text
created unused structure

did not transform/delete production data

has tested reverse path
```

---

# 83. Dangerous Rollback Examples

Avoid automatic rollback after:

```text
DROP COLUMN

data migration

enum transformation

record deletion
```

unless recovery plan was explicitly tested.

---

# 84. Migration Backup Gate

Before major destructive migration:

```text
Verify current backup
```

and prepare recovery procedure.

---

# 85. Feature Flags

MVP does not require a full feature-flag system.

For risky future features such as:

```text
semantic matching

push notifications

new trust algorithm
```

simple server-side/config flags may be useful.

---

# 86. Maintenance Mode

A maintenance screen is optional.

For serious backend maintenance, it may be useful to temporarily prevent mutations while still allowing status communication.

Not required for initial MVP.

---

# 87. Monitoring

Production should monitor at minimum:

```text
Frontend errors

Authentication failures

Database/RPC failures

Edge Function failures

Storage failures

Realtime failures

Matching failures
```

---

# 88. Frontend Error Monitoring

A provider such as:

```text
Sentry
```

may be introduced.

If added:

Do not send sensitive user data unnecessarily.

---

# 89. Monitoring Privacy

Error reporting must not automatically capture:

```text
chat messages

claim answers

private Finder details

precise location

authentication tokens
```

Review monitoring configuration before enabling session replay or payload capture.

---

# 90. Backend Logs

Useful backend log context:

```text
operation

resource ID

error code

duration
```

Avoid logging full sensitive payloads.

---

# 91. Matching Monitoring

Track:

```text
matching execution failure

candidate count

processing duration

match count
```

Do not log private verification data.

---

# 92. Realtime Monitoring

Observe:

```text
subscription failures

connection issues

unexpected message delivery errors
```

At MVP scale, standard Supabase diagnostics may be sufficient.

---

# 93. Database Monitoring

Monitor:

```text
database CPU

connections

slow queries

storage usage

table growth
```

especially:

```text
messages

notifications

matches
```

over time.

---

# 94. Query Performance

Review slow queries for:

```text
Explore

message pagination

notifications

matching

claims
```

before adding infrastructure.

Start with:

```text
indexes

query refinement

pagination
```

---

# 95. Application Health Indicators

Key operational indicators:

```text
login succeeds

listing creation succeeds

matching executes

claims work

message insert succeeds

handover completes
```

These represent actual product health.

---

# 96. Alerts

Future production alerts may include:

```text
high API failure rate

database unavailable

Edge Function failure spike

authentication failure spike

matching job failures
```

Do not create excessive alerts with no action path.

---

# 97. Backups

Production database should use Supabase backup capabilities appropriate to the selected plan and risk profile.

---

# 98. Backup Scope

Critical data:

```text
profiles

items

claims

recoveries

messages

ratings

notifications
```

Storage objects also require consideration separately.

---

# 99. Backup Verification

A backup is valuable only if recovery is possible.

Periodically verify:

```text
backup exists

restore process understood
```

before production scale.

---

# 100. Point-in-Time Recovery

If available on the chosen Supabase plan:

```text
PITR
```

can provide finer recovery.

Configure based on production needs and budget.

---

# 101. Storage Backup

Database backups may not automatically represent complete Storage object recovery strategy.

Review Supabase Storage backup behavior separately before relying on it.

---

# 102. Disaster Recovery

Basic plan:

```text
Detect incident
      ↓
Stop harmful writes if needed
      ↓
Assess database/storage
      ↓
Restore or forward-fix
      ↓
Verify integrity
      ↓
Resume service
```

---

# 103. Data Integrity Checks

Useful periodic checks:

```text
Recoveries reference valid claims

Conversations reference valid recoveries

Messages reference valid conversations

Ratings reference completed recoveries

No invalid active recovery duplication
```

---

# 104. Orphan Storage Cleanup

Potential orphan:

```text
Storage object exists
but item_images row does not
```

A future scheduled cleanup may remove old orphan objects.

Do not delete aggressively without retention safeguards.

---

# 105. Database Retention

MVP may retain:

```text
completed recoveries

ratings

messages

notifications
```

according to the privacy strategy.

Formal retention should be established before large-scale launch.

---

# 106. Production Seed Data

Do not deploy development:

```text
test users

fake recoveries

sample claims

demo conversations
```

to production.

---

# 107. Reference Data

Safe production seed may contain:

```text
categories

configuration values
```

if modeled in database.

---

# 108. Matching Configuration

Initial matching configuration should be deployable consistently.

Example:

```text
Category      25%

Location      25%

Date/Time     20%

Description   30%
```

and thresholds:

```text
Display >= 60

Notify >= 75

Very Strong >= 90
```

---

# 109. Configuration Drift

Avoid manually changing matching constants differently between environments without documenting the change.

---

# 110. Feature Configuration

Prefer central configuration for:

```text
image limits

pagination sizes

matching thresholds

message limits

rating limits
```

where useful.

---

# 111. Production Build Optimization

Before production:

```text
remove development logging

enable production build

lazy-load large routes

compress media

verify bundle
```

---

# 112. Source Maps

If source maps are enabled:

Ensure they are handled appropriately.

Private source-map upload to monitoring provider is preferable to unnecessarily exposing them publicly if security policy requires.

---

# 113. Console Logging

Production should not contain noisy:

```text
console.log(user)
console.log(session)
console.log(message)
```

especially for sensitive objects.

---

# 114. Service Worker

Not required for MVP.

Do not add PWA/service-worker caching until cache invalidation and private-data implications are considered.

---

# 115. CDN Caching

Static assets may be cached aggressively.

Private API/user data should not be cached publicly.

---

# 116. Signed Media

Private media signed URLs should remain short-lived and must not be treated as permanent public assets.

---

# 117. SEO

Authenticated application pages do not require broad search-engine indexing.

Public landing pages may be indexed.

Sensitive routes should never expose data to crawlers.

---

# 118. robots.txt

If applicable:

Disallow indexing of authenticated application areas.

Authentication should still be the actual security barrier.

`robots.txt` is not security.

---

# 119. Production Authentication Test

Before launch verify:

```text
Register

Login

Logout

Session refresh

Forgot password

Email verification if enabled
```

against real production configuration.

---

# 120. Production Storage Test

Verify with test account:

```text
avatar upload

item image upload

image load

replace

delete

unauthorized cross-user access denied
```

---

# 121. Production Matching Test

Use controlled production-safe/test scenario if appropriate, or validate fully in staging before launch.

Verify:

```text
Lost + Found
→ Match generated
```

---

# 122. Production Realtime Test

Verify:

```text
Conversation participants

send message

recipient receives
```

on staging and, after release, via safe smoke testing where appropriate.

---

# 123. Production Notification Test

Verify at least:

```text
notification creation

unread badge

deep link
```

---

# 124. Production Security Smoke

Attempt:

```text
User A reads User B private claim

User A accesses unrelated conversation
```

using staging and pre-launch production test accounts.

Expected:

```text
DENIED
```

---

# 125. Pre-Production Checklist

Before launch:

```text
All migrations committed

Local DB reset succeeds

Staging migration succeeds

TypeScript types regenerated

Build passes

Tests pass

Critical E2E passes

RLS tests pass

Storage policies pass

Service role absent from frontend

Environment variables correct

Auth redirect URLs correct

HTTPS active

Domain configured

Security headers reviewed

No P0/P1 bugs
```

---

# 126. Database Release Checklist

Verify:

```text
Migration order

Constraints

Indexes

Functions

Triggers

RLS

Views

Realtime tables

Storage policies
```

---

# 127. Frontend Release Checklist

Verify:

```text
Production Supabase URL

Production anon key

No staging references

No localhost URLs

No test credentials

Build succeeds

Responsive QA completed
```

---

# 128. Security Release Checklist

Verify:

```text
No secrets committed

No service-role key in bundle

Private details inaccessible

Chat private

Exact coordinates hidden publicly

Trust fields protected

Ratings protected

Handover backend-controlled

Critical RPCs authorization-tested
```

---

# 129. Privacy Release Checklist

Verify:

```text
Public DTO minimized

Location is approximate publicly

Finder verification details private

Chat inaccessible publicly

Review content safe

Images warn against personal-data leakage
```

---

# 130. Launch Day Sequence

Recommended:

```text
1. Freeze major code changes

2. Run final CI

3. Verify backup

4. Apply production migrations

5. Deploy required Edge Functions

6. Deploy frontend

7. Verify domain + HTTPS

8. Run smoke tests

9. Run core user flow

10. Monitor logs/errors
```

---

# 131. Launch Smoke Flow

Run:

```text
Open Landing
      ↓
Login
      ↓
Home
      ↓
Explore
      ↓
Open Listing
      ↓
Notifications
      ↓
Profile
```

Then verify one controlled mutation path.

---

# 132. Full Launch Validation

Preferred staging/full validation:

```text
Create Lost

Create Found

Generate Match

Submit Claim

Accept Claim

Chat

Confirm Handover

Confirm Receipt

Rate
```

Production should only be considered stable after the complete flow has been validated in production-equivalent conditions.

---

# 133. Post-Launch Monitoring

Immediately monitor:

```text
Auth errors

Database errors

RLS failures

Listing creation failures

Matching failures

Storage errors

Realtime errors
```

---

# 134. First Production Metrics

Useful metrics:

```text
accounts created

Lost Reports created

Found Listings created

matches generated

claims submitted

claims accepted

recoveries completed

message send failure rate
```

---

# 135. Release Rollback Decision

Rollback frontend if:

```text
UI completely broken

critical frontend regression

wrong environment configuration
```

Pause/forward-fix backend if:

```text
data-integrity risk

authorization failure

migration issue
```

depending on incident.

---

# 136. Security Incident

If private data is exposed:

```text
STOP affected feature
      ↓
Restrict access
      ↓
Investigate
      ↓
Fix policy/function
      ↓
Test
      ↓
Redeploy
```

This takes priority over preserving feature availability.

---

# 137. Secret Exposure Incident

If service-role/API secret leaks:

```text
Rotate immediately
```

Then:

```text
update environments

redeploy

review logs

remove secret from repository/history where appropriate
```

Do not assume deleting a public commit makes the secret safe.

---

# 138. Production Bug Severity

## P0

```text
Authentication bypass

Private data leak

RLS bypass

Service-role exposure

Data corruption
```

Immediate response.

---

## P1

```text
Claims unusable

Recovery cannot complete

Chat inaccessible to valid users

Matching entirely broken
```

Urgent fix.

---

## P2

```text
Filters broken

Notification UI bug

non-critical responsive issue
```

Schedule quickly.

---

# 139. Deployment Documentation

Maintain records for:

```text
Supabase project identifiers

production domain

environment variable names

deployment commands

CI workflow

rollback process
```

Do not document secret values.

---

# 140. README Deployment Section

README should provide developer-level commands for:

```text
local run

build

test

Supabase start/reset

type generation
```

Production operational details can remain in this file.

---

# 141. Manual Deployment

Manual deployment may be acceptable early.

However, migrations/tests should still follow the same controlled sequence.

Do not allow:

```text
"just edit production dashboard"
```

to become normal workflow.

---

# 142. CI/CD Evolution

MVP:

```text
PR CI
+
Vercel automatic deployment
+
controlled Supabase migration
```

Later:

```text
fully automated staged deployment
```

can be introduced.

---

# 143. Staging Promotion

Recommended process:

```text
Feature PR
      ↓
Preview
      ↓
Merge
      ↓
Staging
      ↓
Full Tests
      ↓
Production Approval
      ↓
Production
```

For a small team, staging may be updated from `main` before production promotion.

---

# 144. Dependency Updates

Do not auto-deploy major dependency upgrades directly to production.

Run:

```text
build

tests

E2E

staging
```

first.

---

# 145. Supabase Upgrade Considerations

Changes involving:

```text
PostgreSQL extensions

Auth configuration

Realtime

Storage
```

should be tested in staging before production configuration changes.

---

# 146. Matching Engine Scale Trigger

Initial matching runs through PostgreSQL.

Reconsider architecture only when monitoring shows:

```text
slow listing creation

high candidate volumes

database CPU pressure

matching timeout
```

Do not introduce workers/queues prematurely.

---

# 147. Realtime Scale Trigger

Current chat architecture is sufficient until:

```text
connection count

message throughput

database load
```

show measurable issues.

---

# 148. Storage Scale Trigger

Monitor:

```text
storage usage

bandwidth

image sizes
```

before implementing complex CDN/media pipelines.

---

# 149. Cost Awareness

Primary expected infrastructure costs:

```text
Supabase plan

database/storage usage

Vercel plan/bandwidth

future AI services

future email/push providers
```

The current MVP avoids expensive infrastructure intentionally.

---

# 150. Cost-Safe Architecture

Current MVP does not require:

```text
Kubernetes

dedicated Redis

message queue

microservices

vector database outside Supabase

custom media server
```

---

# 151. Production Readiness Gate

The platform is ready for production only when:

1. All migrations apply cleanly.
2. Staging matches production architecture.
3. Production Supabase project is configured.
4. Auth redirects point to correct domains.
5. RLS is enabled and tested.
6. Storage policies are enabled and tested.
7. Service-role key is absent from frontend.
8. Vercel production environment points to production Supabase.
9. Build passes.
10. Typecheck passes.
11. Tests pass.
12. Critical E2E recovery passes.
13. Concurrency tests pass.
14. Private details are protected.
15. Exact location is not publicly exposed.
16. Claims cannot be manipulated.
17. Chat is participant-only.
18. Handover requires both parties.
19. Ratings are protected.
20. Trust is backend-controlled.
21. Notifications work.
22. HTTPS is valid.
23. Production domain works.
24. No P0/P1 bugs remain.
25. Backup/recovery strategy is understood.

---

# 152. Final Deployment Sequence

```text
                   SOURCE CODE
                       │
                       ▼
                  PULL REQUEST
                       │
                       ▼
                       CI
            ┌──────────┼──────────┐
            │          │          │
            ▼          ▼          ▼
          LINT      TESTS       BUILD
            │          │          │
            └──────────┼──────────┘
                       │
                       ▼
                    PREVIEW
                       │
                       ▼
                     MERGE
                       │
                       ▼
                    STAGING
                       │
                FULL VALIDATION
                       │
                       ▼
               PRODUCTION RELEASE
                       │
             ┌─────────┴──────────┐
             │                    │
             ▼                    ▼
        SUPABASE               VERCEL
             │                    │
        Migrations             Frontend
        Functions
        Storage
        RLS
             │                    │
             └─────────┬──────────┘
                       │
                       ▼
                   SMOKE TEST
                       │
                       ▼
                    MONITOR
```

---

# 153. Final Deployment Principle

Deployment should never mean:

```text
"the build was uploaded"
```

A successful deployment means:

```text
Correct code
      +
Correct schema
      +
Correct policies
      +
Correct secrets
      +
Correct environment
      +
Tests passing
      +
Production health verified
```

The release priority should remain:

```text
DATA SAFETY
      ↓
AUTHORIZATION
      ↓
CORRECTNESS
      ↓
AVAILABILITY
      ↓
PERFORMANCE
      ↓
FEATURE VELOCITY
```

For the Lost & Found Platform, preserving ownership evidence, private communication, recovery integrity, and user trust is more important than deploying quickly.

The production system is ready only when a real user can securely complete:

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

without exposing another user's private information or allowing an unauthorized user to alter that lifecycle.