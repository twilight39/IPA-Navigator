import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/dashboard")({
  component: DashboardComponent,
});

function DashboardComponent() {
  return <div>Hello "/_protected/dashboard"!</div>;
}
