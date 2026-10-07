-- Listings, media and private-detail RLS tests (Phase 2).
--
-- Run with: supabase test db
-- Covers docs/authAndRls.md §19–§26, §51–§53, §98, §99 and
-- docs/securityAndService.md §22–§25.
--
-- Each case switches role and JWT claims to impersonate a real client session, so
-- the policies are exercised the way PostgREST would evaluate them — not as a
-- superuser. Every permission assertion has its negative counterpart: the wrong user
-- must be denied.

begin;

create extension if not exists pgtap with schema extensions;

-- `plan()` must match the assertion count exactly, and these suites have not been
-- run yet (no local Docker in the authoring session), so `no_plan()` is used: it
-- counts at run time instead of failing the whole suite on an off-by-one.
select no_plan();

-- ---------------------------------------------------------------------------
-- Structure
-- ---------------------------------------------------------------------------

select has_table('public', 'items', 'items table exists');
select has_table('public', 'item_images', 'item_images table exists');
select has_table('public', 'found_item_private_details', 'found_item_private_details table exists');
select has_table('public', 'lost_item_private_details', 'lost_item_private_details table exists');
select has_table('public', 'verification_questions', 'verification_questions table exists');
select has_view('public', 'public_items_view', 'public_items_view exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.items'::regclass),
  'RLS is enabled on items'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.item_images'::regclass),
  'RLS is enabled on item_images'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.found_item_private_details'::regclass),
  'RLS is enabled on found_item_private_details'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.lost_item_private_details'::regclass),
  'RLS is enabled on lost_item_private_details'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.verification_questions'::regclass),
  'RLS is enabled on verification_questions'
);

-- The safe projection must not even have the private columns.
select hasnt_column('public', 'public_items_view', 'latitude',
  'public_items_view has no latitude column');
select hasnt_column('public', 'public_items_view', 'longitude',
  'public_items_view has no longitude column');
select hasnt_column('public', 'public_items_view', 'closed_reason',
  'public_items_view has no closed_reason column');

-- security_invoker keeps the caller's RLS in force on the view.
select ok(
  (select 'security_invoker=true' = any(reloptions) from pg_class
   where oid = 'public.public_items_view'::regclass),
  'public_items_view is security_invoker'
);

-- The final documented status set, with no derived state persisted.
select set_eq(
  $$ select unnest(enum_range(null::public.listing_status))::text $$,
  $$ values ('ACTIVE'),('RECOVERY_IN_PROGRESS'),('RETURNED'),('CLOSED'),('CANCELLED') $$,
  'listing_status is exactly the documented final set'
);
select set_eq(
  $$ select unnest(enum_range(null::public.listing_type))::text $$,
  $$ values ('LOST'),('FOUND') $$,
  'listing_type is LOST | FOUND'
);

select has_function('public', 'close_my_item', 'close_my_item() exists');
select has_function('public', 'cancel_my_item', 'cancel_my_item() exists');
select has_function('public', 'get_my_item_detail', 'get_my_item_detail() exists');
select has_function('public', 'user_owns_item', 'user_owns_item() exists');

-- `authenticated` holds column-level SELECT on items only, and the private columns
-- are excluded. Discovery goes through public_items_view; the full owner row comes
-- from get_my_item_detail().
select ok(
  not has_column_privilege('authenticated', 'public.items', 'latitude', 'select'),
  'authenticated cannot select items.latitude'
);
select ok(
  not has_column_privilege('authenticated', 'public.items', 'longitude', 'select'),
  'authenticated cannot select items.longitude'
);
select ok(
  not has_column_privilege('authenticated', 'public.items', 'closed_reason', 'select'),
  'authenticated cannot select items.closed_reason'
);
select ok(
  has_column_privilege('authenticated', 'public.items', 'title', 'select'),
  'authenticated can select the safe item columns (needed for INSERT ... RETURNING)'
);
select ok(
  has_table_privilege('authenticated', 'public.public_items_view', 'select'),
  'authenticated may select from public_items_view'
);

-- ---------------------------------------------------------------------------
-- Fixtures: two real auth users, so the Phase 1 signup trigger creates profiles.
-- ---------------------------------------------------------------------------

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'user-a@college.edu', crypt('password-a', gen_salt('bf')), now(),
    '{"display_name": "User A"}'::jsonb, now(), now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'user-b@college.edu', crypt('password-b', gen_salt('bf')), now(),
    '{"display_name": "User B"}'::jsonb, now(), now()
  );

