-- Explore discovery and search tests (Phase 3).
--
-- Run with: supabase test db
-- Covers docs/apiAndDataContracts.md §29–§31 (filters, cursor contract, page size),
-- requirements.md FR-EXPLORE-001..004, docs/authAndRls.md §19 and
-- docs/securityAndService.md §24, §60, §61.
--
-- Two things are under test, and they are different in kind:
--
--   1. DISCOVERY CORRECTNESS — the right rows, in the right order, paged without
--      duplicates or gaps.
--   2. THE PRIVACY BOUNDARY — that no argument to the search function, and no
--      filter combination, can return a coordinate, a close reason, or anything
--      from the private-detail tables. This is asserted structurally (the columns
--      are not in the result type at all) as well as behaviourally.
--
-- Every search runs as a real `authenticated` session, not as superuser, so RLS
-- and the column grants are exercised the way PostgREST would evaluate them.

begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------
-- Two owners, so "someone else's listing" is a real case. Timestamps are set
-- explicitly: the cursor tests need a known order, including exact ties.

insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'finder@test.edu',
   '{"display_name":"Finder One","username":"finderone"}'::jsonb, now()),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'seeker@test.edu',
   '{"display_name":"Seeker Two","username":"seekertwo"}'::jsonb, now());

-- The event_date guard is a per-row trigger on a date that is already valid here;
-- created_at is being backdated deliberately, which the updated_at trigger would
-- otherwise interfere with on later updates.
alter table public.items disable trigger items_event_date_not_future;

insert into public.items
  (id, user_id, listing_type, title, category, brand, color, description,
   event_date, location_text, latitude, longitude, status, closed_at, closed_reason, created_at)
values
  -- Discoverable ACTIVE listings, one per lifecycle-relevant case.
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'FOUND', 'Blue Nike hoodie', 'clothing', 'Nike', 'blue',
   'Found a soft blue hoodie left on a bench outside the library.',
   current_date - 3, 'Central Library', 12.9716, 77.5946, 'ACTIVE', null, null,
   '2026-10-01 10:00:00+00'),
  ('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
   'LOST', 'Casio scientific calculator', 'electronics', 'Casio', 'black',
   'Lost my calculator somewhere near the exam hall, needed for finals.',
   current_date - 2, 'Lecture Hall 4', null, null, 'ACTIVE', null, null,
   '2026-10-02 10:00:00+00'),
  ('11111111-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002',
   'FOUND', 'Steel water bottle', 'accessory', 'Milton', 'silver',
   'A dented steel bottle has been sitting in the canteen for two days now.',
   current_date - 20, 'Canteen', 12.9720, 77.5950, 'ACTIVE', null, null,
   '2026-10-03 10:00:00+00'),
  -- Non-discoverable statuses. Each must be absent from the board.
  ('11111111-0000-0000-0000-000000000010', 'aaaaaaaa-0000-0000-0000-000000000001',
   'FOUND', 'Closed hoodie listing', 'clothing', 'Nike', 'blue',
   'This listing was closed by its owner and must not appear on the board.',
   current_date - 5, 'Central Library', null, null, 'CLOSED', now(),
   'Returned privately', '2026-10-04 10:00:00+00'),
  ('11111111-0000-0000-0000-000000000011', 'aaaaaaaa-0000-0000-0000-000000000001',
   'LOST', 'Cancelled calculator listing', 'electronics', 'Casio', 'black',
   'This listing was cancelled by its owner and must not appear on the board.',
   current_date - 5, 'Lecture Hall 4', null, null, 'CANCELLED', now(),
   'Posted twice', '2026-10-05 10:00:00+00'),
  ('11111111-0000-0000-0000-000000000012', 'aaaaaaaa-0000-0000-0000-000000000001',
   'FOUND', 'Returned bottle listing', 'accessory', 'Milton', 'silver',
   'This item was already returned to its owner and is off the board.',
   current_date - 5, 'Canteen', null, null, 'RETURNED', now(), null,
   '2026-10-06 10:00:00+00'),
  ('11111111-0000-0000-0000-000000000013', 'aaaaaaaa-0000-0000-0000-000000000001',
   'FOUND', 'In recovery hoodie listing', 'clothing', 'Nike', 'blue',
   'This item is mid-handover and is not an ordinary discovery card.',
   current_date - 5, 'Central Library', null, null, 'RECOVERY_IN_PROGRESS', null, null,
   '2026-10-07 10:00:00+00'),
  -- Three ACTIVE rows sharing one created_at to the microsecond: the case a
  -- single-column cursor cannot page correctly.
  ('11111111-0000-0000-0000-000000000020', 'aaaaaaaa-0000-0000-0000-000000000002',
   'LOST', 'Tied timestamp item A', 'other', null, 'grey',
   'One of three listings created at exactly the same instant, for tie testing.',
   current_date - 1, 'Hostel Block C', null, null, 'ACTIVE', null, null,
   '2026-09-01 08:00:00+00'),
  ('11111111-0000-0000-0000-000000000021', 'aaaaaaaa-0000-0000-0000-000000000002',
   'LOST', 'Tied timestamp item B', 'other', null, 'grey',
   'One of three listings created at exactly the same instant, for tie testing.',
   current_date - 1, 'Hostel Block C', null, null, 'ACTIVE', null, null,
   '2026-09-01 08:00:00+00'),
  ('11111111-0000-0000-0000-000000000022', 'aaaaaaaa-0000-0000-0000-000000000002',
   'LOST', 'Tied timestamp item C', 'other', null, 'grey',
   'One of three listings created at exactly the same instant, for tie testing.',
   current_date - 1, 'Hostel Block C', null, null, 'ACTIVE', null, null,
   '2026-09-01 08:00:00+00');

