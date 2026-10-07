-- Profiles RLS and reputation-protection tests.
--
-- Run with: supabase test db
-- Covers docs/authAndRls.md §16, §17 and docs/securityAndService.md §129, §130.
--
-- Each case switches role and JWT claims to impersonate a real client session, so the
-- policies are exercised the way PostgREST would evaluate them — not as a superuser.

begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

-- ---------------------------------------------------------------------------
-- Structure
-- ---------------------------------------------------------------------------

select has_table('public', 'profiles', 'profiles table exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS is enabled on profiles'
);
select has_function('public', 'handle_new_user', 'handle_new_user() exists');
select has_function('public', 'update_my_profile', 'update_my_profile() exists');

-- ---------------------------------------------------------------------------
-- Fixtures: two real auth users, so the signup trigger creates both profiles.
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
    '{}'::jsonb, now(), now()
  );

-- STEP 18: signup creates a profile.
select is(
  (select count(*)::int from public.profiles where id in (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222')),
  2,
  'handle_new_user() created a profile for each new auth user'
);

select is(
  (select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'User A',
  'display_name is seeded from auth metadata'
);

-- With no display_name in metadata, the email local part is used.
select is(
  (select display_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'user-b',
  'display_name falls back to the email local part'
);

-- New accounts start from the documented neutral defaults.
select results_eq(
  $$ select trust_score, average_rating, rating_count, successful_returns
     from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values (50::numeric(5,2), 0::numeric(3,2), 0, 0) $$,
  'a new profile starts at the documented neutral reputation defaults'
);

-- ---------------------------------------------------------------------------
-- Authenticated user A
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

-- SELECT: a signed-in user may read public-safe profile data.
select is(
  (select count(*)::int from public.profiles),
  2,
  'user A can read profiles for the community'
);

-- UPDATE own safe fields: allowed.
select lives_ok(
  $$ update public.profiles set display_name = 'User A Renamed', username = 'user_a'
     where id = '11111111-1111-1111-1111-111111111111' $$,
  'user A can update their own safe profile fields'
);

select is(
  (select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'User A Renamed',
  'the safe update actually persisted'
);

-- UPDATE another user's row: denied. RLS filters the row out, so this affects
-- nothing rather than raising — the assertion is that B is unchanged.
update public.profiles set display_name = 'Hacked'
  where id = '22222222-2222-2222-2222-222222222222';

select is(
  (select display_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'user-b',
  'user A cannot update user B''s profile'
);

-- UPDATE own trust_score: denied by the reputation trigger.
select throws_ok(
  $$ update public.profiles set trust_score = 100
     where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501',
  null,
  'user A cannot set their own trust_score'
);

select throws_ok(
  $$ update public.profiles set average_rating = 5
     where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501',
  null,
  'user A cannot set their own average_rating'
);

select throws_ok(
  $$ update public.profiles set rating_count = 999
     where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501',
  null,
  'user A cannot set their own rating_count'
);

select throws_ok(
  $$ update public.profiles set successful_returns = 999
     where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501',
  null,
  'user A cannot set their own successful_returns'
);

-- The safe-mutation RPC cannot be used to smuggle a reputation change either: it has
-- no parameter for one, and it writes as the caller.
select lives_ok(
  $$ select public.update_my_profile(p_display_name => 'Via RPC') $$,
  'update_my_profile() updates the caller''s own safe fields'
);

select is(
  (select trust_score from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  50::numeric(5,2),
  'trust_score is still the platform default after an RPC profile update'
);

-- ---------------------------------------------------------------------------
-- Anonymous
-- ---------------------------------------------------------------------------

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

-- docs/authAndRls.md §105: anonymous users get landing/login only in the MVP, so
-- there is no anon SELECT policy and reads return nothing.
select is(
  (select count(*)::int from public.profiles),
  0,
  'anonymous users cannot read profiles'
);

reset role;

select * from finish();

rollback;
