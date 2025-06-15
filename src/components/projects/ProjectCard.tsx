import React from "react";
import Link from "next/link";

interface ProjectCardProps {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  taskCount: number;
  completedTaskCount: number;
}

export default function ProjectCard({
  id,
  name,
  description,
  memberCount,
  taskCount,
  completedTaskCount,
}: ProjectCardProps) {
  // Calculate completion percentage
  const completionPercentage =
    taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;

  return (
    <Link href={`/projects/${id}`}>
      <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900">{name}</h3>

          {description && (
            <p className="mt-2 line-clamp-3 text-sm text-gray-600">
              {description}
            </p>
          )}
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm text-gray-500">
            <span>Progress</span>
            <span>{completionPercentage}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-indigo-600"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center">
            <svg
              className="mr-1.5 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </div>

          <div className="flex items-center">
            <svg
              className="mr-1.5 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path
                fillRule="evenodd"
                d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                clipRule="evenodd"
              />
            </svg>
            {taskCount} {taskCount === 1 ? "task" : "tasks"}
          </div>
        </div>
      </div>
    </Link>
  );
}
