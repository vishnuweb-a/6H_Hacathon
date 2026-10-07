# Lost & Found Platform — Matching Engine

## 1. Purpose

This document defines the matching engine for the Lost & Found Platform.

The matching engine is responsible for connecting:

```text
LOST REPORTS
      ↕
FOUND LISTINGS
```

It should identify likely candidate pairs using structured metadata and text similarity, calculate a confidence score, rank possible matches, and notify users when appropriate.

The system must never automatically declare ownership.

Its purpose is to answer:

> Which Found Listings are most likely related to this Lost Report?

and:

> Which Lost Reports are most likely related to this Found Listing?

The final ownership decision always happens through the claim and verification process.

---

# 2. Matching Principles

The matching engine should follow these principles.

## 2.1 Matching Is Suggestion, Not Verification

A score means:

```text
Similarity
```

not:

```text
Confirmed Ownership
```

The UI should always use wording such as:

```text
Possible Match

Strong Match

Very Strong Match
```

and never:

```text
Confirmed Owner
```

before ownership verification.

---

## 2.2 Matching Must Be Bidirectional

The engine must work regardless of which record exists first.

### Lost First

```text
Lost Report Created
       ↓
No Found Listing Yet
       ↓
Found Listing Created Later
       ↓
Engine Matches Them
```

### Found First

```text
Found Listing Created
       ↓
No Lost Report Yet
       ↓
Lost Report Created Later
       ↓
Engine Matches Them
```

---

## 2.3 Filter Before Scoring

The engine should not compare every listing with every other listing.

First:

```text
Candidate Filtering
```

Then:

```text
Detailed Scoring
```

This improves performance and reduces noisy results.

---

## 2.4 Multiple Signals Matter

Matching should not depend on one field.

The first implementation will combine:

```text
Category

Location

Date / Time

Description
```

Later versions may add:

```text
Brand

Color

Semantic Embeddings

Image Similarity
```

---

# 3. High-Level Matching Flow

```text
New / Updated Listing
        ↓
Determine Listing Type
        ↓
Search Opposite Type
        ↓
Filter Candidate Set
        ↓
Calculate Individual Scores
        ↓
Calculate Overall Score
        ↓
Apply Threshold
        ↓
Rank Matches
        ↓
Persist Match Records
        ↓
Notify When Appropriate
```

---

# 4. Matching Trigger Events

Matching should run when:

```text
Lost Report Created

Found Listing Created
```

It should also rerun when match-relevant fields are modified.

Relevant fields include:

```text
category

brand

color

description

event_date

event_time

location

latitude

longitude
```

---

# 5. Matching Direction

When:

```text
listing_type = LOST
```

search:

```text
FOUND
```

When:

```text
listing_type = FOUND
```

search:

```text
LOST
```

No matching should occur between:

```text
LOST ↔ LOST
```

or:

```text
FOUND ↔ FOUND
```

---

# 6. Eligible Candidate Status

Only listings that can participate in recovery should be considered.

Recommended eligible status:

```text
ACTIVE
```

Do not match listings that are:

```text
RETURNED

CLOSED

CANCELLED
```

A listing in active recovery should usually not generate new proactive matches.

---

# 7. Candidate Generation

Before calculating detailed scores, reduce the candidate set.

Initial candidate conditions:

```text
Opposite listing type

Active status

Compatible category

Reasonable date proximity

Reasonable location proximity
```

Text similarity may then further rank candidates.

---

# 8. Candidate Generation Example

Lost item:

```text
AirPods Pro

Electronics

Lost October 7

Main Library
```

Database contains:

```text
1. Found AirPods near Library
2. Found Wallet near Library
3. Found Earbuds near Cafeteria
4. Found Headphones three months ago
5. Returned AirPods
```

Initial filtering may keep:

```text
1. Found AirPods near Library

3. Found Earbuds near Cafeteria
```

and reject:

```text
Wallet
Old headphones
Returned AirPods
```

---

# 9. Category Filtering

Category is the first strong filter.

Example categories:

```text
electronics

wallet

id_card

keys

bag

clothing

book

document

accessory

other
```

---

# 10. Exact Category Match

If:

```text
lost.category = found.category
```

