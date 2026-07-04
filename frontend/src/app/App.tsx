/**
 * Application root — composes global providers around the router.
 *
 * Provider order (outermost → innermost):
 *   QueryClientProvider → RouterProvider
 *
 * No business logic here. The router owns screen rendering.
 */

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "react-router-dom";
import { queryClient } from "@/app/queryClient";
import { router } from "@/app/router";

/**
 * Top-level application component. Mounts global providers and the router.
 */
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {/* DevTools rendered only in development builds */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
