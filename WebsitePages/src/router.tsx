import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    // `auth` is replaced by the root route's beforeLoad on every load; this is only
    // the pre-resolution default so the context type is satisfied.
    context: { queryClient, auth: { isAuthenticated: false, userId: null } },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
