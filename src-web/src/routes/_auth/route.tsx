import { Link, Outlet } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "@phosphor-icons/react";

export const Route = createFileRoute("/_auth")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <div className="fixed inset-0 bg-gradient-to-b from-base-200 to-primary-content -z-10">
      </div>

      <div className="absolute top-4 left-4">
        <Link to="/" className="btn btn-ghost gap-2">
          <ArrowLeft size={24} />
          Back to Home
        </Link>
      </div>

      <div className="flex justify-center items-center min-h-screen py-10">
        <div className="w-full max-w-md p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
