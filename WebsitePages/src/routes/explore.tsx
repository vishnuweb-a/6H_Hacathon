import { createFileRoute } from "@tanstack/react-router";
import { ExplorePage } from "@/components/kept-board-pages";
import { validateExploreSearch } from "@/lib/explore-search";

/**
 * Explore's filter state is URL state (docs/frontendArchitecture.md — search params
 * own shareable screen state). `validateExploreSearch` is total, so a hand-edited
 * or stale link normalises to a valid board rather than throwing.
 */
export const Route = createFileRoute("/explore")({
  validateSearch: validateExploreSearch,
  head: () => ({
    meta: [
      { title: "The campus board — Scout" },
      { name: "description", content: "Search lost and found items across your campus." },
      { property: "og:title", content: "The campus board — Scout" },
      { property: "og:description", content: "Search lost and found items across your campus." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExplorePage,
});
