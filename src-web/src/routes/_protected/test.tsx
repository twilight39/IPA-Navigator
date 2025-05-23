import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/test")({
  component: TestComponent,
});

function TestComponent() {
  return <div>Hello "/_protected/test"!</div>;
}