then:

```text
category_score = 100
```

---

# 11. Compatible Categories

Some categories may be related.

Example:

```text
electronics ↔ accessory
```

or:

```text
document ↔ id_card
```

These may receive lower compatibility scores.

Example:

```text
80
```

rather than:

```text
100
```

---

# 12. Incompatible Categories

Example:

```text
wallet ↔ headphones
```

should usually receive:

```text
0
```

and may be removed before detailed scoring.

---

# 13. Category Compatibility Map

Optional configuration:

```text
electronics
  electronics = 100
  accessory   = 60

wallet
  wallet      = 100
  accessory   = 40

document
  document    = 100
  id_card     = 80

id_card
  id_card     = 100
  document    = 80
```

This configuration should remain editable without rewriting matching logic.

---

# 14. Date Matching

The date score measures how close:

```text
date lost
```

and:

```text
date found
```

are.

Usually:

> an item should be found after or close to when it was lost.

---

# 15. Date Difference

Calculate:

```text
date_difference =
absolute(found_date - lost_date)
```

However, preserve the chronological relationship separately.

A Found Listing dated significantly before the Lost Report is generally suspicious.

---

# 16. Recommended Date Score

Example initial configuration:

```text
Same day
100

1 day difference
90

2 days
80

3 days
70

4–7 days
50

8–14 days
25

More than 14 days
10
```

These thresholds should be tuned after real-world usage.

---

# 17. Chronology Penalty

If:

```text
found_date < lost_date
```

apply a penalty.

Example:

```text
1 day before
possible data-entry uncertainty

3+ days before
very low confidence
```

Do not automatically reject one-day inconsistencies because users may enter approximate dates incorrectly.

---

# 18. Time Matching

If both users provide time:

```text
event_time
```

calculate a time proximity score.

Example:

```text
Lost 10:30 AM

Found 11:10 AM
```

is highly compatible.

---

# 19. Recommended Time Difference Scores

If same date:

```text
0–1 hour
100

1–3 hours
90

3–6 hours
75

6–12 hours
55

12–24 hours
35
```

If time is unknown on either listing:

```text
Use date score only
```

Do not punish users heavily for not knowing the exact time.

---

# 20. Combined Date / Time Score

Possible method:

If both times exist:

```text
time_score =
(date_score × 0.6)
+
(time_proximity_score × 0.4)
```

If one time is missing:

```text
time_score = date_score
```

---

# 21. Location Matching

Location is one of the strongest signals.

The system may have:

```text
location_text

latitude

longitude
```

Whenever coordinates are available, use distance rather than exact text comparison.

---

# 22. Distance Calculation

For MVP, calculate approximate geographic distance using:

```text
Haversine Formula
```

Inputs:

```text
lost.latitude
lost.longitude

found.latitude
found.longitude
```

Output:

```text
distance in meters / kilometers
```

---

# 23. Recommended Location Score

Example:

```text
0–100 meters
100

100–250 meters
95

250–500 meters
90

500m–1km
80

1–2km
65

2–5km
45

5–10km
25

10km+
10
```

These numbers should be configurable.

---

# 24. Location Should Not Be an Absolute Rejection

Someone may:

- find an item and carry it elsewhere
- report the nearest known landmark
- enter approximate location
- discover the loss later

Therefore:

```text
large distance
```

should reduce score but not always completely remove the candidate.

---

# 25. Location Text Fallback

If coordinates are missing, compare:

```text
location_text
```

Example:

```text
Main Library
```

and:

```text
Library Entrance
```

may still be considered similar.

Initial implementation may use:

```text
normalized substring / token matching
```

Later semantic location normalization can improve this.

---

# 26. Location Normalization

Before comparison:

```text
Lowercase

Trim spaces

Remove punctuation

Normalize abbreviations
```

Example:

```text
CSE Block
```

and:

```text
C.S.E. Block
```

should become similar.

---

# 27. Text Similarity

Description matching compares item information.

Fields may include:

```text
title

brand

color

description
```

Initial implementation should use deterministic text similarity.

Future implementation may use semantic embeddings.

---

# 28. Text Normalization

Before comparison:

