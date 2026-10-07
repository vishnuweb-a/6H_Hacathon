# Lost & Found Platform — Trust and Rating System

## 1. Purpose

This document defines the trust and reputation system for the Lost & Found Platform.

The trust system exists to help users understand whether another participant has a history of reliable recovery interactions.

It must support:

- post-recovery ratings
- written reviews
- successful return statistics
- trust score calculation
- reputation updates
- badges
- anti-abuse protections
- rating eligibility
- duplicate prevention
- trust recalculation
- safe public display

The trust system should reinforce the lifecycle:

```text
MATCH
  ↓
VERIFY
  ↓
CONNECT
  ↓
RETURN
  ↓
CONFIRM
  ↓
RATE
  ↓
TRUST
```

Trust must support user decisions without falsely guaranteeing safety.

---

# 2. Core Principle

Trust is evidence of previous platform activity.

It is not proof that a person is:

```text
safe
honest
verified
risk-free
```

The application must never communicate:

```text
High Trust Score = Guaranteed Safe User
```

Instead:

```text
Trust Score = Reputation Based on Platform History
```

---

# 3. Trust System Goals

The system should:

- reward successful returns
- encourage responsible behavior
- surface useful reputation signals
- discourage fake activity
- make recovery interactions feel safer
- provide context during claims and handovers

It should not:

- become a competitive leaderboard
- reward volume without quality
- encourage fake transactions
- punish new users excessively
- make low-data users appear suspicious

---

# 4. Reputation Signals

Initial trust may use:

```text
Successful Recoveries

Average Rating

Number of Ratings

Account Age

Recovery Completion Behavior
```

Future versions may also consider:

```text
Rejected fraudulent claims

Moderation actions

Confirmed abuse reports

Recovery cancellations

Verification history
```

These future signals should be added carefully.

---

# 5. Canonical Data Sources

Trust must be derived from authoritative records.

Primary sources:

```text
recoveries
ratings
profiles
```

Potential future moderation source:

```text
user_reports
```

The frontend must never calculate authoritative trust independently.

---

# 6. Rating Eligibility

A rating may only be submitted when:

```text
Recovery status = COMPLETED
```

The user must be one of:

```text
Owner

Finder
```

for that recovery.

---

# 7. Mutual Rating

Both participants may independently rate each other.

Example:

```text
Owner → rates Finder

Finder → rates Owner
```

One user's rating should not depend on whether the other user has already rated.

---

# 8. Rating Scale

Initial scale:

```text
1–5 stars
```

Meaning:

```text
1
Very Poor

2
Poor

3
Okay

4
Good

5
Excellent
```

The UI may use stars without showing these words continuously.

---

# 9. Review Text

Written review is optional.

Recommended maximum:

```text
500 characters
```

Reviews should focus on the recovery experience.

Examples:

```text
Very helpful and returned the item quickly.
```

```text
Communication was clear and the handover went smoothly.
```

---

# 10. Rating Submission

Recommended backend operation:

```text
submit_rating(
  recovery_id,
  rating,
  review
)
```

The backend derives:

```text
from_user_id
to_user_id
```

from the recovery.

The client must not arbitrarily select another user as rating target.

---

# 11. Rating Validation

The backend must validate:

```text
auth.uid() participated in recovery

recovery = COMPLETED

rating between 1 and 5

from_user != to_user

no existing rating from current user
```

---

# 12. Duplicate Rating Prevention

Database constraint:

```text
UNIQUE(recovery_id, from_user_id)
```

This allows:

```text
maximum two ratings per recovery
```

one from each participant.

---

# 13. Self-Rating Prevention

Constraint:

```text
from_user_id <> to_user_id
```

The backend must also derive the target from recovery participants.

---

# 14. Rating Timing

Ratings become available immediately after:

```text
both users confirm handover
```

and:

```text
recovery.status = COMPLETED
```

---

# 15. Rating Reminder

Immediately after successful completion:

```text
RATING_REQUEST
```

notification is created.

Future:

```text
one reminder after 24 hours
```

may be added if no rating exists.

Repeated reminders should not be used.

---

# 16. Rating Immutability

For MVP:

```text
ratings are immutable after submission
```

This simplifies:

- trust calculations
- dispute handling
- audit history

Future versions may allow a short edit window.