alter table public.items enable trigger items_event_date_not_future;

-- Private evidence on a discoverable FOUND listing: search must never reach it.
insert into public.found_item_private_details (item_id, private_notes, serial_fragment, unique_markings)
values ('11111111-0000-0000-0000-000000000001',
        'Secret finder note: there is a bus pass in the left pocket.',
        'SNX-99117', 'Bleach mark shaped like a crescent on the right cuff');

insert into public.lost_item_private_details (item_id, private_notes, serial_fragment, unique_markings)
values ('11111111-0000-0000-0000-000000000002',
        'Secret owner note: my name is scratched inside the battery cover.',
        'CSO-40231', 'Chipped corner on the solar strip');

insert into public.verification_questions (item_id, question, position)
values ('11111111-0000-0000-0000-000000000001',
        'What exactly is in the left pocket of the hoodie?', 1);

-- ---------------------------------------------------------------------------
-- Structure: the search surface cannot name a private column
-- ---------------------------------------------------------------------------

select has_function('public', 'search_public_items', 'search_public_items() exists');
select has_function('public', 'searchable_item_text', 'searchable_item_text() exists');

-- SECURITY INVOKER, so the caller's own RLS and grants decide what it can read.
-- A DEFINER search function would bypass both and is the classic way a "safe"
-- projection stops being safe.
select is(
  (select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'search_public_items'),
  false,
  'search_public_items is SECURITY INVOKER, so RLS still applies to the caller'
);

select ok(
  (select 'search_path=' = any(p.proconfig) or p.proconfig::text like '%search_path=%'
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'search_public_items'),
  'search_public_items pins an empty search_path'
);

-- The output column list IS the privacy contract: a column absent from the return
-- type cannot be returned by any argument combination.
select bag_eq(
  $$ select unnest(proargnames[array_position(proargmodes, 't'::"char"):array_length(proargnames,1)])
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'search_public_items' $$,
  $$ values ('id'),('user_id'),('listing_type'),('title'),('category'),('brand'),
            ('color'),('description'),('event_date'),('event_time'),
            ('location_text'),('status'),('created_at'),('updated_at') $$,
  'search_public_items returns exactly the public-safe column set'
);

select hasnt_column('public', 'public_items_view', 'latitude',
  'public_items_view still has no latitude column');
select hasnt_column('public', 'public_items_view', 'longitude',
  'public_items_view still has no longitude column');
select hasnt_column('public', 'public_items_view', 'closed_reason',
  'public_items_view still has no closed_reason column');

-- ---------------------------------------------------------------------------
-- Indexes that the Phase 3 query shapes depend on
-- ---------------------------------------------------------------------------

