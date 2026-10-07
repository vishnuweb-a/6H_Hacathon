-- Phase 2 — Listings and Media
--
-- Implements the canonical single-listing-table design (docs/database.md §17–§24):
-- `items` (LOST | FOUND), `item_images`, `found_item_private_details`,
-- `lost_item_private_details` and `verification_questions`; their RLS
-- (docs/authAndRls.md §19–§26), the
-- `public_items_view` safe projection (§73, docs/database.md §78), the controlled
-- close/cancel surface (docs/apiAndDataContracts.md §28, §92) and the private
-- `item-images` storage bucket with ownership-verified policies
-- (docs/storageAndMedia.md §7, §85, docs/authAndRls.md §51–§53).
--
-- Out of scope here (later phases): matches, claims, claim answers, recoveries,
-- conversations, messages, handovers, ratings, notifications.

-- ---------------------------------------------------------------------------
-- 1. Enums (docs/database.md §6, §7, §71 — the FINAL status set, AGENTS.md §6)
-- ---------------------------------------------------------------------------
-- MATCH_FOUND and CLAIM_PENDING are deliberately absent: they are derived from
-- `matches` / `claims`, never persisted (docs/database.md §71).

do $$
begin
  if not exists (select 1 from pg_type where typname = 'listing_type') then
    create type public.listing_type as enum ('LOST', 'FOUND');
  end if;
  if not exists (select 1 from pg_type where typname = 'listing_status') then
    create type public.listing_status as enum (
      'ACTIVE',
      'RECOVERY_IN_PROGRESS',
      'RETURNED',
      'CLOSED',
      'CANCELLED'
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. items (docs/database.md §17, §18)
-- ---------------------------------------------------------------------------

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_type public.listing_type not null,
  title varchar(120) not null,
  category text not null,
  brand varchar(120),
  color varchar(80),
  description text not null,
  event_date date not null,
  event_time time,
  location_text varchar(255) not null,
  -- Stored for matching only. Never exposed through public_items_view
  -- (docs/securityAndService.md §60, §61).
  latitude double precision,
  longitude double precision,
  status public.listing_status not null default 'ACTIVE',
  closed_reason text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint items_title_length check (char_length(btrim(title)) between 3 and 120),
  constraint items_description_length check (char_length(btrim(description)) between 10 and 1000),
  constraint items_location_text_length check (char_length(btrim(location_text)) between 2 and 255),
  constraint items_category_allowed check (category in (
    'electronics', 'wallet', 'id_card', 'keys', 'bag',
    'clothing', 'book', 'document', 'accessory', 'other'
  )),
  constraint items_latitude_range check (latitude is null or (latitude >= -90 and latitude <= 90)),
  constraint items_longitude_range check (longitude is null or (longitude >= -180 and longitude <= 180)),
  -- Coordinates are a pair or absent; one half alone is a data bug.
  constraint items_coordinates_paired check (
    (latitude is null and longitude is null) or (latitude is not null and longitude is not null)
  ),
  constraint items_closed_reason_length check (closed_reason is null or char_length(closed_reason) <= 500),
  -- closed_at is set exactly for the terminal states (docs/database.md §94).
  constraint items_closed_at_matches_status check (
    (status in ('CLOSED', 'CANCELLED', 'RETURNED') and closed_at is not null)
    or (status in ('ACTIVE', 'RECOVERY_IN_PROGRESS') and closed_at is null)
  )
);

comment on table public.items is
  'Lost Reports and Found Listings. listing_type distinguishes them. latitude/longitude are private and excluded from public_items_view.';
comment on column public.items.latitude is
  'Private. Matching only — never exposed through a public projection (docs/securityAndService.md §60).';

