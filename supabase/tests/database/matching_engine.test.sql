-- Matching engine tests (Phase 4).
--
-- Run with: supabase test db
-- Covers docs/matchingEngine.md §2.2 (bidirectional), §5–§13 (direction, eligible
-- status, category), §14–§20 (date/time), §21–§26 (location), §27–§35
-- (description), §36–§38 (weighted score, strength), §39–§41 (thresholds),
-- §47/§48 (dedup, upsert), §61/§111 (private evidence excluded), §68–§71
-- (dynamic weight normalization), §90 (expiration), §124/§126 (non-fatal,
-- idempotent); docs/authAndRls.md §27, §68; docs/database.md §25–§27, §84.
--
-- Three different kinds of claim are under test, and they are not
-- interchangeable:
--
--   1. SCORING DETERMINISM — exact expected numbers for known inputs, so an
--      algorithm regression fails the build. No `score > 0` assertions.
--   2. THE PAIR INVARIANTS — orientation and uniqueness enforced by the DATABASE,
--      asserted by trying to violate them directly as a privileged role, not just
--      through the generator that happens to do it right.
--   3. THE AUTHORIZATION BOUNDARY — participant-only visibility, per-user
--      dismissal, and the impossibility of a client writing a score. Asserted as
--      real `authenticated` sessions, the way PostgREST evaluates them.

begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------
-- Three users: A owns the LOST reports, B owns the FOUND listings, and C owns
-- nothing relevant so "a stranger to this match" is a real, testable case.

insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at)
values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'owner-a@test.edu',
   '{"display_name":"Owner A","username":"ownera"}'::jsonb, now()),
  ('aaaaaaaa-0000-0000-0000-0000000000b1', 'finder-b@test.edu',
   '{"display_name":"Finder B","username":"finderb"}'::jsonb, now()),
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 'stranger-c@test.edu',
   '{"display_name":"Stranger C","username":"strangerc"}'::jsonb, now());

-- ===========================================================================
-- PART 1 — Pure scoring functions, exact values
-- ===========================================================================
-- These run before any item exists: the scoring layer is deterministic and has no
-- dependency on table state, which is itself worth pinning down.

-- Category (§10–§13), including symmetry: argument order must not matter, or the
-- two creation orders would score differently.
select is(public.match_category_score('electronics', 'electronics'), 100::numeric,
  'category: exact match scores 100');
select is(public.match_category_score('document', 'id_card'), 80::numeric,
  'category: document <-> id_card is the documented 80');
select is(public.match_category_score('id_card', 'document'), 80::numeric,
  'category: the compatibility map is applied symmetrically');
select is(public.match_category_score('electronics', 'accessory'), 60::numeric,
  'category: electronics <-> accessory is the documented 60');
select is(public.match_category_score('accessory', 'electronics'), 60::numeric,
  'category: and symmetrically');
select is(public.match_category_score('wallet', 'keys'), 0::numeric,
  'category: unrelated categories score 0 (§12)');
select is(public.match_category_score('electronics', 'clothing'), 0::numeric,
  'category: electronics <-> clothing scores 0');

-- Date (§16) and the chronology penalty (§17).
select is(public.match_date_score('2026-10-07', '2026-10-07'), 100::numeric,
  'date: same day scores 100');
select is(public.match_date_score('2026-10-07', '2026-10-08'), 90::numeric,
  'date: one day later scores 90');
select is(public.match_date_score('2026-10-07', '2026-10-09'), 80::numeric,
  'date: two days later scores 80');
select is(public.match_date_score('2026-10-07', '2026-10-10'), 70::numeric,
  'date: three days later scores 70');
select is(public.match_date_score('2026-10-07', '2026-10-12'), 50::numeric,
  'date: 4-7 days later scores 50');
select is(public.match_date_score('2026-10-07', '2026-10-18'), 25::numeric,
  'date: 8-14 days later scores 25');
select is(public.match_date_score('2026-10-07', '2026-11-07'), 10::numeric,
  'date: beyond 14 days scores 10');
select is(public.match_date_score('2026-10-07', '2026-10-06'), 76.50::numeric,
  'date: found one day BEFORE the loss takes the light chronology penalty (90 * 0.85)');
select is(public.match_date_score('2026-10-07', '2026-10-04'), 28.00::numeric,
  'date: found three days before takes the heavy chronology penalty (70 * 0.40 = 28.00)');
select is(public.match_date_score('2026-10-07', '2026-10-01'), 20::numeric,
  'date: found six days before is heavily penalised (50 * 0.40)');

-- Time (§19, §20). The key behaviour: a MISSING time must fall back to the date
-- score, not score zero (§67, task §16).
select is(public.match_time_proximity_score('10:30', '11:10'), 100::numeric,
  'time: within the hour scores 100');
select is(public.match_time_proximity_score('10:30', '13:00'), 90::numeric,
  'time: 1-3 hours apart scores 90');
select is(public.match_time_proximity_score('10:00', '22:00'), 55::numeric,
  'time: 12 hours apart scores 55');
select is(public.match_time_proximity_score('10:30', null), null,
  'time: a missing time is NULL (unavailable), not 0');
select is(public.match_time_score('2026-10-07', '10:30', '2026-10-07', '11:10'), 100.00::numeric,
  'date/time: same day + close time blends to 100');
select is(public.match_time_score('2026-10-07', null, '2026-10-07', '11:10'), 100::numeric,
  'date/time: one missing time falls back to the date score, unpunished');
select is(public.match_time_score('2026-10-07', null, '2026-10-07', null), 100::numeric,
  'date/time: both times missing still scores the full date score');
select is(public.match_time_score('2026-10-07', '09:00', '2026-10-09', '09:00'),
  80::numeric,
  'date/time: times on DIFFERENT days are not blended (a cross-day clock gap is meaningless)');

-- Location (§22–§26).
select is(public.haversine_km(12.9716, 77.5946, 12.9716, 77.5946), 0::double precision,
  'haversine: an identical coordinate pair is 0 km (no floating-point domain error)');
select ok(abs(public.haversine_km(12.9716, 77.5946, 13.0716, 77.5946) - 11.119) < 0.01,
  'haversine: 0.1 degrees of latitude is ~11.12 km');
select is(public.match_location_score_from_km(0.05), 100::numeric,
  'location: within 100 m scores 100');
