import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/chapters")({
  component: ChaptersComponent,
});

function ChaptersComponent() {
  return <div>Hello "/_protected/chapters"!</div>;
}
