import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { ClassroomSettingsContent } from "../../../../components/ClassroomSettings.tsx";

export const Route = createFileRoute(
  "/_protected/classrooms/$classroomId/settings",
)({
  component: ClassroomSettingsComponent,
});

function ClassroomSettingsComponent() {
  const { classroomId } = Route.useParams();
  const navigate = useNavigate();
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">(
    "saved",
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() =>
            navigate({
              to: "/classrooms/$classroomId",
              params: { classroomId },
            })}
          className="btn btn-ghost btn-square"
        >
          <ArrowLeftIcon size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Classroom Settings
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-600">Manage your classroom</p>
            {saveStatus === "saving" && (
              <span className="loading loading-spinner loading-sm"></span>
            )}
            {saveStatus === "saved" && (
              <span className="text-xs text-green-600">✓ Saved</span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w">
        <ClassroomSettingsContent
          classroomId={classroomId}
          onSaveStatusChange={setSaveStatus}
        />
      </div>
    </div>
  );
}
