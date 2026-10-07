import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/require-auth";
import { ActivityPage } from "@/components/kept-account-pages";
export const Route = createFileRoute("/activity")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Your campus activity — Scout" },
      { name: "description", content: "Manage reports, matches, claims and completed returns." },
      { property: "og:title", content: "Your campus activity — Scout" },
      {
        property: "og:description",
        content: "Manage reports, matches, claims and completed returns.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ActivityPage,
});