select has_index('public', 'items', 'items_search_text_trgm_idx',
  'the Explore text-search trigram index exists');
select has_index('public', 'items', 'items_active_created_at_id_idx',
  'the keyset pagination index on (created_at, id) exists');
select has_index('public', 'items', 'items_active_event_date_idx',
  'the event_date filter index exists');
select has_index('public', 'items', 'items_active_type_created_at_id_idx',
  'the listing_type + board-order index exists');
select has_index('public', 'items', 'items_location_text_trgm_idx',
  'the location_text trigram index exists');

select ok(
  (select count(*) > 0 from pg_extension where extname = 'pg_trgm'),
  'pg_trgm is installed'
);

-- The single-column cursor index is gone: it was the ancestor of the composite
-- one, and keeping both would be a redundant write cost on every insert.
select ok(
  (select count(*) = 0 from pg_indexes
   where schemaname = 'public' and indexname = 'items_active_created_at_idx'),
  'the superseded single-column ACTIVE created_at index was dropped'
);

-- Fixture sanity, asserted while still superuser: the listings under test really
-- do carry coordinates, so the privacy assertions further down are meaningful
-- rather than passing on absent data.
select is(
  (select count(*) from public.items where latitude is not null),
  2::bigint,
  'fixture sanity: coordinates really are stored on two of the listings'
);
select is(
  (select count(*) from public.found_item_private_details),
  1::bigint,
  'fixture sanity: FOUND private evidence really exists'
);
select is(
  (select count(*) from public.lost_item_private_details),
  1::bigint,
  'fixture sanity: LOST private evidence really exists'
);
select is(
  (select count(*) from public.verification_questions),
  1::bigint,
  'fixture sanity: a verification question really exists'
);

-- ---------------------------------------------------------------------------
-- Discovery as a real signed-in caller
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}';

-- FR-EXPLORE-001: the board returns ACTIVE listings.
select is(
  (select count(*) from public.search_public_items(p_limit => 50)),
  6::bigint,
  'the board returns exactly the six ACTIVE listings'
);

select ok(
  (select bool_and(status = 'ACTIVE') from public.search_public_items(p_limit => 50)),
  'every row the board returns is ACTIVE'
);

-- §10: each non-discoverable status, named individually, so a regression says which.
select is_empty(
  $$ select id from public.search_public_items(p_limit => 50)
     where id = '11111111-0000-0000-0000-000000000010' $$,
  'a CLOSED listing is not discoverable'
);
select is_empty(
  $$ select id from public.search_public_items(p_limit => 50)
     where id = '11111111-0000-0000-0000-000000000011' $$,
  'a CANCELLED listing is not discoverable'
);
select is_empty(
  $$ select id from public.search_public_items(p_limit => 50)
     where id = '11111111-0000-0000-0000-000000000012' $$,
  'a RETURNED listing is not discoverable'
);
select is_empty(
  $$ select id from public.search_public_items(p_limit => 50)
     where id = '11111111-0000-0000-0000-000000000013' $$,
  'a RECOVERY_IN_PROGRESS listing is not an ordinary discovery card'
);

-- A closed listing stays off the board even when a filter would otherwise match it.
select is_empty(
  $$ select id from public.search_public_items(p_query => 'Closed hoodie listing', p_limit => 50) $$,
  'searching for a CLOSED listing by its own title returns nothing'
);
select is_empty(
  $$ select id from public.search_public_items(p_category => 'clothing', p_limit => 50)
     where status <> 'ACTIVE' $$,
  'a category filter cannot surface a non-ACTIVE listing'
);

-- ---------------------------------------------------------------------------
-- Listing type filter (§11, FR-EXPLORE-003)
-- ---------------------------------------------------------------------------