-- docs/database.md §19 and §101.
create index if not exists items_user_id_idx on public.items (user_id);
create index if not exists items_status_idx on public.items (status);
create index if not exists items_category_idx on public.items (category);
create index if not exists items_event_date_idx on public.items (event_date desc);
create index if not exists items_created_at_idx on public.items (created_at desc);
create index if not exists items_type_status_idx on public.items (listing_type, status);
create index if not exists items_category_type_status_idx on public.items (category, listing_type, status);
create index if not exists items_event_date_type_idx on public.items (event_date desc, listing_type);
-- Explore reads active listings newest-first; this serves that path directly.
create index if not exists items_active_created_at_idx
  on public.items (created_at desc)
  where status = 'ACTIVE';

-- event_date cannot be in the future. This is a trigger rather than a CHECK
-- constraint because Postgres rejects non-immutable functions such as now() in a
-- CHECK, and "not in the future" is only meaningful relative to the current date.

create or replace function public.assert_item_event_date_not_future()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
begin
  if new.event_date > ((now() at time zone 'utc')::date + 1) then
    raise exception 'The date cannot be in the future' using errcode = '22007';
  end if;
  return new;
end;
$fn$;

drop trigger if exists items_event_date_not_future on public.items;
create trigger items_event_date_not_future
  before insert or update of event_date on public.items
  for each row
  execute function public.assert_item_event_date_not_future();

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
  before update on public.items
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Immutable / backend-owned item fields (docs/authAndRls.md §21, §70)
-- ---------------------------------------------------------------------------
-- RLS restricts which ROWS a user may update, never which COLUMNS. This trigger is
-- the column-level enforcement, mirroring protect_profile_reputation() from Phase 1.
-- A user session may move a listing only between the states it legitimately owns;
-- RETURNED and RECOVERY_IN_PROGRESS belong to the backend recovery flow.

create or replace function public.protect_item_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
begin
  -- Platform roles own lifecycle transitions driven by recovery/claims.
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;

  if new.user_id is distinct from old.user_id then
    raise exception 'Listing ownership cannot be transferred' using errcode = '42501';
  end if;

  if new.listing_type is distinct from old.listing_type then
    raise exception 'Listing type cannot be changed after creation' using errcode = '42501';
  end if;

  if new.id is distinct from old.id then
    raise exception 'Listing id cannot be changed' using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    -- A user session requests closure through close_my_item()/cancel_my_item(),
    -- which run as SECURITY INVOKER and therefore pass through here. Only the
    -- owner-initiated terminal transitions out of ACTIVE are permitted.
    if not (old.status = 'ACTIVE' and new.status in ('CLOSED', 'CANCELLED')) then
      raise exception
        'Listing status % -> % is set by the platform, not directly',
        old.status, new.status
        using errcode = '42501';
    end if;
  end if;

  -- System timestamps are not user-writable.
  new.created_at := old.created_at;

  return new;
end;
$fn$;

drop trigger if exists items_protect_fields on public.items;
create trigger items_protect_fields
  before update on public.items
  for each row
  execute function public.protect_item_fields();

-- ---------------------------------------------------------------------------
-- 4. item_images (docs/database.md §20, §21)
-- ---------------------------------------------------------------------------

create table if not exists public.item_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  -- Object path inside the `item-images` bucket, never a signed URL
  -- (docs/storageAndMedia.md §24, §25).
  storage_path text not null,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  constraint item_images_storage_path_length check (char_length(storage_path) between 1 and 1024),
  -- Max 3 images per item (docs/storageAndMedia.md §15) — positions 0..2.
  constraint item_images_position_range check (position between 0 and 2),
  constraint item_images_unique_position unique (item_id, position),
  constraint item_images_unique_path unique (storage_path)
);

comment on table public.item_images is
  'Storage object paths for item photos. Ordering is deterministic via (position, created_at).';

create index if not exists item_images_item_id_position_idx
  on public.item_images (item_id, position);

-- ---------------------------------------------------------------------------
-- 5. found_item_private_details (docs/database.md §22)
-- ---------------------------------------------------------------------------
-- The most sensitive table in this phase. One row per FOUND listing, readable only
-- by the Finder (docs/authAndRls.md §24, §25).