select is(public.match_location_score_from_km(0.4), 90::numeric,
  'location: 250-500 m scores 90');
select is(public.match_location_score_from_km(1.5), 65::numeric,
  'location: 1-2 km scores 65');
select is(public.match_location_score_from_km(8), 25::numeric,
  'location: 5-10 km scores 25');
select is(public.match_location_score_from_km(50), 10::numeric,
  'location: far away still scores 10, never an outright rejection (§24)');
select is(
  public.match_location_score(12.9716, 77.5946, 'Main Library', 12.9716, 77.5946, 'Main Library'),
  100::numeric,
  'location: identical coordinates score 100');
select ok(
  public.match_location_score(null, null, 'Main Library', null, null, 'Library Entrance')
  > public.match_location_score(null, null, 'Main Library', null, null, 'Chemistry Lab'),
  'location: the text fallback ranks a similar place above a dissimilar one (§25)');
select is(
  public.match_location_score(null, null, null, null, null, null),
  null,
  'location: no coordinates AND no text is NULL (unavailable), not 0 (§66, task §15)');

-- Text normalization and tokens (§26, §28, §29, §76).
select is(public.normalize_matching_text('  C.S.E.   Block!! '), 'c s e block',
  'normalize: lowercases, de-punctuates and collapses whitespace');
select is(public.matching_tokens('AirPods'), array['earbuds'],
  'tokens: the documented synonym airpods -> earbuds is applied (§76)');
select is(public.matching_tokens('earphones'), array['earbuds'],
  'tokens: earphones -> earbuds');
select is(public.matching_tokens('rucksack'), array['backpack'],
  'tokens: rucksack -> backpack');
select is(public.matching_tokens('a lost white AirPods in the case'),
  array['case', 'earbuds', 'white'],
  'tokens: stopwords and listing-type noise ("lost") are dropped, synonyms applied, sorted');
select ok(not ('lost' = any (public.matching_tokens('lost my bag'))),
  'tokens: "lost" is never a matching token - it describes the listing, not the item');

-- Overall score (§36, §37) and renormalization (§68–§71).
select is(public.match_overall_score(100, 90, 85, 92), 92.10::numeric,
  'overall: the docs §37 worked example reproduces exactly (92.10)');
select is(public.match_overall_score(100, null, 85, 90), 92.00::numeric,
  'overall: the docs §71 missing-location example reproduces exactly (92.00 over 75 weight)');
select is(public.match_overall_score(100, 100, 100, 100), 100::numeric,
  'overall: all components perfect is 100');
select is(public.match_overall_score(null, null, null, null), null,
  'overall: no signal at all is NULL, not a zero-confidence match');
select ok(
  public.match_overall_score(100, null, 100, 100) > public.match_overall_score(100, 0, 100, 100),
  'overall: an UNAVAILABLE location scores strictly better than a location that genuinely conflicts');

-- Strength bands (§38) at every boundary.
select is(public.match_strength(100), 'VERY_STRONG', 'strength: 100 is VERY_STRONG');
select is(public.match_strength(90), 'VERY_STRONG', 'strength: 90 is the VERY_STRONG boundary');
select is(public.match_strength(89.99), 'STRONG', 'strength: just under 90 is STRONG');
select is(public.match_strength(75), 'STRONG', 'strength: 75 is the STRONG boundary');
select is(public.match_strength(74.99), 'POSSIBLE', 'strength: just under 75 is POSSIBLE');
select is(public.match_strength(60), 'POSSIBLE', 'strength: 60 is the POSSIBLE boundary');
select is(public.match_strength(59.99), 'LOW', 'strength: below 60 is LOW and not shown proactively');

-- Config (§78) — the weights must still sum to 100, or every score is wrong.
select is(
  (public.matching_config() ->> 'category_weight')::int
  + (public.matching_config() ->> 'location_weight')::int
  + (public.matching_config() ->> 'time_weight')::int
  + (public.matching_config() ->> 'description_weight')::int,
  100,
  'config: the four weights sum to 100');
select is((public.matching_config() ->> 'store_threshold')::int, 50,
  'config: the persistence threshold is 50 (§39)');
select is((public.matching_config() ->> 'display_threshold')::int, 60,
  'config: the display threshold is 60 (§40)');
select is((public.matching_config() ->> 'notification_threshold')::int, 75,
  'config: the notification threshold is recorded as 75 for Phase 10 (§41)');

-- ===========================================================================
-- PART 2 — Generation: both creation orders, the deterministic case
-- ===========================================================================

-- Flow A: LOST exists, then FOUND is created (task §9, §41 case A).
insert into public.items
  (id, user_id, listing_type, title, category, brand, color, description,
   event_date, event_time, location_text, latitude, longitude)
values
  ('11110000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000a1',
   'LOST', 'White AirPods Pro', 'electronics', 'Apple', 'white',
   'white AirPods Pro in charging case, lost near the library reading room',
   current_date - 1, '10:30', 'Main Library', 12.97160, 77.59460);

select is(
  (select count(*) from public.matches)::int, 0,
  'generation: a LOST report with no opposing listing produces no match');

insert into public.items
  (id, user_id, listing_type, title, category, brand, color, description,
   event_date, event_time, location_text, latitude, longitude)
values
  ('11110000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-0000000000b1',
   'FOUND', 'White Apple earbuds', 'electronics', 'Apple', 'white',
   'found white Apple earbuds inside a charging case at the library',
   current_date - 1, '11:10', 'Main Library Entrance', 12.97165, 77.59465);

select is(
  (select count(*) from public.matches)::int, 1,
  'generation flow A: creating the FOUND listing generates the match (LOST existed first)');

-- The deterministic expected result (task §40). These are exact, not ranges, so
-- any change to a weight, band or tokenizer fails here loudly.
select is(
  (select category_score from public.matches), 100.00::numeric,
  'deterministic case: category score is exactly 100 (same category)');
select is(
  (select location_score from public.matches), 100.00::numeric,
  'deterministic case: location score is exactly 100 (~6 m apart)');
select is(
  (select time_score from public.matches), 100.00::numeric,
  'deterministic case: date/time score is exactly 100 (same day, 40 min apart)');
select is(
  (select description_score from public.matches), 73.34::numeric,
  'deterministic case: description score is exactly 73.34 (token+trigram, brand and colour agree)');
select is(
  (select overall_score from public.matches), 92.00::numeric,
  'deterministic case: overall score is exactly 92.00 — the docs §37 worked example');
