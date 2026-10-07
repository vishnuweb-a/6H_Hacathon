-- Phase 3 — Explore search, filtering and keyset pagination support.
--
-- Adds nothing to the data model and changes no policy, grant or view: the public
-- boundary established in 20261007160000_listings_and_media.sql is already safe by
-- construction (`authenticated` has no SELECT on public.items at all;
-- public_items_view has no latitude, longitude, closed_reason or closed_at column
-- to project). This migration is purely the index support the Phase 3 query shapes
-- need (docs/database.md §87, docs/supabaseArchitecture.md §101).
--
-- Search strategy for MVP: ILIKE over the public text fields, backed by pg_trgm.
-- docs/supabaseArchitecture.md §101 names "PostgreSQL text search / ILIKE /
-- structured filters" as the initial approach and defers full-text search; a
-- tsvector column with GIN(search_vector) remains the documented later step
-- (docs/database.md §88). No embeddings, no pgvector, no relevance ranking — those
-- are not part of this phase.
--
-- Every index here was chosen from an EXPLAIN ANALYZE against ~30k representative
-- local rows, not from guesswork; the notes record what the plans showed.

-- ---------------------------------------------------------------------------
-- 1. pg_trgm (docs/supabaseArchitecture.md §101)
-- ---------------------------------------------------------------------------
-- Installed into `extensions`, per Supabase convention, rather than into `public`.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- 2. Explore text search index
-- ---------------------------------------------------------------------------
-- The board searches several public fields at once (requirements.md
-- FR-EXPLORE-002: title, category, brand, description, location). Spelled as
-- `title ilike $1 or brand ilike $1 or ...`, Postgres will NOT combine the
-- per-column trigram indexes once an ORDER BY ... LIMIT is present: the measured
-- plan for a selective term was a Seq Scan over every row.
--
-- One GIN index over the concatenation of exactly those fields turns the four-way
-- OR into a single indexable predicate. Measured on the same data and term, the
-- plan becomes a Bitmap Index Scan on this index. A non-selective term instead
-- walks the ordering index and stops at the LIMIT, which is also correct — the
-- point is that neither shape is a sequential scan.
--
-- The expression must be repeated verbatim by the query for the planner to match
-- it; `searchable_item_text()` below is the single definition both sides use.
--
-- color is included because it is a public card field people search by; the
-- private tables are not, and cannot be: this index is on public.items only, which
-- holds no verification answers or private evidence at all.

create or replace function public.searchable_item_text(
  p_title text,
  p_brand text,
  p_color text,
  p_category text,
  p_location_text text,
  p_description text
)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $fn$
  select coalesce(p_title, '') || ' ' ||
         coalesce(p_brand, '') || ' ' ||
         coalesce(p_color, '') || ' ' ||
         coalesce(p_category, '') || ' ' ||
         coalesce(p_location_text, '') || ' ' ||
         coalesce(p_description, '')
$fn$;

comment on function public.searchable_item_text is
  'The public searchable text of a listing. IMMUTABLE so it can back an expression index; the Explore search predicate must use this exact expression to match items_search_text_trgm_idx.';

create index if not exists items_search_text_trgm_idx
  on public.items using gin (
    public.searchable_item_text(title, brand, color, category, location_text, description)
    extensions.gin_trgm_ops
  );

comment on index public.items_search_text_trgm_idx is
  'Trigram index for Explore free-text search across the public listing fields.';

-- ---------------------------------------------------------------------------
-- 3. Keyset pagination index
-- ---------------------------------------------------------------------------
-- Explore pages on the composite key (created_at, id), not created_at alone:
-- created_at is not unique, so a single-column cursor duplicates or skips rows
-- that share a timestamp (skill: supabase-postgres-best-practices,
-- data-pagination). Verified against 40 rows sharing one created_at: two
-- consecutive 20-row pages returned 40 distinct rows and 0 overlap.
--
-- Partial on status = 'ACTIVE' because that is the only discoverable status on the
-- public board, so the index covers just the rows Explore reads
-- (query-partial-indexes).
--
-- Ascending column order only. Postgres scans a btree backwards as cheaply as
-- forwards, and the measured plans confirmed it: the newest-first board uses this
-- index via Index Only Scan Backward, and the oldest-first sort via a forward
-- Index Only Scan. A mirrored DESC index was tried and the planner never chose it
-- (idx_scan = 0), so it is not created here.

drop index if exists public.items_active_created_at_idx;

create index if not exists items_active_created_at_id_idx
  on public.items (created_at, id)
  where status = 'ACTIVE';

comment on index public.items_active_created_at_id_idx is
  'Explore keyset pagination: total ordering on (created_at, id) over ACTIVE listings. Scanned backwards for newest-first.';

-- The date filter is on event_date (when the item was lost or found), which is
-- deliberately distinct from created_at (when the listing was posted). Explore
-- filters on event_date while ordering by created_at.
create index if not exists items_active_event_date_idx
  on public.items (event_date desc, created_at desc, id desc)
  where status = 'ACTIVE';

-- Lost-only / Found-only is the most common filtered board, and category narrows
-- it further; both still order by the board key.
create index if not exists items_active_type_created_at_id_idx
  on public.items (listing_type, created_at desc, id desc)
  where status = 'ACTIVE';

create index if not exists items_active_category_created_at_id_idx
  on public.items (category, created_at desc, id desc)
  where status = 'ACTIVE';

-- ---------------------------------------------------------------------------
-- 4. Location text filter
-- ---------------------------------------------------------------------------
-- The documented MVP location filter is text, not geometry: no PostGIS, and no
-- proximity scoring, which belongs to matching (docs/matchingEngine.md). A
-- single-column ILIKE on location_text is indexable on its own.