create table if not exists public.found_item_private_details (
  item_id uuid primary key references public.items (id) on delete cascade,
  private_notes text,
  serial_fragment text,
  unique_markings text,
  private_contents text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint found_private_notes_length check (private_notes is null or char_length(private_notes) <= 1000),
  constraint found_serial_fragment_length check (serial_fragment is null or char_length(serial_fragment) <= 120),
  constraint found_unique_markings_length check (unique_markings is null or char_length(unique_markings) <= 1000),
  constraint found_private_contents_length check (private_contents is null or char_length(private_contents) <= 1000),
  -- An all-empty row carries no verification value.
  constraint found_private_details_not_empty check (
    coalesce(btrim(private_notes), '') <> ''
    or coalesce(btrim(serial_fragment), '') <> ''
    or coalesce(btrim(unique_markings), '') <> ''
    or coalesce(btrim(private_contents), '') <> ''
  )
);

comment on table public.found_item_private_details is
  'Finder-only ownership verification details. Never exposed publicly, in matching explanations, or in any public DTO.';

drop trigger if exists found_item_private_details_set_updated_at on public.found_item_private_details;
create trigger found_item_private_details_set_updated_at
  before update on public.found_item_private_details
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. verification_questions (docs/database.md §23, §24)
-- ---------------------------------------------------------------------------
-- Question TEXT only. Expected answers are never stored here — verification
-- compares a claimant's answers against the Finder's own knowledge
-- (docs/securityAndService.md §25).

create table if not exists public.verification_questions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  question text not null,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  constraint verification_questions_text_length check (char_length(btrim(question)) between 5 and 300),
  constraint verification_questions_position_range check (position between 0 and 4),
  constraint verification_questions_unique_position unique (item_id, position)
);

comment on table public.verification_questions is
  'Finder-authored ownership questions for a FOUND listing. Question text only; expected answers are never stored.';

create index if not exists verification_questions_item_id_position_idx
  on public.verification_questions (item_id, position);

-- ---------------------------------------------------------------------------
-- 6b. lost_item_private_details (docs/database.md §22b)
-- ---------------------------------------------------------------------------
-- The LOST-side mirror of found_item_private_details, and equally sensitive. The
-- approved LOST wizard collects the same four distinguishing-characteristic fields
-- the FOUND wizard does; without this table they would be discarded at submit.
--
-- These are the OWNER's private ownership evidence: the details only the person who
-- lost the item would know. A Finder must never be shown them, or the verification
-- question "can you describe what is inside?" answers itself. They are therefore
-- excluded from public_items_view, Explore, public listing detail and matching
-- explanations, exactly as the FOUND table is, and are not fed into matching.
-- The Claims phase compares a claimant's statement against them server-side; it
-- does not reveal them.

create table if not exists public.lost_item_private_details (
  item_id uuid primary key references public.items (id) on delete cascade,
  private_notes text,
  serial_fragment text,
  unique_markings text,
  private_contents text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lost_private_notes_length check (private_notes is null or char_length(private_notes) <= 1000),
  constraint lost_serial_fragment_length check (serial_fragment is null or char_length(serial_fragment) <= 120),
  constraint lost_unique_markings_length check (unique_markings is null or char_length(unique_markings) <= 1000),
  constraint lost_private_contents_length check (private_contents is null or char_length(private_contents) <= 1000),
  -- An all-empty row carries no ownership-evidence value.
  constraint lost_private_details_not_empty check (
    coalesce(btrim(private_notes), '') <> ''
    or coalesce(btrim(serial_fragment), '') <> ''
    or coalesce(btrim(unique_markings), '') <> ''
    or coalesce(btrim(private_contents), '') <> ''
  )
);

comment on table public.lost_item_private_details is
  'Owner-only distinguishing characteristics for a LOST listing. Private ownership evidence for later claim verification. Never exposed publicly, in Explore, in matching explanations, or in any public DTO.';

