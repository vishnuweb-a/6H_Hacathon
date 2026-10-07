import { createFileRoute } from "@tanstack/react-router";
import { ListingPage } from "@/components/kept-board-pages";
export const Route = createFileRoute("/listing/$id")({
  head: () => ({
    meta: [
      { title: "Item details — Scout" },
      {
        name: "description",
        content: "View public item details and start a private ownership claim.",
      },
      { property: "og:title", content: "Item details — Scout" },
      {
        property: "og:description",
        content: "View public item details and start a private ownership claim.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoutePage,
});

function RoutePage() {
  const { id } = Route.useParams();
  return <ListingPage id={id} />;
}
