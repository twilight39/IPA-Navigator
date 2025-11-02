import { createFileRoute } from "@tanstack/react-router";
import { useUser } from "@clerk/clerk-react";
import {
  BookmarkSimpleIcon,
  BookOpenTextIcon,
  CalendarBlankIcon,
  EnvelopeSimpleIcon,
  HeartIcon,
} from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api.js";
import { UserProfile } from "@clerk/clerk-react";
// @ts-types="react"
import { BadgesDisplay } from "../../components/BadgesDisplay.tsx";
import { useState } from "react";

import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

export const Route = createFileRoute("/_protected/dashboard")({
  component: DashboardComponent,
});

function DashboardComponent() {
  const [showEditProfile, setShowEditProfile] = useState(false);

  const user = useUser().user;

  const userAccuracyData = useQuery(
    api.functions.dashboard.getUserAccuracyOverTime,
    {},
  );
  const userActivityLog = useQuery(
    api.functions.dashboard.getUserActivitiyLog,
    {},
  );
  const userCommunityStats: UserCommunityStats | undefined = useQuery(
    api.functions.dashboard.getUserCommunityStats,
    {},
  );
  const userMeterData: MeterData = useQuery(
    api.functions.dashboard.getUserProgressMeterData,
    {},
  );
  const userPercentileData = useQuery(
    api.functions.dashboard.getUserPercentileAndDistribution,
    {},
  );
  const userSkills: UserSkills = useQuery(
    api.functions.dashboard.getUserSkills,
  );

  const userAccuracyOverTime = userAccuracyData?.chartData || [];
  const totalWordsPracticed = userAccuracyData?.totalWords || 0;

  // Calculate overall accuracy
  const overallAccuracy = userAccuracyOverTime.length > 0
    ? userAccuracyOverTime[userAccuracyOverTime.length - 1].accuracy.toFixed(2)
    : 0;

  console.log(userPercentileData);

  if (
    user === null || user === undefined || userCommunityStats === undefined ||
    userMeterData === undefined || userSkills === undefined
  ) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // --- SVG Constants ---
  const overallTotal = Object.values(userMeterData.categories.difficulty).map((
    d,
  ) => d.total).reduce((a, b) => a + b, 0);
  const overallSolved = userMeterData.completedChapters ?? 0;
  const overallAttempting = userMeterData.attemptingChapters ?? 0;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 4;

  const lineChartData = {
    labels: userAccuracyOverTime.map((d) => d.label),
    datasets: [
      {
        label: "Accuracy",
        data: userAccuracyOverTime.map((d) => d.accuracy),
        fill: false,
        backgroundColor: "rgb(5, 211, 189)", // Main line color (Teal)
        borderColor: "rgba(5, 211, 189, 0.6)",
        tension: 0.4, // Makes the line smooth
        pointRadius: 3,
        pointBackgroundColor: "rgb(5, 211, 189)",
        pointBorderColor: "#fff",
        pointHoverRadius: 5,
        pointHoverBackgroundColor: "rgb(5, 211, 189)",
        pointHoverBorderColor: "rgba(220,220,220,1)",
      },
    ],
  };

  return (
    <div className="p-4 flex flex-row gap-4">
      <div className="card bg-base-100 shadow-xl max-w-[30vh]">
        <div className="card-body">
          <div className="flex items-top space-x-4 mb-4">
            <div className="avatar">
              <div className="w-16 rounded-full">
                <img
                  src={user.imageUrl}
                  alt="User Avatar"
                />
              </div>
            </div>
            <div>
              <div className="card-title">
                <p className="text-md font-bold">{user.fullName}</p>
              </div>
              <p className="text-sm text-gray-500">{user.username}</p>
            </div>
          </div>
          <button
            className="btn btn-sm btn-success w-full btn-soft"
            onClick={() => {
              (document.getElementById("modal") as HTMLDialogElement)
                ?.showModal();
            }}
            type="button"
          >
            Edit Profile
          </button>

          <div className="space-y-2 text-sm text-gray-600 mt-2">
            <p className="flex items-center">
              <EnvelopeSimpleIcon size={16} className="mr-1" />
              {user.primaryEmailAddress?.emailAddress || "Not Linked"}
            </p>
            <p className="flex items-center">
              <CalendarBlankIcon size={16} className="mr-1" />
              {getTimeElapsed(user.createdAt)}
            </p>
          </div>

          <div className="divider my-0"></div>

          <div>
            <p className="text-lg font-semibold">Community Stats</p>
            <div className="flex flex-row space-y-4 space-x-2 mt-2">
              <BookOpenTextIcon size={24} color="#05D3BC"></BookOpenTextIcon>
              <div className="flex flex-col space-y-0">
                <div className="flex flex-row space-x-2">
                  <p className="text-md text-gray-700 flex-grow-0">Chapters</p>
                  <p className="text-md font-semibold">
                    {userCommunityStats.chaptersCreated}
                  </p>
                </div>
                <div className="flex flex-row space-x-1">
                  <p className="text-xs text-gray-500 flex-grow-0">Last Week</p>
                  <p className="text-xs text-gray-400">
                    {userCommunityStats.chaptersCreatedLastWeek}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-row space-y-4 space-x-2 mt-2">
              <HeartIcon size={24} color="#FE637D"></HeartIcon>
              <div className="flex flex-col space-y-0">
                <div className="flex flex-row space-x-2">
                  <p className="text-md text-gray-700 flex-grow-0">Liked</p>
                  <p className="text-md font-semibold">
                    {userCommunityStats.chaptersLiked}
                  </p>
                </div>
                <div className="flex flex-row space-x-1">
                  <p className="text-xs text-gray-500 flex-grow-0">Last Week</p>
                  <p className="text-xs text-gray-400">
                    {userCommunityStats.chaptersLikedLastWeek}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-row space-y-4 space-x-2 mt-2">
              <BookmarkSimpleIcon size={24} color="#00BBFE">
              </BookmarkSimpleIcon>
              <div className="flex flex-col space-y-0">
                <div className="flex flex-row space-x-2">
                  <p className="text-md text-gray-700 flex-grow-0">
                    Bookmarked
                  </p>
                  <p className="text-md font-semibold">
                    {userCommunityStats.chaptersBookmarked}
                  </p>
                </div>
                <div className="flex flex-row space-x-1">
                  <p className="text-xs text-gray-500 flex-grow-0">Last Week</p>
                  <p className="text-xs text-gray-400">
                    {userCommunityStats.chaptersBookmarkedLastWeek}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="divider my-0"></div>

          <div>
            <p className="text-lg font-semibold">Skills</p>
            <div className="flex flex-col space-y-2 mt-2">
              <div className="flex flex-row space-x-2 items-center">
                <div
                  aria-label="status"
                  className="status status-primary status-sm"
                >
                </div>
                <p className="text-xs text-gray-700 flex-grow-0 font-semibold">
                  Vowels
                </p>
              </div>
              {userSkills["Vowels"] &&
                Object.keys(userSkills["Vowels"]).length === 0 && (
                <p className="text-xs text-gray-400 italic">(No Skills)</p>
              )}
              {userSkills["Vowels"] &&
                Object.keys(userSkills["Vowels"]).length > 0 && (
                <div className="flex flex-wrap space-x-1">
                  {Object.values(userSkills["Vowels"])
                    .filter((skill) => skill.completedCount > 0)
                    .map((skill) => (
                      <div className="flex flex-row">
                        <div
                          className={`badge badge-sm badge-ghost`}
                        >
                          {skill.name}
                        </div>
                        <div className="tex-sm text-gray-400">
                          x {skill.completedCount}
                        </div>
                      </div>
                    ))}
                </div>
              )}
              <div className="flex flex-row space-x-2 items-center mt-2">
                <div
                  aria-label="status"
                  className="status status-error status-sm"
                >
                </div>
                <p className="text-xs text-gray-700 flex-grow-0 font-semibold">
                  Consonants
                </p>
              </div>
              {userSkills["Consonants"] &&
                Object.keys(userSkills["Consonants"]).length === 0 && (
                <p className="text-xs text-gray-400 italic">(No Skills)</p>
              )}
              {userSkills["Consonants"] &&
                Object.keys(userSkills["Consonants"]).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {Object.values(userSkills["Consonants"])
                    .filter((skill) => skill.completedCount > 0)
                    .map((skill) => (
                      <div className="flex flex-row">
                        <div
                          className={`badge badge-sm badge-ghost`}
                        >
                          {skill.name}
                        </div>
                        <div className="tex-sm text-gray-400">
                          x {skill.completedCount}
                        </div>
                      </div>
                    ))}
                </div>
              )}
              <div className="flex flex-row space-x-2 items-center mt-2">
                <div
                  aria-label="status"
                  className="status status-success status-sm"
                >
                </div>
                <p className="text-xs text-gray-700 flex-grow-0 font-semibold">
                  Diphthongs
                </p>
              </div>
              {userSkills["Dipthongs"] &&
                Object.keys(userSkills["Dipthongs"]).length === 0 && (
                <p className="text-xs text-gray-400 italic">(No Skills)</p>
              )}
              {userSkills["Dipthongs"] &&
                Object.keys(userSkills["Dipthongs"]).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {Object.values(userSkills["Dipthongs"])
                    .filter((skill) => skill.completedCount > 0)
                    .map((skill) => (
                      <div className="flex flex-row">
                        <div
                          className={`badge badge-sm badge-ghost`}
                        >
                          {skill.name}
                        </div>
                        <div className="tex-sm text-gray-400">
                          x {skill.completedCount}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-3 flex-col space-y-6">
        <div className="card bg-base-100 shadow-md">
          <div className="card-body flex flex-row p-2">
            <div className="flex flex-col flex-1">
              <div className="flex-1 flex">
                <div className="flex flex-row pl-2 space-x-16">
                  <div className="flex flex-col py-1">
                    <p className="text-sm text-gray-500 flex-grow-0">
                      Accuracy
                    </p>
                    <p className="text-2xl">{overallAccuracy}%</p>
                  </div>
                  <div className="flex flex-col py-1">
                    <p className="text-sm text-gray-500 flex-grow-0">Ranking</p>
                    <div className="flex flex-row">
                      <p className="text-sm mr-0 flex-grow-0">
                        {userPercentileData?.userRank}
                      </p>
                      <p className="text-sm text-gray-400 ml-0">
                        /{userPercentileData?.totalUsers}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col py-1">
                    <p className="text-sm text-gray-500 flex-grow-0">
                      Practiced
                    </p>
                    <p className="text-sm">
                      {totalWordsPracticed.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-2 mt-4 h-48">
                {userAccuracyOverTime.length > 0
                  ? <Line data={lineChartData} options={lineChartOptions} />
                  : (
                    <div className="flex h-full items-center justify-center text-gray-500 italic">
                      No accuracy data available yet.
                    </div>
                  )}
              </div>
            </div>

            <div
              className="divider divider-horizontal mx-2"
              style={{ width: "1px" }}
            >
            </div>
            <div className="flex-1 flex flex-col">
              <div className="flex flex-col py-1">
                <p className="text-sm text-gray-500 flex-grow-0">Top</p>
                <p className="text-2xl">
                  {userPercentileData?.userPercentile}%
                </p>
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <div className="flex items-end gap-1 h-32 flex-1">
                  {userPercentileData?.histogram.map((bucket) => (
                    <div
                      key={bucket.range}
                      className={`flex-1 rounded-sm transition-all ${
                        bucket.isUserBucket ? "bg-warning" : "bg-gray-300"
                      }`}
                      style={{
                        height: `${Math.max(bucket.heightPercent, 5)}%`,
                      }}
                      title={`${bucket.range}: ${bucket.count} users`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-row gap-4">
          <div className="card bg-base-100 shadow-md flex-1">
            <div className="card-body p-2 px-4">
              <div className="flex flex-row py-1">
                <div className="flex-3">
                  <div className="relative w-full h-40 flex items-center justify-center items-center">
                    <svg
                      className="w-full h-full absolute top-0 left-0 transform rotate-[-90deg]"
                      viewBox="0 0 100 100"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {(() => {
                        const radius = 40;
                        const strokeWidth = 4;
                        const circumference = 2 * Math.PI * radius;
                        const segmentDegrees = 82.5;

                        // Convert degrees to dasharray values
                        const segmentLength = (segmentDegrees / 360) *
                          circumference;

                        // Calculate progress percentages
                        const beginnerProgress =
                          userMeterData.categories.difficulty.Beginner.solved /
                            userMeterData.categories.difficulty.Beginner
                              .total || 0;
                        const intermediateProgress =
                          userMeterData.categories.difficulty.Intermediate
                              .solved /
                            userMeterData.categories.difficulty.Intermediate
                              .total || 0;
                        const advancedProgress =
                          userMeterData.categories.difficulty.Advanced.solved /
                            userMeterData.categories.difficulty.Advanced
                              .total || 0;

                        return (
                          <>
                            {/* Background segments */}
                            {/* West segment - Beginner (soft success) */}
                            <circle
                              cx="50"
                              cy="50"
                              r={radius}
                              fill="none"
                              stroke="#B8FFD2"
                              strokeWidth={strokeWidth}
                              strokeDasharray={`${segmentLength} ${
                                circumference - segmentLength
                              }`}
                              strokeDashoffset={circumference * 135 / 360}
                              strokeLinecap="round"
                            />

                            {/* North segment - Intermediate (soft warning) */}
                            <circle
                              cx="50"
                              cy="50"
                              r={radius}
                              fill="none"
                              stroke="#FEF3C7"
                              strokeWidth={strokeWidth}
                              strokeDasharray={`${segmentLength} ${
                                circumference - segmentLength
                              }`}
                              strokeDashoffset={circumference * 42.5 / 360}
                              strokeLinecap="round"
                            />

                            {/* East segment - Danger (soft error) */}
                            <circle
                              cx="50"
                              cy="50"
                              r={radius}
                              fill="none"
                              stroke="#FFA9B0"
                              strokeWidth={strokeWidth}
                              strokeDasharray={`${segmentLength} ${
                                circumference - segmentLength
                              }`}
                              strokeDashoffset={-circumference * 50 / 360}
                              strokeLinecap="round"
                            />

                            {/* Progress overlays */}
                            {/* West - Beginner progress */}
                            <circle
                              cx="50"
                              cy="50"
                              r={radius}
                              fill="none"
                              stroke="#05D3BD"
                              strokeWidth={strokeWidth}
                              strokeDasharray={`${
                                segmentLength * beginnerProgress
                              } ${
                                circumference - segmentLength * beginnerProgress
                              }`}
                              strokeDashoffset={circumference * 135 / 360}
                              strokeLinecap="round"
                            />

                            {/* North - Intermediate progress */}
                            <circle
                              cx="50"
                              cy="50"
                              r={radius}
                              fill="none"
                              stroke="#FEC84B"
                              strokeWidth={strokeWidth}
                              strokeDasharray={`${
                                segmentLength * intermediateProgress
                              } ${
                                circumference - segmentLength *
                                  intermediateProgress
                              }`}
                              strokeDashoffset={circumference * 42.5 / 360}
                              strokeLinecap="round"
                            />

                            {/* East - Advanced progress */}
                            <circle
                              cx="50"
                              cy="50"
                              r={radius}
                              fill="none"
                              stroke="#FE637D"
                              strokeWidth={strokeWidth}
                              strokeDasharray={`${
                                segmentLength * advancedProgress
                              } ${
                                circumference - segmentLength * advancedProgress
                              }`}
                              strokeDashoffset={-circumference * 50 / 360}
                              strokeLinecap="round"
                            />
                          </>
                        );
                      })()}
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <p className="text-3xl font-bold leading-none flex-grow-0 leading-none">
                        {overallSolved}
                        <span className="text-gray-400 text-lg leading-none">
                          /{overallTotal}
                        </span>
                      </p>
                      <p
                        className="text-sm text-success flex items-center gap-1 mt-1 flex-grow-0 mt-0"
                        style={{ marginTop: "0" }}
                      >
                        <span>✓</span> Solved
                      </p>
                      <p className="absolute bottom-4 text-xs text-gray-500 leading-none">
                        {overallAttempting} Attempting
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col flex-1 space-y-2 py-1">
                  <div className="flex flex-row flex-1">
                    <div className="card bg-base-200 rounded-md items-center p-1 w-full">
                      <p className="text-success font-semibold leading-none">
                        Beginner
                      </p>
                      <p className="">
                        {userMeterData.categories.difficulty.Beginner
                          .solved}/{userMeterData.categories.difficulty.Beginner
                          .total}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row flex-1">
                    <div className="card bg-base-200 rounded-md items-center p-1 w-full">
                      <p className="text-warning font-semibold leading-none">
                        Intermediate
                      </p>
                      <p className="">
                        {userMeterData.categories.difficulty.Intermediate
                          .solved}/
                        {userMeterData.categories.difficulty.Intermediate.total}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row flex-1">
                    <div className="card bg-base-200 rounded-md items-center p-1 w-full">
                      <p className="text-error font-semibold leading-none">
                        Advanced
                      </p>
                      <p className="">
                        {userMeterData.categories.difficulty.Advanced.solved}/
                        {userMeterData.categories.difficulty.Advanced.total}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="card bg-base-100 shadow-md flex-1">
            <div className="card-body p-4">
              <BadgesDisplay />
            </div>
          </div>
        </div>
        <div className="card bg-base-100 shadow-md">
          <div className="card-body p-2 px-4">
            <div className="flex flex-row py-1">
              <div className="flex flex-col flex-1 items-start">
                <p className="text-lg font-semibold flex-grow-0">
                  Activity Log
                </p>
                {userActivityLog.length === 0
                  ? (
                    <p className="text-sm text-gray-500">
                      No activity recorded yet.
                    </p>
                  )
                  : (
                    <div className="overflow-x-auto w-full rounded-lg">
                      <table className="table w-full">
                        <tbody>
                          {userActivityLog.map((entry, index) => {
                            const rowBgClass = index % 2 === 0
                              ? "bg-base-200"
                              : "bg-transparent"; // Example dark color
                            return (
                              <tr
                                key={entry._id}
                                className={`hover:bg-base-300 group ${rowBgClass}`}
                              >
                                <td className="flex justify-between items-center text-sm text-gray-600 py-3 pr-4">
                                  <div>
                                    {entry.description
                                      ? (() => {
                                        const parts = entry.description.split(
                                          '"',
                                        );
                                        if (parts.length === 3) {
                                          const actionPrefix = parts[0];
                                          const chapterName = parts[1];
                                          return (
                                            <>
                                              {actionPrefix}
                                              <span className="font-semibold">
                                                {chapterName}
                                              </span>
                                              {parts.length > 2 && parts[2]}
                                            </>
                                          );
                                        }
                                        return entry.description;
                                      })()
                                      : (
                                        entry.description
                                      )}
                                  </div>
                                  <div className="ml-4 flex-shrink-0">
                                    <span className="text-sm text-gray-500">
                                      {formatTimestamp(entry.created_at)}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <dialog className="modal modal-blur" id="modal">
        <div
          className="modal-box p-0 bg-base-300 w-[55rem] overflow-y-auto relative"
          style={{ maxWidth: "none" }}
        >
          <button
            type="button"
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            onClick={() => {
              const modal = document.getElementById(
                "modal",
              ) as HTMLDialogElement;
              if (modal) modal.close();
            }}
          >
            X
          </button>
          <UserProfile />
        </div>

        <form method="dialog" className="modal-backdrop backdrop-blur">
          <button type="submit">close</button>
        </form>
      </dialog>
    </div>
  );
}

function getTimeElapsed(date: Date | null): string {
  const now = new Date();

  let years = now.getFullYear() - date.getFullYear();
  let months = now.getMonth() - date.getMonth();
  let days = now.getDate() - date.getDate();

  if (days < 0) {
    months -= 1;
    // Get days in previous month
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years > 0) {
    return `${years} year${years > 1 ? "s" : ""}, ${months} month${
      months !== 1 ? "s" : ""
    }`;
  } else if (months > 0) {
    return `${months} month${months !== 1 ? "s" : ""}, ${days} day${
      days !== 1 ? "s" : ""
    }`;
  } else {
    return `${days} day${days !== 1 ? "s" : ""}`;
  }
}

function formatTimestamp(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);
  const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = secondsAgo / 31536000;
  if (interval > 1) {
    const years = Math.floor(interval);
    return `${years} year${years !== 1 ? "s" : ""} ago`;
  }

  interval = secondsAgo / 2592000;
  if (interval > 1) {
    const months = Math.floor(interval);
    return `${months} month${months !== 1 ? "s" : ""} ago`;
  }

  interval = secondsAgo / 86400;
  if (interval > 1) {
    const days = Math.floor(interval);
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  }

  interval = secondsAgo / 3600;
  if (interval > 1) {
    const hours = Math.floor(interval);
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  }

  interval = secondsAgo / 60;
  if (interval > 1) {
    const minutes = Math.floor(interval);
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  }

  if (secondsAgo < 60) {
    return "just now";
  }

  return date.toLocaleString();
}

function formatStat(count: number | undefined): string {
  if (count === undefined) {
    return "...";
  }
  return String(count);
}

interface UserChapterStat {
  chapterId: string;
  userId: string;
  completed_excerpts_count: number;
  total_excerpts_in_chapter: number;
  overall_accuracy: number;
  completed: boolean;
  created_at: number;
  updated_at: number;
}

interface UserCommunityStats {
  chaptersCreated: number;
  chaptersLiked: number;
  chaptersBookmarked: number;
  chaptersCreatedLastWeek: number;
  chaptersLikedLastWeek: number;
  chaptersBookmarkedLastWeek: number;
}

interface PhonemeCategoryStats {
  categoryType: "phoneme_type";
  completedCount: number;
  name: string;
  totalCount: number;
}

interface UserSkills {
  Vowels: Record<string, PhonemeCategoryStats>;
  Consonants: Record<string, PhonemeCategoryStats>;
  Dipthongs: Record<string, PhonemeCategoryStats>;
}

interface Difficulty {
  solved: number;
  total: number;
}

interface MeterData {
  totalChapters: number;
  completedChapters: number;
  attemptingChapters: number;
  categories: {
    difficulty: {
      Beginner: Difficulty;
      Intermediate: Difficulty;
      Advanced: Difficulty;
    };
  };
}

interface ChartDataItem {
  label: string;
  accuracy: number;
}

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false, // Allows chart to fill parent div height
  plugins: {
    legend: {
      display: false, // No legend for a single line chart
    },
    title: {
      display: false, // No main chart title
    },
    tooltip: {
      callbacks: {
        label: function (context: any) {
          let label = context.dataset.label || "";
          if (label) {
            label += ": ";
          }
          if (context.parsed.y !== null) {
            label += context.parsed.y + "%";
          }
          return label;
        },
      },
    },
  },
  scales: {
    x: {
      grid: {
        display: false, // No vertical grid lines
      },
      ticks: {
        autoSkip: true, // Automatically skip labels if too many
        maxTicksLimit: 7, // Limit number of visible X-axis labels
        font: {
          size: 10,
        },
        color: "#a0a0a0", // Grey tick labels
      },
      title: {
        display: false, // No X-axis title
      },
    },
    y: {
      min: 0,
      max: 100,
      grid: {
        color: "rgba(200, 200, 200, 0.2)", // Light grey horizontal grid lines
      },
      ticks: {
        callback: function (value: any) {
          return value + "%"; // Add '%' suffix to Y-axis labels
        },
        font: {
          size: 10,
        },
        color: "#a0a0a0", // Grey tick labels
      },
      title: {
        display: false, // No Y-axis title
      },
    },
  },
};