drop trigger if exists lost_item_private_details_set_updated_at on public.lost_item_private_details;
create trigger lost_item_private_details_set_updated_at
  before update on public.lost_item_private_details
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. Parent listing-type enforcement (docs/database.md §84, docs/authAndRls.md §26)
-- ---------------------------------------------------------------------------
-- A foreign key cannot express "the parent must be a FOUND item", so a trigger
-- enforces it. The required type is a trigger argument rather than a literal, so
-- the FOUND-side children and the LOST-side private details share one mechanism
-- instead of drifting apart. This is cross-row correctness, not authorization —
-- RLS below handles who may write.

create or replace function public.assert_parent_item_type()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  required_type public.listing_type := tg_argv[0]::public.listing_type;
  parent_type public.listing_type;
begin
  select i.listing_type into parent_type
  from public.items i
  where i.id = new.item_id;

  if parent_type is null then
    raise exception 'Listing % does not exist', new.item_id using errcode = '23503';
  end if;

  if parent_type <> required_type then
    raise exception '% may only be attached to a % listing', tg_table_name, required_type
      using errcode = '23514';
  end if;

  return new;
end;
$fn$;

-- SECURITY DEFINER purely so the lookup is not itself filtered by the caller's
-- RLS (an owner can always see their own item, but the function must not depend on
-- that). It performs no mutation and is never callable as an RPC.
revoke execute on function public.assert_parent_item_type()
  from public, anon, authenticated;

drop trigger if exists found_item_private_details_require_found on public.found_item_private_details;
create trigger found_item_private_details_require_found
  before insert or update of item_id on public.found_item_private_details
  for each row
  execute function public.assert_parent_item_type('FOUND');

drop trigger if exists verification_questions_require_found on public.verification_questions;
create trigger verification_questions_require_found
  before insert or update of item_id on public.verification_questions
  for each row
  execute function public.assert_parent_item_type('FOUND');

-- The LOST mirror: private owner evidence may only hang off a LOST listing, so a
-- Finder cannot attach "owner evidence" to their own FOUND listing.
drop trigger if exists lost_item_private_details_require_lost on public.lost_item_private_details;
create trigger lost_item_private_details_require_lost
  before insert or update of item_id on public.lost_item_private_details
  for each row
  execute function public.assert_parent_item_type('LOST');

-- ---------------------------------------------------------------------------
-- 8. Ownership helper (docs/authAndRls.md §23, skill: security-rls-performance)
-- ---------------------------------------------------------------------------
-- Child-table policies must verify ownership through the PARENT item, never from a
-- client-supplied user id. A SECURITY DEFINER helper keeps that lookup out of the
-- caller's RLS (otherwise the items SELECT policy would also have to admit the row)
-- and makes the check a single indexed lookup per statement.

create or replace function public.user_owns_item(p_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1
    from public.items i
    where i.id = p_item_id
      and i.user_id = (select auth.uid())
  );
$fn$;

comment on function public.user_owns_item(uuid) is
  'True when the calling session owns the given listing. Identity comes from auth.uid(), never from an argument.';

-- Callable by signed-in sessions because the RLS policies below invoke it. It
-- leaks nothing: it answers only about the caller''s own ownership.
revoke execute on function public.user_owns_item(uuid) from public, anon;
grant execute on function public.user_owns_item(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. items RLS (docs/authAndRls.md §19, §108)
-- ---------------------------------------------------------------------------

alter table public.items enable row level security;

-- SELECT: a signed-in member sees publicly discoverable listings plus every one of
-- their own (any status). Anonymous visitors get landing/auth only in MVP scope
-- (docs/authAndRls.md §105), so no anon policy exists and anon reads are denied.
--
-- NOTE: this policy admits the ROW, including latitude/longitude, to a non-owner.
-- Column-level privacy is enforced by granting non-owners access through
-- `public_items_view` only — see the GRANTs below, which revoke direct table
-- SELECT from `authenticated` entirely.
drop policy if exists items_select_visible on public.items;
create policy items_select_visible
  on public.items
  for select
  to authenticated
  using (
    status in ('ACTIVE', 'RECOVERY_IN_PROGRESS', 'RETURNED')
    or user_id = (select auth.uid())
  );

-- INSERT: own listings only. user_id is checked against auth.uid(), so a
-- client-supplied id for somebody else is rejected (docs/authAndRls.md §58).
-- New listings always start ACTIVE; the check keeps a client from inserting
-- straight into a lifecycle state it does not own.
drop policy if exists items_insert_own on public.items;
create policy items_insert_own
  on public.items
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'ACTIVE'
    and closed_at is null
    and closed_reason is null
  );