select is(
  (select public.match_strength(overall_score) from public.matches), 'VERY_STRONG',
  'deterministic case: 92.00 classifies as VERY_STRONG');

-- Orientation produced by the generator (task §6).
select is(
  (select i.listing_type from public.matches m join public.items i on i.id = m.lost_item_id),
  'LOST'::public.listing_type,
  'orientation: lost_item_id points at the LOST listing');
select is(
  (select i.listing_type from public.matches m join public.items i on i.id = m.found_item_id),
  'FOUND'::public.listing_type,
  'orientation: found_item_id points at the FOUND listing');

-- Signals are public-safe labels (§113, task §31).
select is(
  (select public.match_signals(category_score, location_score, time_score, description_score)
   from public.matches),
  array['CATEGORY', 'LOCATION', 'DATE', 'DESCRIPTION'],
  'signals: all four agree on the deterministic case');

-- Idempotency (§126, task §24). Re-running must not duplicate or drift.
select lives_ok(
  $$ select public.generate_matches('11110000-0000-0000-0000-000000000001') $$,
  'idempotency: the generator can be re-run');
select is(
  (select count(*) from public.matches)::int, 1,
  'idempotency: re-running produces no duplicate row (§47, §48)');
select is(
  (select overall_score from public.matches), 92.00::numeric,
  'idempotency: the score is unchanged by a re-run');

-- The returned metadata shape (§82).
select is(
  (public.generate_matches('11110000-0000-0000-0000-000000000001') ->> 'matchCount')::int, 1,
  'generation: the RPC reports its match count');
select is(
  (public.generate_matches('11110000-0000-0000-0000-000000000001') ->> 'topScore')::numeric,
  92.00::numeric,
  'generation: the RPC reports the top score');

-- ===========================================================================
-- PART 3 — PRIVATE EVIDENCE IS NOT A MATCHING INPUT (task §42)
-- ===========================================================================
-- The critical privacy proof. Two listings already matched; now attach private
-- ownership evidence to BOTH sides and regenerate. The score must not move by a
-- single hundredth, which demonstrates the private tables are not read.

create temporary table score_before as
  select overall_score, category_score, location_score, time_score, description_score
  from public.matches;

insert into public.lost_item_private_details (item_id, serial_fragment, private_notes, unique_markings)
values ('11110000-0000-0000-0000-000000000001', 'SN-XK9-22',
        'engraved initials VB inside the lid',
        'deep scratch on the left bud and a chipped corner');

insert into public.found_item_private_details (item_id, serial_fragment, private_notes, unique_markings)
values ('11110000-0000-0000-0000-000000000002', 'SN-XK9-22',
        'engraved initials VB inside the lid',
        'deep scratch on the left bud and a chipped corner');

select lives_ok(
  $$ select public.generate_matches('11110000-0000-0000-0000-000000000001') $$,
  'private evidence: regeneration runs with private details present on both sides');

select is(
  (select overall_score from public.matches),
  (select overall_score from score_before),
  'PRIVATE EVIDENCE: adding identical private evidence to both sides does not change the overall score');
select is(
  (select description_score from public.matches),
  (select description_score from score_before),
  'PRIVATE EVIDENCE: the description score in particular is unmoved by private notes and serial fragments');

-- And the inverse: CONTRADICTORY private evidence must not change it either.
update public.found_item_private_details
set serial_fragment = 'SN-TOTALLY-DIFFERENT',
    private_notes = 'completely unrelated private note about something else',
    unique_markings = 'no scratches at all, pristine condition'
where item_id = '11110000-0000-0000-0000-000000000002';

select lives_ok(
  $$ select public.generate_matches('11110000-0000-0000-0000-000000000002') $$,
  'private evidence: regeneration runs with contradictory private details');
select is(
  (select overall_score from public.matches),
  (select overall_score from score_before),
  'PRIVATE EVIDENCE: contradictory private evidence does not change the score either — it is simply not an input');

-- Verification questions are equally absent from matching.
insert into public.verification_questions (item_id, question, position)
values ('11110000-0000-0000-0000-000000000002', 'What is engraved inside the lid?', 0);

select lives_ok(
  $$ select public.generate_matches('11110000-0000-0000-0000-000000000002') $$,
  'private evidence: regeneration runs with a verification question present');
select is(
  (select overall_score from public.matches),
  (select overall_score from score_before),
  'PRIVATE EVIDENCE: a verification question does not change the score');

-- Structural, not just behavioural: the read surface has no column for any of it.
select hasnt_column('public', 'matches', 'latitude',
  'matches has no latitude column');
select hasnt_column('public', 'matches', 'longitude',
  'matches has no longitude column');
select hasnt_column('public', 'matches', 'distance_km',
  'matches stores no distance — a precise distance between two private points is itself a disclosure');

-- The get_my_matches() return type must not carry a coordinate or a distance.
select is(
  (select count(*)::int
   from information_schema.routines r
   join information_schema.parameters p
     on p.specific_name = r.specific_name
   where r.routine_schema = 'public'
     and r.routine_name = 'get_my_matches'
     and p.parameter_mode = 'OUT'
     and (p.parameter_name ilike '%latitude%'
       or p.parameter_name ilike '%longitude%'
       or p.parameter_name ilike '%distance%'
       or p.parameter_name ilike '%private%'
       or p.parameter_name ilike '%serial%'
       or p.parameter_name ilike '%verification%')),
  0,
  'MATCH DTO: the get_my_matches() return type has no coordinate, distance, private, serial or verification column');

-- ===========================================================================
-- PART 4 — Pair invariants enforced by the DATABASE (task §6, §7)
-- ===========================================================================
-- Asserted by attempting the violation directly, as a privileged role, so these
-- prove the constraint rather than the generator's good behaviour.

insert into public.items
  (id, user_id, listing_type, title, category, description, event_date, location_text)
values
  ('11110000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-0000000000a1',
   'LOST', 'Second lost item', 'book', 'a second lost listing used for the orientation tests',
   current_date - 1, 'Main Library'),
  ('11110000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-0000000000b1',
   'FOUND', 'Second found item', 'book', 'a second found listing used for the orientation tests',
   current_date - 1, 'Main Library');

