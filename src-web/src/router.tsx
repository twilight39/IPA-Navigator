import { createRouter, ErrorComponent } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen.ts";

// Create the router instance
export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultPendingComponent: () => (
    <div className="flex items-center justify-center h-screen">
      <span className="loading loading-ring loading-xl"></span>
    </div>
  ),
  defaultErrorComponent: ({ err }) => (
    <div className="flex items-center justify-center h-screen">
      <ErrorComponent error={err} />
    </div>
  ),
  notFoundComponent: () => <div>404 Not Found</div>,
  context: {},
});
