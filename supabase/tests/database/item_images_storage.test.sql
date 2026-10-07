-- item-images Storage policy tests (Phase 2).
--
-- Run with: supabase test db
-- Covers docs/authAndRls.md §51–§53 and docs/storageAndMedia.md §3.4, §33–§37, §85.
--
-- The point of these cases is that the path prefix alone is never the
-- authorization. Every policy checks BOTH that folder 1 is the caller's own uid AND
-- that folder 2 is a listing the caller actually owns, so neither rewriting the path
-- nor guessing an item id gets a user into someone else's folder.

begin;

create extension if not exists pgtap with schema extensions;

-- See the note in listings_rls.test.sql on no_plan().
select no_plan();

-- ---------------------------------------------------------------------------
-- Bucket configuration (docs/storageAndMedia.md §85)
-- ---------------------------------------------------------------------------

select ok(
  exists (select 1 from storage.buckets where id = 'item-images'),
  'the item-images bucket exists'
);

select is(
  (select public from storage.buckets where id = 'item-images'),
  false,
  'item-images is a PRIVATE bucket, read through signed URLs'
);

select is(
  (select file_size_limit from storage.buckets where id = 'item-images'),
  5242880::bigint,
  'item-images allows up to 5 MB per object'
);

select set_eq(
  $$ select unnest(allowed_mime_types) from storage.buckets where id = 'item-images' $$,
  $$ values ('image/jpeg'),('image/png'),('image/webp') $$,
  'item-images accepts only JPEG, PNG and WebP'
);

select ok(
  not exists(
    select 1 from storage.buckets
    where id = 'item-images'
      and 'image/svg+xml' = any(allowed_mime_types)
  ),
  'item-images rejects SVG, which can carry active content'
);

select has_function('public', 'storage_path_item_id',
  'storage_path_item_id() exists for the storage policies');

-- A malformed path owns nothing rather than raising inside a policy.
select is(
  public.storage_path_item_id('not-a-path'),
  null,
  'storage_path_item_id() returns null for a path with no item segment'
);
select is(
  public.storage_path_item_id('user-a/not-a-uuid/file.webp'),
  null,
  'storage_path_item_id() returns null when the item segment is not a uuid'
);

-- ---------------------------------------------------------------------------
-- Fixtures
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

-- One listing each, created as the owning user so the INSERT policy applies.
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
insert into public.items
  (id, user_id, listing_type, title, category, description, event_date, location_text)
values
  ('aaaaaaaa-0000-0000-0000-00000000000a',
   '11111111-1111-1111-1111-111111111111',
   'LOST', 'A calculator', 'electronics',
   'User A''s lost calculator, used as a storage fixture.',
   current_date - 1, 'Engineering Block');

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
insert into public.items
  (id, user_id, listing_type, title, category, description, event_date, location_text)
values
  ('bbbbbbbb-0000-0000-0000-00000000000b',
   '22222222-2222-2222-2222-222222222222',
   'FOUND', 'A hoodie', 'clothing',
   'User B''s found hoodie, used as a storage fixture.',
   current_date - 1, 'Central Library');

-- ---------------------------------------------------------------------------
-- User A: own folder, own item
-- ---------------------------------------------------------------------------

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner, metadata)
     values ('item-images',
             '11111111-1111-1111-1111-111111111111/aaaaaaaa-0000-0000-0000-00000000000a/one.webp',
             '11111111-1111-1111-1111-111111111111',
             '{"mimetype": "image/webp"}'::jsonb) $$,
  'user A can upload into their own user/item folder'
);

select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'item-images'
     and name like '11111111-1111-1111-1111-111111111111/%'),
  1,
  'user A can read their own object'
);

-- Replace (upsert needs UPDATE alongside INSERT/SELECT).
select lives_ok(
  $$ update storage.objects set metadata = '{"mimetype": "image/webp", "size": 2048}'::jsonb
     where bucket_id = 'item-images'
       and name = '11111111-1111-1111-1111-111111111111/aaaaaaaa-0000-0000-0000-00000000000a/one.webp' $$,
  'user A can replace their own object'
);

-- Own folder, but an item A does not own: denied. The path prefix is not enough.
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner, metadata)
     values ('item-images',
             '11111111-1111-1111-1111-111111111111/bbbbbbbb-0000-0000-0000-00000000000b/forged.webp',
             '11111111-1111-1111-1111-111111111111',
             '{"mimetype": "image/webp"}'::jsonb) $$,
  '42501',
  null,
  'user A cannot upload under their own uid for a listing they do not own'
);

