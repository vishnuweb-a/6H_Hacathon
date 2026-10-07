-- Run once after Phase 4 rollout, or rerun safely after an outage.
-- No schema edits and no private input/output. Normal future writes use triggers.
begin;
do $backfill$
declare
  listing_id uuid;
begin
  for listing_id in select id from public.items where listing_type='LOST' and status='ACTIVE' order by id
  loop
    perform public.generate_matches(listing_id);
  end loop;
end;
$backfill$;
commit;
select count(*) as stored_matches, count(*) filter (where status='ACTIVE' and overall_score >= 60) as displayable_matches from public.matches;
