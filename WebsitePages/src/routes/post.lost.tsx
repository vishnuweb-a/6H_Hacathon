import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/require-auth";
import { ReportPage } from "@/components/kept-report-pages";
export const Route = createFileRoute("/post/lost")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Report a lost item — Kept" },
      { name: "description", content: "Create a privacy-conscious lost item report." },
      { property: "og:title", content: "Report a lost item — Kept" },
      { property: "og:description", content: "Create a privacy-conscious lost item report." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoutePage,
});

function RoutePage() {
  return <ReportPage kind="lost" />;
}
