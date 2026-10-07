import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/require-auth";
import { ClaimPage } from "@/components/kept-recovery-pages";
export const Route = createFileRoute("/claim/$id")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Claim an item — Scout" },
      { name: "description", content: "Answer private questions so a human can verify ownership." },
      { property: "og:title", content: "Claim an item — Scout" },
      {
        property: "og:description",
        content: "Answer private questions so a human can verify ownership.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoutePage,
});

function RoutePage() {
  const { id } = Route.useParams();
  return <ClaimPage id={id} />;
}
