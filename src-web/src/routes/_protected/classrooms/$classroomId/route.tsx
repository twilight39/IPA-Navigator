import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/classrooms/$classroomId")(
  {
    component: ClassroomLayout,
  },
);

function ClassroomLayout() {
  return <Outlet />;
}
