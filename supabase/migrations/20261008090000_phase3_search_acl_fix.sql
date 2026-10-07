-- ---------------------------------------------------------------------------
-- Phase 3 corrective migration — remove `anon` EXECUTE from search_public_items()
-- ---------------------------------------------------------------------------
-- Defect: `search_public_items()` carries an explicit EXECUTE grant to `anon`.
--
-- Cause: Postgres grants EXECUTE on a new function to PUBLIC by default, and
-- Supabase additionally grants it to `anon` and `authenticated` through default
-- privileges on the `public` schema. The Phase 3 migration
-- (20261007230000_phase3_search_and_discovery.sql §6) revoked only from `public`:
--
--     revoke execute on function public.search_public_items(...) from public;
--     grant  execute on function public.search_public_items(...) to authenticated;
--
-- Revoking the PUBLIC pseudo-role does NOT remove a role-specific grant, so the
-- live ACL retained `anon=X`. Verified against the linked project:
--
--     search_public_items -> {postgres=X/postgres,anon=X/postgres,
--                             authenticated=X/postgres,service_role=X/postgres}
--
-- Impact: currently NOT exploitable. The function is SECURITY INVOKER, so the
-- caller's own privileges and RLS still apply, and an `anon` session has neither a
-- SELECT grant on `public.items` (revoked in 20261007160000 §14) nor any SELECT
-- policy admitting it (`items_select_visible` is `to authenticated`). An anonymous
-- call therefore fails on table permissions rather than returning rows.
--
-- It is corrected anyway because the documented contract is authenticated-only
-- (docs/authAndRls.md §105 — anonymous visitors get landing/auth only in MVP
-- scope), and defence in depth should not rest on a second layer holding. If a
-- later phase ever adds an anon-readable policy to `items`, this stray grant would
-- silently become a public data endpoint.
--
-- Audit of every other project-owned function in `public` (same ACL query):
--
--   anon EXECUTE intentionally retained:
--     searchable_item_text(...)  pure text helper over caller-supplied values;
--                                reads no table, grants no visibility, and the
--                                Phase 3 migration grants it to anon explicitly
--                                and on purpose so the search predicate can name
--                                it (20261007230000 §5).
--     set_updated_at()           ) trigger functions. Postgres requires no EXECUTE
--     protect_item_fields()      ) grant to FIRE a trigger, and they are not
--     protect_profile_reputation() ) reachable as PostgREST RPCs because they
--     assert_item_event_date_not_future() ) return `trigger`. Left as created.
--
--   already correctly authenticated-only (no change needed):
--     get_my_item_detail, close_my_item, cancel_my_item, update_my_profile,
--     user_owns_item, storage_path_item_id
--
--   already correctly backend-only (no change needed):
--     assert_parent_item_type, handle_new_user
--
-- No platform or extension function is touched.

revoke execute on function public.search_public_items(
  text, public.listing_type, text, date, date, text, text, timestamptz, uuid, integer
) from anon;

-- Authenticated execution is the documented contract and is preserved. Re-granted
-- idempotently so this migration fully states the intended end ACL rather than
-- depending on the previous migration's grant surviving.
grant execute on function public.search_public_items(
  text, public.listing_type, text, date, date, text, text, timestamptz, uuid, integer
) to authenticated;

comment on function public.search_public_items is
  'Explore discovery read: public-safe columns only, ACTIVE listings only, keyset paginated on (created_at, id). SECURITY INVOKER, so RLS applies as the caller; the return type has no coordinate, closed_reason or closed_at column. EXECUTE is authenticated-only (docs/authAndRls.md §105).';

-- Rebuild portability: Phase 1 relied on legacy Supabase default table grants.
-- State the documented profile access explicitly, independent of CLI defaults.
-- profiles contains public-safe fields only; own-row RLS gates safe updates and
-- the reputation trigger remains a second boundary. No browser INSERT/DELETE.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, username, avatar_url) on public.profiles to authenticated;
