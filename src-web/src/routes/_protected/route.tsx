import { Outlet } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";

import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected")({
  component: ProtectedComponent,
});

function ProtectedComponent() {
  return (
    <>
      <SignedIn>
        <Outlet />
      </SignedIn>
      <SignedOut>
        <Navigate
          to="/sign-in"
          search={{ redirect: globalThis.location.pathname }}
        />
      </SignedOut>
    </>
  );
}
