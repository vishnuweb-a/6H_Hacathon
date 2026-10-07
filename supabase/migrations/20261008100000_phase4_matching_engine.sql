-- ---------------------------------------------------------------------------
-- Phase 4 — Bidirectional Matching Engine
-- ---------------------------------------------------------------------------
-- Implements docs/matchingEngine.md end to end for MVP scope:
--   `matches` (docs/database.md §25–§27), `match_dismissals` (the Phase 4
--   per-user refinement, below), the deterministic scoring functions (§9–§37),
--   candidate filtering before scoring (§2.3, §7, §62–§65), dynamic weight
--   normalization for missing signals (§68–§71), `generate_matches()` (§80–§82),
--   automatic bidirectional triggering (§4, §5), participant-only RLS
--   (docs/authAndRls.md §27) and the safe read surfaces.
--
-- SCOPE BOUNDARY. This phase deliberately does NOT implement:
--   * claims           -> `matches.status = 'CLAIMED'` is a legal enum value that
--                         NOTHING in this migration ever sets. It becomes
--                         reachable only when a claim is ACCEPTED / recovery
--                         begins (docs/matchingEngine.md §52, §92). Phase 4
--                         produces ACTIVE and EXPIRED rows only.
--   * chat, recovery   -> untouched.
--   * notifications    -> the >= 75 threshold is recorded in the config function
--                         for Phase 10 to read. NO notification row is written and
--                         no delivery happens here (docs/matchingEngine.md §83).
--   * embeddings / LLM / image similarity -> explicitly out of MVP scope (§138).
--
-- PRIVACY. Matching reads `public.items` only. The private-evidence tables
-- (`found_item_private_details`, `lost_item_private_details`,
-- `verification_questions`) are never referenced by any function in this file —
-- grep this migration for their names and the only hits are in comments. That is
-- the structural enforcement required by docs/matchingEngine.md §61, §111 and
-- docs/securityAndService.md §65: private verification evidence cannot influence a
-- score, so it cannot leak through one either. Coordinates ARE used internally
-- (they are a matching input, docs/database.md items.latitude) but no read surface
-- in this file returns them, or any distance derived from them.

-- ---------------------------------------------------------------------------
-- 1. match_status enum (docs/database.md §9)
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'match_status') then
    create type public.match_status as enum ('ACTIVE', 'DISMISSED', 'CLAIMED', 'EXPIRED');
  end if;
end $$;

comment on type public.match_status is
  'Backend lifecycle of a candidate pair. DISMISSED is reserved for a global backend invalidation; a single user saying "not my item" writes match_dismissals instead (Phase 4 refinement). CLAIMED is set only when a claim is accepted / recovery begins, never by matching.';

-- ---------------------------------------------------------------------------
-- 2. Matching configuration (docs/matchingEngine.md §77, §78)
-- ---------------------------------------------------------------------------
-- "Avoid scattering matching constants throughout SQL/functions" (§77). Every
-- weight, threshold and window lives here exactly once; the scoring functions,
-- the candidate filter and the read surfaces all call this. Changing a weight is a
-- one-line change in one place.
--
-- IMMUTABLE so the planner can fold it into expressions, and so the scoring
-- functions below stay IMMUTABLE too.

create or replace function public.matching_config()
returns jsonb
language sql
immutable
parallel safe
set search_path = ''
as $fn$
  select jsonb_build_object(
    -- Weights (§36). Must sum to 100.
    'category_weight',     25,
    'location_weight',     25,
    'time_weight',         20,
    'description_weight',  30,
    -- Thresholds (§39, §40, §41).
    'store_threshold',     50,
    'display_threshold',   60,
    'notification_threshold', 75,   -- recorded for Phase 10; unused here
    -- Strength bands (§38).
    'strong_threshold',      75,
    'very_strong_threshold', 90,
    -- Candidate windows (§63, §64, §65).
    'date_window_days',   14,
    'location_window_km', 10,
    -- Result limits (§44).
    'max_results',        20
  );
$fn$;

comment on function public.matching_config() is
  'Single source of truth for matching weights, thresholds and candidate windows (docs/matchingEngine.md §77, §78). notification_threshold is recorded for Phase 10 and is not acted on in Phase 4.';

grant execute on function public.matching_config() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Category compatibility (docs/matchingEngine.md §10–§13)
-- ---------------------------------------------------------------------------
-- The documented map, verbatim from §13, kept as data rather than branching logic
-- so it "should remain editable without rewriting matching logic" (§13).
--
-- The map is deliberately SYMMETRIC in effect: the function below looks up both
-- orientations, so declaring `document -> id_card = 80` also yields
-- `id_card -> document = 80`. A LOST/FOUND pair must score the same whichever side
-- the generation ran from, which is the bidirectional-equivalence guarantee
-- (docs/matchingEngine.md §2.2, task §41).

create or replace function public.category_compatibility_map()
returns jsonb
language sql
immutable
parallel safe
set search_path = ''
as $fn$
  select jsonb_build_object(
    'electronics', jsonb_build_object('electronics', 100, 'accessory', 60),
    'wallet',      jsonb_build_object('wallet', 100, 'accessory', 40),
    'document',    jsonb_build_object('document', 100, 'id_card', 80),
    'id_card',     jsonb_build_object('id_card', 100, 'document', 80),
    'bag',         jsonb_build_object('bag', 100, 'accessory', 40),
    'accessory',   jsonb_build_object('accessory', 100, 'electronics', 60,
                                      'wallet', 40, 'bag', 40),
    'keys',        jsonb_build_object('keys', 100, 'accessory', 40),
    'clothing',    jsonb_build_object('clothing', 100, 'accessory', 40),
    'book',        jsonb_build_object('book', 100, 'document', 40),
    'other',       jsonb_build_object('other', 100)
  );
$fn$;

comment on function public.category_compatibility_map() is
  'Category compatibility scores (docs/matchingEngine.md §13). Editable configuration, not logic. Applied symmetrically by category_score().';

-- Category score (§10, §11, §12).
--
--   exact match                        -> 100
--   declared compatible pair           -> the declared score (40–80)
--   anything else                      -> 0  (and filtered out before scoring)
--
-- `other` is a special case: it is the catch-all bucket a user picks when nothing
-- fits, so `other` against a *specific* category is treated as weakly compatible
-- rather than a hard contradiction. Two items can genuinely be the same thing with
-- one of them filed under `other`. It scores 40, matching the weakest declared
-- compatibility, so it never survives on category alone.

create or replace function public.match_category_score(
  p_lost_category text,
  p_found_category text
)
returns numeric
language sql
immutable
parallel safe
set search_path = ''
as $fn$
  select case
    when p_lost_category is null or p_found_category is null then 0::numeric
    when p_lost_category = p_found_category then 100::numeric
    when public.category_compatibility_map() -> p_lost_category ? p_found_category
      then (public.category_compatibility_map() -> p_lost_category ->> p_found_category)::numeric
    -- Symmetric lookup: declaring one direction is enough.
    when public.category_compatibility_map() -> p_found_category ? p_lost_category
      then (public.category_compatibility_map() -> p_found_category ->> p_lost_category)::numeric
    when p_lost_category = 'other' or p_found_category = 'other' then 40::numeric
    else 0::numeric
  end;
$fn$;

comment on function public.match_category_score(text, text) is
  'Deterministic category similarity 0–100 (docs/matchingEngine.md §10–§13). Symmetric: the argument order does not change the result.';

-- ---------------------------------------------------------------------------
-- 4. Text normalization and synonyms (docs/matchingEngine.md §28, §76)
-- ---------------------------------------------------------------------------
-- The small controlled synonym mapping from §76, and nothing more. This is not an
-- NLP subsystem: it is a lookup table applied token by token, so "airpods" and
-- "earbuds" compare as the same token. Only the documented entries are included.

create or replace function public.matching_synonyms()
returns jsonb
language sql
immutable
parallel safe
set search_path = ''
as $fn$
  select jsonb_build_object(
    -- docs/matchingEngine.md §76, verbatim.
    'earphones',     'earbuds',
    'airpods',       'earbuds',
    'rucksack',      'backpack',
    'spectacles',    'glasses',
    'mobile',        'phone',
    -- "identity card" is a two-word source; handled as a phrase before tokenizing.
    'cellphone',     'phone',
    'smartphone',    'phone',
    'earphone',      'earbuds',
    'headphone',     'headphones',
    'laptops',       'laptop',
    'specs',         'glasses',
    'bottle',        'bottle',
    'purse',         'wallet',
    'backpacks',     'backpack',
    'bag',           'bag'
  );
$fn$;

comment on function public.matching_synonyms() is
  'Controlled token synonym map (docs/matchingEngine.md §76). Deliberately small; matching must not become an NLP subsystem.';

