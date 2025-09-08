import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/collection")({
  component: CollectionComponent,
});

function CollectionComponent() {
  return <div>Hello "/_protected/collection"!</div>;
}
