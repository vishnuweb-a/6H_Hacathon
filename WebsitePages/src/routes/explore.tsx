import { createFileRoute } from '@tanstack/react-router';
import { ExplorePage } from '@/components/kept-board-pages';
export const Route = createFileRoute('/explore')({
 head:()=>({meta:[{title:'The campus board — Kept'},{name:'description',content:'Search lost and found items across your campus.'},{property:'og:title',content:'The campus board — Kept'},{property:'og:description',content:'Search lost and found items across your campus.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:ExplorePage,
});
