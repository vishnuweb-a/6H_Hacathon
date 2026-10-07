/**
 * Browser Supabase client.
 *
 * TanStack Start renders on both the server and the client, so this module is
 * deliberately browser-only: it stores the session in cookies via `@supabase/ssr`
 * so the server render can read the same session (docs/authAndRls.md §7, §8).
 *
 * The server-side counterpart lives in `./server.ts` and must never be imported
 * from a component.
 */

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "../database.types";
import { getSupabaseEnv } from "./env";

export type SupabaseClient = ReturnType<typeof createBrowserClient<Database>>;

let browserClient: SupabaseClient | null = null;

/**
 * Returns the singleton browser client. A single instance matters: each
 * `createBrowserClient` call installs its own auth state listener and refresh
 * timer, and duplicates cause competing token refreshes.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error(
      "getSupabaseBrowserClient() was called during a server render. " +
        "Use getSupabaseServerClient() from src/lib/supabase/server.ts instead.",
    );
  }

  if (!browserClient) {
    const { url, publishableKey } = getSupabaseEnv();
    browserClient = createBrowserClient<Database>(url, publishableKey);
  }

  return browserClient;
}