```text
lowercase

trim whitespace

remove punctuation

normalize repeated spaces

normalize common synonyms
```

Example:

```text
Air Pods
```

and:

```text
AirPods
```

should be treated similarly where possible.

---

# 29. Tokenization

Example:

Lost:

```text
black apple airpods pro silicone case
```

Tokens:

```text
black
apple
airpods
pro
silicone
case
```

Found:

```text
apple earbuds black rubber case
```

Tokens:

```text
apple
earbuds
black
rubber
case
```

---

# 30. Basic Text Similarity V1

The initial implementation may combine:

```text
Exact word overlap

Partial word overlap

Brand match

Color match

Title similarity
```

Possible tools:

```text
PostgreSQL similarity

pg_trgm

custom token matching
```

---

# 31. pg_trgm

Recommended PostgreSQL extension:

```text
pg_trgm
```

This allows similarity operations such as:

```text
similarity(text1, text2)
```

It works well for spelling differences and similar strings.

---

# 32. Title Similarity

Example:

```text
AirPods Pro
```

vs:

```text
Apple AirPods
```

could produce a strong score.

---

# 33. Description Similarity

Example:

Lost:

```text
Black AirPods case with scratch on left side
```

Found:

```text
AirPods inside dark case, slightly scratched
```

A simple text engine should assign moderate-to-high similarity.

Semantic embeddings can improve this later.

---

# 34. Brand Matching

Brand should be treated as an additional signal inside the description/metadata score.

Example:

```text
Apple ↔ Apple
```

Strong positive signal.

```text
Apple ↔ Samsung
```

Strong negative signal for certain categories.

---

# 35. Color Matching

Color is useful but should not be overly weighted.

Example:

```text
black
```

vs:

```text
dark grey
```

may still be close.

Color may contribute to metadata similarity rather than acting as a hard filter.

---

# 36. Initial Match Formula

Recommended MVP weighting:

```text
Category        25%

Location        25%

Date / Time     20%

Description     30%
```

Formula:

```text
overall_score =
(category_score × 0.25)
+
(location_score × 0.25)
+
(time_score × 0.20)
+
(description_score × 0.30)
```

Each individual score is:

```text
0–100
```

Final score is therefore:

```text
0–100
```

---

# 37. Example Score

Suppose:

```text
Category
100

Location
90

Date / Time
85

Description
92
```

Then:

```text
(100 × 0.25)
+
(90 × 0.25)
+
(85 × 0.20)
+
(92 × 0.30)
```

Result:

```text
92.1
```

Displayed as:

```text
92% Possible Match
```

---

# 38. Match Strength Labels

Recommended:

```text
90–100
Very Strong Match

75–89
Strong Match

60–74
Possible Match

Below 60
Low Confidence
```

---

# 39. Minimum Stored Match Threshold

Not every candidate must be persisted.

Recommended:

```text
store only matches >= 50
```

This prevents the database from filling with clearly irrelevant pairs.

---

# 40. User Display Threshold

Recommended:

```text
show matches >= 60
```

---

# 41. Notification Threshold

Recommended initial threshold:

```text
notify at >= 75
```

This reduces noisy notifications.

---

# 42. Very Strong Match Notification

For:

```text
score >= 90
```

notification may say:

```text
We found a strong possible match for your lost item.
```

Still avoid certainty.

---

# 43. Ranking

Matches should be ordered:

```text
overall_score DESC
```

Then optionally:

```text
location distance ASC

date difference ASC

created_at DESC
```

as tie-breakers.

---

# 44. Top Results

For user-facing match lists, return only a manageable number.

Example:

```text
Top 10
```

or:

```text
Top 20
```

Do not overwhelm users with hundreds of weak matches.

---

# 45. Matching Persistence

Store match results in:

```text
matches
```

Fields:

```text
lost_item_id

found_item_id

overall_score

category_score

location_score

time_score

description_score

status
```

---

# 46. Why Persist Matches

Persisting enables:

```text
ranked match history

dismissal

notification deduplication

claim linking

analytics

matching evaluation
```

---

# 47. Match Deduplication

Database must enforce:

```text
unique(lost_item_id, found_item_id)
```

If matching reruns:

```text
UPDATE existing match
```

rather than create duplicate records.

---

# 48. Match Upsert

Recommended behavior:

```text
Existing pair?
      ↓
YES
Update scores + updated_at

NO
Create match
```

---

# 49. Match Status

Recommended statuses:

```text
ACTIVE

DISMISSED

CLAIMED

EXPIRED
```

---

# 50. ACTIVE

Means:

```text
Candidate is currently valid and visible.
```

---

# 51. DISMISSED

Used when a user indicates:

```text
Not My Item
```

The match should no longer appear in normal results.

---

# 52. CLAIMED

When a claim is created from the match:

```text
match.status = CLAIMED
```

This improves traceability.

---

# 53. EXPIRED

Used when:

```text
listing closed

listing returned

candidate no longer valid
```

---

# 54. Dismiss Match Flow

```text
User selects:
Not My Item
      ↓
dismiss_match(match_id)
      ↓
Verify user owns one side
      ↓
status = DISMISSED
```

---

# 55. Dismissal Persistence

A dismissed match should not immediately reappear after routine recalculation.

Keep dismissal state unless:

```text
significant listing changes occur
```

and the system explicitly chooses to reconsider it.

---

# 56. Significant Change

Examples:

```text
category changed

location corrected

date changed significantly

description substantially updated
```

Minor changes should not reactivate dismissed matches automatically.

---

# 57. Claim Linking

If a user claims from a match:

```text
claims.match_id = match.id
```

This allows analysis such as:

```text
Which matches turned into claims?

Which claims became successful recoveries?
```

---

# 58. Manual Claim

If user finds an item manually through Explore:

```text
claims.match_id = NULL
```

This distinction is useful for product analytics.

---

# 59. Match Explanation

The frontend should explain major signals.

Example:

```text
92% Possible Match

Similarities:

✓ Same category

✓ Found near your loss location

✓ Same day

✓ Similar description
```

---

# 60. Do Not Expose Hidden Details

Match explanations must never reveal:

```text
found_item_private_details

verification answers

secret ownership clues
```

Only public-safe fields may contribute to visible explanations.

---

# 61. Private Details and Matching

For MVP:

> Do not use private Finder details directly for automated public matching.

Why:

If a private detail strongly affects matching and the UI reveals the reason indirectly, it may leak ownership clues.

Private information should remain primarily for human verification.

---

# 62. Candidate Query Example

Conceptually:

```text
New LOST Item
     ↓
SELECT active FOUND items
WHERE
category compatible
AND
event_date reasonably close
AND
location reasonably close
```

Then score the returned set.

---

# 63. Date Window

Recommended initial candidate window:

```text
±14 days
```

with preference toward:

```text
Found on or after lost date
```

Do not search years of unrelated data for every listing.

---

# 64. Location Window

If coordinates exist:

Recommended candidate radius:

```text
10 km
```

for initial campus/local-community MVP.

This may later vary by product deployment.

---

# 65. Campus-Specific Configuration

For a university deployment, radius may be much smaller:

```text
2–5 km
```

because most campus items remain nearby.

The matching system should allow environment-level configuration.

---

# 66. No Coordinates

If coordinates are missing:

Use:

```text
category

date

location_text

description
```

Matching must still work.

---

# 67. Missing Data Strategy

The system should not automatically give zero score for fields the user did not provide.

Example:

If brand is unknown:

```text
Do not treat missing brand as brand mismatch.
```

---

# 68. Dynamic Weight Normalization

A better future scoring model may redistribute weights when signals are unavailable.

Example:

If location coordinates are unavailable:

Original:

```text
Category 25
Location 25
Time 20
Description 30
```

Available weights:

```text
Category 25
Time 20
Description 30
```

Total:

```text
75
```

Normalize:

```text
category weight = 25 / 75

time weight = 20 / 75

description weight = 30 / 75
```

This avoids unfairly reducing scores because data is missing.

---

# 69. Recommended MVP Missing Data Approach

For first implementation:

Use dynamic weight normalization.

This is more reliable than assigning:

```text
missing = 0
```

---

# 70. Dynamic Score Formula

For available signals:

```text
overall =
Σ(score_i × weight_i)
/
Σ(active_weights)
```

