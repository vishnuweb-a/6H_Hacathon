-- ---------------------------------------------------------------------------
-- Phase 2 corrective migration — RPC privileges for the owner-side item RPCs
-- ---------------------------------------------------------------------------
-- Defect found by supabase/tests/database/listings_rls.test.sql once the suite
-- could run end to end against a local stack:
--
--   get_my_item_detail(), close_my_item() and cancel_my_item() all failed with
--   42501 "permission denied for table items" -- even for the legitimate owner.
--
-- Cause: `authenticated` holds only a COLUMN-level SELECT grant on public.items
-- (20261007160000, section "items_column_grants"), which deliberately withholds
-- latitude, longitude, closed_at and closed_reason so that exact coordinates can
-- never be read through a direct table select. The three RPCs were declared
-- SECURITY INVOKER and each does `select i.*` / `returning i.*`, which touches
-- those withheld columns, so the privilege check denied the call.
--
-- The withheld grants are correct and are NOT widened here. Instead the three
-- functions become SECURITY DEFINER, which is what the Phase 2 design already
-- documents for get_my_item_detail: "the only path by which coordinates reach a
-- client" (docs/storageAndMedia.md / apiAndDataContracts.md §28, §92). This
-- matches the existing SECURITY DEFINER pattern used by update_my_profile().
--
-- Authorization is NOT relaxed. Every function keeps, and this migration
-- preserves verbatim:
--   * `caller is null` -> 42501 (anonymous callers rejected)
--   * `and i.user_id = caller` on the lookup -> a non-owner gets P0002
--     "Listing not found" and learns nothing about the row
--   * the ACTIVE-only status guard, so RECOVERY_IN_PROGRESS / RETURNED remain
--     unreachable from the browser
-- The ownership predicate now does the authorization work explicitly rather than
-- leaning on RLS, so each UPDATE is additionally re-qualified with
-- `and i.user_id = caller` as defence in depth.
--
-- Execute grants stay revoked from public/anon and granted to authenticated.

create or replace function public.get_my_item_detail(p_item_id uuid)
returns public.items
language plpgsql
stable
security definer
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

create or replace function public.close_my_item(
  p_item_id uuid,
  p_reason text default null
)
returns public.items
language plpgsql
security definer
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
    and i.user_id = caller
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
security definer
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
    and i.user_id = caller
  returning i.* into updated;

  return updated;
end;
$fn$;

revoke execute on function public.cancel_my_item(uuid, text) from public, anon;
grant execute on function public.cancel_my_item(uuid, text) to authenticated;

comment on function public.get_my_item_detail(uuid) is
  'Owner-only full item read, coordinates included. SECURITY DEFINER with an explicit user_id = auth.uid() check; non-owners receive P0002.';
comment on function public.close_my_item(uuid, text) is
  'Owner closes their own ACTIVE listing. SECURITY DEFINER with an explicit ownership check; RECOVERY_IN_PROGRESS and RETURNED are unreachable here.';
comment on function public.cancel_my_item(uuid, text) is
  'Owner cancels their own ACTIVE listing. SECURITY DEFINER with an explicit ownership check; RECOVERY_IN_PROGRESS and RETURNED are unreachable here.';