-- UPDATE: own row only, and it must stay owned. Which COLUMNS may change is
-- enforced by protect_item_fields() above.
drop policy if exists items_update_own on public.items;
create policy items_update_own
  on public.items
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- DELETE: no policy. Listings are closed or cancelled, never hard-deleted
-- (docs/authAndRls.md §22, docs/database.md §93).

-- ---------------------------------------------------------------------------
-- 10. item_images RLS (docs/authAndRls.md §23)
-- ---------------------------------------------------------------------------

alter table public.item_images enable row level security;

-- SELECT: readable when the parent item is visible to the caller. The subquery
-- repeats the items visibility rule rather than selecting from `items` under the
-- caller's RLS, so it stays a single indexed lookup.
drop policy if exists item_images_select_visible on public.item_images;
create policy item_images_select_visible
  on public.item_images
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.items i
      where i.id = item_images.item_id
        and (
          i.status in ('ACTIVE', 'RECOVERY_IN_PROGRESS', 'RETURNED')
          or i.user_id = (select auth.uid())
        )
    )
  );

-- INSERT / UPDATE / DELETE: parent ownership, verified server-side.
drop policy if exists item_images_insert_own on public.item_images;
create policy item_images_insert_own
  on public.item_images
  for insert
  to authenticated
  with check ((select public.user_owns_item(item_images.item_id)));

drop policy if exists item_images_update_own on public.item_images;
create policy item_images_update_own
  on public.item_images
  for update
  to authenticated
  using ((select public.user_owns_item(item_images.item_id)))
  with check ((select public.user_owns_item(item_images.item_id)));

drop policy if exists item_images_delete_own on public.item_images;
create policy item_images_delete_own
  on public.item_images
  for delete
  to authenticated
  using ((select public.user_owns_item(item_images.item_id)));

-- ---------------------------------------------------------------------------
-- 11. found_item_private_details RLS (docs/authAndRls.md §24, §25)
-- ---------------------------------------------------------------------------
-- Finder only, for every verb. Claimants never get direct SELECT here; the
-- verification flow (Claims phase) compares answers server-side without revealing
-- these values.

alter table public.found_item_private_details enable row level security;

drop policy if exists found_private_details_select_finder on public.found_item_private_details;
create policy found_private_details_select_finder
  on public.found_item_private_details
  for select
  to authenticated
  using ((select public.user_owns_item(found_item_private_details.item_id)));

drop policy if exists found_private_details_insert_finder on public.found_item_private_details;
create policy found_private_details_insert_finder
  on public.found_item_private_details
  for insert
  to authenticated
  with check ((select public.user_owns_item(found_item_private_details.item_id)));

drop policy if exists found_private_details_update_finder on public.found_item_private_details;
create policy found_private_details_update_finder
  on public.found_item_private_details
  for update
  to authenticated
  using ((select public.user_owns_item(found_item_private_details.item_id)))
  with check ((select public.user_owns_item(found_item_private_details.item_id)));

drop policy if exists found_private_details_delete_finder on public.found_item_private_details;
create policy found_private_details_delete_finder
  on public.found_item_private_details
  for delete
  to authenticated
  using ((select public.user_owns_item(found_item_private_details.item_id)));