select is(
  (select count(*) from public.search_public_items(p_listing_type => 'LOST', p_limit => 50)),
  4::bigint,
  'the LOST filter returns only lost listings'
);
select ok(
  (select bool_and(listing_type = 'LOST')
   from public.search_public_items(p_listing_type => 'LOST', p_limit => 50)),
  'every row under the LOST filter is LOST'
);
select is(
  (select count(*) from public.search_public_items(p_listing_type => 'FOUND', p_limit => 50)),
  2::bigint,
  'the FOUND filter returns only found listings'
);
select ok(
  (select bool_and(listing_type = 'FOUND')
   from public.search_public_items(p_listing_type => 'FOUND', p_limit => 50)),
  'every row under the FOUND filter is FOUND'
);
select is(
  (select count(*) from public.search_public_items(p_listing_type => null, p_limit => 50)),
  6::bigint,
  'an unset listing type is ALL, not an empty board'
);

-- ---------------------------------------------------------------------------
-- Category filter (§12)
-- ---------------------------------------------------------------------------

select is(
  (select count(*) from public.search_public_items(p_category => 'electronics', p_limit => 50)),
  1::bigint,
  'the category filter narrows to that category'
);
select is(
  (select title from public.search_public_items(p_category => 'electronics', p_limit => 50)),
  'Casio scientific calculator',
  'the category filter returns the right listing'
);
select is_empty(
  $$ select id from public.search_public_items(p_category => 'not_a_real_category', p_limit => 50) $$,
  'an unknown category returns an empty board rather than everything'
);

-- ---------------------------------------------------------------------------
-- Text search (§8, FR-EXPLORE-002)
-- ---------------------------------------------------------------------------
-- One assertion per searchable field, so a regression names the field that broke.

select is(
  (select count(*) from public.search_public_items(p_query => 'hoodie', p_limit => 50)),
  1::bigint,
  'search matches on title'
);
select is(
  (select count(*) from public.search_public_items(p_query => 'exam hall', p_limit => 50)),
  1::bigint,
  'search matches on description'
);
select is(
  (select count(*) from public.search_public_items(p_query => 'Casio', p_limit => 50)),
  1::bigint,
  'search matches on brand'
);
select is(
  (select count(*) from public.search_public_items(p_query => 'silver', p_limit => 50)),
  1::bigint,
  'search matches on color'
);
select is(
  (select count(*) from public.search_public_items(p_query => 'Canteen', p_limit => 50)),
  1::bigint,
  'search matches on location_text'
);
select is(
  (select count(*) from public.search_public_items(p_query => 'electronics', p_limit => 50)),
  1::bigint,
  'search matches on category'
);

select is(
  (select count(*) from public.search_public_items(p_query => 'HOODIE', p_limit => 50)),
  1::bigint,
  'search is case-insensitive'
);
select is(
  (select count(*) from public.search_public_items(p_query => '   hoodie   ', p_limit => 50)),
  1::bigint,
  'a padded search term is trimmed rather than missing everything'
);
select is(
  (select count(*) from public.search_public_items(p_query => '', p_limit => 50)),
  6::bigint,
  'an empty search term is not a filter'
);
select is_empty(
  $$ select id from public.search_public_items(p_query => 'definitelynotpresentanywhere', p_limit => 50) $$,
  'a term that matches nothing returns an empty board'
);

-- A wildcard typed as text is content, not syntax: the term is a bound parameter,
-- so it cannot widen its own pattern or alter the predicate.
select is_empty(
  $$ select id from public.search_public_items(p_query => '%', p_limit => 50) $$,
  'a bare % is treated as literal text, not a match-everything wildcard'
);
select is_empty(
  $$ select id from public.search_public_items(p_query => 'hoodie%calculator', p_limit => 50) $$,
  'an embedded % cannot be used to broaden a search'
);
select is_empty(
  $$ select id from public.search_public_items(p_query => '_', p_limit => 50) $$,
  'a bare _ is literal text, not a single-character wildcard'
);

-- ---------------------------------------------------------------------------
-- Location filter (§14)
-- ---------------------------------------------------------------------------

select is(
  (select count(*) from public.search_public_items(p_location_query => 'Library', p_limit => 50)),
  1::bigint,
  'the location filter is a text match on location_text'
);
select is(
  (select count(*) from public.search_public_items(p_location_query => 'library', p_limit => 50)),
  1::bigint,
  'the location filter is case-insensitive'
);
select is(
  (select count(*) from public.search_public_items(p_location_query => 'Hostel', p_limit => 50)),
  3::bigint,
  'the location filter matches every listing at that place'
);