-- Normalize a free-text matching input (§28, §26).
--   lowercase -> strip punctuation -> collapse whitespace -> trim
-- Phrase-level synonyms are applied BEFORE tokenizing, because "identity card"
-- cannot be mapped one token at a time.

create or replace function public.normalize_matching_text(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $fn$
  select btrim(
    regexp_replace(
      regexp_replace(
        replace(
          replace(lower(coalesce(p_text, '')), 'identity card', 'id_card'),
          'id card', 'id_card'
        ),
        -- Keep word characters and underscore; everything else becomes a space, so
        -- "C.S.E. Block" and "CSE Block" normalize alike (§26).
        '[^a-z0-9_]+', ' ', 'g'
      ),
      '\s+', ' ', 'g'
    )
  );
$fn$;

comment on function public.normalize_matching_text(text) is
  'Lowercase, de-punctuate and collapse whitespace for matching comparison (docs/matchingEngine.md §26, §28).';

-- Tokenize to a canonical, de-duplicated, synonym-mapped, sorted token array
-- (§29, §76). Sorted so the array itself is orientation-independent.
-- Tokens of one character are dropped: they carry no matching signal and inflate
-- overlap denominators.

-- Stopwords. Jaccard overlap divides by the UNION of the two token sets, so
-- filler words that both descriptions happen to contain -- or worse, that only one
-- contains -- dilute the score without carrying any signal about the item. "white
-- AirPods in a charging case" vs "white Apple earbuds inside a charging case"
-- should score on {white, earbuds, charging, case}, not be penalised for one
-- writer saying "in" and the other "inside".
--
-- The list is closed and small: English function words, plus the four words that
-- describe the LISTING rather than the ITEM. "lost" and "found" in particular
-- appear in almost every description by construction and are pure noise for a
-- LOST-vs-FOUND comparison -- the listing_type column already carries that fact.
create or replace function public.matching_stopwords()
returns text[]
language sql
immutable
parallel safe
set search_path = ''
as $fn$
  select array[
    'the','and','for','with','was','were','has','have','had','this','that','these',
    'those','its','it','is','are','be','been','am','my','me','mine','your','yours',
    'his','her','hers','their','theirs','our','ours','a','an','of','in','on','at',
    'to','from','by','near','inside','into','onto','out','over','under','up','down',
    'about','around','between','through','during','before','after','while','when',
    'where','very','some','any','all','just','only','also','there','here','then',
    'than','so','if','or','but','not','no','yes','can','could','would','should',
    'please','someone','somebody','anyone','left','put','kept',
    -- Listing-type noise, not item description.
    'lost','found','losing','finding','missing','misplaced'
  ];
$fn$;

comment on function public.matching_stopwords() is
  'Closed stopword list for matching tokenization. Includes "lost"/"found", which describe the listing rather than the item and appear in nearly every description (docs/matchingEngine.md §29).';

create or replace function public.matching_tokens(p_text text)
returns text[]
language sql
immutable
parallel safe
set search_path = ''
as $fn$
  select coalesce(array_agg(distinct canonical order by canonical), '{}'::text[])
  from (
    select coalesce(public.matching_synonyms() ->> tok, tok) as canonical
    from unnest(
      string_to_array(public.normalize_matching_text(p_text), ' ')
    ) as t(tok)
    where char_length(tok) > 1
      -- Stopwords are removed BEFORE synonym mapping, so a stopword can never be
      -- resurrected by the map, and after the length filter.
      and not (tok = any (public.matching_stopwords()))
  ) mapped;
$fn$;

comment on function public.matching_tokens(text) is
  'Canonical sorted token set for matching: normalized, synonym-mapped, de-duplicated, single characters dropped (docs/matchingEngine.md §29, §76).';

-- ---------------------------------------------------------------------------
-- 5. Date / time score — 20% (docs/matchingEngine.md §14–§20)
-- ---------------------------------------------------------------------------
-- Date bands from §16, the chronology penalty from §17, time bands from §19 and
-- the 0.6/0.4 combination from §20.
--
-- Chronology (§17): an item found BEFORE it was reported lost is suspicious, but
-- users enter approximate dates, so a one-day inconsistency is only lightly
-- penalised and three or more days heavily. It is never an outright rejection.

create or replace function public.match_date_score(
  p_lost_date date,
  p_found_date date
)
returns numeric
language sql
immutable
parallel safe
set search_path = ''
as $fn$
  with d as (
    select
      abs(p_found_date - p_lost_date) as gap,
      -- Negative when the find predates the loss report.
      (p_found_date - p_lost_date)   as signed_gap
  ),
  base as (
    select
      case
        when gap = 0 then 100::numeric
        when gap = 1 then 90::numeric
        when gap = 2 then 80::numeric
        when gap = 3 then 70::numeric
        when gap between 4 and 7  then 50::numeric
        when gap between 8 and 14 then 25::numeric
        else 10::numeric
      end as score,
      signed_gap
    from d
  )
  select case
    when p_lost_date is null or p_found_date is null then null::numeric
    -- §17: found well before the loss -> very low confidence.
    when signed_gap <= -3 then round(score * 0.40, 2)
    -- 1–2 days before is plausible data-entry uncertainty; light penalty only.
    when signed_gap < 0   then round(score * 0.85, 2)
    else score
  end
  from base;
$fn$;

comment on function public.match_date_score(date, date) is
  'Date proximity 0-100 with the chronology penalty for a find predating the loss (docs/matchingEngine.md §16, §17).';

-- Time proximity within the same day (§19). Returns NULL when either time is
-- absent, which is what makes "missing time" different from "distant time":
-- the caller then falls back to the date score alone rather than scoring a zero.

create or replace function public.match_time_proximity_score(
  p_lost_time time,
  p_found_time time
)
returns numeric
language sql
immutable
parallel safe
set search_path = ''
as $fn$
  with h as (
    select abs(
      extract(epoch from p_found_time) - extract(epoch from p_lost_time)
    ) / 3600.0 as hours
  )
  select case
    when p_lost_time is null or p_found_time is null then null::numeric
    when hours <= 1  then 100::numeric
    when hours <= 3  then 90::numeric
    when hours <= 6  then 75::numeric
    when hours <= 12 then 55::numeric
    else 35::numeric
  end
  from h;
$fn$;

comment on function public.match_time_proximity_score(time, time) is
  'Same-day time proximity 0-100, NULL when either time is unknown (docs/matchingEngine.md §19).';

-- Combined date/time component (§20).
--   both times present AND same date -> date*0.6 + time*0.4
--   otherwise                        -> date score alone
--
-- The same-date condition matters: a time-of-day comparison across different days
-- is meaningless (10:00 on Monday vs 10:30 on Friday is not a one-hour gap), so
-- the time term only applies when the dates agree (§19 "If same date").

create or replace function public.match_time_score(
  p_lost_date date,
  p_lost_time time,
  p_found_date date,
  p_found_time time
)
returns numeric
language sql
immutable
parallel safe
set search_path = ''
as $fn$
  with s as (
    select
      public.match_date_score(p_lost_date, p_found_date) as date_score,
      public.match_time_proximity_score(p_lost_time, p_found_time) as time_score
  )
  select case
    when date_score is null then null::numeric
    when time_score is not null and p_lost_date = p_found_date
      then round(date_score * 0.6 + time_score * 0.4, 2)
    else date_score
  end
  from s;
$fn$;

comment on function public.match_time_score(date, time, date, time) is
  'The 20% date/time component. Blends time proximity only when both times exist and the dates agree; otherwise the date score stands alone, so a missing optional time is not punished (docs/matchingEngine.md §19, §20).';

-- ---------------------------------------------------------------------------
-- 6. Location score — 25% (docs/matchingEngine.md §21–§26)
-- ---------------------------------------------------------------------------
-- Haversine, no PostGIS. §22 names Haversine for MVP explicitly and the data is a
-- plain lat/lon pair on `items`; introducing PostGIS would be unjustified at this
-- scale (§122 "do not introduce distributed infrastructure before it is required",
-- and task §14).

create or replace function public.haversine_km(
  p_lat1 double precision,
  p_lon1 double precision,
  p_lat2 double precision,
  p_lon2 double precision
)
returns double precision
language sql
immutable
parallel safe
set search_path = ''
as $fn$
  select case
    when p_lat1 is null or p_lon1 is null or p_lat2 is null or p_lon2 is null
      then null::double precision
    else
      -- 6371 km mean Earth radius. asin(least(1, ...)) guards the floating-point
      -- case where an identical coordinate pair makes the root marginally > 1.
      2 * 6371 * asin(least(1.0,
        sqrt(
          sin(radians(p_lat2 - p_lat1) / 2) ^ 2 +
          cos(radians(p_lat1)) * cos(radians(p_lat2)) *
          sin(radians(p_lon2 - p_lon1) / 2) ^ 2
        )
      ))
  end;
$fn$;

comment on function public.haversine_km(double precision, double precision, double precision, double precision) is
  'Great-circle distance in kilometres (docs/matchingEngine.md §22). Internal matching use only - no read surface returns a distance.';

-- Distance -> 0–100 similarity, bands from §23.

create or replace function public.match_location_score_from_km(p_km double precision)
returns numeric
language sql
immutable
parallel safe
set search_path = ''
as $fn$
  select case
    when p_km is null       then null::numeric
    when p_km <= 0.1        then 100::numeric
    when p_km <= 0.25       then 95::numeric
    when p_km <= 0.5        then 90::numeric
    when p_km <= 1          then 80::numeric
    when p_km <= 2          then 65::numeric
    when p_km <= 5          then 45::numeric
    when p_km <= 10         then 25::numeric
    else 10::numeric
  end;
$fn$;

comment on function public.match_location_score_from_km(double precision) is
  'Distance band to 0-100 location similarity (docs/matchingEngine.md §23). Large distance reduces the score but never rejects outright (§24).';

-- The location component, with the documented text fallback (§25, §26).
--
-- Coordinates win when both sides have them. When either side lacks them, the
-- normalized location_text is compared by trigram similarity, so "Main Library"
-- and "Library Entrance" stay close. The fallback returns NULL only when there is
-- no usable text on either side either — and NULL is the signal that triggers
-- dynamic weight renormalization (§68), NOT a zero (§15, §67).

create or replace function public.match_location_score(
  p_lost_lat double precision,
  p_lost_lon double precision,
  p_lost_location_text text,
  p_found_lat double precision,
  p_found_lon double precision,
  p_found_location_text text
)
returns numeric
language sql
immutable
parallel safe
set search_path = ''
as $fn$
  select case
    -- Both coordinate pairs present: true distance.
    when p_lost_lat is not null and p_found_lat is not null
      then public.match_location_score_from_km(
        public.haversine_km(p_lost_lat, p_lost_lon, p_found_lat, p_found_lon)
      )
    -- Text fallback (§25). Scaled to 95 so a text guess never claims the
    -- certainty of a sub-100m coordinate match.
    when coalesce(btrim(p_lost_location_text), '') <> ''
     and coalesce(btrim(p_found_location_text), '') <> ''
      then round(
        least(
          95::numeric,
          extensions.similarity(
            public.normalize_matching_text(p_lost_location_text),
            public.normalize_matching_text(p_found_location_text)
          )::numeric * 95
        ),
        2
      )
    -- No comparable location data at all -> unavailable, not zero.
    else null::numeric
  end;
$fn$;

comment on function public.match_location_score(double precision, double precision, text, double precision, double precision, text) is
  'The 25% location component. Haversine when both sides have coordinates, normalized location_text trigram similarity otherwise, NULL when neither is comparable so the weight renormalizes (docs/matchingEngine.md §23-§26, §68).';

-- ---------------------------------------------------------------------------
-- 7. Description score — 30% (docs/matchingEngine.md §27–§35)
-- ---------------------------------------------------------------------------
-- PostgreSQL only: token overlap + pg_trgm, per §30 and §31. No embeddings, no
-- LLM, no vector search, no image similarity — explicitly out of MVP scope (§138,
-- task §17).
--
-- The inputs are the PUBLIC listing fields only: title, description, brand,
-- color. The private-evidence tables are not read here and are not reachable from
-- this function, which is what makes task §42 (identical score after a private
-- detail changes) true by construction rather than by test luck.
--
-- Composition, from §30/§32/§33/§34/§35:
--   title + description token/trigram similarity   60%   the main signal
--   brand agreement                                25%   strong when stated (§34)
--   color agreement                                15%   useful, not decisive (§35)
--
-- Brand and color are OPTIONAL fields. "Missing" must not read as "mismatch"
-- (§67), so when a side has not stated one, that sub-weight is dropped and the
-- remaining sub-weights renormalize — the same principle as §68, applied inside
-- the component.

-- Jaccard token overlap, 0–100 (§29, §30).
create or replace function public.token_overlap_score(p_left text, p_right text)
returns numeric
language sql
immutable
parallel safe
set search_path = ''
as $fn$
  with t as (
    select
      public.matching_tokens(p_left)  as l,
      public.matching_tokens(p_right) as r
  ),
  counts as (
    select
      cardinality(l) as nl,
      cardinality(r) as nr,
      (
        select count(*)
        from unnest(l) as x(tok)
        where tok = any (r)
      ) as shared
    from t
  )
  select case
    when nl = 0 or nr = 0 then null::numeric
    else round(
      -- Jaccard: shared / union. Union = nl + nr - shared, and both token arrays
      -- are already de-duplicated by matching_tokens().
      (shared::numeric / (nl + nr - shared)::numeric) * 100,
      2
    )
  end
  from counts;
$fn$;

comment on function public.token_overlap_score(text, text) is
  'Jaccard token-set overlap 0-100 over canonical matching tokens (docs/matchingEngine.md §29, §30). NULL when either side has no usable tokens.';

-- Brand / color agreement, 0–100. NULL when either side left the field blank, so
-- the sub-weight drops out rather than scoring zero (§67).
--
-- Trigram similarity rather than equality, so "Apple" vs "apple inc" agrees and
-- "black" vs "dark grey" lands partway (§35) instead of being a flat mismatch.
create or replace function public.match_attribute_score(p_left text, p_right text)
returns numeric
language sql
immutable
parallel safe
set search_path = ''
as $fn$
  with n as (
    select
      public.normalize_matching_text(p_left)  as l,
      public.normalize_matching_text(p_right) as r
  )
  select case
    when coalesce(l, '') = '' or coalesce(r, '') = '' then null::numeric
    when l = r then 100::numeric
    else round(extensions.similarity(l, r)::numeric * 100, 2)
  end
  from n;
$fn$;

comment on function public.match_attribute_score(text, text) is
  'Trigram agreement 0-100 for an optional attribute such as brand or color. NULL when either side is blank, so a missing value renormalizes instead of scoring zero (docs/matchingEngine.md §34, §35, §67).';

-- The 30% description component.
create or replace function public.match_description_score(
  p_lost_title text,
  p_lost_description text,
  p_lost_brand text,
  p_lost_color text,
  p_found_title text,
  p_found_description text,
  p_found_brand text,
  p_found_color text
)
returns numeric
language sql
immutable
parallel safe
set search_path = ''
as $fn$
  with parts as (
    select
      -- Title and description are pooled into one text field rather than scored
      -- separately: users split the same information across the two
      -- inconsistently ("Black AirPods" as a title with a bare description, or an
      -- empty-ish title with everything in the description). Pooling makes the
      -- comparison robust to where they chose to type it.
      greatest(
        coalesce(public.token_overlap_score(
          coalesce(p_lost_title, '')  || ' ' || coalesce(p_lost_description, ''),
          coalesce(p_found_title, '') || ' ' || coalesce(p_found_description, '')
        ), 0),
        -- Trigram similarity over the same pooled text, which catches spelling
        -- differences and partial words that whole-token overlap misses (§31).
        coalesce(round(extensions.similarity(
          public.normalize_matching_text(
            coalesce(p_lost_title, '')  || ' ' || coalesce(p_lost_description, '')),
          public.normalize_matching_text(
            coalesce(p_found_title, '') || ' ' || coalesce(p_found_description, ''))
        )::numeric * 100, 2), 0)
      ) as text_score,
      public.match_attribute_score(p_lost_brand, p_found_brand) as brand_score,
      public.match_attribute_score(p_lost_color, p_found_color) as color_score
  ),
  weighted as (
    select
      text_score * 60
        + coalesce(brand_score, 0) * 25
        + coalesce(color_score, 0) * 15 as total,
      60
        + case when brand_score is null then 0 else 25 end
        + case when color_score is null then 0 else 15 end as active_weight
    from parts
  )
  -- active_weight is never 0: the text sub-weight of 60 is unconditional.
  select round(total / active_weight, 2)
  from weighted;
$fn$;

comment on function public.match_description_score(text, text, text, text, text, text, text, text) is
  'The 30% description component: pooled title+description token/trigram similarity (60%), brand (25%) and color (15%), with absent optional attributes renormalized out. Public listing fields only - never private evidence (docs/matchingEngine.md §27-§35, §61).';

-- ---------------------------------------------------------------------------
-- 8. Overall score with dynamic weight normalization (§36, §68–§71)
-- ---------------------------------------------------------------------------
-- A NULL component means "this signal is unavailable", not "this signal scored
-- zero". Unavailable components drop out and the remaining weights renormalize
-- over their own sum (§70), which is the documented MVP approach (§69) and what
-- task §15 requires.
--
--   all four present:   (c*25 + l*25 + t*20 + d*30) / 100
--   location absent:    (c*25 +        t*20 + d*30) /  75
--
-- With every component present this is arithmetically identical to the plain
-- 25/25/20/30 weighting, so the §37 worked example still holds exactly.

create or replace function public.match_overall_score(
  p_category_score numeric,
  p_location_score numeric,
  p_time_score numeric,
  p_description_score numeric
)
returns numeric
language sql
immutable
parallel safe
set search_path = ''
as $fn$
  with cfg as (
    select
      (public.matching_config() ->> 'category_weight')::numeric    as cw,
      (public.matching_config() ->> 'location_weight')::numeric    as lw,
      (public.matching_config() ->> 'time_weight')::numeric        as tw,
      (public.matching_config() ->> 'description_weight')::numeric as dw
  ),
  w as (
    select
      coalesce(p_category_score, 0)    * case when p_category_score    is null then 0 else cw end
      + coalesce(p_location_score, 0)  * case when p_location_score    is null then 0 else lw end
      + coalesce(p_time_score, 0)      * case when p_time_score        is null then 0 else tw end
      + coalesce(p_description_score, 0) * case when p_description_score is null then 0 else dw end
        as total,
      case when p_category_score    is null then 0 else cw end
      + case when p_location_score  is null then 0 else lw end
      + case when p_time_score      is null then 0 else tw end
      + case when p_description_score is null then 0 else dw end
        as active_weight
    from cfg
  )
  select case
    -- No signal at all is not a zero-confidence match, it is no match.
    when active_weight = 0 then null::numeric
    -- numeric(5,2) is the persisted precision (docs/database.md §25). Two decimals
    -- keep ranking deterministic without the absurd precision task §20 rules out;
    -- the UI rounds to a whole percent.
    else round(total / active_weight, 2)
  end
  from w;
$fn$;

comment on function public.match_overall_score(numeric, numeric, numeric, numeric) is
  'Weighted overall score 0-100 using 25/25/20/30, renormalized over whichever components are available (docs/matchingEngine.md §36, §68-§71). Authoritative - never computed in the client.';

-- Strength band (§38, docs/apiAndDataContracts.md §33).
create or replace function public.match_strength(p_overall_score numeric)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $fn$
  select case
    when p_overall_score is null then null
    when p_overall_score >= (public.matching_config() ->> 'very_strong_threshold')::numeric
      then 'VERY_STRONG'
    when p_overall_score >= (public.matching_config() ->> 'strong_threshold')::numeric
      then 'STRONG'
    when p_overall_score >= (public.matching_config() ->> 'display_threshold')::numeric
      then 'POSSIBLE'
    else 'LOW'
  end;
$fn$;

comment on function public.match_strength(numeric) is
  'Score to strength band: VERY_STRONG 90+, STRONG 75-89, POSSIBLE 60-74, LOW below (docs/matchingEngine.md §38, docs/apiAndDataContracts.md §33).';

-- ---------------------------------------------------------------------------
-- 9. matches (docs/database.md §25–§27)
-- ---------------------------------------------------------------------------
-- Column types are the documented ones: numeric(5,2) scores, match_status
-- defaulting to ACTIVE.
--
-- Orientation is a column-level invariant, not a convention: lost_item_id must
-- point at a LOST item and found_item_id at a FOUND one. A foreign key cannot
-- express that, so a trigger does (docs/database.md §84 lists exactly this case),
-- and it is enforced at the DATABASE layer rather than only in the generator, per
-- task §6.

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  lost_item_id uuid not null references public.items (id) on delete cascade,
  found_item_id uuid not null references public.items (id) on delete cascade,
  overall_score numeric(5, 2) not null,
  category_score numeric(5, 2),
  location_score numeric(5, 2),
  time_score numeric(5, 2),
  description_score numeric(5, 2),
  status public.match_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- docs/database.md §26 — the critical constraint. One canonical row per pair;
  -- recalculation UPSERTs onto it (§47, §48, task §7).
  constraint matches_unique_pair unique (lost_item_id, found_item_id),
  -- A pair of the same row is meaningless and would also pass the type trigger
  -- only if an item were somehow both types.
  constraint matches_distinct_items check (lost_item_id <> found_item_id),
  -- Every score stays in band (docs/database.md §25).
  constraint matches_overall_score_range check (overall_score >= 0 and overall_score <= 100),
  constraint matches_category_score_range check (category_score is null or (category_score >= 0 and category_score <= 100)),
  constraint matches_location_score_range check (location_score is null or (location_score >= 0 and location_score <= 100)),
  constraint matches_time_score_range check (time_score is null or (time_score >= 0 and time_score <= 100)),
  constraint matches_description_score_range check (description_score is null or (description_score >= 0 and description_score <= 100))
);

