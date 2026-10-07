import { createFileRoute } from '@tanstack/react-router';
import { AuthPage } from '@/components/kept-account-pages';
export const Route = createFileRoute('/auth')({
 head:()=>({meta:[{title:'Campus sign in — Kept'},{name:'description',content:'Join the Kept verified-college community prototype.'},{property:'og:title',content:'Campus sign in — Kept'},{property:'og:description',content:'Join the Kept verified-college community prototype.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:AuthPage,
});