---

# 17. Rating Deletion

Ordinary users should not directly delete ratings.

Moderation may hide/remove a rating if it violates policy.

If moderation removes a rating:

```text
average rating
+
trust score
```

must be recalculated.

---

# 18. Average Rating

Canonical source:

```text
ratings
```

Profile may cache:

```text
average_rating
rating_count
```

for fast display.

---

# 19. Average Rating Formula

```text
average_rating =
sum(valid ratings received)
/
count(valid ratings received)
```

Example:

```text
5
5
4
4
5
```

Average:

```text
4.6
```

---

# 20. Low Sample Size Problem

A user with:

```text
one 5-star rating
```

should not automatically appear more trustworthy than someone with:

```text
30 ratings averaging 4.8
```

Therefore trust should not depend only on raw average rating.

---

# 21. Successful Return

A successful return occurs when:

```text
Recovery = COMPLETED
```

after:

```text
Finder confirmed handover
AND
Owner confirmed receipt
```

---

# 22. Successful Returns Count

Profile may display:

```text
successful_returns
```

This should be derived from completed recoveries.

The system should count participation, not only Finder activity, if the metric is labeled generally.

If the UI specifically displays:

```text
Items Returned
```

then Finder-side completed recoveries should be counted separately.

---

# 23. Recommended Separate Metrics

Long-term, consider:

```text
successful_recoveries
```

for any completed recovery participation.

And:

```text
items_returned_as_finder
```

for Finder-specific contribution.

For MVP, one simple:

```text
successful_returns
```

field is acceptable if clearly defined.

---

# 24. Trust Score

The platform may expose a normalized:

```text
0–100
```

Trust Score.

Recommended initial default:

```text
50
```

for a new user.

This represents:

```text
neutral / limited history
```

not mistrust.

---

# 25. Why Start at 50

Starting at:

```text
0
```

could imply a new user is unsafe.

Starting at:

```text
100
```

gives unearned reputation.

A neutral score provides room to increase or decrease based on real activity.

---

# 26. Initial Trust Inputs

Recommended MVP inputs:

```text
Rating Quality

Rating Confidence / Count

Successful Recoveries

Account Age
```

Do not add too many opaque factors initially.

---

# 27. Initial Trust Formula

Recommended conceptual formula:

```text
Trust Score =
Rating Component
+
Recovery Component
+
Account Maturity Component
```

Normalized to:

```text
0–100
```

---

# 28. Proposed Weighting

Initial weighting:

```text
Ratings
50%

Successful Recoveries
40%

Account Maturity
10%
```

This is a starting heuristic, not a permanent mathematical truth.

---

# 29. Rating Component

Maximum contribution:

```text
50 points
```

But it should consider both:

```text
average rating
+
rating count
```

---

# 30. Bayesian-Style Rating Confidence

Instead of directly using:

```text
average_rating / 5
```

use a confidence-adjusted rating.

Conceptually:

```text
adjusted_rating =
(v / (v + m)) × R
+
(m / (v + m)) × C
```

Where:

```text
R = user's average rating

v = user's rating count

C = platform baseline rating

m = minimum confidence threshold
```

---

# 31. Example Baseline

Initial configuration may use:

```text
C = 4.0

m = 5
```

This means low-review accounts remain closer to the platform baseline.

---

# 32. Why Confidence Adjustment Helps

User A:

```text
1 rating
5.0 average
```

User B:

```text
25 ratings
4.8 average
```

Raw average suggests A is better.

Confidence adjustment correctly gives more confidence to User B's established history.

---

# 33. Rating Component Calculation

After computing adjusted rating:

```text
rating_component =
(adjusted_rating / 5)
× 50
```

Maximum:

```text
50 points
```

---

# 34. Recovery Component

Maximum:

```text
40 points
```

Do not scale linearly forever.

Otherwise:

```text
100 returns
```

would overwhelm every other signal.

Use diminishing returns.

---

# 35. Simple Recovery Contribution

Initial configurable example:

```text
0 recoveries
0 points

1 recovery
10 points

2 recoveries
16 points

3 recoveries
21 points

5 recoveries
28 points

10 recoveries
35 points

20+ recoveries
40 points
```

This rewards activity while preventing runaway scoring.

---

# 36. Account Maturity Component

