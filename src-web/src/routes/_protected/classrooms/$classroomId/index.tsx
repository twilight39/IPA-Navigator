import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api.js";
import { useStoreUserEffect } from "../../../../hooks/useStoreUserEffect.tsx";
import { AddChaptersModal } from "../../../../components/AddChaptersModal.tsx";
import { LeaveClassroomModal } from "../../../../components/LeaveClassroomModal.tsx";
import { useEffect, useState } from "react";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  BookOpenTextIcon,
  GraduationCapIcon,
  PlusIcon,
  TrashIcon,
  TrophyIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";

export const Route = createFileRoute("/_protected/classrooms/$classroomId/")(
  {
    component: ClassroomDetailComponent,
  },
);

type Classroom = {
  _id: string;
  name: string;
  description?: string;
  teacherId: string;
  teacherName: string;
  teacherPicture?: string;
  memberCount: number;
  userRole: "teacher" | "student";
  visibility: "public" | "private";
};

type Chapter = {
  assignmentId: string;
  chapterId: string;
  order: number;
  dueDate?: number;
  name: string;
  description?: string;
  difficulty: string;
  totalExcerpts: number;
  progress: {
    completedCount: number;
    totalCount: number;
    accuracy: number;
    completed: boolean;
  } | null;
};

type LeaderboardEntry = {
  rank: number;
  userId: string;
  userName: string;
  userPicture?: string;
  accuracy: number;
  totalAttempts: number;
  role: "teacher" | "student";
};