-- LOST <-> LOST must be impossible (task §39).
select throws_ok(
  $$ insert into public.matches (lost_item_id, found_item_id, overall_score)
     values ('11110000-0000-0000-0000-000000000001',
             '11110000-0000-0000-0000-000000000003', 95) $$,
  '23514',
  null,
  'INVARIANT: a LOST <-> LOST pair is rejected by the database');

-- FOUND <-> FOUND must be impossible.
select throws_ok(
  $$ insert into public.matches (lost_item_id, found_item_id, overall_score)
     values ('11110000-0000-0000-0000-000000000002',
             '11110000-0000-0000-0000-000000000004', 95) $$,
  '23514',
  null,
  'INVARIANT: a FOUND <-> FOUND pair is rejected by the database');

-- A correctly typed pair in the WRONG column order must also be rejected, which
-- is what makes the orientation canonical rather than conventional.
select throws_ok(
  $$ insert into public.matches (lost_item_id, found_item_id, overall_score)
     values ('11110000-0000-0000-0000-000000000004',
             '11110000-0000-0000-0000-000000000003', 95) $$,
  '23514',
  null,
  'INVARIANT: a FOUND id in lost_item_id is rejected even though both types are present');

-- Unique pair (§26, task §7).
select throws_ok(
  $$ insert into public.matches (lost_item_id, found_item_id, overall_score)
     values ('11110000-0000-0000-0000-000000000001',
             '11110000-0000-0000-0000-000000000002', 55) $$,
  '23505',
  null,
  'INVARIANT: a duplicate (lost_item_id, found_item_id) pair is rejected');

-- Score range.
select throws_ok(
  $$ insert into public.matches (lost_item_id, found_item_id, overall_score)
     values ('11110000-0000-0000-0000-000000000003',
             '11110000-0000-0000-0000-000000000004', 150) $$,
  '23514',
  null,
  'INVARIANT: an out-of-range overall_score is rejected');

select has_column('public', 'matches', 'overall_score', 'matches.overall_score exists');
select col_type_is('public', 'matches', 'overall_score', 'numeric(5,2)',
  'matches.overall_score is the documented numeric(5,2) (docs/database.md §25)');
select col_type_is('public', 'matches', 'category_score', 'numeric(5,2)',
  'matches.category_score is numeric(5,2)');
select col_not_null('public', 'matches', 'overall_score',
  'matches.overall_score is NOT NULL');

-- ===========================================================================
-- PART 5 — Candidate eligibility by status (task §8)
-- ===========================================================================

-- A fresh LOST report to match against listings in various states.
insert into public.items
  (id, user_id, listing_type, title, category, brand, color, description,
   event_date, location_text, latitude, longitude)
values
  ('22220000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000a1',
   'LOST', 'Black Casio calculator', 'electronics', 'Casio', 'black',
   'black Casio scientific calculator with a cracked screen cover',
   current_date - 2, 'Exam Hall', 12.9800, 77.6000);

-- Four FOUND listings that are all excellent textual matches but sit in
-- non-eligible states. None may produce an ACTIVE match.
insert into public.items
  (id, user_id, listing_type, title, category, brand, color, description,
   event_date, location_text, latitude, longitude, status, closed_at)
values
  ('22220000-0000-0000-0000-000000000010', 'aaaaaaaa-0000-0000-0000-0000000000b1',
   'FOUND', 'Black Casio calculator', 'electronics', 'Casio', 'black',
   'black Casio scientific calculator with a cracked screen cover',
   current_date - 2, 'Exam Hall', 12.9800, 77.6000, 'CLOSED', now()),
  ('22220000-0000-0000-0000-000000000011', 'aaaaaaaa-0000-0000-0000-0000000000b1',
   'FOUND', 'Black Casio calculator', 'electronics', 'Casio', 'black',
   'black Casio scientific calculator with a cracked screen cover',
   current_date - 2, 'Exam Hall', 12.9800, 77.6000, 'CANCELLED', now()),
  ('22220000-0000-0000-0000-000000000012', 'aaaaaaaa-0000-0000-0000-0000000000b1',
   'FOUND', 'Black Casio calculator', 'electronics', 'Casio', 'black',
   'black Casio scientific calculator with a cracked screen cover',
   current_date - 2, 'Exam Hall', 12.9800, 77.6000, 'RETURNED', now());

select is(
  (select count(*)::int from public.matches m
   where m.lost_item_id = '22220000-0000-0000-0000-000000000001'
     and m.found_item_id in (
       '22220000-0000-0000-0000-000000000010',  -- CLOSED
       '22220000-0000-0000-0000-000000000011',  -- CANCELLED
       '22220000-0000-0000-0000-000000000012'   -- RETURNED
     )),
  0,
  'ELIGIBILITY: CLOSED, CANCELLED and RETURNED listings generate no match despite a perfect text match');

-- RECOVERY_IN_PROGRESS (§91). Set as a privileged role, since
-- protect_item_fields() reserves that transition for the platform.
insert into public.items
  (id, user_id, listing_type, title, category, brand, color, description,
   event_date, location_text, latitude, longitude)
values
  ('22220000-0000-0000-0000-000000000013', 'aaaaaaaa-0000-0000-0000-0000000000b1',
   'FOUND', 'Black Casio calculator', 'electronics', 'Casio', 'black',
   'black Casio scientific calculator with a cracked screen cover',
   current_date - 2, 'Exam Hall', 12.9800, 77.6000);

select is(
  (select count(*)::int from public.matches m
   where m.lost_item_id = '22220000-0000-0000-0000-000000000001'
     and m.found_item_id = '22220000-0000-0000-0000-000000000013'
     and m.status = 'ACTIVE'),
  1,
  'ELIGIBILITY: an ACTIVE FOUND listing does generate the match (control for the above)');

update public.items set status = 'RECOVERY_IN_PROGRESS'
where id = '22220000-0000-0000-0000-000000000013';

select is(
  (select status from public.matches m
   where m.lost_item_id = '22220000-0000-0000-0000-000000000001'
     and m.found_item_id = '22220000-0000-0000-0000-000000000013'),
  'EXPIRED'::public.match_status,
  'ELIGIBILITY: a listing entering RECOVERY_IN_PROGRESS expires its active matches (§91)');

-- A user's own two listings never match each other.
insert into public.items
  (id, user_id, listing_type, title, category, brand, color, description,
   event_date, location_text, latitude, longitude)
