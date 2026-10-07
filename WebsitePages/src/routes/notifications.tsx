import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/require-auth";
import { NotificationsPage } from "@/components/kept-account-pages";
export const Route = createFileRoute("/notifications")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Your notifications — Kept" },
      { name: "description", content: "Keep up with matches, claims and recovery updates." },
      { property: "og:title", content: "Your notifications — Kept" },
      { property: "og:description", content: "Keep up with matches, claims and recovery updates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotificationsPage,
});