function ClassroomDetailComponent() {
  const { classroomId } = Route.useParams();
  const navigate = useNavigate();
  const { userId } = useStoreUserEffect();

  const classroom: Classroom | undefined = useQuery(
    api.functions.classrooms.getClassroom,
    { classroomId },
  );
  const chapters: Chapter[] | undefined = useQuery(
    api.functions.classrooms.getClassroomChapters,
    { classroomId },
  );
  const leaderboard: LeaderboardEntry[] | undefined = useQuery(
    api.functions.classrooms.getClassroomLeaderboard,
    { classroomId },
  );
  const leaveClassroomMutation = useMutation(
    api.functions.classrooms.leaveClassroom,
  );

  const [reorderMode, setReorderMode] = useState(false);
  const [localChapters, setLocalChapters] = useState<Chapter[]>([]);
  const reorderChaptersMutation = useMutation(
    api.functions.classrooms.reorderChapters,
  );

  // Sync chapters from query to local state
  useEffect(() => {
    if (chapters) {
      setLocalChapters(chapters);
    }
  }, [chapters]);

  if (!classroom || !chapters || !leaderboard) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading loading-spinner loading-lg text-primary">
        </div>
      </div>
    );
  }

  const isTeacher = classroom.userRole === "teacher";
  const userLeaderboardEntry = leaderboard.find(
    (entry) => entry.userId === userId,
  );

  const handleMoveChapter = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= localChapters.length) return;

    const newChapters = [...localChapters];
    [newChapters[index], newChapters[newIndex]] = [
      newChapters[newIndex],
      newChapters[index],
    ];

    setLocalChapters(newChapters);
  };

  const handleSaveOrder = async () => {
    try {
      await reorderChaptersMutation({
        classroomId,
        assignments: localChapters.map((ch, idx) => ({
          assignmentId: ch.assignmentId,
          order: idx,
        })),
      });
      toast.success("Chapters reordered successfully");
      setReorderMode(false);
    } catch (error) {
      toast.error("Failed to reorder chapters");
      // Reset to previous state
      setLocalChapters(chapters);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate({ to: "/classrooms" })}
            className="btn btn-ghost btn-square"
          >
            <ArrowLeftIcon size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              {classroom.name}
            </h1>
            {classroom.description && (
              <p className="text-slate-600 mt-1">
                {classroom.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
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
          </div>
        </div>
        <div className="flex gap-2">
          {isTeacher && (
            <button
              onClick={() => {
                navigate({
                  to: "/classrooms/$classroomId/settings",
                  params: { classroomId },
                });
              }}
              className="btn btn-ghost"
            >
              Settings
            </button>
          )}
          {!isTeacher && (
            <button
              onClick={() => {
                const modal = document.getElementById(
                  `leave_classroom_modal_${classroomId}`,
                ) as HTMLDialogElement;
                if (modal) modal.showModal();
              }}
              className="btn btn-ghost btn-outline text-error"
            >
              Leave
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Your Stats Card */}
          {userLeaderboardEntry && (
            <div className="card bg-base-100 shadow-sm border border-slate-200">
              <div className="card-body p-5">
                <h2 className="card-title text-lg">Your Stats</h2>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="stat p-3 bg-slate-50 rounded-lg">
                    <div className="stat-title text-xs">Rank</div>
                    <div className="stat-value text-2xl text-primary">
                      #{userLeaderboardEntry.rank}
                    </div>
                  </div>
                  <div className="stat p-3 bg-slate-50 rounded-lg">
                    <div className="stat-title text-xs">Accuracy</div>
                    <div className="stat-value text-2xl">
                      {Math.round(userLeaderboardEntry.accuracy * 100)}%
                    </div>
                  </div>
                  <div className="stat p-3 bg-slate-50 rounded-lg">
                    <div className="stat-title text-xs">Attempts</div>
                    <div className="stat-value text-2xl">
                      {userLeaderboardEntry.totalAttempts}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chapters Section */}
          <div className="card bg-base-100 shadow-sm border border-slate-200">
            <div className="card-body p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="card-title text-lg flex items-center gap-2">
                  <BookOpenTextIcon size={20} />
                  Chapters
                </h2>
                {isTeacher && (
                  <div className="flex gap-2">
                    {reorderMode && (
                      <button
                        onClick={handleSaveOrder}
                        className="btn btn-sm btn-success"
                      >
                        Save Order
                      </button>
                    )}
                    <button
                      onClick={() => setReorderMode(!reorderMode)}
                      className={`btn btn-sm ${
                        reorderMode ? "btn-error" : "btn-ghost"
                      }`}
                    >
                      {reorderMode ? "Cancel" : "Reorder"}
                    </button>
                    <button
                      onClick={() => {
                        const modal = document.getElementById(
                          `add_chapters_modal_${classroomId}`,
                        ) as HTMLDialogElement;
                        if (modal) modal.showModal();
                      }}
                      className="btn btn-sm btn-primary"
                    >
                      <PlusIcon size={16} />
                      Add
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {localChapters.length === 0
                  ? (
                    <p className="text-slate-500 text-center py-4">
                      No chapters assigned yet
                    </p>
                  )
                  : localChapters.map((chapter, index) => (
                    <div
                      key={chapter.assignmentId}
                      className="flex items-center gap-2"
                    >
                      {reorderMode && isTeacher && (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleMoveChapter(index, "up")}
                            disabled={index === 0}
                            className="btn btn-xs btn-ghost btn-square"
                          >
                            <ArrowUpIcon size={14} />
                          </button>
                          <button
                            onClick={() => handleMoveChapter(index, "down")}
                            disabled={index === localChapters.length - 1}
                            className="btn btn-xs btn-ghost btn-square"
                          >
                            <ArrowDownIcon size={14} />
                          </button>
                        </div>
                      )}
                      <ClassroomChapterCard
                        chapter={chapter}
                        classroomId={classroomId}
                        isTeacher={isTeacher}
                        reorderMode={reorderMode}
                      />
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard Sidebar */}
        <div className="card bg-base-100 shadow-sm border border-slate-200 lg:sticky lg:top-6">
          <div className="card-body p-5">
            <h2 className="card-title text-lg flex items-center gap-2">
              <TrophyIcon size={20} />
              Leaderboard
            </h2>
            <div className="space-y-2 mt-4 max-h-[calc(100vh-300px)] overflow-y-auto">
              {leaderboard.map((entry) => (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    entry.userId === userId ? "bg-blue-50" : "bg-slate-50"
                  }`}
                >
                  <div className="font-bold text-lg text-slate-500 w-6 text-center">
                    {entry.rank}
                  </div>
                  <div className="avatar placeholder">
                    <div className="bg-slate-200 text-slate-600 rounded-full w-8">
                      {entry.userPicture
                        ? (
                          <img
                            src={entry.userPicture}
                            alt={entry.userName}
                            className="rounded-full"
                          />
                        )
                        : (
                          <span className="text-xs">
                            {entry.userName.charAt(0)}
                          </span>
                        )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {entry.userName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {Math.round(entry.accuracy * 100)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isTeacher && (
        <TeacherMetricsPanel
          classroom={classroom}
          chapters={chapters}
          leaderboard={leaderboard}
        />
      )}

      {isTeacher && <AddChaptersModal classroomId={classroomId} />}
      {!isTeacher && (
        <LeaveClassroomModal
          classroomId={classroomId}
          classroomName={classroom.name}
        />
      )}
    </div>
  );
}

function ClassroomChapterCard(
  {
    chapter,
    classroomId,
    isTeacher,
    reorderMode,
  }: {
    chapter: Chapter;
    classroomId: string;
    isTeacher: boolean;
    reorderMode: boolean;
  },
) {
  const navigate = useNavigate();
  const removeChapter = useMutation(
    api.functions.classrooms.removeChapterFromClassroom,
  );

  const progressPercent = chapter.progress && chapter.totalExcerpts > 0
    ? Math.round(
      (chapter.progress.completedCount / chapter.totalExcerpts) * 100,
    )
    : 0;

  const completedCount = chapter.progress?.completedCount ?? 0;

  const difficultyColor = {
    "Beginner": "bg-green-100 text-green-800",
    "Intermediate": "bg-yellow-100 text-yellow-800",
    "Advanced": "bg-red-100 text-red-800",
  }[chapter.difficulty] || "bg-blue-100 text-blue-800";

  const handleRemove = async () => {
    try {
      await removeChapter({
        classroomId,
        assignmentId: chapter.assignmentId,
      });
      toast.success("Chapter removed");
    } catch (error) {
      toast.error("Failed to remove chapter");
    }
  };

  console.log(progressPercent);

  return (
    <div className="flex-1 flex items-center gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-slate-800">{chapter.name}</h3>
          <span className={`badge badge-sm ${difficultyColor}`}>
            {chapter.difficulty}
          </span>
        </div>
        {chapter.totalExcerpts > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <progress
              className="progress progress-primary w-24 h-1"
              value={progressPercent}
              max={100}
            />
            <span>
              {completedCount}/{chapter.totalExcerpts}
            </span>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {!reorderMode && (
          <button
            onClick={() => {
              navigate({
                to: "/chapters/$chapterId/practice",
                params: { chapterId: chapter.chapterId },
              });
            }}
            className="btn btn-sm btn-primary"
          >
            <GraduationCapIcon size={16} weight="fill" />
            Practice
          </button>
        )}
        {isTeacher && !reorderMode && (
          <button
            onClick={handleRemove}
            className="btn btn-sm btn-ghost btn-square text-error"
          >
            <TrashIcon size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function TeacherMetricsPanel(
  {
    classroom,
    chapters,
    leaderboard,
  }: {
    classroom: Classroom;
    chapters: Chapter[];
    leaderboard: LeaderboardEntry[];
  },
) {
  const students = leaderboard.filter((e) => e.role === "student");
  const averageAccuracy = students.length > 0
    ? students.reduce((sum, s) => sum + s.accuracy, 0) / students.length * 100
    : 0;

  console.log("Students accuracies:", students.map((s) => s.accuracy));
  console.log("Average accuracy:", averageAccuracy);

  return (
    <div className="card bg-base-100 shadow-sm border border-slate-200">
      <div className="card-body p-5">
        <h2 className="card-title text-lg">Class Metrics</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="stat p-4 bg-slate-50 rounded-lg">
            <div className="stat-title">Total Students</div>
            <div className="stat-value">{students.length}</div>
          </div>
          <div className="stat p-4 bg-slate-50 rounded-lg">
            <div className="stat-title">Average Accuracy</div>
            <div className="stat-value">
              {Math.round(averageAccuracy)}%
            </div>
          </div>
          <div className="stat p-4 bg-slate-50 rounded-lg">
            <div className="stat-title">Total Chapters</div>
            <div className="stat-value">{chapters.length}</div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="font-semibold mb-3">Student Progress</h3>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Student</th>
                  {chapters.map((ch) => (
                    <th key={ch.chapterId} className="text-center text-xs">
                      {ch.name.substring(0, 3)}
                    </th>
                  ))}
                  <th className="text-center">Avg</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.userId}>
                    <td className="font-medium text-sm">
                      {student.userName}
                    </td>
                    {chapters.map((chapter) => (
                      <td
                        key={chapter.chapterId}
                        className="text-center text-xs"
                      >
                        <span className="badge badge-xs">—</span>
                      </td>
                    ))}
                    <td className="text-center text-sm font-medium">
                      {Math.round(student.accuracy * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
