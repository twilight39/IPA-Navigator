import { createFileRoute, Link } from "@tanstack/react-router";
import { SignOutButton } from "@clerk/clerk-react";
import { useConvexAuth } from "convex/react";
import {
  ArrowRightIcon,
  BrainIcon,
  LightningIcon,
  UsersIcon,
} from "@phosphor-icons/react";

export const Route = createFileRoute("/")({
  component: IndexComponent,
});

function IndexComponent() {
  const { isAuthenticated } = useConvexAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col">
      <div className="navbar fixed top-0 z-50 bg-base-100/70 backdrop-blur-md shadow-sm border-b border-slate-200/50">
        <div className="navbar-start">
          <Link
            to="/"
            className="px-3 py-2 rounded-lg font-bold text-xl transition-colors duration-200 hover:text-blue-500"
          >
            <span className="text-blue-600">IPA</span>{" "}
            <span className="text-indigo-600">Navigator</span>
          </Link>
        </div>
        <div className="navbar-center hidden md:flex">
          <ul className="menu menu-horizontal px-1">
            <li>
              <Link to="/features" className="hover:text-blue-600">
                Features
              </Link>
            </li>
            <li>
              <Link to="/pricing" className="hover:text-blue-600">Pricing</Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-blue-600">About</Link>
            </li>
          </ul>
        </div>
        <div className="navbar-end gap-2">
          {isAuthenticated
            ? (
              <>
                <Link
                  to="/dashboard"
                  className="btn btn-ghost hover:bg-blue-50"
                >
                  Dashboard
                </Link>
                <SignOutButton>
                  <button className="btn btn-outline border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white">
                    Sign Out
                  </button>
                </SignOutButton>
              </>
            )
            : (
              <>
                <Link to="/sign-in" className="btn btn-ghost hover:bg-blue-50">
                  Sign In
                </Link>
                <Link
                  to="/sign-up"
                  className="btn btn-primary bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Get Started
                </Link>
              </>
            )}
        </div>
      </div>
      <main className="flex-1 flex flex-col items-center justify-center text-center p-6 pt-24 space-y-12">
        <div className="max-w-3xl space-y-6">
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Master Your Pronunciation
          </h1>
          <p className="text-lg md:text-xl text-slate-700 max-w-2xl mx-auto">
            Elevate your speaking skills with AI-powered practice, personalized
            feedback, and a supportive community. Join IPA Navigator today!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/dashboard"
              className="btn btn-primary bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              Get Started{" "}
              <ArrowRightIcon className="ml-2 h-5 w-5" weight="bold" />
            </Link>
            <button className="btn btn-outline border-indigo-500 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
              Learn More
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 max-w-5xl w-full">
          <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
            <div className="card-body items-center text-center">
              <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-3">
                <LightningIcon
                  className="h-10 w-10 text-yellow-500"
                  weight="fill"
                />
              </div>
              <h3 className="card-title text-slate-800">AI-Powered Practice</h3>
              <p className="text-slate-600">
                Receive instant feedback on your pronunciation with our advanced
                speech analysis.
              </p>
            </div>
          </div>
          <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
            <div className="card-body items-center text-center">
              <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-3">
                <UsersIcon className="h-10 w-10 text-teal-500" weight="fill" />
              </div>
              <h3 className="card-title text-slate-800">
                Community Colloquiums
              </h3>
              <p className="text-slate-600">
                Join practice groups, share progress, and learn with peers in a
                supportive environment.
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
            <div className="card-body items-center text-center">
              <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-3">
                <BrainIcon
                  className="h-10 w-10 text-purple-500"
                  weight="fill"
                />
              </div>
              <h3 className="card-title text-slate-800">Personalized Focus</h3>
              <p className="text-slate-600">
                Target your weak spots with AI-curated chapters designed to
                boost your improvement.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer footer-center p-8 bg-white/60 text-slate-600">
        <aside>
          <p>
            &copy; {new Date().getFullYear()}{" "}
            IPA Navigator. All rights reserved.
          </p>
        </aside>
      </footer>
    </div>
  );
}
