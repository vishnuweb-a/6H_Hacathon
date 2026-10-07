import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/require-auth";
import { ClaimsPage } from "@/components/kept-recovery-pages";
export const Route = createFileRoute("/claims")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Your claims — Kept" },
      { name: "description", content: "Review and manage sent and received ownership claims." },
      { property: "og:title", content: "Your claims — Kept" },
      {
        property: "og:description",
        content: "Review and manage sent and received ownership claims.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClaimsPage,
});