comment on table public.matches is
  'Candidate LOST<->FOUND pairs with their component and overall similarity scores. A match suggests similarity; it never proves ownership (docs/matchingEngine.md §2.1). Scores are backend-generated and not client-writable.';
comment on column public.matches.lost_item_id is
  'Always an item with listing_type = LOST. Enforced by assert_match_orientation().';
comment on column public.matches.found_item_id is
  'Always an item with listing_type = FOUND. Enforced by assert_match_orientation().';
comment on column public.matches.status is
  'Backend lifecycle only. A single user dismissing a match writes match_dismissals; it does NOT set DISMISSED here (Phase 4 refinement). CLAIMED is never set by matching.';

-- docs/database.md §27 — the documented index set, including both composites.
create index if not exists matches_lost_item_id_idx on public.matches (lost_item_id);
create index if not exists matches_found_item_id_idx on public.matches (found_item_id);
create index if not exists matches_overall_score_idx on public.matches (overall_score desc);
create index if not exists matches_status_idx on public.matches (status);
-- These two serve the per-item match list: filter by one side + status, already
-- ordered by score (skill: supabase-postgres-best-practices, query-composite-indexes).
create index if not exists matches_lost_status_score_idx
  on public.matches (lost_item_id, status, overall_score desc);
create index if not exists matches_found_status_score_idx
  on public.matches (found_item_id, status, overall_score desc);

