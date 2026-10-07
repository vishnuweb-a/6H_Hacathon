import { createFileRoute } from '@tanstack/react-router';
import { PostPage } from '@/components/kept-report-pages';
export const Route = createFileRoute('/post/')({
 head:()=>({meta:[{title:'Report an item — Kept'},{name:'description',content:'Report something lost or found on your campus.'},{property:'og:title',content:'Report an item — Kept'},{property:'og:description',content:'Report something lost or found on your campus.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:PostPage,
});