where only available signal weights are included.

---

# 71. Example Missing Location

Available:

```text
Category = 100
Time = 85
Description = 90
```

Weights:

```text
25
20
30
```

Score:

```text
(100×25 + 85×20 + 90×30)
/
75
```

This produces a fair confidence estimate.

---

# 72. Hard Negative Signals

Some conflicts should sharply reduce confidence.

Examples:

```text
Lost: Apple AirPods
Found: Samsung Galaxy Buds
```

or:

```text
Lost: blue backpack
Found: tiny wallet
```

These should not survive solely because location/date match.

---

# 73. Hard Filters

Recommended hard filters:

```text
Same listing type
→ reject

Found item returned
→ reject

Lost item returned
→ reject

Clearly incompatible categories
→ reject
```

Other conflicts should reduce score rather than always reject.

---

# 74. Brand Conflict

For brand-sensitive categories:

```text
electronics
```

different explicit brands may trigger a significant description/metadata penalty.

For categories such as:

```text
keys
```

brand may matter much less.

---

# 75. Item Type Extraction

Future matching may normalize item types.

Examples:

```text
AirPods
earbuds
wireless earphones
TWS
```

into:

```text
wireless_earbuds
```

This can dramatically improve deterministic matching.

---

# 76. Synonym Dictionary

Initial synonym mapping may include:

```text
earphones → earbuds

airpods → earbuds

rucksack → backpack

spectacles → glasses

mobile → phone

identity card → id_card
```

Keep synonym logic centralized.

---

# 77. Matching Configuration

Recommended configuration object concept:

```text
weights

thresholds

date windows

distance ranges

category compatibility

synonyms
```

Avoid scattering matching constants throughout SQL/functions.

---

# 78. Matching Configuration Example

Conceptually:

```text
category_weight = 0.25

location_weight = 0.25

time_weight = 0.20

description_weight = 0.30

store_threshold = 50

display_threshold = 60

notification_threshold = 75
```

---

# 79. Backend Implementation

For MVP, matching should primarily run inside:

```text
PostgreSQL
```

through:

```text
generate_matches(item_id)
```

---

# 80. generate_matches()

Responsibilities:

```text
Validate item

Determine type

Load eligible opposite listings

Generate candidate set

Calculate scores

Apply threshold

Upsert matches

Expire invalid old matches

Generate notifications where appropriate
```

---

# 81. Matching Function Input

Preferred:

```text
generate_matches(item_id)
```

Do not require frontend to supply:

```text
user_id
listing_type
scores
```

These should be derived from database data.

---

# 82. Matching Function Output

Possible response:

```text
match_count

top_match_id

top_score
```

The frontend may then invalidate/refetch match queries.

---

# 83. Notification Generation

A notification should be created when:

```text
new match
AND
score >= notification threshold
```

Do not notify repeatedly for the same unchanged pair.

---

# 84. Match Notification Deduplication

Possible method:

Use existing:

```text
matches
```

record and only create notification when:

```text
match newly inserted
```

or when score crosses the notification threshold for the first time.

---

# 85. Both-Sides Notifications

For strong matches:

Owner:

```text
A found item may match something you lost.
```

Finder:

```text
A Lost Report may match the item you found.
```

The Finder notification may optionally encourage:

```text
Notify Possible Owner
```

depending on final UX.

---

# 86. Finder-Initiated Owner Notification

If Finder selects:

```text
Notify Possible Owner
```

the backend should verify:

```text
Finder owns Found Listing

Match is active
```

before sending.

Do not allow arbitrary users to notify unrelated owners.

---

# 87. Notification Cooldown

If listing updates repeatedly change score:

Do not spam users.

Recommended:

```text
one notification per match pair
```

unless there is a major meaningful change.

---

# 88. Recalculation Strategy

When an item changes:

```text
Load previous matches
      ↓
Recalculate relevant candidates
      ↓
Update score
      ↓
Expire no-longer-valid matches
      ↓
Add new matches
```

---

# 89. Recalculation Scope

Do not always recompute the entire database.

Only compare against:

```text
eligible opposite listings
```

within configured category/date/location windows.

---