-- ---------------------------------------------------------------------------
-- 11b. lost_item_private_details RLS (docs/authAndRls.md §25b)
-- ---------------------------------------------------------------------------
-- Owner only, for every verb, mirroring the FOUND policies above. Ownership is
-- resolved through the PARENT item (item -> user_id -> auth.uid()) by
-- user_owns_item(); no client-supplied user id takes part in the decision, and
-- there is no column on this table a client could use to assert one.
--
-- A second authenticated user fails user_owns_item() and gets nothing; an
-- anonymous caller has no policy at all and is denied by default, with the grants
-- in section 14 revoking anon access outright.

alter table public.lost_item_private_details enable row level security;

drop policy if exists lost_private_details_select_owner on public.lost_item_private_details;
create policy lost_private_details_select_owner
  on public.lost_item_private_details
  for select
  to authenticated
  using ((select public.user_owns_item(lost_item_private_details.item_id)));

drop policy if exists lost_private_details_insert_owner on public.lost_item_private_details;
create policy lost_private_details_insert_owner
  on public.lost_item_private_details
  for insert
  to authenticated
  with check ((select public.user_owns_item(lost_item_private_details.item_id)));

drop policy if exists lost_private_details_update_owner on public.lost_item_private_details;
create policy lost_private_details_update_owner
  on public.lost_item_private_details
  for update
  to authenticated
  using ((select public.user_owns_item(lost_item_private_details.item_id)))
  with check ((select public.user_owns_item(lost_item_private_details.item_id)));

drop policy if exists lost_private_details_delete_owner on public.lost_item_private_details;
create policy lost_private_details_delete_owner
  on public.lost_item_private_details
  for delete
  to authenticated
  using ((select public.user_owns_item(lost_item_private_details.item_id)));

-- ---------------------------------------------------------------------------
-- 12. verification_questions RLS (docs/authAndRls.md §26)
-- ---------------------------------------------------------------------------
-- Write: Finder only. Read: Finder only in Phase 2.
--
-- docs/authAndRls.md §26 says questions "may be visible to eligible claimants" —
-- eligibility is defined by the Claims phase, which does not exist yet. Until that
-- rule has a definition, the restricted reading is the safe one: a question such as
-- "what was engraved inside?" is itself a hint about the item. The Claims phase
-- widens this policy; it does not have to loosen a leak.

alter table public.verification_questions enable row level security;

drop policy if exists verification_questions_select_finder on public.verification_questions;
create policy verification_questions_select_finder
  on public.verification_questions
  for select
  to authenticated
  using ((select public.user_owns_item(verification_questions.item_id)));

drop policy if exists verification_questions_insert_finder on public.verification_questions;
create policy verification_questions_insert_finder
  on public.verification_questions
  for insert
  to authenticated
  with check ((select public.user_owns_item(verification_questions.item_id)));

drop policy if exists verification_questions_update_finder on public.verification_questions;
create policy verification_questions_update_finder
  on public.verification_questions
  for update
  to authenticated
  using ((select public.user_owns_item(verification_questions.item_id)))
  with check ((select public.user_owns_item(verification_questions.item_id)));

drop policy if exists verification_questions_delete_finder on public.verification_questions;
create policy verification_questions_delete_finder
  on public.verification_questions
  for delete
  to authenticated
  using ((select public.user_owns_item(verification_questions.item_id)));

-- ---------------------------------------------------------------------------
-- 13. public_items_view (docs/database.md §78, docs/authAndRls.md §73)
-- ---------------------------------------------------------------------------
-- The safe-by-construction projection for discovery. latitude/longitude are absent
-- from the SELECT list, so no caller of this view can receive them regardless of
-- what the frontend asks for (docs/securityAndService.md §24, §61).
--
-- security_invoker keeps the caller's RLS in force; without it the view would run
-- as its owner and bypass the items policy above.

create or replace view public.public_items_view
with (security_invoker = true)
as
select
  i.id,
  i.user_id,
  i.listing_type,
  i.title,
  i.category,
  i.brand,
  i.color,
  i.description,
  i.event_date,
  i.event_time,
  i.location_text,
  i.status,
  i.created_at,
  i.updated_at