-- ---------------------------------------------------------------------------
-- User A: creates a LOST report
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.items
       (id, user_id, listing_type, title, category, description, event_date, location_text)
     values
       ('aaaaaaaa-0000-0000-0000-000000000001',
        '11111111-1111-1111-1111-111111111111',
        'LOST', 'Blue Casio calculator', 'electronics',
        'Blue scientific calculator last seen after my morning lecture.',
        current_date - 1, 'Engineering Block') $$,
  'user A can create their own LOST report'
);

-- STEP 26: A creating an item that claims B's user_id must be impossible.
select throws_ok(
  $$ insert into public.items
       (user_id, listing_type, title, category, description, event_date, location_text)
     values
       ('22222222-2222-2222-2222-222222222222',
        'LOST', 'Forged listing', 'other',
        'This listing claims to belong to user B.',
        current_date, 'Nowhere') $$,
  '42501',
  null,
  'user A cannot create a listing owned by user B'
);

-- A listing cannot be inserted straight into a lifecycle state the client does not own.
select throws_ok(
  $$ insert into public.items
       (user_id, listing_type, title, category, description, event_date, location_text, status, closed_at)
     values
       ('11111111-1111-1111-1111-111111111111',
        'LOST', 'Pre-returned listing', 'other',
        'This listing tries to start out already returned.',
        current_date, 'Nowhere', 'RETURNED', now()) $$,
  '42501',
  null,
  'user A cannot insert a listing that is already RETURNED'
);

-- Editing own safe fields: allowed.
select lives_ok(
  $$ update public.items set title = 'Blue Casio FX calculator', color = 'Blue'
     where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'user A can edit their own listing'
);

-- Protected columns: denied by protect_item_fields(), whatever the policy admitted.
select throws_ok(
  $$ update public.items set user_id = '22222222-2222-2222-2222-222222222222'
     where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501',
  null,
  'user A cannot transfer ownership of their listing'
);
select throws_ok(
  $$ update public.items set listing_type = 'FOUND'
     where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501',
  null,
  'listing_type cannot be changed after creation'
);
select throws_ok(
  $$ update public.items set status = 'RETURNED', closed_at = now()
     where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501',
  null,
  'the browser cannot set a listing to RETURNED'
);
select throws_ok(
  $$ update public.items set status = 'RECOVERY_IN_PROGRESS'
     where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501',
  null,
  'the browser cannot set a listing to RECOVERY_IN_PROGRESS'
);

-- Constraint coverage.
select throws_ok(
  $$ insert into public.items
       (user_id, listing_type, title, category, description, event_date, location_text, latitude, longitude)
     values ('11111111-1111-1111-1111-111111111111', 'LOST', 'Bad coords', 'other',
             'A listing with an out-of-range latitude value.',
             current_date, 'Somewhere', 999, 10) $$,
  '23514',
  null,
  'latitude outside -90..90 is rejected'
);
select throws_ok(
  $$ insert into public.items
       (user_id, listing_type, title, category, description, event_date, location_text, latitude)
     values ('11111111-1111-1111-1111-111111111111', 'LOST', 'Half coords', 'other',
             'A listing with only one half of a coordinate pair.',
             current_date, 'Somewhere', 12.5) $$,
  '23514',
  null,
  'a lone latitude without a longitude is rejected'
);
select throws_ok(
  $$ insert into public.items
       (user_id, listing_type, title, category, description, event_date, location_text)
     values ('11111111-1111-1111-1111-111111111111', 'LOST', 'Bad category', 'spaceship',
             'A listing using a category that is not in the documented set.',
             current_date, 'Somewhere') $$,
  '23514',
  null,
  'a category outside the documented set is rejected'
);
select throws_ok(
  $$ insert into public.items
       (user_id, listing_type, title, category, description, event_date, location_text)
     values ('11111111-1111-1111-1111-111111111111', 'LOST', 'Future', 'other',
             'A listing dated well into the future.',
             current_date + 30, 'Somewhere') $$,
  '22007',
  null,
  'an event_date in the future is rejected'
);

-- Own images.
select lives_ok(
  $$ insert into public.item_images (id, item_id, storage_path, position)
     values ('cccccccc-0000-0000-0000-000000000001',
             'aaaaaaaa-0000-0000-0000-000000000001',
             '11111111-1111-1111-1111-111111111111/aaaaaaaa-0000-0000-0000-000000000001/a.webp',
             0) $$,
  'user A can add an image to their own listing'
);

