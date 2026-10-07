-- Phase 1 — Authentication and Profiles
--
-- Implements the canonical `profiles` table (docs/database.md §15, §16), the
-- `handle_new_user()` profile-creation trigger (§86), the reusable
-- `set_updated_at()` trigger (§85), profiles RLS (docs/authAndRls.md §16),
-- backend-owned reputation protection (§17), the `update_my_profile()` safe
-- mutation function (§18), `public_profiles_view` (§72) and the `avatars`
-- storage bucket policies (§49, §50).
--
-- No items/matches/claims tables are created here; those belong to later phases.

-- ---------------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  username text unique,
  -- Storage object path (e.g. `<uid>/avatar.jpg`), not an expiring signed URL
  -- (docs/database.md §15 profiles.avatar_url, apiAndDataContracts.md §104).
  avatar_url text,
  trust_score numeric(5, 2) not null default 50,
  average_rating numeric(3, 2) not null default 0,
  rating_count integer not null default 0,
  successful_returns integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(btrim(display_name)) between 1 and 80),
  constraint profiles_username_format check (username is null or username ~ '^[a-z0-9_]{3,30}$'),
  constraint profiles_trust_score_range check (trust_score >= 0 and trust_score <= 100),
  constraint profiles_average_rating_range check (average_rating >= 0 and average_rating <= 5),
  constraint profiles_rating_count_nonneg check (rating_count >= 0),
  constraint profiles_successful_returns_nonneg check (successful_returns >= 0)
);

comment on table public.profiles is
  'Public and system-controlled profile data. id mirrors auth.users.id. Reputation columns are backend-owned.';

-- unique(username) creates its index automatically (docs/database.md §16).
create index if not exists profiles_trust_score_idx on public.profiles (trust_score desc);
create index if not exists profiles_created_at_idx on public.profiles (created_at desc);

-- ---------------------------------------------------------------------------
-- 2. updated_at trigger (docs/database.md §85)
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
begin
  new.updated_at := now();
  return new;
end;
$fn$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Reputation protection (docs/authAndRls.md §17, §67)
-- ---------------------------------------------------------------------------
-- An RLS UPDATE policy can restrict *which rows* a user may change, but not
-- which columns. This trigger is the column-level enforcement: a non-privileged
-- session that alters a reputation column is rejected regardless of which policy
-- admitted the UPDATE. Frontend omission is NOT relied upon.

create or replace function public.protect_profile_reputation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
begin
  -- Platform roles own these values and may recalculate them (trust/rating phase).
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;

  if new.trust_score is distinct from old.trust_score
    or new.average_rating is distinct from old.average_rating
    or new.rating_count is distinct from old.rating_count
    or new.successful_returns is distinct from old.successful_returns
  then
    raise exception
      'Reputation fields are managed by the platform and cannot be set directly'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id then
    raise exception 'Profile id cannot be changed' using errcode = '42501';
  end if;

  -- created_at is immutable from a user session.
  new.created_at := old.created_at;

  return new;
end;
$fn$;

drop trigger if exists profiles_protect_reputation on public.profiles;
create trigger profiles_protect_reputation
  before update on public.profiles
  for each row
  execute function public.protect_profile_reputation();

-- ---------------------------------------------------------------------------
-- 4. handle_new_user() (docs/database.md §86, docs/authAndRls.md §6)
-- ---------------------------------------------------------------------------
-- Runs as the function owner so it can insert into public.profiles without a
-- client-side insert path. The user id is taken from the inserted auth.users row,
-- never from client input. `on conflict do nothing` keeps it idempotent.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  resolved_display_name text;
begin
  resolved_display_name := nullif(
    btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')),
    ''
  );

  -- Fall back to the local part of the email, then to a generic label, so the
  -- not-null display_name constraint can never block signup.
  if resolved_display_name is null then
    resolved_display_name := nullif(btrim(split_part(coalesce(new.email, ''), '@', 1)), '');
  end if;
  if resolved_display_name is null then
    resolved_display_name := 'New member';
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, left(resolved_display_name, 80))
  on conflict (id) do nothing;

  return new;
end;
$fn$;

-- Never callable as an ad-hoc RPC; it exists only as an auth.users trigger.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 5. Profiles RLS (docs/authAndRls.md §16, §108)
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

-- SELECT: signed-in users may read public-safe profile data. Anonymous users get
-- landing/login only in the MVP scope (docs/authAndRls.md §105), so no anon policy
-- is created — anonymous reads are denied by default.
drop policy if exists profiles_select_public on public.profiles;
create policy profiles_select_public
  on public.profiles
  for select
  to authenticated
  using (true);

-- UPDATE: own row only. Both USING and WITH CHECK are required so the row cannot
-- be reassigned to another user. Column-level safety comes from the
-- protect_profile_reputation() trigger above.
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- INSERT: no policy. Profiles are created by handle_new_user() only
-- (docs/authAndRls.md §16 INSERT).
-- DELETE: no policy. Account deletion is a controlled workflow
-- (docs/authAndRls.md §16 DELETE).

-- ---------------------------------------------------------------------------
-- 6. update_my_profile() (docs/authAndRls.md §18)
-- ---------------------------------------------------------------------------
-- Safe-field-only mutation surface. Identity comes from auth.uid(), never from a
-- client-supplied id. SECURITY INVOKER, so the RLS policies above still apply.
-- A null argument leaves the column unchanged; clearing username/avatar uses the
-- dedicated boolean flags.

create or replace function public.update_my_profile(
  p_display_name text default null,
  p_username text default null,
  p_avatar_url text default null,
  p_clear_username boolean default false,
  p_clear_avatar_url boolean default false
)
returns public.profiles
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  caller uuid := (select auth.uid());
  updated public.profiles;
begin
  if caller is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.profiles p
  set
    display_name = coalesce(nullif(btrim(p_display_name), ''), p.display_name),
    username = case
      when p_clear_username then null
      when p_username is null then p.username
      else lower(btrim(p_username))
    end,
    avatar_url = case
      when p_clear_avatar_url then null
      when p_avatar_url is null then p.avatar_url
      else btrim(p_avatar_url)
    end
  where p.id = caller
  returning p.* into updated;

  if updated.id is null then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  return updated;
end;
$fn$;

revoke execute on function public.update_my_profile(text, text, text, boolean, boolean)
  from public, anon;
grant execute on function public.update_my_profile(text, text, text, boolean, boolean)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 7. public_profiles_view (docs/authAndRls.md §72, docs/database.md §77)
-- ---------------------------------------------------------------------------
-- security_invoker keeps the caller's RLS in force; a view would otherwise run as
-- its owner and bypass the policies above. No auth metadata is exposed.

create or replace view public.public_profiles_view
with (security_invoker = true)
as
select
  p.id,
  p.display_name,
  p.username,
  p.avatar_url,
  p.trust_score,
  p.average_rating,
  p.rating_count,
  p.successful_returns,
  p.created_at
from public.profiles p;

revoke all on public.public_profiles_view from anon;
grant select on public.public_profiles_view to authenticated;

-- ---------------------------------------------------------------------------
-- 8. avatars storage bucket (docs/authAndRls.md §48-§50)
-- ---------------------------------------------------------------------------
-- Path convention: avatars/<auth.uid()>/<filename>. A user may only write inside
-- their own folder. item-images belongs to the storage phase and is not created here.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists avatars_select_public on storage.objects;
create policy avatars_select_public
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'avatars');

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Upsert needs UPDATE alongside INSERT/SELECT, or replacing an avatar fails silently.
drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