from public.items i;

comment on view public.public_items_view is
  'Public-safe listing projection. Deliberately omits latitude/longitude, closed_reason and closed_at.';

-- ---------------------------------------------------------------------------
-- 14. Table grants — the column-level privacy boundary
-- ---------------------------------------------------------------------------
-- `authenticated` has NO direct SELECT on public.items. Discovery goes through
-- public_items_view, which cannot return coordinates. An owner reads their own
-- coordinates through get_my_item_detail() below. This is what makes the privacy
-- guarantee structural rather than a matter of which columns the client requested
-- (docs/securityAndService.md §24 — "security must not depend on React simply
-- hiding fields").

revoke all on public.items from anon, authenticated;
grant insert, update on public.items to authenticated;
-- Column-level SELECT, deliberately excluding latitude, longitude, closed_reason and
-- closed_at. An INSERT ... RETURNING needs SELECT on the columns it returns, so a
-- create can echo back its own id and status; a `select *` on the table still fails,
-- and the private columns remain unreachable through PostgREST at any row.
-- The full owner row comes from get_my_item_detail() instead.
grant select (
  id, user_id, listing_type, title, category, brand, color, description,
  event_date, event_time, location_text, status, created_at, updated_at
) on public.items to authenticated;

revoke all on public.public_items_view from anon;
grant select on public.public_items_view to authenticated;

revoke all on public.item_images from anon;
grant select, insert, update, delete on public.item_images to authenticated;

revoke all on public.found_item_private_details from anon;
grant select, insert, update, delete on public.found_item_private_details to authenticated;

revoke all on public.lost_item_private_details from anon;
grant select, insert, update, delete on public.lost_item_private_details to authenticated;

revoke all on public.verification_questions from anon;
grant select, insert, update, delete on public.verification_questions to authenticated;

-- ---------------------------------------------------------------------------
-- 15. get_my_item_detail() — owner read, including private columns
-- ---------------------------------------------------------------------------
-- SECURITY INVOKER: the items SELECT policy still applies, and the explicit
-- ownership check means a non-owner gets nothing even though the function returns
-- the full row shape. This is the only path by which coordinates reach a client.

create or replace function public.get_my_item_detail(p_item_id uuid)
returns public.items
language plpgsql
stable
security invoker
set search_path = ''
as $fn$
declare
  caller uuid := (select auth.uid());
  found_item public.items;
begin
  if caller is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select i.* into found_item
  from public.items i
  where i.id = p_item_id
    and i.user_id = caller;

  if found_item.id is null then
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;

  return found_item;
end;
$fn$;

revoke execute on function public.get_my_item_detail(uuid) from public, anon;
grant execute on function public.get_my_item_detail(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 16. close_my_item() / cancel_my_item() (docs/apiAndDataContracts.md §28, §92)
-- ---------------------------------------------------------------------------
-- An explicit action rather than a generic status update. SECURITY INVOKER, so RLS
-- and protect_item_fields() both still apply — the function is the documented
-- surface, not a privilege escalation. Idempotent: closing an already-closed
-- listing returns it unchanged instead of raising (docs/supabaseArchitecture.md §51).
--
-- CLOSED  = the owner closed the listing themselves (found it elsewhere, no longer
--           relevant).
-- CANCELLED = the listing should not have been posted (mistake, duplicate).
-- RETURNED is NOT reachable here: it means a completed platform recovery
-- (docs/database.md §94) and belongs to the recovery flow.

create or replace function public.close_my_item(
  p_item_id uuid,
  p_reason text default null
)
returns public.items
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  caller uuid := (select auth.uid());
  current_item public.items;
  updated public.items;
begin
  if caller is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select i.* into current_item
  from public.items i
  where i.id = p_item_id
    and i.user_id = caller;

  if current_item.id is null then
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;

  -- Idempotent: already closed is success, not a conflict.
  if current_item.status = 'CLOSED' then
    return current_item;
  end if;

  if current_item.status <> 'ACTIVE' then
    raise exception 'A listing that is % cannot be closed here', current_item.status
      using errcode = '22023';
  end if;

  update public.items i
  set status = 'CLOSED',
      closed_reason = nullif(btrim(p_reason), ''),
      closed_at = now()
  where i.id = p_item_id
  returning i.* into updated;

  return updated;
end;
$fn$;

revoke execute on function public.close_my_item(uuid, text) from public, anon;
grant execute on function public.close_my_item(uuid, text) to authenticated;

create or replace function public.cancel_my_item(
  p_item_id uuid,
  p_reason text default null
)
returns public.items
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  caller uuid := (select auth.uid());
  current_item public.items;
  updated public.items;
begin
  if caller is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select i.* into current_item
  from public.items i
  where i.id = p_item_id
    and i.user_id = caller;

  if current_item.id is null then
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;

  if current_item.status = 'CANCELLED' then
    return current_item;
  end if;

  if current_item.status <> 'ACTIVE' then
    raise exception 'A listing that is % cannot be cancelled here', current_item.status
      using errcode = '22023';
  end if;

  update public.items i
  set status = 'CANCELLED',
      closed_reason = nullif(btrim(p_reason), ''),
      closed_at = now()
  where i.id = p_item_id
  returning i.* into updated;

  return updated;
end;
$fn$;

revoke execute on function public.cancel_my_item(uuid, text) from public, anon;
grant execute on function public.cancel_my_item(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 17. item-images storage bucket (docs/storageAndMedia.md §7, §10, §85)
-- ---------------------------------------------------------------------------
-- PRIVATE bucket + signed URLs: "Private is the safer default"
-- (docs/storageAndMedia.md §10). Path: {user_id}/{item_id}/{uuid}.webp.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'item-images',
  'item-images',
  false,
  5242880, -- 5 MB before client processing (docs/storageAndMedia.md §14)
  array['image/jpeg', 'image/png', 'image/webp'] -- no SVG (§13)
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 18. item-images storage policies (docs/authAndRls.md §51–§53)
-- ---------------------------------------------------------------------------
-- The path prefix alone is NOT the authorization ("file paths are not security",
-- docs/storageAndMedia.md §3.4). Every policy checks BOTH that folder 1 is the
-- caller's own uid AND, through user_owns_item(), that folder 2 is a listing the
-- caller actually owns. Changing the path to another user's folder fails the first
-- test; guessing an item id you do not own fails the second.

create or replace function public.storage_path_item_id(p_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $fn$
declare
  segment text := (storage.foldername(p_name))[2];
begin
  -- A malformed path is not an error here; it simply owns nothing.
  return segment::uuid;
exception
  when invalid_text_representation then
    return null;
  when others then
    return null;
end;
$fn$;

revoke execute on function public.storage_path_item_id(text) from public, anon;
grant execute on function public.storage_path_item_id(text) to authenticated;

-- SELECT: owner only. Everyone else reads these images through a signed URL the
-- service layer mints, so there is no public read policy on the object itself.
drop policy if exists item_images_storage_select_own on storage.objects;
create policy item_images_storage_select_own
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.user_owns_item(public.storage_path_item_id(name)))
  );

drop policy if exists item_images_storage_insert_own on storage.objects;
create policy item_images_storage_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.user_owns_item(public.storage_path_item_id(name)))
  );

-- Upsert needs INSERT + SELECT + UPDATE together, or replacing an image fails
-- silently (supabase skill, storage access control).
drop policy if exists item_images_storage_update_own on storage.objects;
create policy item_images_storage_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.user_owns_item(public.storage_path_item_id(name)))
  )
  with check (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.user_owns_item(public.storage_path_item_id(name)))
  );

drop policy if exists item_images_storage_delete_own on storage.objects;
create policy item_images_storage_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.user_owns_item(public.storage_path_item_id(name)))
  );