Maximum:

```text
10 points
```

Possible initial mapping:

```text
< 7 days
1 point

7–30 days
3 points

1–3 months
5 points

3–6 months
7 points

6–12 months
9 points

12+ months
10 points
```

Account age should remain a small signal.

---

# 37. Trust Formula Example

User:

```text
Adjusted rating = 4.6

Successful recoveries = 5

Account age = 4 months
```

Rating component:

```text
4.6 / 5 × 50
= 46
```

Recovery component:

```text
28
```

Account maturity:

```text
7
```

Raw total:

```text
81
```

Trust Score:

```text
81 / 100
```

---

# 38. New User Example

New user:

```text
0 ratings

0 recoveries

2 days old
```

The formal formula above may produce an artificially low result.

Therefore:

> Users without enough reputation history should remain near a neutral baseline instead of being treated as low-trust.

---

# 39. New User Handling

Recommended:

If:

```text
rating_count = 0
AND
successful_recoveries = 0
```

display:

```text
New Member
```

and internal trust score may remain:

```text
50
```

Do not display:

```text
Low Trust
```

---

# 40. Limited History State

When reputation history is too small:

Display:

```text
Limited history
```

rather than strongly interpreting the score.

Example:

```text
Trust Score 58

Limited activity history
```

---

# 41. Trust Score Bands

Optional UI interpretation:

```text
0–39
Limited / Concerning History

40–59
Developing Trust

60–79
Good Standing

80–100
Strong Reputation
```

However, avoid aggressive labeling.

Recommended public UI should emphasize:

```text
score
+
supporting statistics
```

rather than judgment-heavy labels.

---

# 42. Better Public Trust Display

Preferred:

```text
Trust Score
82 / 100

4.8 ★ from 18 ratings
12 successful recoveries
Member for 9 months
```

Instead of:

```text
SUPER TRUSTED USER
```

---

# 43. Trust Score Is Supportive

During claim review:

Finder may see:

```text
Claimant

Trust Score: 74

4.6 ★

3 successful recoveries
```

This is supplementary evidence.

The Finder should still verify ownership answers.

---

# 44. Trust Must Not Influence Ownership Automatically

High trust must never automatically:

```text
accept claim
```

Similarly, low/new trust must not automatically:

```text
reject legitimate ownership
```

Ownership verification remains independent.

---

# 45. Trust Recalculation

Recommended backend function:

```text
recalculate_user_trust(user_id)
```

It should derive current values from authoritative records.

---

# 46. Recalculation Events

Trust may recalculate after:

```text
Recovery completed

Rating submitted

Rating moderated

Relevant moderation action
```

---

# 47. Trust Update After Recovery

On successful recovery:

```text
Complete Recovery
      ↓
Update successful recovery metrics
      ↓
Recalculate trust for Owner
      ↓
Recalculate trust for Finder
```

The same recovery must not increment metrics twice.

---

# 48. Rating Update

When User A rates User B:

```text
rating INSERT
      ↓
recalculate User B average
      ↓
recalculate User B trust
```

User A's trust does not increase merely because they submitted a rating.

---

# 49. Cached Profile Metrics

The profile may store:

```text
trust_score

average_rating

rating_count

successful_returns
```

for efficient reads.

But canonical source remains:

```text
ratings
recoveries
```

---

# 50. Trust Function Idempotency

Running:

```text
recalculate_user_trust(user_id)
```

multiple times must produce the same result from the same data.

Do not implement trust as:

```text
trust_score += 5
```

for every event.

Prefer:

```text
trust_score = recompute from source data
```

This prevents drift.

---

# 51. Never Increment Trust Blindly

Bad:

```text
Completed recovery
→ trust_score = trust_score + 10
```

because retrying the operation may duplicate trust.

Good:

```text
Completed recovery
→ recalculate trust from completed recovery count
```

---

# 52. Rating Abuse Risks

Potential abuse includes:

```text
self-rating

duplicate rating

fake recovery farming

multiple fake accounts

retaliatory ratings

coordinated rating manipulation
```

MVP should protect against the simplest attacks.

---

# 53. Self-Rating Protection

Prevent through:

```text
recovery participant derivation

database constraint

backend function
```

---

# 54. Duplicate Rating Protection

Use:

```text
UNIQUE(recovery_id, from_user_id)
```

---

# 55. Fake Rating Prevention

Ratings are available only after:

```text
completed recovery
```

Users cannot simply visit another profile and leave reviews.

This is one of the strongest protections.

---

# 56. Fake Recovery Farming

Attack:

```text
User A creates Found Listing

User B creates fake Lost Report

They complete recovery repeatedly

Both gain trust
```

MVP cannot perfectly eliminate this.

Mitigation:

- diminishing returns
- account-age signal
- moderation reports
- suspicious activity analytics
- no monetary rewards
- cap repeated trust benefit patterns later

---

# 57. Same-Pair Repeated Recoveries

Future anti-abuse rule may reduce trust benefit when the same two accounts repeatedly complete recoveries.

Example:

```text
A ↔ B
20 times
```

should not be treated like 20 independent community interactions.

Not necessary for initial MVP but worth monitoring.

---

# 58. Retaliatory Ratings

A user may leave:

```text
1 star
```

because the other person rated them poorly.

Potential future mitigation:

```text
blind ratings
```

where reviews remain hidden until:

- both users submit
- or review period expires

This is not required for MVP.

---

# 59. Recommended MVP Rating Visibility

Simpler approach:

Ratings become public once submitted.

If retaliatory behavior becomes a problem, introduce blind review release later.

---

# 60. Moderation

Users should be able to report:

```text
abusive review

false review

harassment
```

Moderators may later:

```text
hide review

invalidate rating
```

If a rating becomes invalid:

```text
recalculate average

recalculate trust
```

---

# 61. Rating Validity Flag

Future schema may add:

```text
is_valid boolean
```

or:

```text
moderation_status
```

to ratings.

MVP can omit this unless moderation workflows are implemented immediately.

---

# 62. Reviews Display

Public profile may show:

```text
rating

review text

reviewer display name

date
```

Optionally:

```text
recovery role
```

Example:

```text
★★★★★

"Very responsive and returned my wallet safely."

— Owner, Oct 2026
```

---

# 63. Privacy in Reviews

Reviews must not expose:

```text
phone numbers

exact meetup addresses

private item contents

claim answers

personal identifiers
```

Future moderation may automatically flag such content.

---

# 64. Public Reviewer Identity

Recommended:

Display:

```text
avatar

display name
```

Do not expose email or private profile information.

---

# 65. Review Sorting

Recommended:

```text
newest first
```

No advanced sorting required for MVP.

---

# 66. Rating Summary

Profile summary may display:

```text
4.8 ★

18 ratings
```

Avoid:

```text
5.0 from 1 rating
```

without also showing rating count.

---

# 67. No Ratings State

For a new user:

```text
No ratings yet
```

Do not display:

```text
0.0 ★
```

because this incorrectly implies poor reviews.

---

# 68. Badges

Badges may provide lightweight recognition.

Potential badges:

```text
First Return

Helpful Finder

Trusted Finder

Community Helper
```

Do not add excessive game-like badges.

---

# 69. MVP Badge Recommendation

Keep badge system minimal.

Recommended initial badge:

```text
Trusted Finder
```

Possible condition:

```text
5+ successful returns as Finder
AND
average rating >= 4.0
```

---

# 70. First Return Badge

Optional:

```text
First Return
```

after:

```text
first completed Finder recovery
```

This is simple and understandable.

---

# 71. Badge Authority

Badges must be system-controlled.

Users may not:

```text
select

edit

grant themselves
```

badges.

---

# 72. Badge Storage

For a very small number of badges, eligibility may be derived dynamically.

If badge complexity grows, introduce:

```text
badges

user_badges
```

tables later.

Not required for MVP.

---

# 73. Trust Display Locations

Trust information may appear on:

```text
Profile

Claim Review

Recovery Detail
```

Potentially also on:

```text
Found Listing
```

but keep it secondary.

---

# 74. Claim Review Trust UI

Finder may see:

```text
Vishnu

Trust 78

4.7 ★

4 successful recoveries
```

Then:

```text
Verification Answers
```

Trust must not visually overpower ownership evidence.

---

# 75. Recovery Trust UI

Recovery screen may show partner's reputation summary for context.

Example:

```text
Recovery with Rahul

4.9 ★
8 successful returns
```

---

