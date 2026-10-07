import { createFileRoute } from '@tanstack/react-router';
import { ClaimPage } from '@/components/kept-recovery-pages';
export const Route = createFileRoute('/claim/$id')({
 head:()=>({meta:[{title:'Claim an item — Kept'},{name:'description',content:'Answer private questions so a human can verify ownership.'},{property:'og:title',content:'Claim an item — Kept'},{property:'og:description',content:'Answer private questions so a human can verify ownership.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:RoutePage,
});

function RoutePage(){const {id}=Route.useParams();return <ClaimPage id={id}/>}
