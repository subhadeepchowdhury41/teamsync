import React, { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { GetServerSideProps } from "next";
import { getServerAuthSession } from "@/server/auth";
import Layout from "@/components/layout/Layout";
import TaskCard from "@/components/tasks/TaskCard";
import TaskForm from "@/components/tasks/TaskForm";
import { api } from "@/utils/api";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assignee: {
    id: string;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  project: {
    id: string;
    name: string;
  } | null;
  tags?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
};

export default function Tasks() {
  const { data: session } = useSession();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [filter, setFilter] = useState<string>(
    typeof router.query.filter === "string" ? router.query.filter : "all",
  );
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Set filter from URL query
  useEffect(() => {
    if (router.query.filter && typeof router.query.filter === "string") {
      setFilter(router.query.filter);
    }
  }, [router.query.filter]);

  // Fetch projects using tRPC
  const { data: projectsData, error: projectsError } = api.project.list.useQuery(undefined, {
    enabled: !!session?.user,
  });
  
  // Handle projects error
  useEffect(() => {
    if (projectsError) {
      console.error("Failed to fetch projects:", projectsError);
      setError("Failed to fetch projects");
    }
  }, [projectsError]);

  // Fetch tasks using tRPC
  const { data: tasksData, error: tasksError, refetch: refetchTasks } = api.task.getAll.useQuery(
    {
      filter: filter as "all" | "assigned" | "upcoming" | "overdue",
      projectId: projectFilter || undefined,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
    },
    {
      enabled: !!session?.user,
    },
  );
  
  // Handle tasks data and errors
  useEffect(() => {
    if (tasksData) {
      // Ensure the task data matches our Task type
      const formattedTasks = tasksData.tasks.map(task => ({
        ...task,
        tags: task.tags?.map(tag => ({
          ...tag,
          color: tag.color || '#cccccc' // Provide default color if null
        })) || []
      }));
      setTasks(formattedTasks);
      setLoading(false);
    }
    if (tasksError) {
      console.error("Failed to fetch tasks:", tasksError);
      setError("Failed to fetch tasks");
      setLoading(false);
    }
  }, [tasksData, tasksError]);

  // No longer needed as TaskForm handles the mutation internally

  // Handle task deletion
  const deleteTaskMutation = api.task.delete.useMutation({
    onSuccess: () => {
      void refetchTasks();
    },
    onError: (error) => {
      console.error("Error deleting task:", error);
      alert(`Error deleting task: ${error.message || "Unknown error"}`);
    },
  });

  // Handle task creation
  const handleCreateTask = () => {
    // Task data will be handled internally by the TaskForm component
    // The form will call this function after successful submission
    setShowTaskForm(false);
    void refetchTasks();
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTaskMutation.mutate({ id: taskId });
    }
  };

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    void router.push({
      pathname: router.pathname,
      query: { ...router.query, filter: newFilter },
    });
  };

  const handleProjectFilterChange = (projectId: string | null) => {
    setProjectFilter(projectId);
  };

  const handleStatusFilterChange = (status: string | null) => {
    setStatusFilter(status);
  };

  const handlePriorityFilterChange = (priority: string | null) => {
    setPriorityFilter(priority);
  };

  if (!session) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">
          <p>Please sign in to view tasks</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Tasks | TeamSync</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Tasks</h1>
          <button
            onClick={() => setShowTaskForm(true)}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Create Task
          </button>
        </div>

        {/* Filter tabs */}
        <div className="mb-6">
          <div className="mb-4 flex space-x-4 border-b">
            <button
              className={`pb-2 ${filter === "all" ? "border-b-2 border-blue-500 font-medium text-blue-500" : "text-gray-500"}`}
              onClick={() => handleFilterChange("all")}
            >
              All Tasks
            </button>
            <button
              className={`pb-2 ${filter === "assigned" ? "border-b-2 border-blue-500 font-medium text-blue-500" : "text-gray-500"}`}
              onClick={() => handleFilterChange("assigned")}
            >
              Assigned to Me
            </button>
            <button
              className={`pb-2 ${filter === "upcoming" ? "border-b-2 border-blue-500 font-medium text-blue-500" : "text-gray-500"}`}
              onClick={() => handleFilterChange("upcoming")}
            >
              Upcoming
            </button>
            <button
              className={`pb-2 ${filter === "overdue" ? "border-b-2 border-blue-500 font-medium text-blue-500" : "text-gray-500"}`}
              onClick={() => handleFilterChange("overdue")}
            >
              Overdue
            </button>
          </div>

          {/* Additional filters */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Project filter */}
            <div>
              <label className="mb-1 block text-sm font-medium">Project</label>
              <select
                className="w-full rounded-md border border-gray-300 p-2"
                value={projectFilter || ""}
                onChange={(e) =>
                  handleProjectFilterChange(e.target.value || null)
                }
              >
                <option value="">All Projects</option>
                {projectsData?.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <select
                className="w-full rounded-md border border-gray-300 p-2"
                value={statusFilter || ""}
                onChange={(e) =>
                  handleStatusFilterChange(e.target.value || null)
                }
              >
                <option value="">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Priority filter */}
            <div>
              <label className="mb-1 block text-sm font-medium">Priority</label>
              <select
                className="w-full rounded-md border border-gray-300 p-2"
                value={priorityFilter || ""}
                onChange={(e) =>
                  handlePriorityFilterChange(e.target.value || null)
                }
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Task list */}
        {loading ? (
          <div className="flex justify-center py-8">
            <p>Loading tasks...</p>
          </div>
        ) : error ? (
          <div className="rounded-md bg-red-50 p-4 text-red-800">
            <p>{error}</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-md bg-gray-50 p-8 text-center">
            <p className="text-gray-500">
              No tasks found matching your criteria
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 ">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                id={task.id}
                title={task.title}
                description={task.description || ''}
                status={task.status as 'todo' | 'in_progress' | 'review' | 'completed'}
                priority={task.priority as 'low' | 'medium' | 'high' | 'urgent'}
                dueDate={task.due_date || undefined}
                assignee={task.assignee ? {
                  id: task.assignee.id,
                  name: task.assignee.name || '',
                  email: task.assignee.email || '',
                  avatarUrl: task.assignee.avatar_url || undefined
                } : null}
                project={task.project ? {
                  id: task.project.id,
                  name: task.project.name
                } : null}
                tags={task.tags}
                onDelete={() => handleDeleteTask(task.id)}
              />
            ))}
          </div>
        )}

        {/* Task creation modal */}
        {showTaskForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Create New Task</h2>
                <button
                  onClick={() => setShowTaskForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  &times;
                </button>
              </div>
              <TaskForm
                onSuccess={handleCreateTask}
                onCancel={() => setShowTaskForm(false)}
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerAuthSession(context);

  if (!session) {
    return {
      redirect: {
        destination: "/auth/signin",
        permanent: false,
      },
    };
  }

  return {
    props: {
      session,
    },
  };
};
