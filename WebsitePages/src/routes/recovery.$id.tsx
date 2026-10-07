import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/require-auth";
import { RecoveryPage } from "@/components/kept-recovery-pages";
export const Route = createFileRoute("/recovery/$id")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Recovery timeline — Scout" },
      { name: "description", content: "Follow the return and confirm a safe handover." },
      { property: "og:title", content: "Recovery timeline — Scout" },
      { property: "og:description", content: "Follow the return and confirm a safe handover." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoutePage,
});

function RoutePage() {
  const { id } = Route.useParams();
  return <RecoveryPage id={id} />;
}