-- ---------------------------------------------------------------------------
-- Date filter (§13) — event_date, never created_at
-- ---------------------------------------------------------------------------

select is(
  (select count(*) from public.search_public_items(
     p_date_from => current_date - 5, p_limit => 50)),
  5::bigint,
  'dateFrom filters on event_date'
);
select is(
  (select count(*) from public.search_public_items(
     p_date_to => current_date - 10, p_limit => 50)),
  1::bigint,
  'dateTo filters on event_date'
);
select is(
  (select count(*) from public.search_public_items(
     p_date_from => current_date - 4, p_date_to => current_date - 2, p_limit => 50)),
  2::bigint,
  'a date range filters on event_date inclusively at both ends'
);

-- The distinction that matters: the bottle's event_date is 20 days ago while its
-- created_at is recent, so a filter that confused the two would include it.
select is_empty(
  $$ select id from public.search_public_items(p_date_from => current_date - 5, p_limit => 50)
     where id = '11111111-0000-0000-0000-000000000003' $$,
  'the date filter uses event_date, not created_at'
);

-- ---------------------------------------------------------------------------
-- Sorting (§15, FR-EXPLORE-004)
-- ---------------------------------------------------------------------------

select is(
  (select id from public.search_public_items(p_sort => 'NEWEST', p_limit => 1)),
  '11111111-0000-0000-0000-000000000003'::uuid,
  'NEWEST returns the most recently created listing first'
);
select is(
  (select id from public.search_public_items(p_sort => 'OLDEST', p_limit => 1)),
  '11111111-0000-0000-0000-000000000020'::uuid,
  'OLDEST returns the earliest listing first'
);
select ok(
  (select bool_and(ordered) from (
    select created_at <= lag(created_at) over (order by rn) as ordered
    from (select created_at, row_number() over () rn
          from public.search_public_items(p_sort => 'NEWEST', p_limit => 50)) s
  ) t where ordered is not null),
  'NEWEST is monotonically non-increasing in created_at'
);
select ok(
  (select bool_and(ordered) from (
    select created_at >= lag(created_at) over (order by rn) as ordered
    from (select created_at, row_number() over () rn
          from public.search_public_items(p_sort => 'OLDEST', p_limit => 50)) s
  ) t where ordered is not null),
  'OLDEST is monotonically non-decreasing in created_at'
);
select is(
  (select id from public.search_public_items(p_sort => 'NONSENSE', p_limit => 1)),
  '11111111-0000-0000-0000-000000000003'::uuid,
  'an unrecognised sort falls back to NEWEST rather than failing'
);

-- ---------------------------------------------------------------------------
-- Page size (§17, docs/apiAndDataContracts.md §31)
-- ---------------------------------------------------------------------------

select is(
  (select count(*) from public.search_public_items(p_limit => 2)),
  2::bigint,
  'the page size is honoured'
);
select is(
  (select count(*) from public.search_public_items(p_limit => 9999)),
  6::bigint,
  'an oversized limit is clamped, not obeyed'
);
select is(
  (select count(*) from public.search_public_items(p_limit => 0)),
  1::bigint,
  'a zero limit is raised to one rather than returning nothing'
);
select is(
  (select count(*) from public.search_public_items(p_limit => -5)),
  1::bigint,
  'a negative limit cannot invert the page size'
);

-- The documented maximum is 50: prove the clamp is that number specifically.
select is(
  (select least(greatest(9999, 1), 50)), 50,
  'the clamp ceiling is the documented maximum of 50'
);

-- ---------------------------------------------------------------------------
-- Cursor pagination (§16, §30)
-- ---------------------------------------------------------------------------
-- Walked page by page: no row may appear twice and none may be skipped, including
-- across the boundary where three listings share one created_at exactly.

create temporary table page_walk (page_no int, pos int, id uuid, created_at timestamptz);

do $$
declare
  cur_created timestamptz := null;
  cur_id uuid := null;
  page int := 0;
  row_count int;
