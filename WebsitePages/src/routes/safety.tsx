import { createFileRoute } from "@tanstack/react-router";
import { SafetyPage } from "@/components/kept-account-pages";
export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "Safety and privacy — Kept" },
      {
        name: "description",
        content: "Privacy-conscious ownership checks and safe campus handovers.",
      },
      { property: "og:title", content: "Safety and privacy — Kept" },
      {
        property: "og:description",
        content: "Privacy-conscious ownership checks and safe campus handovers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SafetyPage,
});
