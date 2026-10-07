import { createFileRoute } from '@tanstack/react-router';
import { ProfilePage } from '@/components/kept-account-pages';
export const Route = createFileRoute('/profile')({
 head:()=>({meta:[{title:'Your trust profile — Kept'},{name:'description',content:'See verified returns, community ratings and kindness badges.'},{property:'og:title',content:'Your trust profile — Kept'},{property:'og:description',content:'See verified returns, community ratings and kindness badges.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:ProfilePage,
});
