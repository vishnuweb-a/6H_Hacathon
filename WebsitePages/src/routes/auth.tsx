import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/kept-account-pages";

/**
 * `redirect` carries where a signed-out visitor was originally headed. Only
 * same-site relative paths are accepted, so the parameter cannot be used to bounce
 * someone to another origin after sign-in (docs/securityAndService.md §42).
 */
function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: safeRedirect(search["redirect"]),
  }),
  head: () => ({
    meta: [
      { title: "Campus sign in — Scout" },
      { name: "description", content: "Join the Scout verified-college community prototype." },
      { property: "og:title", content: "Campus sign in — Scout" },
      {
        property: "og:description",
        content: "Join the Scout verified-college community prototype.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});
