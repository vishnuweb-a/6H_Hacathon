import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/require-auth";
import { ProfilePage } from "@/components/kept-account-pages";
export const Route = createFileRoute("/profile")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Your trust profile — Scout" },
      {
        name: "description",
        content: "See verified returns, community ratings and kindness badges.",
      },
      { property: "og:title", content: "Your trust profile — Scout" },
      {
        property: "og:description",
        content: "See verified returns, community ratings and kindness badges.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});
