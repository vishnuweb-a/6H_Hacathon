import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/require-auth";
import { MessagesPage } from "@/components/kept-recovery-pages";
export const Route = createFileRoute("/messages")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Recovery conversations — Kept" },
      {
        name: "description",
        content: "Keep your recovery conversations private and plan safe handovers.",
      },
      { property: "og:title", content: "Recovery conversations — Kept" },
      {
        property: "og:description",
        content: "Keep your recovery conversations private and plan safe handovers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MessagesPage,
});
