import {
  createFileRoute,
  Link,
  Navigate,
  Outlet,
} from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api.js";
import { useNavigate } from "@tanstack/react-router";

import { Authenticated, Unauthenticated } from "convex/react";
import {
  BellIcon,
  BellRingingIcon,
  BookOpenIcon,
  BrainIcon,
  ChartDonutIcon,
  FireSimpleIcon,
  GearIcon,
  Icon,
  SidebarSimpleIcon,
  StackIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { UserButton } from "@clerk/clerk-react";
import { useLocation } from "@tanstack/react-router";
import { Toaster } from "sonner";

export const Route = createFileRoute("/_protected")({
  component: ProtectedComponent,
});

type NavItem = {
  icon: Icon;
  title: string;
  url: string;
};

const NavItem = ({ icon: IconComponent, title, url }: NavItem) => {
  // Check if the current route matches the nav item's URL
  const location = useLocation();
  const match = location.pathname === url ? true : false;

  return (
    <li>
      <Link
        to={url}
        className={`w-full flex items-center justify-start gap-2 px-3 py-2 rounded-md transition-all text-slate-700 hover:text-blue-600 hover:bg-blue-50 ${match ? "text-blue-600" : ""
          }`}
      >
        <IconComponent
          size={16}
          className={match ? "text-blue-600" : "text-slate-700"}
        />
        <article
          className={`prose prose-xs ${match ? "text-black font-medium" : ""}`}
        >
          {title}
        </article>
      </Link>
    </li>
  );
};

const navItems: NavItem[] = [
  {
    title: "Collection",
    icon: BookOpenIcon,
    url: "/collection",
  },
  {
    title: "Chapters",
    icon: StackIcon,

    url: "/chapters",
  },
  {
    title: "Dashboard",
    icon: ChartDonutIcon,
    url: "/dashboard",
  },
  {
    title: "Classrooms",
    icon: UsersIcon,
    url: "/classrooms",
  },
  {
    title: "Focus Session",
    icon: BrainIcon,
    url: "/focus-session",
  },
];

function ProtectedComponent() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <>
      <Toaster
        richColors
      />
      <Authenticated>
        <div className="flex flex-col h-screen bg-base-100 mx-auto max-w-[100rem]">
          {/* Top NavBar */}
          <div className="bg-white shadow-sm z-30 sticky top-0">
            <div className="navbar h-12 min-h-0 px-4 flex items-center">
              <div className="flex-1 flex items-center">
                <div className="tooltip tooltip-bottom" data-tip="Landing Page">
                  <Link
                    to="/"
                    className="font-bold text-lg transition-colors duration-200 hover:text-blue-600"
                  >
                    <span className="text-blue-600">IPA</span>{" "}
                    <span className="text-indigo-600">Navigator</span>
                  </Link>
                </div>
                <div
                  className="tooltip tooltip-bottom"
                  data-tip={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                  <button
                    aria-label="Toggle Sidebar"
                    type="button"
                    onClick={toggleSidebar}
                    className="ml-4 p-1 rounded-md hover:bg-slate-100 flex items-center"
                  >
                    <SidebarSimpleIcon
                      size={20}
                      weight={sidebarOpen ? "fill" : "regular"}
                    />
                  </button>
                </div>
              </div>
              <div className="flex-none gap-3 flex items-center flex-row">
                <NotificationBell />
                <DailyPracticeBadge />
                <UserButton />
              </div>
            </div>
          </div>

          {/* Main content with sidebar */}
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar with proper animation */}
            <div
              className={`bg-slate-100 border-r border-slate-200 overflow-hidden transition-all duration-300 ease-in-out ${sidebarOpen ? "w-56" : "w-0"
                }`}
            >
              <div className="w-56 h-full">
                <aside className="flex flex-col h-full">
                  <div className="flex-grow">
                    <div className="h-4" />
                    <ul className="menu text-base-content w-full px-4 py-0">
                      {/* Sidebar content */}
                      <li>
                        <h2 className="text-slate-500 font-medium text-sm px-3 mb-2 font-zilla pointer-events-none">
                          Navigation
                        </h2>
                        <ul>
                          {navItems.map((item, index) => (
                            <NavItem
                              key={index}
                              icon={item.icon}
                              title={item.title}
                              url={item.url}
                            />
                          ))}
                        </ul>
                      </li>
                    </ul>
                  </div>

                  {/* Settings at the bottom */}
                  <div className="p-4">
                    <Link
                      to="/settings"
                      className="w-full flex items-center justify-start gap-2 px-3 py-2 rounded-md transition-all text-slate-700 hover:text-blue-600 hover:bg-blue-50"
                    >
                      <GearIcon size={16} />
                      <article className="prose prose-xs">Settings</article>
                    </Link>
                  </div>
                </aside>
              </div>
            </div>

            {/* Page Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50">
              <Outlet />
            </div>
          </div>
        </div>
      </Authenticated>
      <Unauthenticated>
        <Navigate
          to="/sign-in"
          search={{ redirect: globalThis.location.pathname }}
        />
      </Unauthenticated>
    </>
  );
}

function DailyPracticeBadge() {
  const navigate = useNavigate();
  const streak = useQuery(api.functions.gamification.getUserStreak, {});
  const randomChapter = useQuery(
    api.functions.gamification.getRandomChapterForDaily,
    {},
  );

  if (streak === undefined || randomChapter === undefined || randomChapter === null) return null;

  const handleDailyPractice = () => {
    navigate({
      to: "/chapters/$chapterId/practice",
      params: { chapterId: randomChapter._id },
    });
  };

  return (
    <div className="tooltip tooltip-bottom" data-tip="Daily Practice">
      <button
        className="btn btn-ghost rounded-lg flex items-center justify-center px-1"
        onClick={handleDailyPractice}
      >
        <FireSimpleIcon size={20} />
        <span className="text-sm font-bold ml-1">
          {streak.currentStreak}
        </span>
      </button>
    </div>
  );
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const notifications = useQuery(api.functions.gamification.getNotifications, {
    limit: 10,
  });
  const markAllAsRead = useMutation(
    api.functions.gamification.markAllNotificationsAsRead,
  );

  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark notifications as read");
    }
  };

  const formatTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case "badge_earned":
        return "🏆";
      case "streak_milestone":
        return "🔥";
      case "daily_claimed":
        return "";
      case "streak_lost":
        return "😢";
      default:
        return "📢";
    }
  };

  return (
    <div className="dropdown dropdown-end">
      <div className="tooltip tooltip-bottom" data-tip="Notifications">
        <button
          className="btn btn-ghost btn-circle flex items-center justify-center relative"
          onClick={() => setIsOpen(!isOpen)}
        >
          {unreadCount > 0
            ? <BellRingingIcon size={20} className="text-primary" />
            : <BellIcon size={20} />}
        </button>
      </div>

      {isOpen && (
        <div className="dropdown-content menu p-2 shadow bg-base-100 rounded-lg w-80">
          <div className="p-3 border-b border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={handleMarkAllAsRead}
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {!notifications || notifications.length === 0
              ? (
                <div className="p-4 text-center text-slate-500 text-sm">
                  No notifications yet
                </div>
              )
              : (
                notifications.map((notif) => (
                  <div
                    key={notif._id}
                    className={`p-3 border-b border-slate-100 hover:bg-slate-50 ${!notif.read ? "bg-blue-50" : ""
                      }`}
                  >
                    <div className="flex gap-2">
                      <span className="text-lg flex-shrink-0">
                        {getNotificationIcon(notif.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-800">
                          {notif.title}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {notif.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                          {formatTime(notif.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
          </div>
        </div>
      )}
    </div>
  );
}
