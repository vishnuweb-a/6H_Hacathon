select
  (select count(*) from public.items where status='ACTIVE') as active_listings,
  (select relrowsecurity from pg_class where oid='public.matches'::regclass) as matches_rls,
  (select relrowsecurity from pg_class where oid='public.match_dismissals'::regclass) as dismissals_rls,
  has_function_privilege('anon','public.search_public_items(text,public.listing_type,text,date,date,text,text,timestamptz,uuid,integer)','EXECUTE') as anon_search_execute,
  has_function_privilege('anon','public.get_my_matches(text,boolean,integer,uuid)','EXECUTE') as anon_matches_execute,
  has_table_privilege('authenticated','public.matches','UPDATE') as client_can_forge_score,
  has_function_privilege('authenticated','public.get_my_matches(text,boolean,integer,uuid)','EXECUTE') as authenticated_matches_execute;
