/**
 * Browser-safe Supabase configuration.
 *
 * Only the project URL and the publishable (anon) key may ever appear here —
 * docs/supabaseArchitecture.md §7 and docs/securityAndService.md §48. The service
 * role / secret key must never be read into any module that the client bundle can
 * reach.
 *
 * `@lovable.dev/vite-tanstack-config` injects `VITE_*` variables into both the
 * browser and the server build, so a single accessor works in either context.
 */

type SupabaseEnv = {
  url: string;
  publishableKey: string;
};

function readEnv(name: "VITE_SUPABASE_URL" | "VITE_SUPABASE_PUBLISHABLE_KEY"): string | undefined {
  const value = import.meta.env[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

let cached: SupabaseEnv | null = null;

/**
 * Returns the publishable Supabase configuration, or throws a message that names
 * the missing variable without ever printing its value.
 */
export function getSupabaseEnv(): SupabaseEnv {
  if (cached) return cached;

  const url = readEnv("VITE_SUPABASE_URL");
  const publishableKey = readEnv("VITE_SUPABASE_PUBLISHABLE_KEY");

  const missing = [
    url ? null : "VITE_SUPABASE_URL",
    publishableKey ? null : "VITE_SUPABASE_PUBLISHABLE_KEY",
  ].filter((name): name is string => name !== null);

  if (missing.length > 0 || !url || !publishableKey) {
    throw new Error(
      `Missing Supabase environment variable(s): ${missing.join(", ")}. ` +
        "Copy WebsitePages/.env.example to WebsitePages/.env and fill in the " +
        "project URL and publishable key.",
    );
  }

  cached = { url, publishableKey };
  return cached;
}

/** True when the publishable config is present, for render-time guards. */
export function hasSupabaseEnv(): boolean {
  return Boolean(readEnv("VITE_SUPABASE_URL") && readEnv("VITE_SUPABASE_PUBLISHABLE_KEY"));
}
