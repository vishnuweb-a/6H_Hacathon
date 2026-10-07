import { createFileRoute } from '@tanstack/react-router';
import { ReturnedPage } from '@/components/kept-recovery-pages';
export const Route = createFileRoute('/returned/$id')({
 head:()=>({meta:[{title:'A successful return — Kept'},{name:'description',content:'Celebrate a return and share a trusted review.'},{property:'og:title',content:'A successful return — Kept'},{property:'og:description',content:'Celebrate a return and share a trusted review.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:RoutePage,
});

function RoutePage(){const {id}=Route.useParams();return <ReturnedPage id={id}/>}
