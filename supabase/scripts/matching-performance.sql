begin;
insert into auth.users(id,email,raw_user_meta_data) values
('bbbbbbbb-0000-0000-0000-000000000001','phase4-perf-owner@test.edu','{"display_name":"Performance Owner"}'),
('bbbbbbbb-0000-0000-0000-000000000002','phase4-perf-finder@test.edu','{"display_name":"Performance Finder"}');
alter table public.items disable trigger items_generate_matches_on_insert;
insert into public.items(user_id,listing_type,title,category,description,event_date,location_text)
select 'bbbbbbbb-0000-0000-0000-000000000002','FOUND','Performance item '||n,case when n%10=0 then 'electronics' else 'wallet' end,'Representative public description of a silver camera with shoulder strap',current_date-(n%180),'Main Library'
from generate_series(1,10000) n;
insert into public.items(id,user_id,listing_type,title,category,description,event_date,location_text)
values ('bbbbbbbb-0000-0000-0000-000000000003','bbbbbbbb-0000-0000-0000-000000000001','LOST','Silver camera','electronics','Representative public description of a silver camera with shoulder strap',current_date-1,'Main Library');
alter table public.items enable trigger items_generate_matches_on_insert;
analyze public.items;
explain (analyze,buffers)
with candidates as materialized (
select id,title,description,brand,color from public.items where listing_type='FOUND' and status='ACTIVE' and user_id<>'bbbbbbbb-0000-0000-0000-000000000001' and event_date between current_date-15 and current_date+13 and public.match_category_score('electronics',category)>0
)
select count(*),avg(public.match_description_score('Silver camera','Representative public description of a silver camera with shoulder strap',null,null,title,description,brand,color)) from candidates;
explain (analyze,buffers) select public.generate_matches('bbbbbbbb-0000-0000-0000-000000000003');
select count(*) as persisted_pairs from public.matches where lost_item_id='bbbbbbbb-0000-0000-0000-000000000003';
rollback;