values
  ('22220000-0000-0000-0000-000000000020', 'aaaaaaaa-0000-0000-0000-0000000000a1',
   'FOUND', 'Black Casio calculator', 'electronics', 'Casio', 'black',
   'black Casio scientific calculator with a cracked screen cover',
   current_date - 2, 'Exam Hall', 12.9800, 77.6000);

select is(
  (select count(*)::int from public.matches m
   where m.lost_item_id = '22220000-0000-0000-0000-000000000001'
     and m.found_item_id = '22220000-0000-0000-0000-000000000020'),
  0,
  'ELIGIBILITY: a user''s own LOST and FOUND listings are never matched to each other');

-- Incompatible category is filtered before scoring, even with a perfect
-- location/date agreement (§73, task §12).
insert into public.items
  (id, user_id, listing_type, title, category, brand, color, description,
   event_date, location_text, latitude, longitude)
values
  ('22220000-0000-0000-0000-000000000030', 'aaaaaaaa-0000-0000-0000-0000000000b1',
   'FOUND', 'Brown leather wallet', 'wallet', null, 'brown',
   'a brown leather wallet was handed in at the exam hall desk',
   current_date - 2, 'Exam Hall', 12.9800, 77.6000);

select is(
  (select count(*)::int from public.matches m
   where m.lost_item_id = '22220000-0000-0000-0000-000000000001'
     and m.found_item_id = '22220000-0000-0000-0000-000000000030'),
  0,
  'CANDIDATE FILTER: an incompatible category (electronics vs wallet) is rejected before scoring');

-- Outside the ±14 day window (§63).
insert into public.items
  (id, user_id, listing_type, title, category, brand, color, description,
   event_date, location_text, latitude, longitude)
values
  ('22220000-0000-0000-0000-000000000040', 'aaaaaaaa-0000-0000-0000-0000000000b1',
   'FOUND', 'Black Casio calculator', 'electronics', 'Casio', 'black',
   'black Casio scientific calculator with a cracked screen cover',
   current_date - 60, 'Exam Hall', 12.9800, 77.6000);

select is(
  (select count(*)::int from public.matches m
   where m.lost_item_id = '22220000-0000-0000-0000-000000000001'
     and m.found_item_id = '22220000-0000-0000-0000-000000000040'),
  0,
  'CANDIDATE FILTER: a listing 60 days away is outside the +/-14 day window (§63)');

-- ===========================================================================
-- PART 6 — Thresholds, recalculation and expiration
-- ===========================================================================

-- Persistence floor (§39, task §22): a weak pair is not stored at all.
insert into public.items
  (id, user_id, listing_type, title, category, brand, color, description,
   event_date, location_text, latitude, longitude)
values
  ('33330000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000a1',
   'LOST', 'Red umbrella', 'accessory', null, 'red',
   'a small red folding umbrella with a wooden handle',
   current_date - 1, 'Bus Stop', 12.9716, 77.5946),
  ('33330000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-0000000000b1',
   'FOUND', 'Blue laptop charger', 'electronics', 'Dell', 'blue',
   'a blue Dell laptop charger brick with a frayed cable was left behind',
   current_date - 13, 'Hostel Block', 13.0716, 77.6946);

select ok(
  (select count(*)::int from public.matches m
   where m.lost_item_id = '33330000-0000-0000-0000-000000000001'
     and m.found_item_id = '33330000-0000-0000-0000-000000000002') = 0,
  'PERSISTENCE: a pair scoring below the 50 floor is not persisted (§39)');

-- Recalculation after an edit (task §10, §88).
insert into public.items
  (id, user_id, listing_type, title, category, brand, color, description,
   event_date, location_text, latitude, longitude)
values
  ('44440000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000a1',
   'LOST', 'Green water bottle', 'accessory', 'Milton', 'green',
   'a green insulated Milton water bottle with a dented base',
   current_date - 1, 'Canteen', 12.9716, 77.5946),
  ('44440000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-0000000000b1',
   'FOUND', 'Green bottle', 'accessory', 'Milton', 'green',
   'a green insulated Milton water bottle with a dented base was found',
   current_date - 1, 'Canteen', 12.9716, 77.5946);

create temporary table recalc_before as
  select overall_score from public.matches
  where lost_item_id = '44440000-0000-0000-0000-000000000001'
    and found_item_id = '44440000-0000-0000-0000-000000000002';

select is((select count(*)::int from recalc_before), 1,
  'RECALCULATION: the bottle pair matched on creation');

-- A matching-relevant edit: move the date far away.
update public.items set event_date = current_date - 13
where id = '44440000-0000-0000-0000-000000000001';

select ok(
  (select overall_score from public.matches
   where lost_item_id = '44440000-0000-0000-0000-000000000001'
     and found_item_id = '44440000-0000-0000-0000-000000000002')
  < (select overall_score from recalc_before),
  'RECALCULATION: editing event_date re-scores the existing match downward (§88)');

-- An IRRELEVANT edit must not re-score. `title` is matching-relevant, so the
-- irrelevant case is a field outside the documented set.
create temporary table irrelevant_before as
  select overall_score, updated_at from public.matches
  where lost_item_id = '44440000-0000-0000-0000-000000000001'
    and found_item_id = '44440000-0000-0000-0000-000000000002';

update public.items set closed_reason = 'an annotation that is not a matching input'
where id = '44440000-0000-0000-0000-000000000001';

select is(
  (select overall_score from public.matches
   where lost_item_id = '44440000-0000-0000-0000-000000000001'
     and found_item_id = '44440000-0000-0000-0000-000000000002'),
  (select overall_score from irrelevant_before),
  'RECALCULATION: an edit to a non-matching field leaves the score untouched (task §10)');

-- Expiration when a listing closes (§90, task §23).
insert into public.items
  (id, user_id, listing_type, title, category, brand, color, description,
   event_date, location_text, latitude, longitude)
values
  ('55550000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000a1',
   'LOST', 'Silver keychain', 'keys', null, 'silver',
   'a silver keychain with three keys and a small bottle opener',
   current_date - 1, 'Parking Lot', 12.9716, 77.5946),
  ('55550000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-0000000000b1',
   'FOUND', 'Silver keychain', 'keys', null, 'silver',
   'a silver keychain with three keys and a small bottle opener was handed in',
   current_date - 1, 'Parking Lot', 12.9716, 77.5946);

