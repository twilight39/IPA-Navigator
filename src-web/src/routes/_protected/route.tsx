import {
  createFileRoute,
  Link,
  Navigate,
  Outlet,
} from "@tanstack/react-router";

import { Authenticated, Unauthenticated } from "convex/react";
import {
  BellIcon,
  BookOpenIcon,
  BrainIcon,
  ChartDonutIcon,
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
        className={`w-full flex items-center justify-start gap-2 px-3 py-2 rounded-md transition-all text-slate-700 hover:text-blue-600 hover:bg-blue-50 ${
          match ? "text-blue-600" : ""
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
              <div className="flex-none gap-3 flex items-center">
                <div
                  className="tooltip tooltip-bottom"
                  data-tip="Notifications"
                >
                  <button className="btn btn-ghost btn-circle flex items-center justify-center">
                    <BellIcon size={20} />
                  </button>
                </div>
                <UserButton />
              </div>
            </div>
          </div>

          {/* Main content with sidebar */}
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar with proper animation */}
            <div
              className={`bg-slate-100 border-r border-slate-200 overflow-hidden transition-all duration-300 ease-in-out ${
                sidebarOpen ? "w-56" : "w-0"
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
