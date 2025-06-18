import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";

const TestNavigation: React.FC = () => {
  const router = useRouter();
  
  const isActive = (path: string) => {
    return router.pathname === path;
  };
  
  return (
    <nav className="bg-gray-800 p-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-xl font-bold text-white">TeamSync</span>
        </div>
        <div className="flex space-x-4">
          <Link 
            href="/api-test" 
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              isActive("/api-test") 
                ? "bg-gray-900 text-white" 
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
          >
            API Test
          </Link>
          <Link 
            href="/notification-test" 
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              isActive("/notification-test") 
                ? "bg-gray-900 text-white" 
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
          >
            Notifications
          </Link>
          <Link 
            href="/trpc-test" 
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              isActive("/trpc-test") 
                ? "bg-gray-900 text-white" 
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
          >
            tRPC Test
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default TestNavigation;