# 76. Trust Tooltip

Optional helper:

```text
Trust Score reflects completed recoveries, ratings, and account history. It does not guarantee user safety.
```

This is recommended.

---

# 77. Avoid Leaderboards

Do not implement:

```text
Top 10 Finders

Highest Trust Users
```

for MVP.

This may incentivize:

- fake recoveries
- competition
- gaming the system

Recognition should remain contextual.

---

# 78. Avoid Monetary Trust Rewards

Do not directly convert trust into:

```text
money

cash rewards

financial privileges
```

in MVP.

This greatly increases fraud incentives.

---

# 79. Trust Penalties

Initial MVP does not need automatic negative penalties beyond low ratings.

Future confirmed moderation actions may reduce trust.

Examples:

```text
confirmed scam attempt

serious abuse

fraudulent claims
```

Any penalty system must be carefully auditable.

---

# 80. Do Not Penalize Claim Rejection Automatically

A rejected claim does not necessarily mean fraud.

The user may simply have made an honest mistake.

Therefore:

```text
claim rejected
```

should not automatically decrease trust.

---

# 81. Recovery Cancellation

Similarly:

```text
cancelled recovery
```

should not automatically reduce trust unless there is confirmed misconduct.

There may be legitimate reasons.

---

# 82. Confirmed Abuse Future Model

Future moderation may assign:

```text
trust_penalty
```

only after confirmed review.

Avoid automated accusations.

---

# 83. Trust Calculation Versioning

If the trust algorithm changes later, store or define:

```text
trust_algorithm_version
```

internally if needed.

This helps explain score changes and enables migration.

Not necessary for initial MVP.

---

# 84. Configuration

Trust configuration should remain centralized.

Example:

```text
default_score = 50

rating_weight = 0.50

recovery_weight = 0.40

account_age_weight = 0.10

bayesian_min_reviews = 5

baseline_rating = 4.0
```

Do not scatter constants across frontend/backend.

---

# 85. Backend Location

Trust calculation belongs in:

```text
PostgreSQL function
```

for MVP.

Recommended:

```text
recalculate_user_trust(user_id)
```

If the algorithm becomes highly complex later, it may move into a backend service.

---

# 86. Trust Function Access

Normal browser users must not directly call a function that can arbitrarily modify another user's score unless the function ignores client-selected scores and safely derives everything.

Prefer internal invocation from:

```text
submit_rating()

complete_recovery()
```

---

# 87. Trust Score Bounds

Database constraint:

```text
trust_score >= 0

trust_score <= 100
```

---

# 88. Average Rating Bounds

Database constraint:

```text
average_rating >= 0

average_rating <= 5
```

---

# 89. Successful Return Bounds

```text
successful_returns >= 0
```

---

# 90. Rating Constraints

```text
rating >= 1

rating <= 5
```

---

# 91. Profile Update Security

Users may not update:

```text
trust_score

average_rating

rating_count

successful_returns
```

through normal profile update requests.

---

# 92. Trust Recalculation Transaction

When rating submitted:

```text
validate rating
      ↓
insert rating
      ↓
recalculate target profile metrics
      ↓
commit
```

Ideally within one controlled backend operation.

---

# 93. Recovery Completion Transaction

When both confirmations exist:

```text
complete recovery
      ↓
update successful recovery stats
      ↓
recalculate participant trust
      ↓
create rating notifications
```

All side effects must be idempotent.

---

# 94. Rating API Response

Frontend should receive:

```text
success

rating_id

updated_rating_summary
```

where useful.

The client should then invalidate:

```text
profile

ratings

recovery
```

queries.

---

# 95. Trust Score Animation

When trust changes after recovery:

A small Anime.js count transition may show:

```text
76 → 81
```

but:

- animation must be optional
- reduced motion must be respected
- visual animation must not determine actual score

---

# 96. Trust Score Precision

Public UI should use:

```text
whole number
```

Example:

```text
82 / 100
```

No need for:

```text
82.347
```

Internal calculation may retain decimal precision.

---

# 97. Average Rating Precision

Display:

```text
4.8
```

rather than:

```text
4.833333
```

One decimal is sufficient.

---

# 98. Trust History

Detailed trust history is not required for MVP.

Future screen may explain:

```text
12 successful returns

18 ratings

Member since Jan 2026
```

