import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/focus-session")({
  component: FocusSessionComponent,
});

function FocusSessionComponent() {
  return <div>Hello "/_protected/focus-session"!</div>;
}