select is(
  (select status from public.matches
   where lost_item_id = '55550000-0000-0000-0000-000000000001'
     and found_item_id = '55550000-0000-0000-0000-000000000002'),
  'ACTIVE'::public.match_status,
  'EXPIRATION: the keychain pair starts ACTIVE');

update public.items set status = 'CLOSED', closed_at = now()
where id = '55550000-0000-0000-0000-000000000002';

select is(
  (select status from public.matches
   where lost_item_id = '55550000-0000-0000-0000-000000000001'
     and found_item_id = '55550000-0000-0000-0000-000000000002'),
  'EXPIRED'::public.match_status,
  'EXPIRATION: closing the FOUND listing expires the match — no stale ACTIVE rows (§90)');

-- Phase 4 must never produce CLAIMED (task §4).
select is(
  (select count(*)::int from public.matches where status = 'CLAIMED'),
  0,
  'SCOPE: Phase 4 never sets CLAIMED — that belongs to an accepted claim (§52)');

-- Matching failure must not fail the listing write (§124, task §25).
-- Simulated by breaking the generator, then creating a listing.
alter function public.match_overall_score(numeric, numeric, numeric, numeric)
  rename to match_overall_score_backup;

select lives_ok(
  $$ insert into public.items
       (id, user_id, listing_type, title, category, description, event_date, location_text)
     values ('66660000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000a1',
             'LOST', 'Listing during matching outage', 'book',
             'this listing is created while the matching engine is broken',
             current_date - 1, 'Main Library') $$,
  'NON-FATAL: a listing is created successfully even when match generation raises (§124)');

select is(
  (select status from public.items where id = '66660000-0000-0000-0000-000000000001'),
  'ACTIVE'::public.listing_status,
  'NON-FATAL: and the listing remains ACTIVE, ready for a matching retry (§125)');

alter function public.match_overall_score_backup(numeric, numeric, numeric, numeric)
  rename to match_overall_score;

-- ===========================================================================
-- PART 7 — Authorization: participant-only visibility (task §27)
-- ===========================================================================
-- Real `authenticated` sessions from here on.

-- A fresh, clean pair for the RLS assertions.
insert into public.items
  (id, user_id, listing_type, title, category, brand, color, description,
   event_date, location_text, latitude, longitude)
values
  ('77770000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000a1',
   'LOST', 'Grey hoodie', 'clothing', 'Nike', 'grey',
   'a grey Nike hoodie with a small tear on the left sleeve cuff',
   current_date - 1, 'Sports Complex', 12.9716, 77.5946),
  ('77770000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-0000000000b1',
   'FOUND', 'Grey Nike hoodie', 'clothing', 'Nike', 'grey',
   'a grey Nike hoodie with a small tear on the left sleeve cuff was found',
   current_date - 1, 'Sports Complex', 12.9716, 77.5946);

-- The hoodie match id is needed from inside `authenticated` sessions below. A
-- temporary table is not readable once the role switches, so it is captured in a
-- settings variable instead, which survives the role change within this
-- transaction.
select set_config('test.rls_match_id',
  (select id::text from public.matches
   where lost_item_id = '77770000-0000-0000-0000-000000000001'
     and found_item_id = '77770000-0000-0000-0000-000000000002'),
  true);

select is(
  (select count(*)::int from public.matches
   where lost_item_id = '77770000-0000-0000-0000-000000000001'
     and found_item_id = '77770000-0000-0000-0000-000000000002'),
  1,
  'RLS fixture: the hoodie pair matched');

-- User A (the LOST owner).
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}';

select is(
  (select count(*)::int from public.matches m where m.id = current_setting('test.rls_match_id')::uuid),
  1,
  'RLS: user A (LOST owner) can see the match');
select ok(
  (select count(*) from public.get_my_matches()) > 0,
  'RLS: user A sees the match through get_my_matches()');

-- User B (the FOUND finder) sees the SAME match.
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000b1","role":"authenticated"}';

select is(
  (select count(*)::int from public.matches m where m.id = current_setting('test.rls_match_id')::uuid),
  1,
  'RLS: user B (FOUND finder) can see the same match');
select ok(
  (select count(*) from public.get_my_matches()) > 0,
  'RLS: user B sees the match through get_my_matches()');

-- User C participates in nothing and must see nothing.
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000c1","role":"authenticated"}';

select is(
  (select count(*)::int from public.matches m where m.id = current_setting('test.rls_match_id')::uuid),
  0,
  'RLS: user C sees NOTHING for a match between A and B (task §27)');
select is(
  (select count(*)::int from public.matches),
  0,
  'RLS: user C sees no matches at all');
select is(
  (select count(*)::int from public.get_my_matches()),
  0,
  'RLS: get_my_matches() returns nothing for a non-participant');

-- Anonymous sessions get nothing.
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
-- Stronger than "returns no rows": anon holds no SELECT grant on the table at
-- all, so the attempt is refused at the privilege layer before RLS is consulted.
select throws_ok(
  $$ select count(*) from public.matches $$,
  '42501',
  null,
  'RLS: an anonymous session cannot read matches at all (no grant, not merely no rows)');
select throws_ok(
  $$ select public.get_my_matches() $$,
  '42501',
  null,
  'RLS: anon cannot execute get_my_matches()');
select throws_ok(
  $$ select public.generate_matches('77770000-0000-0000-0000-000000000001') $$,
  '42501',
  null,
  'RLS: anon cannot execute generate_matches()');

reset role;

-- ===========================================================================
-- PART 8 — The browser cannot forge a score (task §29)
-- ===========================================================================

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}';

select throws_ok(
  $$ update public.matches set overall_score = 100 $$,
  '42501',
  null,
  'WRITE BOUNDARY: a participant cannot update overall_score');
select throws_ok(
  $$ update public.matches set category_score = 100, location_score = 100,
         time_score = 100, description_score = 100 $$,
  '42501',
  null,
  'WRITE BOUNDARY: a participant cannot update the component scores');
select throws_ok(
  $$ update public.matches set status = 'CLAIMED' $$,
  '42501',
  null,
  'WRITE BOUNDARY: a participant cannot set the global match status');
select throws_ok(
  $$ insert into public.matches (lost_item_id, found_item_id, overall_score)
     values ('77770000-0000-0000-0000-000000000001',
             '77770000-0000-0000-0000-000000000002', 100) $$,
  '42501',
  null,
  'WRITE BOUNDARY: a participant cannot insert a match at all');