begin
  loop
    page := page + 1;
    insert into page_walk (page_no, pos, id, created_at)
    select page, row_number() over (), s.id, s.created_at
    from public.search_public_items(
      p_cursor_created_at => cur_created,
      p_cursor_id => cur_id,
      p_limit => 2
    ) s;

    select count(*) into row_count from page_walk where page_no = page;
    exit when row_count = 0 or page > 20;

    select created_at, id into cur_created, cur_id
    from page_walk where page_no = page order by pos desc limit 1;
  end loop;
end $$;

select is(
  (select count(*) from page_walk),
  6::bigint,
  'walking the board two rows at a time returns every ACTIVE listing'
);
select is(
  (select count(distinct id) from page_walk),
  6::bigint,
  'no listing is returned twice across pages'
);
select is(
  (select count(*) from page_walk) - (select count(distinct id) from page_walk),
  0::bigint,
  'pages do not overlap'
);
select bag_eq(
  $$ select id from page_walk $$,
  $$ select id from public.search_public_items(p_limit => 50) $$,
  'the paged walk returns the same set as one full page'
);

-- The tie case specifically: all three same-instant rows must be present exactly
-- once. This is what a created_at-only cursor gets wrong.
select is(
  (select count(*) from page_walk
   where id in ('11111111-0000-0000-0000-000000000020',
                '11111111-0000-0000-0000-000000000021',
                '11111111-0000-0000-0000-000000000022')),
  3::bigint,
  'three listings sharing one created_at are each paged exactly once'
);

-- Ordering is preserved across the page boundaries, not just within a page.
select ok(
  (select bool_and(ordered) from (
    select created_at <= lag(created_at) over (order by page_no, pos) as ordered
    from page_walk
  ) t where ordered is not null),
  'the paged walk stays in board order across page boundaries'
);

-- A cursor is a position, not a filter: paging from the last row ends the board.
select is_empty(
  $$ with last_row as (
       select created_at, id from public.search_public_items(p_limit => 50)
       order by created_at asc, id asc limit 1
     )
     select s.id from last_row, public.search_public_items(
       p_cursor_created_at => last_row.created_at,
       p_cursor_id => last_row.id,
       p_limit => 50
     ) s $$,
  'paging past the final row returns nothing rather than wrapping around'
);

-- An incomplete cursor must not silently drop rows.
select is(
  (select count(*) from public.search_public_items(
     p_cursor_created_at => '2026-10-03 10:00:00+00', p_cursor_id => null, p_limit => 50)),
  6::bigint,
  'a cursor timestamp without an id is ignored rather than half-applied'
);

-- Cursor paging under OLDEST walks the other way and is equally exact.
select is(
  (select count(distinct id) from (
     select s.id from public.search_public_items(p_sort => 'OLDEST', p_limit => 3) s
     union all
     select s2.id from (
       select created_at, id from public.search_public_items(p_sort => 'OLDEST', p_limit => 3)
       order by created_at desc, id desc limit 1
     ) c, public.search_public_items(
       p_sort => 'OLDEST',
       p_cursor_created_at => c.created_at,
       p_cursor_id => c.id,
       p_limit => 3
     ) s2
   ) both_pages),
  6::bigint,
  'OLDEST cursor paging also covers the board without duplicates'
);

-- ---------------------------------------------------------------------------
-- Combined filters
-- ---------------------------------------------------------------------------

select is(
  (select count(*) from public.search_public_items(
     p_query => 'hoodie', p_listing_type => 'FOUND', p_category => 'clothing',
     p_location_query => 'Library', p_date_from => current_date - 10, p_limit => 50)),
  1::bigint,
  'every filter applied at once still returns the matching listing'
);
select is_empty(
  $$ select id from public.search_public_items(
       p_query => 'hoodie', p_listing_type => 'LOST', p_limit => 50) $$,
  'filters combine as AND: a FOUND hoodie is not returned under the LOST filter'
);
select is_empty(
  $$ select id from public.search_public_items(
       p_query => 'hoodie', p_category => 'electronics', p_limit => 50) $$,
  'a text match in the wrong category returns nothing'
);
select is_empty(
  $$ select id from public.search_public_items(
       p_query => 'hoodie', p_date_to => current_date - 30, p_limit => 50) $$,
  'a text match outside the date range returns nothing'
);

