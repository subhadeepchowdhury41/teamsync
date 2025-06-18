import React, { ReactNode, useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/auth/signin");
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      name: "Projects",
      href: "/projects",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
    },
    {
      name: "Tasks",
      href: "/tasks",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      ),
    },
    {
      name: "Calendar",
      href: "/calendar",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
  ];

  const userNavigation = [
    { name: "Your Profile", href: "/profile" },
    { name: "Settings", href: "/settings" },
  ];

  // If user is not logged in and not on auth pages, redirect to sign in
  React.useEffect(() => {
    if (status === "unauthenticated" && !router.pathname.startsWith("/auth/")) {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Don't show layout on auth pages
  if (router.pathname.startsWith("/auth/")) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Navigation drawer - desktop */}
      <div
        className={`fixed inset-y-0 left-0 w-64 transform bg-indigo-800 text-white ${drawerOpen ? "translate-x-0" : "-translate-x-full"} z-30 transition duration-200 ease-in-out md:translate-x-0`}
      >
        <div className="p-6">
          <Link
            href="/dashboard"
            className="flex items-center text-xl font-bold text-white"
          >
            <svg
              className="mr-2 h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            TeamSync
          </Link>
        </div>
        <nav className="mt-6">
          <div className="space-y-1 px-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3 transition-colors ${router.pathname.startsWith(item.href) ? "bg-indigo-900 text-white" : "text-indigo-100 hover:bg-indigo-700"} rounded-md`}
                onClick={() => setDrawerOpen(false)}
              >
                <span className="mr-3">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
        </nav>
        <div className="absolute bottom-0 w-full border-t border-indigo-700 p-4">
          <div className="flex items-center">
            <div className="relative h-10 w-10 flex-shrink-0">
              {user?.image ? (
                <Image
                  src={user.image}
                  alt="User avatar"
                  className="rounded-full"
                  width={40}
                  height={40}
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600">
                  <span className="text-xl font-medium text-white">
                    {user?.name?.charAt(0) || user?.email?.charAt(0) || "?"}
                  </span>
                </div>
              )}
            </div>
            <div className="ml-3 text-sm">
              <p className="font-medium text-white">{user?.name || "User"}</p>
              <p className="w-[90%] truncate text-xs text-indigo-200">
                {user?.email || ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-20 bg-gray-800 bg-opacity-50 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <div className="flex flex-1 flex-col md:ml-64">
        {/* Top navigation */}
        <nav className="flex w-full justify-between bg-indigo-600 shadow-md">
          <div className="left-0 px-4 sm:right-0 w-full sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between md:justify-end">
              {/* Mobile menu button */}
              <button
                onClick={toggleDrawer}
                className="inline-flex items-center justify-center rounded-md p-2 text-indigo-200 hover:bg-indigo-500 hover:text-white focus:outline-none md:hidden"
              >
                <span className="sr-only">Open sidebar</span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>

              {/* Page title - mobile only */}
              <div className="flex-1 text-center md:hidden">
                <h1 className="text-lg font-medium text-white">
                  {navigation.find((item) =>
                    router.pathname.startsWith(item.href),
                  )?.name || "TeamSync"}
                </h1>
              </div>

              {/* Right side - user dropdown */}
              <div className="ml-4 flex items-center">
                {/* User dropdown */}
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    className="flex max-w-xs items-center rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-white"
                  >
                    <span className="sr-only">Open user menu</span>
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-indigo-200">
                      {user?.image ? (
                        <Image
                          src={user.image}
                          alt="User avatar"
                          className="h-8 w-8 rounded-full"
                          width={32}
                          height={32}
                        />
                      ) : (
                        <span className="text-sm font-medium text-indigo-800">
                          {user?.name?.charAt(0) ||
                            user?.email?.charAt(0) ||
                            "?"}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Dropdown menu */}
                  {profileMenuOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-48 origin-top-left rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                      <div className="border-b px-4 py-2">
                        <p className="text-sm font-medium text-gray-900">
                          {user?.name || "User"}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {user?.email || ""}
                        </p>
                      </div>

                      {userNavigation.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          {item.name}
                        </Link>
                      ))}

                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          handleSignOut();
                        }}
                        className="block w-full border-t px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