without showing every score change.

---

# 99. Trust Transparency

Users should understand the high-level factors affecting reputation.

Do not reveal fraud-prevention rules in enough detail to enable gaming.

Good explanation:

```text
Your Trust Score reflects completed recoveries, ratings, and account history.
```

Avoid exposing precise anti-abuse thresholds publicly.

---

# 100. Rating Submission UI

Recommended:

```text
How was your experience?

☆ ☆ ☆ ☆ ☆

Optional review

[ Submit Rating ]
```

---

# 101. Rating Labels

Optional accessible labels:

```text
1 — Very Poor

2 — Poor

3 — Okay

4 — Good

5 — Excellent
```

This improves accessibility.

---

# 102. Rating Success UI

Example:

```text
Thanks for your feedback.

Your rating helps build a more trusted recovery community.
```

---

# 103. Double Rating UI

If user already rated:

```text
You've already rated this recovery.
```

Display their submitted rating if appropriate.

---

# 104. Rating Error UI

Example:

```text
We couldn't submit your rating.

Please try again.
```

Do not create optimistic trust-score updates before backend confirmation.

---

# 105. Public Profile Trust Layout

Recommended:

```text
Rahul Sharma

Trust Score
82 / 100

4.8 ★
18 ratings

12 successful recoveries

Trusted Finder

Member since March 2026
```

---

# 106. New Profile Layout

Recommended:

```text
Rahul Sharma

New Member

No ratings yet

No completed recoveries yet
```

Avoid presenting neutral trust as suspicious.

---

# 107. Trust Badge Tone

Badges should be understated.

Use:

```text
Trusted Finder
```

not:

```text
LEGENDARY FINDER LEVEL 10
```

The platform is a recovery utility, not a game.

---

# 108. Rating Query

Public profile rating query should return only valid public reviews.

Recommended ordering:

```text
created_at DESC
```

with pagination.

---

# 109. Rating Pagination

Use:

```text
10–20 reviews
```

per page.

Do not load unlimited profile review history.

---

# 110. Trust and Privacy

Trust should expose:

```text
score

average rating

rating count

successful returns

public reviews
```

It should not expose:

```text
rejected claims

private disputes

moderation investigation details

private reports
```

---

# 111. Trust and Safety

Trust should supplement safety guidance.

Even with a high-trust user, continue to recommend:

```text
Meet in a public place.

Do not send money.

Keep communication in the app.
```

---

# 112. Trust Data Integrity

Only backend-controlled processes should modify reputation aggregates.

Protection required through:

```text
RLS

database functions

restricted update permissions
```

---

# 113. Trust Analytics

Useful future analytics include:

```text
Average trust score

Trust distribution

Ratings per completed recovery

Percentage of recoveries rated

Average rating by role

Repeated user-pair activity
```

These are product metrics, not user-facing leaderboards.

---

# 114. Rating Completion Rate

Metric:

```text
ratings submitted
/
maximum eligible ratings
```

Since each recovery allows two ratings:

```text
maximum eligible ratings =
completed recoveries × 2
```

This helps measure whether the rating UX is effective.

---

# 115. Successful Recovery Metric

Primary trust-related success metric:

```text
completed recoveries
```

This is stronger than:

```text
number of listings created
```

because it represents real platform value.

---

# 116. Fraud Signals for Future Monitoring

Potential signals:

```text
many recoveries between same users

many new accounts interacting together

high recovery volume in short periods

large number of rejected claims

many reports against same user
```

These should trigger review rather than automatic punishment initially.

---

# 117. Anti-Gaming Philosophy

Do not create rewards that make trust valuable enough to strongly incentivize fake behavior before robust anti-fraud systems exist.

Keep trust useful but lightweight.

---

# 118. Testing — Rating Eligibility

Scenario:

```text
Recovery ACTIVE
```

Attempt rating.

Expected:

```text
DENIED
```

---

# 119. Testing — Successful Rating

Scenario:

```text
Recovery COMPLETED

Owner rates Finder 5 stars
```

Expected:

```text
rating created

Finder average updated

Finder rating_count updated

Finder trust recalculated
```

---

# 120. Testing — Duplicate Rating

Same Owner rates same recovery again.

Expected:

```text
DENIED
```

---