# 90. Match Expiration

A match becomes expired if:

```text
Lost item closed

Found item closed

Either item returned

Recovery started with another item

Pair no longer satisfies minimum threshold
```

depending on implementation policy.

---

# 91. Active Recovery Behavior

When a Found Listing enters:

```text
RECOVERY_IN_PROGRESS
```

new claims and match notifications should normally stop.

Existing matches may remain historically stored but should no longer act as active candidates.

---

# 92. Successful Recovery

When recovery completes:

```text
match.status = CLAIMED
```

or a future terminal:

```text
SUCCESSFUL
```

may be introduced.

For MVP, successful outcome can be derived from linked claim/recovery.

Avoid adding unnecessary states prematurely.

---

# 93. Matching Analytics

Store enough data to measure:

```text
match score distribution

claim conversion rate

successful recovery rate

dismissal rate

score vs recovery success

time to match
```

---

# 94. Key Matching Metrics

Recommended metrics:

```text
Matches generated per listing

% matches viewed

% matches dismissed

% matches claimed

% claimed matches accepted

% accepted matches completed

Average successful match score
```

---

# 95. False Positive Analysis

A false positive may be indicated by:

```text
high score
+
user dismisses match
```

or:

```text
claim rejected
```

These events should help future tuning.

---

# 96. False Negative Analysis

Harder to measure.

Potential signal:

```text
successful manual recovery
```

where:

```text
claims.match_id IS NULL
```

This means the matching system may have failed to surface the item.

---

# 97. Weight Tuning

Do not permanently assume initial weights are optimal.

Start with:

```text
Category 25
Location 25
Time 20
Description 30
```

Then use real recovery data to adjust.

---

# 98. Future Semantic Matching

V2 may add:

```text
text embeddings
```

to understand semantic meaning.

Example:

Lost:

```text
Black Apple wireless earbuds in silicone cover
```

Found:

```text
AirPods inside dark rubber case
```

Even with different wording, embeddings should identify similarity.

---

# 99. Semantic Architecture

```text
Listing Description
      ↓
Embedding Model
      ↓
Embedding Vector
      ↓
pgvector
      ↓
Nearest Neighbor Search
      ↓
Semantic Score
```

---

# 100. Semantic Score

Semantic similarity may be converted into:

```text
0–100
```

and added to the weighted formula.

Example future weights:

```text
Category       15%

Location       20%

Date / Time    15%

Metadata       15%

Semantic Text  35%
```

These are only future starting values.

---

# 101. Embedding Input

Do not embed only the description.

Build a normalized text representation.

Example:

```text
category: electronics
item: airpods pro
brand: apple
color: white
description: black silicone protective case
```

This provides richer semantic context.

---

# 102. Embedding Privacy

Do not include private Finder verification details in external embedding APIs unless explicitly approved by the privacy architecture.

Prefer embeddings from public-safe fields.

---

# 103. Embedding Storage

Future table:

```text
item_embeddings
```

Fields:

```text
item_id

embedding

model

content_hash

created_at
```

---

# 104. content_hash

Use a hash of embedded source content.

If source text changes:

```text
hash changes
      ↓
regenerate embedding
```

If unchanged:

```text
reuse existing embedding
```

---

# 105. Semantic Candidate Search

Future approach:

```text
Metadata filter
      ↓
Vector similarity search
      ↓
Combine scores
```

Do not run semantic search against every item regardless of category/date constraints.

Hybrid matching is preferable.

---

# 106. Hybrid Matching

Recommended long-term system:

```text
Structured Filters
+
Geographic Similarity
+
Temporal Similarity
+
Semantic Text Similarity
```

rather than AI-only matching.

---

# 107. Image Matching

Future version may compare:

```text
Lost item previous photo
```

with:

```text
Found item photo
```

using visual embeddings.

This is not required for MVP.

---

# 108. Image Similarity Risks

Image matching can produce false confidence because:

- many products look identical
- photos have different lighting
- only partial item may be visible
- generic wallets/headphones look alike

Image similarity should be one signal, not proof.

---

# 109. Future Image Score

Possible future formula:

```text
Metadata

Location

Time

Text Semantic

Image Semantic
```

