import { Outlet } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";

import { Authenticated, Unauthenticated } from "convex/react";
import { Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected")({
  component: ProtectedComponent,
});

function ProtectedComponent() {
  return (
    <>
      <Authenticated>
        <Outlet />
      </Authenticated>
      <Unauthenticated>
        <Navigate
          to="/sign-in"
          search={{ redirect: globalThis.location.pathname }}
        />
      </Unauthenticated>
    </>
  );
}
