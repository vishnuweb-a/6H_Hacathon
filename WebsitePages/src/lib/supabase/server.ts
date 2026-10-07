/**
 * Server-side Supabase client for TanStack Start.
 *
 * Reads the session from the request cookies and writes refreshed cookies back on
 * the response, so a signed-in session survives a full page load and SSR sees the
 * same user the browser does (docs/authAndRls.md §7, §13 Session Flow).
 *
 * Still uses only the publishable key — the server render runs with the user's own
 * session and the same RLS, never with elevated privileges
 * (docs/securityAndService.md §46, §47).
 *
 * This module imports `@tanstack/react-start/server`, so it must only ever be
 * reached from a server function or a route `beforeLoad`/loader running on the
 * server — never from component code.
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getCookies, setCookie } from "@tanstack/react-start/server";

import type { Database } from "../database.types";
import { getSupabaseEnv } from "./env";

export function getSupabaseServerClient() {
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          // Cookies are set while the response is still streaming its head. If the
          // headers have already been flushed, Start throws; the browser client
          // will persist the refreshed session on hydration instead, so a failure
          // here is non-fatal.
          try {
            setCookie(name, value, options as CookieOptions);
          } catch {
            // Intentionally ignored — see above.
          }
        }
      },
    },
  });
}
