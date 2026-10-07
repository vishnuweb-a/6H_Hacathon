import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from '@/components/kept-board-pages';

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: 'Kept — Lost it. Find it. Get it back.' },
    { name: 'description', content: 'Find your lost things and help campus belongings get back to their people.' },
    { property: 'og:title', content: 'Kept — Campus Lost & Found' },
    { property: 'og:description', content: 'Lost something? Check the board. A little community goes a long way.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: HomePage,
});
