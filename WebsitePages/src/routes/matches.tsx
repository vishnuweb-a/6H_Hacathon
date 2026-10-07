import { createFileRoute } from '@tanstack/react-router';
import { MatchesPage } from '@/components/kept-board-pages';
export const Route = createFileRoute('/matches')({
 head:()=>({meta:[{title:'Your possible matches — Kept'},{name:'description',content:'Review ranked potential matches. Similarity is not proof of ownership.'},{property:'og:title',content:'Your possible matches — Kept'},{property:'og:description',content:'Review ranked potential matches. Similarity is not proof of ownership.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:MatchesPage,
});