Image similarity should not dominate verification.

---

# 110. Matching and Ownership Verification

The matching engine should stop at:

```text
Potential Match
```

Then:

```text
Claim System
```

takes over.

Flow:

```text
92% Match
      ↓
Owner Claims
      ↓
Finder Questions
      ↓
Ownership Verification
```

---

# 111. Security Boundary

The matching engine may use:

```text
public-safe item metadata
```

but must never leak:

```text
private Finder notes

expected verification answers

private contents
```

into:

```text
match explanations

notifications

public API responses
```

---

# 112. Match API / Query Shape

Frontend may receive:

```text
match_id

lost_item_summary

found_item_summary

overall_score

match_strength

matched_signals

status
```

It should not receive private verification data.

---

# 113. matched_signals

Possible safe representation:

```text
CATEGORY

LOCATION

DATE

DESCRIPTION
```

Example:

```text
["CATEGORY", "LOCATION", "DATE"]
```

---

# 114. Do Not Return Internal Scoring Details Unnecessarily

For MVP, detailed component scores may remain backend-only.

Frontend can receive:

```text
overall score
+
human-readable matched signals
```

This reduces complexity and avoids over-explaining unreliable heuristics.

---

# 115. Match Card UX

Example:

```text
Black AirPods

92%

Very Strong Possible Match

Near Main Library

Found today

Matched:
Category • Location • Date
```

---

# 116. Match Detail UX

Compare:

```text
Your Lost Report
```

with:

```text
Found Listing
```

Show:

```text
Category

Color

Brand

Location

Date

Description
```

Do not show private fields.

---

# 117. Not My Item

Match detail should include:

```text
Not My Item
```

This is valuable both for UX and matching analytics.

---

# 118. No Match UX

If no candidate exceeds display threshold:

```text
No possible matches yet.

We'll keep checking new found listings.
```

The report remains active.

---

# 119. Weak Match UX

Weak matches may either:

```text
remain hidden
```

or be placed under:

```text
Other Possible Matches
```

For MVP, keeping results under 60 hidden is recommended.

---

# 120. Matching Performance

Initial optimization strategies:

```text
filter before scoring

indexed category/status/date

limited candidate window

upsert instead of duplicate insert

avoid full database scans
```

---

# 121. Required Indexes

Useful:

```text
items(listing_type, status)

items(category, listing_type, status)

items(event_date)

matches(lost_item_id)

matches(found_item_id)

matches(overall_score)
```

Location indexes may be added later if PostGIS is introduced.

---

# 122. Scaling Strategy

At small scale:

```text
PostgreSQL function
```

is sufficient.

At larger scale:

```text
async matching job
+
queue
+
worker / Edge Function
```

may become necessary.

Do not introduce distributed infrastructure before it is required.

---

# 123. Async Matching Future

Future flow:

```text
Listing Created
      ↓
Matching Job Queued
      ↓
Worker Processes
      ↓
Matches Stored
      ↓
Notification Sent
```

For MVP, synchronous or lightweight post-create matching is simpler.

---

# 124. Matching Failure

If matching fails:

```text
listing creation should still succeed
```

Do not prevent users from posting an item because the recommendation engine temporarily failed.

---

# 125. Retry Strategy

If matching execution fails:

```text
record remains ACTIVE
      ↓
retry matching
```

Possible future mechanisms:

```text
scheduled job

manual retry

background worker
```

---

# 126. Idempotency

Running:

```text
generate_matches(item_id)
```

multiple times should not create duplicate matches or duplicate notifications.

This is required.

---

# 127. Data Validation

Before matching:

Verify:

```text
item exists

valid listing type

eligible status

required fields available
```

Invalid listings should not crash matching logic.

---

# 128. Matching Tests

Core unit/integration scenarios should include:

```text
Exact match

Same category, nearby location

Same category, distant location

Different category

Same item, different wording

Different brand

Missing coordinates

Missing time

Found date before lost date

Closed item

Returned item

Duplicate matching run
```

---

# 129. Exact Match Test

Example:

Lost:

```text
Black AirPods Pro
Library
Oct 7
```

Found:

```text
Black AirPods Pro
Library
Oct 7
```

