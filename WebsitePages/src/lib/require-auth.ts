/**
 * Route guard for authenticated application areas (docs/authAndRls.md §9).
 *
 * Uses TanStack Router's own `beforeLoad` + `redirect` mechanism. The identity comes
 * from the root route's resolved auth context, which was verified server-side — the
 * guard is a navigation convenience, not the security boundary. RLS remains the
 * actual enforcement (docs/securityAndService.md §13).
 *
 * Redirect-loop safety: `/auth` and the other public routes never call this, so the
 * target of the redirect can never itself redirect.
 */

import { redirect } from "@tanstack/react-router";

import type { RouterAuthState } from "@/routes/__root";

/** Routes a signed-out visitor may always reach (docs/authAndRls.md §105). */
export const PUBLIC_ROUTES = ["/", "/auth", "/safety"] as const;

export function requireAuth({
  context,
  location,
}: {
  context: { auth: RouterAuthState };
  location: { href: string };
}): void {
  if (context.auth.isAuthenticated) return;

  throw redirect({
    to: "/auth",
    // Carried so the auth screen can return the user to where they were headed.
    search: { redirect: location.href },
  });
}
