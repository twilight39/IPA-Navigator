import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/classrooms")({
  component: ClassroomsComponent,
});

function ClassroomsComponent() {
  return <div>Hello "/_protected/classrooms"!</div>;
}
