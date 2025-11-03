import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api.js";
import { JoinClassroomModal } from "../../../components/JoinClassroomModal.tsx";
import { JoinWithCodeModal } from "../../../components/JoinWithCodeModal.tsx";

import {
  MagnifyingGlassIcon,
  PlusCircleIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { CreateClassroomModal } from "../../../components/CreateClassroomModal.tsx";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/classrooms/")({
  component: ClassroomsComponent,
});

type Classroom = {
  _id: string;
  name: string;
  description?: string;
  teacherId: string;
  teacherName: string;
  teacherPicture?: string;
  memberCount: number;
  userRole: "teacher" | "student" | null;
  isCreator: boolean;
  created_at: number;
};

function ClassroomsComponent() {
  const [activeTab, setActiveTab] = useState<"my" | "discover">("my");
  const [searchQuery, setSearchQuery] = useState("");

  const navigate = useNavigate();

  const myClassrooms: Classroom[] | undefined = useQuery(
    api.functions.classrooms.getUserClassrooms,
    {},
  );
  const allClassrooms: Classroom[] | undefined = useQuery(
    api.functions.classrooms.getClassrooms,
    {},
  );

  const isLoadingClassrooms = myClassrooms === undefined ||
    allClassrooms === undefined;

  if (isLoadingClassrooms) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading loading-spinner loading-lg text-primary">
        </div>
      </div>
    );
  }

  const discoverClassrooms = allClassrooms.filter(
    (c) => !myClassrooms.some((mc) => mc._id === c._id),
  );

  const source = activeTab === "my" ? myClassrooms : discoverClassrooms;
  const filteredClassrooms = source.filter((classroom) =>
    classroom.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 p-4 mx-auto">
      <div className="flex items-center justify-between pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Classrooms
          </h1>
          <p className="text-slate-600">
            Join classrooms and learn with others
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-ghost"
            onClick={() => {
              const modal = document.getElementById(
                "join_with_code_modal",
              ) as HTMLDialogElement;
              if (modal) modal.showModal();
            }}
          >
            Join with Code
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              const modal = document.getElementById(
                "create_classroom_modal",
              ) as HTMLDialogElement;
              if (modal) modal.showModal();
            }}
          >
            <PlusCircleIcon size={18} weight="bold" className="mr-1" />
            Create Classroom
          </button>
        </div>
      </div>

      <div className="flex justify-start">
        <div className="tabs tabs-boxed bg-white border border-slate-200 rounded-lg inline-flex">
          <a
            className={`tab px-4 py-2 flex items-center rounded-lg ${
              activeTab === "my" ? "bg-slate-200 tab-active" : ""
            }`}
            onClick={() => setActiveTab("my")}
          >
            <UsersThreeIcon size={18} className="mr-2" />
            My Classrooms
          </a>
          <a
            className={`tab px-4 py-2 flex items-center rounded-lg ${
              activeTab === "discover" ? "bg-slate-200 tab-active" : ""
            }`}
            onClick={() => setActiveTab("discover")}
          >
            <UsersThreeIcon size={18} className="mr-2" />
            Discover
          </a>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <MagnifyingGlassIcon
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500"
          size={18}
        />
        <input
          type="text"
          placeholder="Search classrooms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input input-bordered input-primary w-full pl-10 bg-white/80"
        />
      </div>

      {/* Empty State */}
      {filteredClassrooms.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 bg-white/80 backdrop-blur-md rounded-xl shadow-sm text-center">
          <div className="bg-blue-50 p-4 rounded-full mb-4">
            <UsersThreeIcon className="h-10 w-10 text-blue-500" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">
            {activeTab === "my"
              ? "No Classrooms Yet"
              : "No Available Classrooms"}
          </h3>
          <p className="text-slate-600 mb-6 max-w-md">
            {activeTab === "my"
              ? "Create a new classroom or join one from the Discover tab."
              : "Check back later for new classrooms to join!"}
          </p>
          {activeTab === "my" && (
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                const modal = document.getElementById(
                  "create_classroom_modal",
                ) as HTMLDialogElement;
                if (modal) modal.showModal();
              }}
            >
              <PlusCircleIcon size={18} weight="bold" className="mr-1" />
              Create Classroom
            </button>
          )}
        </div>
      )}

      {/* Classrooms Grid */}
      {filteredClassrooms.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClassrooms.map((classroom) => (
            <ClassroomCard
              key={classroom._id}
              classroom={classroom}
              tab={activeTab}
            />
          ))}
        </div>
      )}

      <CreateClassroomModal />
      <JoinWithCodeModal />
    </div>
  );
}

function ClassroomCard(
  { classroom, tab }: { classroom: Classroom; tab: "my" | "discover" },
) {
  const navigate = useNavigate();
  const [showJoinModal, setShowJoinModal] = useState(false);

  const getActionLabel = () => {
    if (tab === "my") {
      return classroom.isCreator ? "Manage" : "View";
    }
    return "Join";
  };

  const handleAction = () => {
    if (tab === "my") {
      navigate({
        to: "/classrooms/$classroomId",
        params: { classroomId: classroom._id },
      });
    } else {
      const modal = document.getElementById(
        `join_classroom_modal_${classroom._id}`,
      ) as HTMLDialogElement;
      if (modal) modal.showModal();
    }
  };

  return (
    <div className="card bg-base-100 shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200 rounded-lg">
      {/* Image Section */}
      <div className="h-24 bg-gradient-to-r from-blue-500/10 to-indigo-500/20 rounded-t-lg overflow-hidden">
        {classroom.imageUrl && (
          <img
            src={classroom.imageUrl}
            alt={classroom.name}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <div className="card-body p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="card-title text-slate-800 font-bold line-clamp-2">
              {classroom.name}
            </h3>
            {classroom.description && (
              <p className="text-sm text-slate-600 line-clamp-2 mt-1">
                {classroom.description}
              </p>
            )}
          </div>
          <div className="badge badge-sm bg-blue-100 text-blue-800">
            {classroom.userRole === "teacher" ? "Teacher" : "Student"}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <UsersThreeIcon size={16} />
            <span>
              {classroom.memberCount}{" "}
              member{classroom.memberCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
          <div className="avatar placeholder">
            <div className="bg-slate-200 text-slate-600 rounded-full w-6">
              {classroom.teacherPicture
                ? (
                  <img
                    src={classroom.teacherPicture}
                    alt={classroom.teacherName}
                    className="rounded-full"
                  />
                )
                : (
                  <span>
                    {classroom.teacherName.charAt(0)}
                  </span>
                )}
            </div>
          </div>
          <span>by {classroom.teacherName}</span>
        </div>

        <button
          onClick={handleAction}
          className="btn btn-sm btn-primary mt-4 w-full"
        >
          {getActionLabel()}
        </button>
      </div>

      {tab === "discover" && (
        <JoinClassroomModal
          classroomId={classroom._id}
          isPrivate={classroom.visibility === "private"}
          onJoinSuccess={() => {
            setShowJoinModal(false);
            // Refresh - Convex will auto-update queries
          }}
        />
      )}
    </div>
  );
}