-- The Owner's own distinguishing characteristics persist against their LOST report
-- (the LOST-side mirror of the Finder's private details).
select lives_ok(
  $$ insert into public.lost_item_private_details (item_id, private_notes, serial_fragment)
     values ('aaaaaaaa-0000-0000-0000-000000000001',
             'Initials V.B. inked inside the fold',
             '...7731') $$,
  'user A can store private distinguishing details for their own LOST report'
);

select is(
  (select private_notes from public.lost_item_private_details
   where item_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'Initials V.B. inked inside the fold',
  'user A reads back their own LOST private details'
);

-- An all-empty row carries no ownership-evidence value.
select throws_ok(
  $$ insert into public.lost_item_private_details (item_id, private_notes)
     values ('aaaaaaaa-0000-0000-0000-000000000001', '   ') $$,
  null,
  null,
  'an empty LOST private-details row is rejected'
);

-- A LOST listing must not carry Finder private structures.
select throws_ok(
  $$ insert into public.found_item_private_details (item_id, private_notes)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'Should not be allowed') $$,
  '23514',
  null,
  'private details cannot be attached to a LOST listing'
);
select throws_ok(
  $$ insert into public.verification_questions (item_id, question, position)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'Should not be allowed?', 0) $$,
  '23514',
  null,
  'verification questions cannot be attached to a LOST listing'
);

-- ---------------------------------------------------------------------------
-- User B: creates a FOUND listing with private details and questions
-- ---------------------------------------------------------------------------

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.items
       (id, user_id, listing_type, title, category, description, event_date, location_text, latitude, longitude)
     values
       ('bbbbbbbb-0000-0000-0000-000000000001',
        '22222222-2222-2222-2222-222222222222',
        'FOUND', 'Grey oversized hoodie', 'clothing',
        'A grey pullover hoodie found near the reading area.',
        current_date - 1, 'Central Library', 12.9716, 77.5946) $$,
  'user B can create their own FOUND listing'
);

select lives_ok(
  $$ insert into public.found_item_private_details (item_id, private_notes, unique_markings)
     values ('bbbbbbbb-0000-0000-0000-000000000001',
             'Stitched initials inside the collar',
             'Small ink mark on the left cuff') $$,
  'user B can store private details for their own FOUND listing'
);

select lives_ok(
  $$ insert into public.verification_questions (item_id, question, position)
     values ('bbbbbbbb-0000-0000-0000-000000000001',
             'What is stitched inside the collar?', 0) $$,
  'user B can store a verification question for their own FOUND listing'
);

-- An all-empty private row carries no verification value.
select throws_ok(
  $$ insert into public.found_item_private_details (item_id, private_notes)
     values ('bbbbbbbb-0000-0000-0000-000000000001', '   ') $$,
  null,
  null,
  'an empty private-details row is rejected'
);

-- A FOUND listing must not carry Owner-side private evidence: a Finder cannot
-- manufacture "ownership evidence" against the item they are holding.
select throws_ok(
  $$ insert into public.lost_item_private_details (item_id, private_notes)
     values ('bbbbbbbb-0000-0000-0000-000000000001', 'Should not be allowed') $$,
  '23514',
  null,
  'LOST private details cannot be attached to a FOUND listing'
);

-- B cannot read A's Owner-side private evidence, and cannot inject their own.
select is(
  (select count(*)::int from public.lost_item_private_details
   where item_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0,
  'user B cannot read user A LOST private details'
);

-- RLS rejects the insert outright: the WITH CHECK clause fails rather than
-- silently filtering, so assert on the policy violation itself.
select throws_ok(
  $$ insert into public.lost_item_private_details (item_id, private_notes)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'Injected by B') $$,
  '42501',
  null,
  'user B cannot write user A LOST private details'
);

select is(
  (select count(*)::int from public.lost_item_private_details
   where item_id = 'aaaaaaaa-0000-0000-0000-000000000001'
     and private_notes = 'Injected by B'),
  0,
  'user B injection left no LOST private-detail row behind'
);

select lives_ok(
  $$ insert into public.item_images (item_id, storage_path, position)
     values ('bbbbbbbb-0000-0000-0000-000000000001',
             '22222222-2222-2222-2222-222222222222/bbbbbbbb-0000-0000-0000-000000000001/a.webp',
             0) $$,
  'user B can add an image to their own listing'
);

