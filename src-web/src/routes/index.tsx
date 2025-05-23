import { createFileRoute, Link } from "@tanstack/react-router";
import { SignOutButton } from "@clerk/clerk-react";
import { useConvexAuth } from "convex/react";

export const Route = createFileRoute("/")({
  component: IndexComponent,
});

function IndexComponent() {
  const { isAuthenticated } = useConvexAuth();
  return (
    <div className="navbar bg-base-100 shadow-sm">
      <div className="flex-1">
        <button className="btn btn-ghost text-xl" type="button">
          IPA Navigator
        </button>
      </div>
      <div className="flex-none">
        <ul className="menu menu-horizontal px-1 items-center">
          <li>
            {isAuthenticated
              ? <SignOutButton>Sign Out</SignOutButton>
              : <Link to="/sign-in" className="btn-ghost">Sign In</Link>}
          </li>
          <li>
            <Link to="/dashboard" className="btn">Dashboard</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
