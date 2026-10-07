/**
 * Server function that resolves the current session from the request cookies.
 *
 * Route `beforeLoad` runs on the server for the initial document and in the browser
 * for client-side navigations, so protected routes need an identity check that works
 * in both. Reading the cookie session on the server lets the first paint already
 * know who the user is, instead of flashing a signed-out shell
 * (docs/authAndRls.md §7, §8).
 *
 * Returns only what the client is allowed to know: whether a verified user exists,
 * and that user's id. No tokens or auth metadata cross this boundary.
 */

import { createServerFn } from "@tanstack/react-start";

export const fetchAuthState = createServerFn({ method: "GET" }).handler(async () => {
  // Imported lazily so the server-only Supabase module never reaches the client bundle.
  const { getSupabaseServerClient } = await import("./server");

  try {
    const supabase = getSupabaseServerClient();
    // getUser() validates the token with the auth server rather than trusting the
    // cookie's contents.
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return { isAuthenticated: false, userId: null };
    return { isAuthenticated: true, userId: data.user.id };
  } catch {
    // Missing configuration must not break rendering; treat it as signed out.
    return { isAuthenticated: false, userId: null };
  }
});