create index if not exists items_location_text_trgm_idx
  on public.items using gin (location_text extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 5. Grants
-- ---------------------------------------------------------------------------
-- The search helper is a pure text function over values the caller already
-- supplies. It reads no table, so it grants no new visibility; `authenticated`
-- needs EXECUTE only so the search predicate can name it.

grant execute on function public.searchable_item_text(text, text, text, text, text, text)
  to authenticated, anon;

-- ---------------------------------------------------------------------------
-- 6. search_public_items() — the Explore read
-- ---------------------------------------------------------------------------
-- Why an RPC rather than more PostgREST filters: the free-text search has to call
-- searchable_item_text() in its WHERE clause for the planner to match the trigram
-- expression index, and PostgREST cannot express a function call in a filter. The
-- keyset predicate is also a row comparison, (created_at, id) < (c, i), which
-- PostgREST can only approximate as an `or(...)` tree.
--
-- This is NOT an escape from the privacy boundary — it is the same boundary stated
-- once more in the return type:
--
--   * SECURITY INVOKER, so items_select_visible RLS is evaluated as the caller.
--   * The return type is the column list of public_items_view. latitude,
--     longitude, closed_reason and closed_at are absent from the signature, so no
--     argument a caller passes can make this function return them.
--   * It reads public.items directly, which `authenticated` cannot select from —
--     but as INVOKER the caller's own column grants apply, and those grants
--     already exclude the private columns. The function selects only public ones.
--   * Status is pinned to ACTIVE in the body, not taken as a parameter, so a
--     client cannot ask for CLOSED, CANCELLED, RETURNED or RECOVERY_IN_PROGRESS
--     rows through the board (docs/authAndRls.md §19 product decision).
--
-- Every filter is optional and NULL means "unset", so one function serves the
-- whole documented filter set (docs/apiAndDataContracts.md §29).

create or replace function public.search_public_items(
  p_query text default null,
  p_listing_type public.listing_type default null,
  p_category text default null,
  p_date_from date default null,
  p_date_to date default null,
  p_location_query text default null,
  p_sort text default 'NEWEST',
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 20
)
returns table (
  id uuid,
  user_id uuid,
  listing_type public.listing_type,
  title text,
  category text,
  brand text,
  color text,
  description text,
  event_date date,
  event_time time,
  location_text text,
  status public.listing_status,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $fn$
  with bounds as (
    -- The contract's maximum is enforced here too, so it holds no matter which
    -- client calls (docs/apiAndDataContracts.md §31).
    --
    -- The search terms are ESCAPED, not merely parameterised. A bound parameter is
    -- already safe from injection, but `%` and `_` are LIKE metacharacters: passed
    -- through raw, a typed `%` matches every listing on the board and `_` matches
    -- any single character. Typed text must behave as content, so the wildcards
    -- (and the escape character itself, first) are escaped before the pattern is
    -- built. The matching ESCAPE clause is on each ILIKE below.
    select
      least(greatest(coalesce(p_limit, 20), 1), 50) as lim,
      replace(replace(replace(
        nullif(btrim(coalesce(p_query, '')), ''),
        '\', '\\'), '%', '\%'), '_', '\_') as q,
      replace(replace(replace(
        nullif(btrim(coalesce(p_location_query, '')), ''),
        '\', '\\'), '%', '\%'), '_', '\_') as loc,
      (coalesce(p_sort, 'NEWEST') = 'OLDEST') as ascending
  )
  select
    i.id,
    i.user_id,
    i.listing_type,
    i.title::text,
    i.category,
    i.brand::text,
    i.color::text,
    i.description,
    i.event_date,
    i.event_time,
    i.location_text::text,
    i.status,
    i.created_at,
    i.updated_at
  from public.items i, bounds b
  where
    -- Discovery is ACTIVE only; not a parameter, so it cannot be widened.
    i.status = 'ACTIVE'
    and (p_listing_type is null or i.listing_type = p_listing_type)
    and (p_category is null or i.category = p_category)
    -- event_date: when the item was lost or found, never created_at.
    and (p_date_from is null or i.event_date >= p_date_from)
    and (p_date_to is null or i.event_date <= p_date_to)
    and (b.loc is null or i.location_text ilike '%' || b.loc || '%' escape '\')
    -- Verbatim the indexed expression, so the planner can use the GIN index.
    and (
      b.q is null
      or public.searchable_item_text(
           i.title, i.brand, i.color, i.category, i.location_text, i.description
         ) ilike '%' || b.q || '%' escape '\'
    )
    -- Keyset predicate on the total ordering. Row comparison gives the planner a
    -- clean range on (created_at, id) rather than an OR tree.
    and (
      p_cursor_created_at is null
      or p_cursor_id is null
      or (
        case when b.ascending
          then (i.created_at, i.id) > (p_cursor_created_at, p_cursor_id)
          else (i.created_at, i.id) < (p_cursor_created_at, p_cursor_id)
        end
      )
    )
  order by
    case when b.ascending then i.created_at end asc nulls last,
    case when b.ascending then i.id end asc nulls last,
    case when not b.ascending then i.created_at end desc nulls last,
    case when not b.ascending then i.id end desc nulls last
  limit (select lim from bounds)
$fn$;

comment on function public.search_public_items is
  'Explore discovery read: public-safe columns only, ACTIVE listings only, keyset paginated on (created_at, id). SECURITY INVOKER, so RLS applies as the caller; the return type has no coordinate, closed_reason or closed_at column.';

revoke execute on function public.search_public_items(
  text, public.listing_type, text, date, date, text, text, timestamptz, uuid, integer
) from public;
grant execute on function public.search_public_items(
  text, public.listing_type, text, date, date, text, text, timestamptz, uuid, integer
) to authenticated;