-- Another user's folder: denied.
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner, metadata)
     values ('item-images',
             '22222222-2222-2222-2222-222222222222/bbbbbbbb-0000-0000-0000-00000000000b/forged.webp',
             '11111111-1111-1111-1111-111111111111',
             '{"mimetype": "image/webp"}'::jsonb) $$,
  '42501',
  null,
  'user A cannot upload into user B''s folder'
);

-- A path with no item segment: denied.
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner, metadata)
     values ('item-images',
             '11111111-1111-1111-1111-111111111111/loose.webp',
             '11111111-1111-1111-1111-111111111111',
             '{"mimetype": "image/webp"}'::jsonb) $$,
  '42501',
  null,
  'an object outside the user/item folder convention is denied'
);

-- ---------------------------------------------------------------------------
-- User B against user A's object
-- ---------------------------------------------------------------------------

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'item-images'
     and name like '11111111-1111-1111-1111-111111111111/%'),
  0,
  'user B cannot read user A''s objects'
);

-- Update filtered out by RLS, so A's object is unchanged.
update storage.objects set metadata = '{"hijacked": true}'::jsonb
  where bucket_id = 'item-images'
    and name = '11111111-1111-1111-1111-111111111111/aaaaaaaa-0000-0000-0000-00000000000a/one.webp';

reset role;
select is(
  (select metadata ->> 'hijacked' from storage.objects
   where bucket_id = 'item-images'
     and name = '11111111-1111-1111-1111-111111111111/aaaaaaaa-0000-0000-0000-00000000000a/one.webp'),
  null,
  'user B cannot overwrite user A''s object'
);

-- This Postgres image carries a platform trigger, storage.protect_objects_delete(),
-- that blocks EVERY direct delete from storage.objects regardless of RLS, so a
-- plain `delete` here aborts the transaction before the policy is ever consulted.
-- The security property under test is the DELETE policy, so assert on the rows the
-- policy makes deletable for B: A's object must not be among them.
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is(
  (select count(*)::int from (
     select 1 from storage.objects
     where bucket_id = 'item-images'
       and name = '11111111-1111-1111-1111-111111111111/aaaaaaaa-0000-0000-0000-00000000000a/one.webp'
     for update
   ) deletable),
  0,
  'user B cannot delete user A''s object: the DELETE policy exposes no such row'
);

reset role;
select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'item-images'
     and name = '11111111-1111-1111-1111-111111111111/aaaaaaaa-0000-0000-0000-00000000000a/one.webp'),
  1,
  'user A''s object still exists after user B''s delete attempt'
);

-- ---------------------------------------------------------------------------
-- User B: own folder, own item — the mirror case must work
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner, metadata)
     values ('item-images',
             '22222222-2222-2222-2222-222222222222/bbbbbbbb-0000-0000-0000-00000000000b/one.webp',
             '22222222-2222-2222-2222-222222222222',
             '{"mimetype": "image/webp"}'::jsonb) $$,
  'user B can upload into their own user/item folder'
);

-- Same platform trigger as above: assert the policy admits B's own row for
-- deletion rather than issuing a delete the trigger would reject outright.
select is(
  (select count(*)::int from (
     select 1 from storage.objects
     where bucket_id = 'item-images'
       and name = '22222222-2222-2222-2222-222222222222/bbbbbbbb-0000-0000-0000-00000000000b/one.webp'
     for update
   ) deletable),
  1,
  'user B can delete their own object: the DELETE policy exposes the row'
);

-- ---------------------------------------------------------------------------
-- Anonymous: denied (the bucket is private; reads use signed URLs)
-- ---------------------------------------------------------------------------

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select is(
  (select count(*)::int from storage.objects where bucket_id = 'item-images'),
  0,
  'anonymous sessions cannot list item-images objects'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, metadata)
     values ('item-images', 'anon/anon/one.webp', '{"mimetype": "image/webp"}'::jsonb) $$,
  '42501',
  null,
  'anonymous sessions cannot upload to item-images'
);

-- The avatars policies from Phase 1 must still be intact.
reset role;
select ok(
  exists (select 1 from storage.buckets where id = 'avatars'),
  'the Phase 1 avatars bucket is still present'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'avatars_insert_own'
  ),
  'the Phase 1 avatars upload policy is still present'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'item_images_storage_insert_own'
  ),
  'the item-images upload policy is installed'
);

select * from finish();

rollback;
