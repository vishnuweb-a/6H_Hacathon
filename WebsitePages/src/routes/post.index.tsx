import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/require-auth";
import { PostPage } from "@/components/kept-report-pages";
export const Route = createFileRoute("/post/")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Report an item — Scout" },
      { name: "description", content: "Report something lost or found on your campus." },
      { property: "og:title", content: "Report an item — Scout" },
      { property: "og:description", content: "Report something lost or found on your campus." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PostPage,
});