drop trigger if exists matches_set_updated_at on public.matches;
create trigger matches_set_updated_at
  before update on public.matches
  for each row
  execute function public.set_updated_at();

-- Orientation invariant (task §6, docs/database.md §84, §3002).
create or replace function public.assert_match_orientation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  lost_type public.listing_type;
  found_type public.listing_type;
begin
  select i.listing_type into lost_type from public.items i where i.id = new.lost_item_id;
  select i.listing_type into found_type from public.items i where i.id = new.found_item_id;

  if lost_type is null or found_type is null then
    raise exception 'Both sides of a match must reference an existing listing'
      using errcode = '23503';
  end if;

  -- This rejects LOST<->LOST and FOUND<->FOUND, and also a correctly-typed pair
  -- inserted in the wrong column order, so the canonical orientation holds.
  if lost_type <> 'LOST' then
    raise exception 'matches.lost_item_id must reference a LOST listing, got %', lost_type
      using errcode = '23514';
  end if;

  if found_type <> 'FOUND' then
    raise exception 'matches.found_item_id must reference a FOUND listing, got %', found_type
      using errcode = '23514';
  end if;

  return new;
end;
$fn$;

-- SECURITY DEFINER so the type lookup is not filtered by the caller's RLS; it
-- mutates nothing and is never exposed as an RPC.
revoke execute on function public.assert_match_orientation() from public, anon, authenticated;

drop trigger if exists matches_require_orientation on public.matches;
create trigger matches_require_orientation
  before insert or update of lost_item_id, found_item_id on public.matches
  for each row
  execute function public.assert_match_orientation();

-- ---------------------------------------------------------------------------
-- 10. match_dismissals — the Phase 4 per-user refinement
-- ---------------------------------------------------------------------------
-- docs/matchingEngine.md §54 originally described dismissal as a global
-- `matches.status = DISMISSED`. That is wrong for a bidirectional match, and this
-- phase refines it.
--
-- One match row is visible to TWO different people: the owner of the LOST report
-- and the Finder of the FOUND listing. "Not my item" is a statement by ONE of
-- them about their own view. If it set the shared row's status, the Finder's
-- honest listing would silently vanish from the owner's matches because the
-- Finder tidied their own list — one participant would be censoring the other's
-- view of a pair the system still considers plausible.
--
-- So a dismissal is a per-user row here, meaning exactly:
--     "hide this match for THIS user"
-- and never:
--     "this pair is globally invalid".
--
-- `matches.status` stays reserved for backend lifecycle (ACTIVE / EXPIRED now,
-- CLAIMED when claims land). The docs are updated to record this refinement
-- (docs/database.md, docs/matchingEngine.md, docs/authAndRls.md,
-- docs/apiAndDataContracts.md).