Expected:

```text
Very Strong Match
```

---

# 130. Location Conflict Test

Same description but:

```text
100+ km apart
```

Expected:

```text
low confidence
```

unless other rules explicitly allow broad geographic matching.

---

# 131. Category Conflict Test

Lost:

```text
Wallet
```

Found:

```text
Laptop
```

Expected:

```text
candidate rejected
```

---

# 132. Missing Location Test

Same:

```text
category
date
description
```

but coordinates absent.

Expected:

```text
score remains calculable through dynamic weight normalization
```

---

# 133. Duplicate Run Test

Run matching twice.

Expected:

```text
one match record
```

not:

```text
two identical matches
```

---

# 134. Notification Test

Match score:

```text
80
```

Expected:

```text
match persisted
notification created once
```

Run again unchanged.

Expected:

```text
no duplicate notification
```

---

# 135. Dismissal Test

User dismisses match.

Matching reruns with no substantial change.

Expected:

```text
match remains dismissed
```

---

# 136. Successful Recovery Feedback

If a match leads to:

```text
Claim Accepted
+
Recovery Completed
```

the system should record enough data to associate that match with a successful outcome.

This data will be useful for future tuning.

---

# 137. MVP Matching Scope

Required:

```text
Opposite-type candidate generation

Category filtering

Location score

Date/time score

Text similarity

Weighted score

Thresholds

Ranking

Match persistence

Deduplication

Dismissal

Notification threshold

Bidirectional matching
```

---

# 138. Not Required for MVP

Do not block release on:

```text
Embeddings

LLM matching

Computer vision

Image similarity

Machine learning training

Personalized matching models

Large vector infrastructure
```

---

# 139. Recommended Implementation Order

```text
1. Normalize listing metadata

2. Candidate filtering

3. Category score

4. Date score

5. Time score

6. Location score

7. Text similarity

8. Weighted overall score

9. Threshold filtering

10. Match persistence

11. Ranking

12. Dismissal

13. Notifications

14. Recalculation

15. Analytics instrumentation

16. Semantic matching later
```

---

# 140. Matching Engine Definition of Done

The MVP matching engine is complete when:

1. Lost Reports search active Found Listings.
2. Found Listings search active Lost Reports.
3. Clearly incompatible categories are filtered.
4. Date proximity affects ranking.
5. Time proximity is used when available.
6. Location distance affects ranking.
7. Description similarity affects ranking.
8. Missing fields do not automatically destroy confidence.
9. A normalized 0–100 score is generated.
10. Matches below threshold are hidden.
11. Strong matches are ranked first.
12. Match pairs are not duplicated.
13. Match results persist.
14. Users can dismiss incorrect matches.
15. Dismissed matches do not immediately reappear.
16. Strong matches trigger deduplicated notifications.
17. Match data does not expose private verification information.
18. The engine continues working regardless of which listing was created first.
19. Listing creation remains successful even if matching fails.
20. Successful recoveries can be traced back to matching results.

---

# 141. Final Matching Architecture

```text
                NEW LISTING
                     │
                     ▼
              NORMALIZE DATA
                     │
                     ▼
            OPPOSITE TYPE SEARCH
                     │
                     ▼
             CANDIDATE FILTERING
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
     CATEGORY      DATE        LOCATION
        │            │            │
        └───────┬────┴────┬───────┘
                │         │
                ▼         ▼
             TIME      DESCRIPTION
                │         │
                └────┬────┘
                     │
                     ▼
               WEIGHTED SCORE
                     │
                     ▼
                  THRESHOLD
                     │
           ┌─────────┴─────────┐
           │                   │
        TOO LOW             VALID MATCH
           │                   │
         IGNORE                ▼
                            PERSIST
                               │
                               ▼
                              RANK
                               │
                               ▼
                           NOTIFY IF
                           STRONG ENOUGH
                               │
                               ▼
                           USER REVIEWS
                               │
                               ▼
                              CLAIM
                               │
                               ▼
                         HUMAN VERIFY
```

The matching engine exists to reduce search effort and surface the most promising recovery candidates.

It must remain explainable, configurable, privacy-aware, and subordinate to the human ownership-verification process.