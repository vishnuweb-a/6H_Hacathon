import { createFileRoute } from '@tanstack/react-router';
import { ReportPage } from '@/components/kept-report-pages';
export const Route = createFileRoute('/post/found')({
 head:()=>({meta:[{title:'Report a found item — Kept'},{name:'description',content:'Help an item get home with public and private details.'},{property:'og:title',content:'Report a found item — Kept'},{property:'og:description',content:'Help an item get home with public and private details.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:RoutePage,
});

function RoutePage(){return <ReportPage kind="found"/>}