create table if not exists public.match_dismissals (
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- The pair IS the identity: one dismissal per user per match, idempotent by
  -- construction (task §5).
  constraint match_dismissals_pkey primary key (match_id, user_id)
);

comment on table public.match_dismissals is
  'Per-user "not my item". One row hides one match for one user only; it never invalidates the pair for the other participant (Phase 4 refinement of docs/matchingEngine.md §54).';

-- The PK covers (match_id, user_id) lookups. This index serves the other
-- direction: "every match this user has dismissed", which is how the match list
-- filters (skill: supabase-postgres-best-practices, schema-foreign-key-indexes).
create index if not exists match_dismissals_user_id_idx on public.match_dismissals (user_id);

-- ---------------------------------------------------------------------------
-- 11. Participation helper (docs/authAndRls.md §27)
-- ---------------------------------------------------------------------------
-- "A match should be visible only if the authenticated user owns at least one
-- side." Both RLS policies and the dismissal RPC need that question answered, so
-- it lives in one SECURITY DEFINER helper: the lookup joins `items`, which
-- `authenticated` has no blanket SELECT grant on, and keeping it out of the
-- caller's RLS makes it a single indexed probe per statement rather than a
-- correlated policy subquery (skill: supabase-postgres-best-practices,
-- security-rls-performance).
--
-- It takes NO user id. Identity is derived from auth.uid() inside the body, so a
-- caller cannot ask "is SOMEBODY ELSE a participant" and cannot pass themselves
-- off as another user (docs/authAndRls.md §58).

create or replace function public.user_participates_in_match(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1
    from public.matches m
    join public.items lost  on lost.id  = m.lost_item_id
    join public.items found on found.id = m.found_item_id
    where m.id = p_match_id
      and (select auth.uid()) is not null
      and (
        lost.user_id  = (select auth.uid())
        or found.user_id = (select auth.uid())
      )
  );
$fn$;

comment on function public.user_participates_in_match(uuid) is
  'True when the calling session owns either side of the given match. Identity comes from auth.uid(), never from an argument (docs/authAndRls.md §27, §58).';

revoke execute on function public.user_participates_in_match(uuid) from public, anon;
grant execute on function public.user_participates_in_match(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 12. matches RLS (docs/authAndRls.md §27)
-- ---------------------------------------------------------------------------

alter table public.matches enable row level security;

-- SELECT: participants only. A third user C sees nothing for a match between A
-- and B — the denial is the default, since no other policy exists and RLS is on
-- (task §27). This is enforced here, in the database, not by a route guard.
--
-- The predicate is inlined rather than calling user_participates_in_match() so
-- the planner can use matches_lost_item_id_idx / matches_found_item_id_idx when
-- listing many rows, instead of invoking a function per candidate row.
drop policy if exists matches_select_participant on public.matches;
create policy matches_select_participant
  on public.matches
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.items i
      where i.id = matches.lost_item_id
        and i.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.items i
      where i.id = matches.found_item_id
        and i.user_id = (select auth.uid())
    )
  );

-- INSERT / UPDATE / DELETE: no policy for `authenticated`, deliberately.
--
-- docs/authAndRls.md §27: "Clients should not directly insert matches. Matches
-- should be created by generate_matches() or other trusted backend logic." With
-- RLS enabled and no write policy, every direct client write is denied — which is
-- what makes "the browser cannot forge a score" (task §29) structurally true. The
-- generator below is SECURITY DEFINER and is the only writer. The table grants in
-- §15 withhold the privileges as a second, independent layer.

-- ---------------------------------------------------------------------------
-- 13. match_dismissals RLS (task §28)
-- ---------------------------------------------------------------------------

alter table public.match_dismissals enable row level security;

-- SELECT: own rows only. A user cannot enumerate what anyone else dismissed.
drop policy if exists match_dismissals_select_own on public.match_dismissals;
create policy match_dismissals_select_own
  on public.match_dismissals
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- INSERT: the row must be the caller's OWN dismissal, AND the caller must really
-- participate in that match. Two independent conditions:
--   * user_id = auth.uid()            -> cannot dismiss on behalf of another user
--   * user_participates_in_match(...) -> cannot dismiss a match they are not in
-- Without the second, a user could insert dismissals for arbitrary match ids and
-- probe which ones exist.
drop policy if exists match_dismissals_insert_own on public.match_dismissals;
create policy match_dismissals_insert_own
  on public.match_dismissals
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.user_participates_in_match(match_dismissals.match_id))
  );

-- DELETE: own rows only — this is "undo my dismissal" (restore).
drop policy if exists match_dismissals_delete_own on public.match_dismissals;
create policy match_dismissals_delete_own
  on public.match_dismissals
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- UPDATE: no policy. The row is (match_id, user_id, created_at) — there is nothing
-- to update. A changed mind is a DELETE.

-- ---------------------------------------------------------------------------
-- 14. generate_matches() (docs/matchingEngine.md §80–§82)
-- ---------------------------------------------------------------------------
-- The single matching entry point. BOTH creation orders call this same function
-- with the same logic (task §9): it looks at the subject item's own listing_type
-- and searches the opposite type, so "LOST then FOUND" and "FOUND then LOST"
-- cannot drift apart into two algorithms.
--
-- Signature is the documented one: generate_matches(item_id). The caller supplies
-- no user id, no listing type and no scores — all are derived from stored data
-- (§81), so none of them is forgeable.
--
-- SECURITY DEFINER because it writes `matches`, which no client role may write
-- (§12 above). Authorization is explicit in the body instead of relying on RLS:
-- the caller must own the subject item, or be a trusted backend role.
--
-- CANDIDATE FILTERING BEFORE SCORING (§2.3, §7, §62, task §12, §43). The CTE
-- chain is ordered deliberately:
--   1. `candidates` applies only index-friendly predicates — opposite
--      listing_type, ACTIVE status, date window, and the category compatibility
--      test. This is what narrows the set.
--   2. `scored` runs the expensive trigram/token similarity, and ONLY over rows
--      that survived step 1.
-- The expensive text work therefore never touches the whole opposite-type table.