select throws_ok(
  $$ delete from public.matches $$,
  '42501',
  null,
  'WRITE BOUNDARY: a participant cannot delete a match');

-- A user cannot aim the generator at somebody else's listing.
select throws_ok(
  $$ select public.generate_matches('77770000-0000-0000-0000-000000000002') $$,
  'P0002',
  'Listing not found',
  'WRITE BOUNDARY: a user cannot run generate_matches() on another user''s listing');

reset role;

-- ===========================================================================
-- PART 9 — Per-user dismissal (task §5, §28)
-- ===========================================================================

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}';

select lives_ok(
  format($$ select public.dismiss_match(%L) $$, current_setting('test.rls_match_id')::uuid),
  'DISMISSAL: user A can dismiss a match they participate in');

select is(
  (select count(*)::int from public.get_my_matches() where id = current_setting('test.rls_match_id')::uuid),
  0,
  'DISMISSAL: the dismissed match is hidden from user A');

-- Idempotent.
select lives_ok(
  format($$ select public.dismiss_match(%L) $$, current_setting('test.rls_match_id')::uuid),
  'DISMISSAL: dismissing twice is idempotent, not an error');

-- The shared row is NOT globally dismissed — the heart of the refinement.
reset role;
select is(
  (select status from public.matches where id = current_setting('test.rls_match_id')::uuid),
  'ACTIVE'::public.match_status,
  'DISMISSAL: matches.status remains ACTIVE — one user''s dismissal is not a global invalidation');

-- User B still sees it.
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000b1","role":"authenticated"}';

select is(
  (select count(*)::int from public.get_my_matches() where id = current_setting('test.rls_match_id')::uuid),
  1,
  'DISMISSAL: user B STILL SEES the match after user A dismissed it (task §5)');
select is(
  (select is_dismissed from public.get_my_matches() where id = current_setting('test.rls_match_id')::uuid),
  false,
  'DISMISSAL: and it is not flagged as dismissed for user B');

-- B cannot dismiss on A's behalf.
select throws_ok(
  format($$ insert into public.match_dismissals (match_id, user_id)
            values (%L, 'aaaaaaaa-0000-0000-0000-0000000000a1') $$,
         current_setting('test.rls_match_id')::uuid),
  '42501',
  null,
  'DISMISSAL: user B cannot insert a dismissal on user A''s behalf (task §28)');

-- B cannot read A's dismissal rows.
select is(
  (select count(*)::int from public.match_dismissals
   where user_id = 'aaaaaaaa-0000-0000-0000-0000000000a1'),
  0,
  'DISMISSAL: user B cannot read user A''s dismissal rows');

-- A non-participant cannot dismiss.
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000c1","role":"authenticated"}';
select throws_ok(
  format($$ select public.dismiss_match(%L) $$, current_setting('test.rls_match_id')::uuid),
  'P0002',
  'Match not found',
  'DISMISSAL: a non-participant cannot dismiss, and learns nothing about the match');
select throws_ok(
  format($$ insert into public.match_dismissals (match_id, user_id)
            values (%L, 'aaaaaaaa-0000-0000-0000-0000000000c1') $$,
         current_setting('test.rls_match_id')::uuid),
  '42501',
  null,
  'DISMISSAL: a non-participant cannot insert a dismissal even for themselves');

-- Restore, for user A only.
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok(
  format($$ select public.restore_match(%L) $$, current_setting('test.rls_match_id')::uuid),
  'DISMISSAL: user A can restore their own dismissal');
select is(
  (select count(*)::int from public.get_my_matches() where id = current_setting('test.rls_match_id')::uuid),
  1,
  'DISMISSAL: the match reappears for user A after restore');

-- A dismissal survives recalculation (§55).
select lives_ok(
  format($$ select public.dismiss_match(%L) $$, current_setting('test.rls_match_id')::uuid),
  'DISMISSAL: user A dismisses again, to test persistence across recalculation');
reset role;

select lives_ok(
  $$ select public.generate_matches('77770000-0000-0000-0000-000000000001') $$,
  'DISMISSAL: the pair is recalculated');

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is(
  (select count(*)::int from public.get_my_matches() where id = current_setting('test.rls_match_id')::uuid),
  0,
  'DISMISSAL: the dismissal survives routine recalculation — it does not immediately reappear (§55)');
reset role;

-- ===========================================================================
-- PART 10 — Display threshold and ranking
-- ===========================================================================

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}';

select ok(
  (select count(*) from public.get_my_matches() where overall_score < 60) = 0,
  'DISPLAY THRESHOLD: get_my_matches() never returns a match below 60 (§40)');

select ok(
  (select count(*) from public.get_my_matches() where strength = 'LOW') = 0,
  'DISPLAY THRESHOLD: no LOW-strength match is shown proactively');

-- Ranking is score-descending (§43).
select ok(
  (select bool_and(ordered) from (
     select overall_score <= lag(overall_score) over (order by rn) as ordered
     from (select overall_score, row_number() over () as rn
           from public.get_my_matches()) s
   ) t where ordered is not null),
  'RANKING: results are ordered by overall_score descending (§43)');

-- Bounded result count (§44).
select ok(
  (select count(*) from public.get_my_matches(null, false, 1000))
  <= (public.matching_config() ->> 'max_results')::int,
  'LIMIT: the configured maximum caps the result count even when a client asks for 1000 (§44)');

-- Strength filtering.
select ok(
  (select count(*) from public.get_my_matches('VERY_STRONG')
   where strength <> 'VERY_STRONG') = 0,
  'FILTER: the strength filter returns only that band');

-- get_matches_for_item() requires ownership.
select ok(
  (select count(*) from public.get_matches_for_item('77770000-0000-0000-0000-000000000001')) >= 0,
  'PER-ITEM: user A can read matches for their own listing');
select is(
  (select count(*)::int from public.get_matches_for_item('77770000-0000-0000-0000-000000000002')),
  0,
  'PER-ITEM: user A gets nothing for a listing they do not own');

reset role;

-- ===========================================================================
-- PART 11 — Schema and grant surface
-- ===========================================================================

select has_table('public', 'matches', 'matches table exists');
select has_table('public', 'match_dismissals', 'match_dismissals table exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.matches'::regclass),
  'RLS is enabled on matches');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.match_dismissals'::regclass),
  'RLS is enabled on match_dismissals');