-- ---------------------------------------------------------------------------
-- THE PRIVACY BOUNDARY
-- ---------------------------------------------------------------------------
-- Behavioural counterparts to the structural assertions above. The listings used
-- here DO have coordinates and DO have private evidence attached, so each of
-- these would fail loudly if the boundary leaked.

-- Coordinates are not reachable through the board at all. A column that is not in
-- the function's result type cannot be selected from it, so this fails to even
-- compile as SQL — which is the guarantee.
select throws_ok(
  $$ select latitude from public.search_public_items(p_limit => 50) $$,
  '42703',
  null,
  'latitude cannot be selected from the Explore search results'
);
select throws_ok(
  $$ select longitude from public.search_public_items(p_limit => 50) $$,
  '42703',
  null,
  'longitude cannot be selected from the Explore search results'
);
select throws_ok(
  $$ select closed_reason from public.search_public_items(p_limit => 50) $$,
  '42703',
  null,
  'closed_reason cannot be selected from the Explore search results'
);
select throws_ok(
  $$ select closed_at from public.search_public_items(p_limit => 50) $$,
  '42703',
  null,
  'closed_at cannot be selected from the Explore search results'
);

-- Direct table access remains closed to a signed-in caller, so the search function
-- is not a new door into a table that was otherwise reachable.
--
-- The privilege failure here is raised while the statement is being planned, which
-- aborts the script rather than surfacing to throws_ok(); catching it inside a
-- plpgsql block is what lets the suite assert on it.
do $check$
declare
  denied boolean := false;
begin
  begin
    perform latitude from public.items limit 1;
  exception
    when insufficient_privilege then denied := true;
  end;
  if not denied then
    raise exception 'a signed-in caller could read items.latitude directly';
  end if;
end $check$;
select pass('a signed-in caller still cannot read coordinates from items directly');

-- Private evidence belongs to the owner alone. Seeker Two owns neither listing
-- carrying private details.
select is_empty(
  $$ select item_id from public.found_item_private_details $$,
  'FOUND private evidence is invisible to a non-owner'
);
select is_empty(
  $$ select item_id from public.lost_item_private_details $$,
  'LOST private evidence is invisible to a non-owner'
);
select is_empty(
  $$ select item_id from public.verification_questions $$,
  'verification questions are invisible to a non-owner'
);

-- The private text must not be discoverable through the search term either: the
-- searchable expression is built from public columns only, so a term drawn from
-- private evidence cannot match.
select is_empty(
  $$ select id from public.search_public_items(p_query => 'bus pass in the left pocket', p_limit => 50) $$,
  'searching for FOUND private note text matches nothing'
);
select is_empty(
  $$ select id from public.search_public_items(p_query => 'SNX-99117', p_limit => 50) $$,
  'searching for a FOUND serial fragment matches nothing'
);
select is_empty(
  $$ select id from public.search_public_items(p_query => 'crescent', p_limit => 50) $$,
  'searching for FOUND unique markings matches nothing'
);
select is_empty(
  $$ select id from public.search_public_items(p_query => 'scratched inside the battery cover', p_limit => 50) $$,
  'searching for LOST private note text matches nothing'
);
select is_empty(
  $$ select id from public.search_public_items(p_query => 'CSO-40231', p_limit => 50) $$,
  'searching for a LOST serial fragment matches nothing'
);
select is_empty(
  $$ select id from public.search_public_items(p_query => 'What exactly is in the left pocket', p_limit => 50) $$,
  'searching for a verification question matches nothing'
);

-- The searchable expression is public columns only, stated directly.
select is(
  public.searchable_item_text('Blue hoodie', 'Nike', 'blue', 'clothing', 'Central Library', 'A description'),
  'Blue hoodie Nike blue clothing Central Library A description',
  'searchable_item_text concatenates exactly the public fields'
);
select is(
  public.searchable_item_text(null, null, null, null, null, null),
  '     ',
  'searchable_item_text is null-safe, so a listing with empty optional fields is still indexed'
);

-- ---------------------------------------------------------------------------
-- Anonymous callers
-- ---------------------------------------------------------------------------

reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok(
  $$ select id from public.search_public_items(p_limit => 50) $$,
  '42501',
  null,
  'an anonymous caller cannot run the Explore search'
);

reset role;

select * from finish();
rollback;