-- B cannot touch A's listing or its images.
update public.items set title = 'Hacked by B'
  where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is(
  (select title from public.items where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'Blue Casio FX calculator',
  'user B cannot edit user A''s listing'
);

update public.item_images set storage_path = 'hijacked/path.webp'
  where id = 'cccccccc-0000-0000-0000-000000000001';
select is(
  (select storage_path from public.item_images
   where id = 'cccccccc-0000-0000-0000-000000000001'),
  '11111111-1111-1111-1111-111111111111/aaaaaaaa-0000-0000-0000-000000000001/a.webp',
  'user B cannot change user A''s image row'
);

delete from public.item_images where id = 'cccccccc-0000-0000-0000-000000000001';
select is(
  (select count(*)::int from public.item_images
   where id = 'cccccccc-0000-0000-0000-000000000001'),
  1,
  'user B cannot delete user A''s image row'
);

-- B cannot attach an image to A's listing by supplying A's item_id.
select throws_ok(
  $$ insert into public.item_images (item_id, storage_path, position)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'forged/path.webp', 1) $$,
  '42501',
  null,
  'user B cannot attach an image to user A''s listing'
);

-- ---------------------------------------------------------------------------
-- User A reads user B's FOUND listing: public data only
-- ---------------------------------------------------------------------------

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  (select title from public.public_items_view
   where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  'Grey oversized hoodie',
  'user A can read user B''s public listing data'
);

-- STEP 26: B's Found private details must be unreachable for A.
select is(
  (select count(*)::int from public.found_item_private_details
   where item_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  0,
  'user A cannot read user B''s Found private details'
);

select is(
  (select count(*)::int from public.verification_questions
   where item_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  0,
  'user A cannot read user B''s verification questions in Phase 2'
);

-- The owner-only RPC refuses a non-owner rather than returning the row.
select throws_ok(
  $$ select public.get_my_item_detail('bbbbbbbb-0000-0000-0000-000000000001') $$,
  'P0002',
  null,
  'get_my_item_detail() refuses a listing the caller does not own'
);

select lives_ok(
  $$ select public.get_my_item_detail('aaaaaaaa-0000-0000-0000-000000000001') $$,
  'get_my_item_detail() returns the caller''s own listing'
);

-- user_owns_item() answers only about the caller.
select ok(
  public.user_owns_item('aaaaaaaa-0000-0000-0000-000000000001'),
  'user_owns_item() is true for the caller''s own listing'
);
select ok(
  not public.user_owns_item('bbbbbbbb-0000-0000-0000-000000000001'),
  'user_owns_item() is false for another user''s listing'
);

-- A cannot close or cancel B's listing.
select throws_ok(
  $$ select public.close_my_item('bbbbbbbb-0000-0000-0000-000000000001') $$,
  'P0002',
  null,
  'user A cannot close user B''s listing'
);
select throws_ok(
  $$ select public.cancel_my_item('bbbbbbbb-0000-0000-0000-000000000001') $$,
  'P0002',
  null,
  'user A cannot cancel user B''s listing'
);

-- Closing own listing works, is idempotent, and leaves it out of discovery.
select is(
  (select status::text from public.close_my_item(
     'aaaaaaaa-0000-0000-0000-000000000001', 'I found it myself')),
  'CLOSED',
  'close_my_item() closes the caller''s own listing'
);
select is(
  (select status::text from public.close_my_item('aaaaaaaa-0000-0000-0000-000000000001')),
  'CLOSED',
  'close_my_item() is idempotent on an already-closed listing'
);
select isnt(
  (select closed_at from public.get_my_item_detail('aaaaaaaa-0000-0000-0000-000000000001')),
  null,
  'closing sets closed_at'
);
select throws_ok(
  $$ select public.cancel_my_item('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '22023',
  null,
  'a closed listing cannot then be cancelled'
);

-- ---------------------------------------------------------------------------
-- Anonymous: denied throughout (docs/authAndRls.md §105)
-- ---------------------------------------------------------------------------

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select count(*) from public.public_items_view $$,
  '42501',
  null,
  'anonymous users cannot read the public listing view'
);

select throws_ok(
  $$ select count(*) from public.found_item_private_details $$,
  '42501',
  null,
  'anonymous users cannot read Found private details'
);

select throws_ok(
  $$ select count(*) from public.lost_item_private_details $$,
  '42501',
  null,
  'anonymous users cannot read Owner LOST private details'
);

select throws_ok(
  $$ insert into public.items
       (user_id, listing_type, title, category, description, event_date, location_text)
     values ('11111111-1111-1111-1111-111111111111', 'LOST', 'Anon listing', 'other',
             'An anonymous session trying to create a listing.',
             current_date, 'Nowhere') $$,
  '42501',
  null,
  'anonymous users cannot create a listing'
);

reset role;

select * from finish();

rollback;