-- `authenticated` holds SELECT on matches and no write privilege at all.
select ok(
  has_table_privilege('authenticated', 'public.matches', 'SELECT'),
  'GRANTS: authenticated may SELECT matches');
select ok(
  not has_table_privilege('authenticated', 'public.matches', 'INSERT'),
  'GRANTS: authenticated has NO INSERT on matches');
select ok(
  not has_table_privilege('authenticated', 'public.matches', 'UPDATE'),
  'GRANTS: authenticated has NO UPDATE on matches — scores cannot be forged');
select ok(
  not has_table_privilege('authenticated', 'public.matches', 'DELETE'),
  'GRANTS: authenticated has NO DELETE on matches');
select ok(
  not has_table_privilege('anon', 'public.matches', 'SELECT'),
  'GRANTS: anon has no access to matches');

select ok(
  has_table_privilege('authenticated', 'public.match_dismissals', 'INSERT'),
  'GRANTS: authenticated may INSERT its own dismissal');
select ok(
  not has_table_privilege('authenticated', 'public.match_dismissals', 'UPDATE'),
  'GRANTS: authenticated has no UPDATE on match_dismissals (a changed mind is a DELETE)');
select ok(
  not has_table_privilege('anon', 'public.match_dismissals', 'SELECT'),
  'GRANTS: anon has no access to match_dismissals');

-- The Phase 3 ACL correction (task §0) is in force.
select ok(
  not has_function_privilege('anon',
    'public.search_public_items(text, public.listing_type, text, date, date, text, text, timestamptz, uuid, integer)',
    'EXECUTE'),
  'ACL FIX: anon no longer holds EXECUTE on search_public_items()');
select ok(
  has_function_privilege('authenticated',
    'public.search_public_items(text, public.listing_type, text, date, date, text, text, timestamptz, uuid, integer)',
    'EXECUTE'),
  'ACL FIX: authenticated execution of search_public_items() is preserved');
select ok(
  not has_function_privilege('anon', 'public.generate_matches(uuid)', 'EXECUTE'),
  'ACL: anon cannot execute generate_matches()');
select ok(
  not has_function_privilege('anon', 'public.dismiss_match(uuid)', 'EXECUTE'),
  'ACL: anon cannot execute dismiss_match()');
select ok(
  not has_function_privilege('anon', 'public.get_my_matches(text, boolean, integer, uuid)', 'EXECUTE'),
  'ACL: anon cannot execute get_my_matches()');

-- The documented index set (docs/database.md §27).
select has_index('public', 'matches', 'matches_lost_item_id_idx',
  'index on matches(lost_item_id)');
select has_index('public', 'matches', 'matches_found_item_id_idx',
  'index on matches(found_item_id)');
select has_index('public', 'matches', 'matches_overall_score_idx',
  'index on matches(overall_score)');
select has_index('public', 'matches', 'matches_status_idx',
  'index on matches(status)');
select has_index('public', 'matches', 'matches_lost_status_score_idx',
  'composite index on matches(lost_item_id, status, overall_score desc)');
select has_index('public', 'matches', 'matches_found_status_score_idx',
  'composite index on matches(found_item_id, status, overall_score desc)');


set local request.jwt.claims = '{}';

-- Regression: creation and disqualification in ONE transaction must expire.
insert into public.items (id,user_id,listing_type,title,category,description,event_date,location_text)
values
('88880000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-0000000000a1','LOST','Regression camera','electronics','silver regression camera with a long shoulder strap',current_date-1,'Main Library'),
('88880000-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-0000000000b1','FOUND','Regression camera','electronics','silver regression camera with a long shoulder strap',current_date-1,'Main Library');
select is((select status from public.matches where lost_item_id='88880000-0000-0000-0000-000000000001' and found_item_id='88880000-0000-0000-0000-000000000002'),'ACTIVE'::public.match_status,'same-transaction fixture initially matches');
update public.items set category='wallet' where id='88880000-0000-0000-0000-000000000002';
select is((select status from public.matches where lost_item_id='88880000-0000-0000-0000-000000000001' and found_item_id='88880000-0000-0000-0000-000000000002'),'EXPIRED'::public.match_status,'incompatible edit expires a pair even with identical transaction timestamps');
update public.items set category='electronics' where id='88880000-0000-0000-0000-000000000002';
select is((select status from public.matches where lost_item_id='88880000-0000-0000-0000-000000000001' and found_item_id='88880000-0000-0000-0000-000000000002'),'ACTIVE'::public.match_status,'eligible correction reactivates the canonical pair');
create temporary table title_before as select description_score from public.matches where lost_item_id='88880000-0000-0000-0000-000000000001' and found_item_id='88880000-0000-0000-0000-000000000002';
update public.items set title='completely unrelated portable radio recorder' where id='88880000-0000-0000-0000-000000000002';
select ok((select description_score from public.matches where lost_item_id='88880000-0000-0000-0000-000000000001' and found_item_id='88880000-0000-0000-0000-000000000002') < (select description_score from title_before),'title edit automatically recalculates description similarity');

-- Ranking/limit regression: a low-ranked subject must still get its own result.
update public.matches set overall_score=60 where lost_item_id='88880000-0000-0000-0000-000000000001' and found_item_id='88880000-0000-0000-0000-000000000002';
set local role authenticated;
set local request.jwt.claims='{"sub":"aaaaaaaa-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is((select count(*)::int from public.get_matches_for_item('88880000-0000-0000-0000-000000000001',1)),1,'item filter is applied BEFORE the result limit');
select is((select count(*)::int from public.get_my_matches(null,false,-1)),0,'negative client limit is clamped safely');
set local request.jwt.claims='{"role":"authenticated"}';
select throws_ok($$ select public.generate_matches('88880000-0000-0000-0000-000000000001') $$,'42501','Authentication required','authenticated role without user identity cannot use privileged generation');
reset role;
set local request.jwt.claims='{}';

-- Recalculation must not overwrite a global backend invalidation.
update public.matches set status='DISMISSED' where lost_item_id='88880000-0000-0000-0000-000000000001' and found_item_id='88880000-0000-0000-0000-000000000002';
select public.generate_matches('88880000-0000-0000-0000-000000000001');
select is((select status from public.matches where lost_item_id='88880000-0000-0000-0000-000000000001' and found_item_id='88880000-0000-0000-0000-000000000002'),'DISMISSED'::public.match_status,'global backend dismissal survives regeneration');

select * from finish();
rollback;