# 121. Testing — Self Rating

User attempts to manipulate target user ID.

Expected:

```text
DENIED
```

Target should be derived by backend.

---

# 122. Testing — Unauthorized Rating

Unrelated User C attempts rating against recovery between A and B.

Expected:

```text
DENIED
```

---

# 123. Testing — Trust Manipulation

User executes direct profile update:

```text
trust_score = 100
```

Expected:

```text
DENIED
```

---

# 124. Testing — Idempotent Recovery

Recovery-completion logic called twice.

Expected:

```text
successful_returns increments once

trust reflects one completed recovery
```

---

# 125. Testing — New User

User has:

```text
0 ratings
0 recoveries
```

Expected:

```text
neutral/new-user presentation
```

not:

```text
0 trust
```

---

# 126. Testing — Rating Average

Ratings:

```text
5
4
5
4
```

Expected raw average:

```text
4.5
```

Profile cache should match canonical rating data.

---

# 127. Testing — Rating Removal

If moderator invalidates a rating later:

Expected:

```text
average recalculated

rating_count recalculated

trust recalculated
```

---

# 128. MVP Trust Requirements

Required:

```text
1–5 star ratings

Optional review

Only completed recoveries can be rated

Mutual rating

Duplicate prevention

Self-rating prevention

Average rating

Rating count

Successful returns

Backend-controlled trust score

Trust recalculation

Public reputation summary

New-user state
```

---

# 129. Recommended P1 Features

```text
Trusted Finder badge

Review reporting

Trust explanation tooltip

Rating moderation
```

---

# 130. Future Features

Do not block MVP on:

```text
Blind reviews

Advanced fraud scoring

Machine-learning trust models

Identity verification

Leaderboard

Complex badge system

Trust history graph

Organization-specific reputation

Verified government identity
```

---

# 131. Recommended Implementation Order

```text
1. Ratings table

2. Rating constraints

3. Rating RLS

4. submit_rating()

5. Average rating calculation

6. Rating count

7. Successful recovery count

8. recalculate_user_trust()

9. Profile trust display

10. Rating form

11. Rating notifications

12. Reviews list

13. New-user state

14. Anti-abuse tests

15. Badge system later
```

---

# 132. Trust System Definition of Done

The MVP trust system is complete when:

1. Only completed recovery participants may rate.
2. Both participants may rate independently.
3. Rating is limited to 1–5.
4. Written review is optional.
5. Users cannot rate themselves.
6. Users cannot rate the same recovery twice.
7. Unrelated users cannot submit ratings.
8. Average rating is backend-derived.
9. Rating count is backend-derived.
10. Successful returns are backend-derived.
11. Trust Score is backend-controlled.
12. Users cannot directly edit trust.
13. Recalculation is idempotent.
14. New users are shown neutrally.
15. Low review counts do not create misleading reputation.
16. Public profiles show supporting statistics.
17. Trust does not automatically approve ownership claims.
18. Trust messaging does not guarantee safety.
19. Rating submission updates the target user's reputation.
20. Trust data remains consistent after retries and repeated operations.

---

# 133. Recommended Trust Model Summary

```text
                    USER ACTIVITY
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
      COMPLETED RECOVERIES        RATINGS
              │                     │
              │                     ▼
              │              ADJUSTED RATING
              │                     │
              └──────────┬──────────┘
                         │
                         ▼
                   ACCOUNT AGE
                         │
                         ▼
                TRUST CALCULATION
                         │
                         ▼
                    0–100 SCORE
                         │
             ┌───────────┼────────────┐
             │           │            │
             ▼           ▼            ▼
          PROFILE    CLAIM REVIEW   RECOVERY
```

---

# 134. Final Trust Principle

The reputation system should communicate:

```text
"This person has a positive history on the platform."
```

not:

```text
"This person is guaranteed to be safe."
```

The strongest trust signal should remain real successful recovery activity.

Ratings add context.

Account history adds confidence.

Ownership verification remains independent.

The final model should therefore be:

```text
REAL RECOVERY ACTIVITY
        +
QUALITY FEEDBACK
        +
HISTORY
        ↓
REPUTATION
```

Trust should help people make informed decisions while preserving the platform's core principle:

> Technology can provide context, but users still verify ownership and exercise normal safety precautions.