create or replace function public.generate_matches(p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  caller uuid := (select auth.uid());
  subject public.items;
  cfg jsonb := public.matching_config();
  store_threshold numeric := (cfg ->> 'store_threshold')::numeric;
  date_window integer := (cfg ->> 'date_window_days')::integer;
  location_window_km numeric := (cfg ->> 'location_window_km')::numeric;
  upserted integer := 0;
  expired integer := 0;
  refreshed_ids uuid[] := array[]::uuid[];
  top_match_id uuid;
  top_score numeric;
begin
  if caller is null and not (
    current_setting('role', true) in ('postgres', 'service_role')
    or (current_setting('role', true) = 'none' and session_user in ('postgres', 'supabase_admin'))
  ) then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select i.* into subject from public.items i where i.id = p_item_id;

  -- 1. Validate the item exists (§80, task §24 step 1).
  if subject.id is null then
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;

  -- 2. Authorization (task §24 step 2).
  --
  -- The discriminator is the presence of a JWT identity, NOT the current role.
  -- Neither role function can be trusted here:
  --   * current_user  — this function is SECURITY DEFINER, so inside the body it
  --                     is always the owner (postgres), whoever called it. Testing
  --                     it would make every caller "trusted" and leave the
  --                     ownership check below as dead code.
  --   * session_user  — the role the connection authenticated as, which is the
  --                     pooler/authenticator role rather than `authenticated`, and
  --                     is `postgres` under `set local role` in the test harness.
  -- Both were tried and both let a user generate against a stranger's listing;
  -- the pgTAP case "a user cannot run generate_matches() on another user's
  -- listing" is what pinned this down.
  --
  -- auth.uid() answers the question actually being asked. A browser session always
  -- carries a JWT, so `caller` is non-null and ownership is enforced. The internal
  -- callers that legitimately generate for any item — the AFTER triggers on
  -- `items`, and service_role maintenance — have no JWT, so `caller` is null and
  -- they proceed. A trigger firing during a user's own INSERT is the one case with
  -- both a JWT and a legitimate need, and there the user owns the row anyway
  -- (items_insert_own enforces user_id = auth.uid()), so the check passes.
  if caller is not null and subject.user_id <> caller then
    -- Deliberately the same error a missing listing gives: a non-owner learns
    -- nothing about whether the listing exists.
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;

  -- An item that is not ACTIVE generates no new candidates. Its existing matches
  -- are expired by step 4 instead (§6, §90, §91, task §8).
  --
  -- RECOVERY_IN_PROGRESS is included in that rule: §91 says a listing in active
  -- recovery "should normally not generate new proactive matches", and existing
  -- rows "may remain historically stored but should no longer act as active
  -- candidates". So recovery stops NEW generation here, and step 4 expires the
  -- stale ACTIVE rows, leaving the historical rows in place.
  if subject.status = 'ACTIVE' then

    -- 3. Candidate generation + scoring + upsert, in one statement so the whole
    -- recalculation for this item is atomic.
    with candidates as materialized (
      select
        other.id,
        other.title, other.description, other.brand, other.color,
        other.category, other.event_date, other.event_time,
        other.location_text, other.latitude, other.longitude
      from public.items other
      where
        -- Opposite listing type. This is the hard filter that makes LOST<->LOST
        -- and FOUND<->FOUND impossible to even consider (§5, §73, task §6).
        other.listing_type <> subject.listing_type
        -- Only listings that can still participate in a recovery (§6, §73).
        -- RETURNED, CLOSED and CANCELLED are excluded here, which is what task §8
        -- requires; RECOVERY_IN_PROGRESS is excluded for the §91 reason above.
        and other.status = 'ACTIVE'
        -- Never match a user's own listing against itself. Two listings from the
        -- same person are not a recovery between two parties.
        and other.user_id <> subject.user_id
        -- Date window (§63). Index-friendly and the single most effective filter.
        and other.event_date between subject.event_date - date_window
                                 and subject.event_date + date_window
        -- Category compatibility as a hard pre-filter (§12 "may be removed before
        -- detailed scoring", §73 "clearly incompatible categories -> reject").
        -- A wallet never reaches the trigram comparison with a pair of headphones.
        and public.match_category_score(
              case when subject.listing_type = 'LOST' then subject.category else other.category end,
              case when subject.listing_type = 'LOST' then other.category else subject.category end
            ) > 0
        -- Location window (§64): 10 km, applied ONLY when both sides have
        -- coordinates. A missing coordinate must not exclude a candidate (§24,
        -- §66) — it renormalizes the weights later instead.
        and (
          subject.latitude is null
          or other.latitude is null
          or public.haversine_km(subject.latitude, subject.longitude,
                                 other.latitude, other.longitude) <= location_window_km
        )
    ),
    -- Orient every surviving candidate into the canonical (lost, found) pair
    -- BEFORE scoring, so the scoring arguments are identical regardless of which
    -- side the generation was triggered from. This is what guarantees the
    -- bidirectional equivalence of task §41.
    oriented as (
      select
        case when subject.listing_type = 'LOST' then subject.id else c.id end as lost_item_id,
        case when subject.listing_type = 'LOST' then c.id else subject.id end as found_item_id,
        case when subject.listing_type = 'LOST' then subject.category else c.category end as lost_category,
        case when subject.listing_type = 'LOST' then c.category else subject.category end as found_category,
        case when subject.listing_type = 'LOST' then subject.event_date else c.event_date end as lost_date,
        case when subject.listing_type = 'LOST' then c.event_date else subject.event_date end as found_date,
        case when subject.listing_type = 'LOST' then subject.event_time else c.event_time end as lost_time,
        case when subject.listing_type = 'LOST' then c.event_time else subject.event_time end as found_time,
        case when subject.listing_type = 'LOST' then subject.latitude else c.latitude end as lost_lat,
        case when subject.listing_type = 'LOST' then c.latitude else subject.latitude end as found_lat,
        case when subject.listing_type = 'LOST' then subject.longitude else c.longitude end as lost_lon,
        case when subject.listing_type = 'LOST' then c.longitude else subject.longitude end as found_lon,
        case when subject.listing_type = 'LOST' then subject.location_text else c.location_text end as lost_location_text,
        case when subject.listing_type = 'LOST' then c.location_text else subject.location_text end as found_location_text,
        case when subject.listing_type = 'LOST' then subject.title else c.title end as lost_title,
        case when subject.listing_type = 'LOST' then c.title else subject.title end as found_title,
        case when subject.listing_type = 'LOST' then subject.description else c.description end as lost_description,
        case when subject.listing_type = 'LOST' then c.description else subject.description end as found_description,
        case when subject.listing_type = 'LOST' then subject.brand else c.brand end as lost_brand,
        case when subject.listing_type = 'LOST' then c.brand else subject.brand end as found_brand,
        case when subject.listing_type = 'LOST' then subject.color else c.color end as lost_color,
        case when subject.listing_type = 'LOST' then c.color else subject.color end as found_color
      from candidates c
    ),
    -- 4. Component scores, then 5. the weighted overall score. Only now, on the
    -- reduced set.
    scored as materialized (
      select
        o.lost_item_id,
        o.found_item_id,
        public.match_category_score(o.lost_category, o.found_category) as category_score,
        public.match_location_score(
          o.lost_lat, o.lost_lon, o.lost_location_text,
          o.found_lat, o.found_lon, o.found_location_text
        ) as location_score,
        public.match_time_score(o.lost_date, o.lost_time, o.found_date, o.found_time) as time_score,
        public.match_description_score(
          o.lost_title, o.lost_description, o.lost_brand, o.lost_color,
          o.found_title, o.found_description, o.found_brand, o.found_color
        ) as description_score
      from oriented o
    ),
    final_scores as (
      select
        s.*,
        public.match_overall_score(
          s.category_score, s.location_score, s.time_score, s.description_score
        ) as overall_score
      from scored s
    ),
    -- 6. UPSERT. Persist only at or above the store threshold (§39, task §22).
    persisted as (
      insert into public.matches as m (
        lost_item_id, found_item_id, overall_score,
        category_score, location_score, time_score, description_score, status
      )
      select
        f.lost_item_id, f.found_item_id, f.overall_score,
        f.category_score, f.location_score, f.time_score, f.description_score,
        'ACTIVE'
      from final_scores f
      where f.overall_score is not null
        and f.overall_score >= store_threshold
      -- §47, §48: one canonical row per pair, updated in place. Idempotent, so
      -- re-running the generator cannot duplicate a match (§126).
      on conflict (lost_item_id, found_item_id) do update
      set overall_score     = excluded.overall_score,
          category_score    = excluded.category_score,
          location_score    = excluded.location_score,
          time_score        = excluded.time_score,
          description_score = excluded.description_score,
          -- A recalculated pair that still qualifies returns to ACTIVE if it had
          -- been expired. A per-user dismissal is NOT touched: those rows live in
          -- match_dismissals and survive recalculation (§55).
          -- CLAIMED is never overwritten by matching — once a claim owns this
          -- pair, matching stops managing its status (§52, task §4).
          status = case
            when m.status in ('CLAIMED', 'DISMISSED') then m.status
            else 'ACTIVE'::public.match_status
          end,
          updated_at = now()
      returning m.id, m.overall_score
    )
    select count(*), coalesce(array_agg(id), array[]::uuid[])
    into upserted, refreshed_ids from persisted;
  end if;

  -- Expire every previously active pair not refreshed by this run.
  -- Returned IDs are reliable even when multiple edits share transaction time.
  with stale as (
    update public.matches m
    set status = 'EXPIRED'
    where (m.lost_item_id = p_item_id or m.found_item_id = p_item_id)
      and m.status = 'ACTIVE'
      and (
        -- Either side is no longer an eligible, active listing.
        exists (
          select 1 from public.items i
          where i.id in (m.lost_item_id, m.found_item_id)
            and i.status <> 'ACTIVE'
        )
        -- Or this pair was not refreshed by the run above: it either scores below
        -- the threshold now or no longer survives candidate filtering.
        or not (m.id = any (refreshed_ids))
      )
    returning m.id
  )
  select count(*) into expired from stale;

  -- 8. Result metadata (§82). Ids and a score only — no candidate titles, no
  -- other user's data, nothing private (task §24 "do not leak private candidate
  -- data"). The frontend uses this to decide whether to invalidate its queries.
  select m.id, m.overall_score
  into top_match_id, top_score
  from public.matches m
  where (m.lost_item_id = p_item_id or m.found_item_id = p_item_id)
    and m.status = 'ACTIVE'
  order by m.overall_score desc, m.created_at desc, m.id
  limit 1;

  return jsonb_build_object(
    'itemId', p_item_id,
    'matchCount', upserted,
    'expiredCount', expired,
    'topMatchId', top_match_id,
    'topScore', top_score
  );
end;
$fn$;

comment on function public.generate_matches(uuid) is
  'Canonical matching operation (docs/matchingEngine.md §80-§82). Derives listing type and all scores from stored data; candidate filtering runs before scoring; UPSERTs one canonical row per pair and expires stale ones. Idempotent. Never sets CLAIMED. Reads public.items only - never private evidence.';

-- A user session may generate for its own listing (the triggers cover the normal
-- path; this allows an explicit retry after a failed run, §125).
revoke execute on function public.generate_matches(uuid) from public, anon;
grant execute on function public.generate_matches(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 15. Automatic matching (docs/matchingEngine.md §4, §88, §124, task §26)
-- ---------------------------------------------------------------------------
-- An AFTER trigger on `items` — the least risky of the documented options (task
-- §26) and the one that needs no worker or queue: the match runs in the same
-- transaction as the listing write, so it cannot be lost, and nothing extra has
-- to be deployed.
--
-- MATCHING FAILURE IS NON-FATAL TO THE LISTING (§124, task §25). The call is
-- wrapped in an exception block: if generation raises for any reason, the listing
-- INSERT or UPDATE still commits and the error is reported as a WARNING. A
-- recommendation engine must never be able to stop someone reporting a lost item.
-- The listing remains ACTIVE and generate_matches() can be retried (§125).
--
-- Only MATCH-RELEVANT field changes re-run matching (§4, §89, task §10). The
-- UPDATE trigger's column list is the documented relevant set, and the WHEN
-- clause re-checks the values so a no-op write (saving a form without changing a
-- matching field) does no work.

create or replace function public.trigger_generate_matches()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  begin
    perform public.generate_matches(new.id);
  exception
    when others then
      -- Keep diagnostics free of error text: SQLERRM can contain row data.
      raise warning 'Matching retry required for listing %, SQLSTATE %', new.id, sqlstate;
  end;
  return null; -- AFTER trigger; the return value is ignored.
end;
$fn$;

comment on function public.trigger_generate_matches() is
  'AFTER-trigger bridge to generate_matches(). Swallows matching errors as warnings so a listing write never fails because matching failed (docs/matchingEngine.md §124).';

revoke execute on function public.trigger_generate_matches() from public, anon, authenticated;

-- Flow A and Flow B both land here: a new LOST searches FOUND, a new FOUND
-- searches LOST, through the one function (task §9).
drop trigger if exists items_generate_matches_on_insert on public.items;
create trigger items_generate_matches_on_insert
  after insert on public.items
  for each row
  when (new.status = 'ACTIVE')
  execute function public.trigger_generate_matches();

-- The relevant-field set from docs/matchingEngine.md §4, plus `status` so a
-- close/cancel/return expires this item's matches immediately (§90).
-- listing_type is included for completeness although protect_item_fields()
-- already makes it immutable.
drop trigger if exists items_generate_matches_on_update on public.items;
create trigger items_generate_matches_on_update
  after update of
    listing_type, category, brand, color, title, description,
    event_date, event_time, location_text, latitude, longitude, status
  on public.items
  for each row
  when (
    old.listing_type   is distinct from new.listing_type
    or old.category    is distinct from new.category
    or old.brand       is distinct from new.brand
    or old.color       is distinct from new.color
    or old.title       is distinct from new.title
    or old.description is distinct from new.description
    or old.event_date  is distinct from new.event_date
    or old.event_time  is distinct from new.event_time
    or old.location_text is distinct from new.location_text
    or old.latitude    is distinct from new.latitude
    or old.longitude   is distinct from new.longitude
    or old.status      is distinct from new.status
  )
  execute function public.trigger_generate_matches();

-- ---------------------------------------------------------------------------
-- 16. dismiss_match() / restore_match() (docs/apiAndDataContracts.md §36, §37)
-- ---------------------------------------------------------------------------
-- The documented RPC name and input, with the Phase 4 per-user semantics: it
-- writes match_dismissals, NOT matches.status.
--
-- SECURITY INVOKER, so the match_dismissals INSERT policy does the authorization
-- — the caller must be a real participant and can only write their own row. The
-- function is the ergonomic surface, not a privilege escalation.

create or replace function public.dismiss_match(p_match_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  -- An explicit participation check so a non-participant gets a clean "not found"
  -- rather than an RLS policy violation, and learns nothing about whether the
  -- match exists.
  if not public.user_participates_in_match(p_match_id) then
    raise exception 'Match not found' using errcode = 'P0002';
  end if;

  -- Idempotent: dismissing twice is success, not a conflict.
  insert into public.match_dismissals (match_id, user_id)
  values (p_match_id, caller)
  on conflict (match_id, user_id) do nothing;

  -- The documented response shape (§37). "DISMISSED" here describes THIS USER's
  -- view of the match, not the shared row's status column, which is untouched.
  return jsonb_build_object('matchId', p_match_id, 'status', 'DISMISSED');
end;
$fn$;

comment on function public.dismiss_match(uuid) is
  'Hides a match for the CALLING user only by writing match_dismissals. Never sets matches.status, so the other participant still sees the pair (Phase 4 refinement of docs/matchingEngine.md §54). Idempotent.';

revoke execute on function public.dismiss_match(uuid) from public, anon;
grant execute on function public.dismiss_match(uuid) to authenticated;

create or replace function public.restore_match(p_match_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  -- The DELETE policy already restricts this to the caller's own row; the
  -- predicate is repeated as defence in depth.
  delete from public.match_dismissals d
  where d.match_id = p_match_id
    and d.user_id = caller;

  return jsonb_build_object('matchId', p_match_id, 'status', 'ACTIVE');
end;
$fn$;

comment on function public.restore_match(uuid) is
  'Undoes the calling user''s own dismissal. Affects only that user''s view.';

revoke execute on function public.restore_match(uuid) from public, anon;
grant execute on function public.restore_match(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 17. Match signals (docs/matchingEngine.md §59, §113, task §31)
-- ---------------------------------------------------------------------------
-- The public-safe explanation. Derived purely from the component scores that are
-- already stored, so it cannot reference a private detail even accidentally: the
-- component scores themselves were computed from public fields only.
--
-- Deliberately NOT included: exact distance, exact coordinates, serial fragments,
-- private notes, verification questions or answers (§60, §111). "Found near your
-- reported area" is a band, not a number.

create or replace function public.match_signals(
  p_category_score numeric,
  p_location_score numeric,
  p_time_score numeric,
  p_description_score numeric
)
returns text[]
language sql
immutable
parallel safe
set search_path = ''
as $fn$
  select array_remove(array[
    -- Each threshold is "this signal genuinely agrees", not merely "present".
    case when p_category_score    >= 80 then 'CATEGORY'    end,
    case when p_location_score    >= 65 then 'LOCATION'    end,
    case when p_time_score        >= 70 then 'DATE'        end,
    case when p_description_score >= 60 then 'DESCRIPTION' end
  ], null);
$fn$;

comment on function public.match_signals(numeric, numeric, numeric, numeric) is
  'Public-safe matched-signal labels derived from component scores (docs/apiAndDataContracts.md §34, docs/matchingEngine.md §113). Carries no distance, coordinate or private detail.';

grant execute on function public.match_signals(numeric, numeric, numeric, numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- 18. get_my_matches() — the Matches screen read
-- ---------------------------------------------------------------------------
-- Returns the caller's matches with the OTHER side's public-safe listing fields
-- flattened in, so the UI needs one round trip rather than a match query plus an
-- item query per row (skill: supabase-postgres-best-practices, data-n-plus-one).
--
-- PRIVACY, structurally (task §30, §14):
--   * The return type HAS NO latitude/longitude column. Not filtered out in the
--     body — absent from the signature, so no argument and no caller can obtain
--     one, exactly as public_items_view does it for Explore.
--   * No distance is returned either, since a precise distance between two
--     private coordinates is itself a location disclosure.
--   * The private-evidence tables are not joined. They are not in this query.
--   * Only the rows the caller participates in are considered, and the caller's
--     own side is never disclosed as "the other listing".
--
-- SECURITY DEFINER for the same reason as get_my_item_detail(): `authenticated`
-- holds only a column-level SELECT grant on `items` and none at all on the
-- coordinate columns this function must read to... in fact it reads no coordinate
-- at all, but it does read `items` rows belonging to the OTHER participant, which
-- the items SELECT policy admits only for discoverable statuses. Running as
-- definer with an explicit participation predicate keeps the authorization
-- explicit and the plan a simple indexed join.

create or replace function public.get_my_matches(
  p_strength text default null,
  p_include_dismissed boolean default false,
  p_limit integer default null,
  p_item_id uuid default null
)
returns table (
  id uuid,
  lost_item_id uuid,
  found_item_id uuid,
  overall_score numeric,
  category_score numeric,
  location_score numeric,
  time_score numeric,
  description_score numeric,
  strength text,
  status public.match_status,
  matched_signals text[],
  is_dismissed boolean,
  created_at timestamptz,
  updated_at timestamptz,
  -- The side the caller does NOT own: the listing they are being shown.
  other_item_id uuid,
  other_listing_type public.listing_type,
  other_title varchar(120),
  other_category text,
  other_brand varchar(120),
  other_color varchar(80),
  other_description text,
  other_event_date date,
  other_event_time time,
  other_location_text varchar(255),
  other_status public.listing_status,
  other_user_id uuid,
  -- Which of the caller's own listings produced this match, for grouping.
  my_item_id uuid,
  my_item_title varchar(120)
)
language sql
stable
security definer
set search_path = ''
as $fn$
  with cfg as (
    select
      (public.matching_config() ->> 'display_threshold')::numeric as display_threshold,
      (public.matching_config() ->> 'max_results')::integer as max_results
  ),
  caller as (select (select auth.uid()) as uid),
  mine as (
    select
      m.*,
      lost.user_id  as lost_user_id,
      found.user_id as found_user_id
    from public.matches m
    join public.items lost  on lost.id  = m.lost_item_id
    join public.items found on found.id = m.found_item_id
    cross join caller c
    where c.uid is not null
      and (lost.user_id = c.uid or found.user_id = c.uid)
      and lost.status = 'ACTIVE' and found.status = 'ACTIVE'
      and (p_item_id is null
        or (lost.id = p_item_id and lost.user_id = c.uid)
        or (found.id = p_item_id and found.user_id = c.uid))
  )
  select
    m.id,
    m.lost_item_id,
    m.found_item_id,
    m.overall_score,
    m.category_score,
    m.location_score,
    m.time_score,
    m.description_score,
    public.match_strength(m.overall_score) as strength,
    m.status,
    public.match_signals(m.category_score, m.location_score, m.time_score, m.description_score)
      as matched_signals,
    (d.match_id is not null) as is_dismissed,
    m.created_at,
    m.updated_at,
    other.id,
    other.listing_type,
    other.title,
    other.category,
    other.brand,
    other.color,
    other.description,
    other.event_date,
    other.event_time,
    other.location_text,
    other.status,
    other.user_id,
    own.id,
    own.title
  from mine m
  cross join caller c
  cross join cfg
  -- The other side is whichever one the caller does not own. When the caller owns
  -- BOTH sides this cannot arise: generate_matches() never pairs a user's own two
  -- listings.
  join public.items other
    on other.id = case when m.lost_user_id = c.uid then m.found_item_id else m.lost_item_id end
  join public.items own
    on own.id = case when m.lost_user_id = c.uid then m.lost_item_id else m.found_item_id end
  left join public.match_dismissals d
    on d.match_id = m.id and d.user_id = c.uid
  where
    -- Display threshold (§40, task §22): below 60 is not shown proactively.
    m.overall_score >= cfg.display_threshold
    -- EXPIRED and CLAIMED rows are history, not the active board. Phase 4 only
    -- ever produces ACTIVE and EXPIRED.
    and m.status = 'ACTIVE'
    -- A dismissal hides the match for THIS user only — the filter is on the
    -- caller's own dismissal row, so the other participant is unaffected.
    and (p_include_dismissed or d.match_id is null)
    and (
      p_strength is null
      or public.match_strength(m.overall_score) = upper(btrim(p_strength))
    )
  -- Ranking (§43): score first, then deterministic tie-breakers so paging and
  -- repeated reads are stable.
  order by m.overall_score desc, m.created_at desc, m.id
  -- Bounded (§44, task §44). The configured maximum is also the hard ceiling, so
  -- a client cannot ask for hundreds.
  limit greatest(0, least(coalesce(p_limit, (select max_results from cfg)), (select max_results from cfg)));
$fn$;

comment on function public.get_my_matches(text, boolean, integer, uuid) is
  'The caller''s ranked matches at or above the display threshold, with the other side''s public-safe listing fields. The return type has no coordinate or distance column, and no private-evidence table is joined. Excludes the caller''s own dismissals unless asked (docs/matchingEngine.md §40, §43, §44, §112).';

revoke execute on function public.get_my_matches(text, boolean, integer, uuid) from public, anon;
grant execute on function public.get_my_matches(text, boolean, integer, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 19. get_matches_for_item() — the listing-detail read
-- ---------------------------------------------------------------------------
-- The same projection narrowed to one of the caller's own listings, for the
-- listing detail screen's possible-match section (task §37). Ownership of the
-- subject item is required: a user cannot enumerate the matches of a listing they
-- do not own, even one that is publicly discoverable.

create or replace function public.get_matches_for_item(
  p_item_id uuid,
  p_limit integer default null
)
returns table (
  id uuid,
  lost_item_id uuid,
  found_item_id uuid,
  overall_score numeric,
  category_score numeric,
  location_score numeric,
  time_score numeric,
  description_score numeric,
  strength text,
  status public.match_status,
  matched_signals text[],
  is_dismissed boolean,
  created_at timestamptz,
  updated_at timestamptz,
  other_item_id uuid,
  other_listing_type public.listing_type,
  other_title varchar(120),
  other_category text,
  other_brand varchar(120),
  other_color varchar(80),
  other_description text,
  other_event_date date,
  other_event_time time,
  other_location_text varchar(255),
  other_status public.listing_status,
  other_user_id uuid,
  my_item_id uuid,
  my_item_title varchar(120)
)
language sql
stable
security definer
set search_path = ''
as $fn$
  select m.*
  from public.get_my_matches(null, false, p_limit, p_item_id) m
  where m.my_item_id = p_item_id
    -- Redundant with get_my_matches()'s own participation filter, but explicit:
    -- the subject must be the caller's listing.
    and exists (
      select 1 from public.items i
      where i.id = p_item_id and i.user_id = (select auth.uid())
    );
$fn$;

comment on function public.get_matches_for_item(uuid, integer) is
  'The caller''s matches for ONE of their own listings, same public-safe projection as get_my_matches(). Requires ownership of the subject listing.';

revoke execute on function public.get_matches_for_item(uuid, integer) from public, anon;
grant execute on function public.get_matches_for_item(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 20. Table grants — the write boundary (task §29)
-- ---------------------------------------------------------------------------
-- `authenticated` gets SELECT on `matches` and nothing else. No INSERT, no
-- UPDATE, no DELETE — so even if a write policy were added by mistake later, the
-- privilege check still denies a client write. Combined with §12 (no write
-- policy) and the SECURITY DEFINER generator, the browser cannot set
-- overall_score, any component score, either item id, or the global status
-- (docs/authAndRls.md §68, docs/securityAndService.md §66).
revoke all on public.matches from anon, authenticated;
grant select on public.matches to authenticated;

-- match_dismissals is the one match-related table a client legitimately writes,
-- and only its own rows, as the policies above enforce. No UPDATE: there is
-- nothing to change on a row that is entirely key plus timestamp.
revoke all on public.match_dismissals from anon, authenticated;
grant select, insert, delete on public.match_dismissals to authenticated;

-- ---------------------------------------------------------------------------
-- 21. Function ACLs for the scoring helpers (least privilege)
-- ---------------------------------------------------------------------------
-- Postgres grants EXECUTE on a new function to PUBLIC by default, and Supabase
-- adds `anon` through schema default privileges. These helpers are pure functions
-- over caller-supplied arguments — they read no table and therefore disclose
-- nothing — but the matching surface is authenticated-only (docs/authAndRls.md
-- §105), and leaving stray anon grants is exactly the drift the Phase 3
-- corrective migration (20261008090000) had to clean up. Revoked here at the
-- point of creation instead.
--
-- `authenticated` keeps EXECUTE because get_my_matches() and the UI-facing
-- surfaces call match_strength()/match_signals(), and because a client may
-- legitimately read the configured thresholds to label a score.

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.matching_config()',
    'public.category_compatibility_map()',
    'public.matching_synonyms()',
    'public.matching_stopwords()',
    'public.normalize_matching_text(text)',
    'public.matching_tokens(text)',
    'public.match_category_score(text, text)',
    'public.match_date_score(date, date)',
    'public.match_time_proximity_score(time, time)',
    'public.match_time_score(date, time, date, time)',
    'public.haversine_km(double precision, double precision, double precision, double precision)',
    'public.match_location_score_from_km(double precision)',
    'public.match_location_score(double precision, double precision, text, double precision, double precision, text)',
    'public.token_overlap_score(text, text)',
    'public.match_attribute_score(text, text)',
    'public.match_description_score(text, text, text, text, text, text, text, text)',
    'public.match_overall_score(numeric, numeric, numeric, numeric)',
    'public.match_strength(numeric)',
    'public.match_signals(numeric, numeric, numeric, numeric)'
  ]
  loop
    execute format('revoke execute on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated, service_role', fn);
  end loop;
end $$;
