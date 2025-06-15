import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { GetServerSideProps } from 'next';
import { getServerAuthSession } from '@/server/auth';
import Layout from '@/components/layout/Layout';
import TaskCard from '@/components/tasks/TaskCard';
import TaskForm from '@/components/tasks/TaskForm';

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

type Project = {
  id: string;
  name: string;
};

export default function Tasks() {
  const { data: session } = useSession();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [filter, setFilter] = useState<string>(
    typeof router.query.filter === 'string' ? router.query.filter : 'all'
  );
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);

  // Set filter from URL query
  useEffect(() => {
    if (router.query.filter && typeof router.query.filter === 'string') {
      setFilter(router.query.filter);
    }
  }, [router.query.filter]);

  // Fetch tasks and projects
  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user) return;

      try {
        setLoading(true);
        
        // Get projects where user is a member
        const projectsResponse = await fetch('/api/projects');
        if (!projectsResponse.ok) {
          throw new Error('Failed to fetch projects');
        }
        const projectsData = await projectsResponse.json();
        setProjects(projectsData.projects || []);

        // Build query for tasks
        let apiUrl = '/api/tasks';
        const queryParams = new URLSearchParams();
        
        // Apply filters based on the current filter type
        if (filter === 'assigned') {
          queryParams.append('filter', 'assigned');
        } else if (filter === 'upcoming') {
          queryParams.append('filter', 'upcoming');
        } else if (filter === 'overdue') {
          queryParams.append('filter', 'overdue');
        } else {
          queryParams.append('filter', 'all');
        }

        // Apply additional filters if set
        if (projectFilter) {
          queryParams.append('projectId', projectFilter);
        }
        
        if (statusFilter) {
          queryParams.append('status', statusFilter);
        }
        
        if (priorityFilter) {
          queryParams.append('priority', priorityFilter);
        }

        // Execute query
        const tasksResponse = await fetch(`${apiUrl}?${queryParams.toString()}`);
        if (!tasksResponse.ok) {
          throw new Error('Failed to fetch tasks');
        }
        
        const tasksData = await tasksResponse.json();
        setTasks(tasksData.tasks || []);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      void fetchData();
    }
  }, [session, filter, projectFilter, statusFilter, priorityFilter]);

  // Show loading state while fetching data
  if (loading && !tasks.length) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const handleTaskFormSuccess = () => {
    setShowTaskForm(false);
    void fetchTasks();
  };

  const fetchTasks = async () => {
    if (!session?.user) return;

    try {
      setLoading(true);
      
      // Build query for tasks
      let apiUrl = '/api/tasks';
      const queryParams = new URLSearchParams();
      
      // Apply filters based on the current filter type
      if (filter === 'assigned') {
        queryParams.append('filter', 'assigned');
      } else if (filter === 'upcoming') {
        queryParams.append('filter', 'upcoming');
      } else if (filter === 'overdue') {
        queryParams.append('filter', 'overdue');
      } else {
        queryParams.append('filter', 'all');
      }

      // Apply additional filters if set
      if (projectFilter) {
        queryParams.append('projectId', projectFilter);
      }
      
      if (statusFilter) {
        queryParams.append('status', statusFilter);
      }
      
      if (priorityFilter) {
        queryParams.append('priority', priorityFilter);
      }

      // Execute query
      const response = await fetch(`${apiUrl}?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilterLabel = (filterName: string) => {
    switch (filterName) {
      case 'assigned':
        return 'Assigned to Me';
      case 'upcoming':
        return 'Upcoming';
      case 'overdue':
        return 'Overdue';
      default:
        return 'All Tasks';
    }
  };

  return (
    <>
      <Head>
        <title>Tasks | TeamSync</title>
      </Head>
      <Layout>
        <div className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <h1 className="text-2xl font-semibold text-gray-900 mb-6">
                {getFilterLabel(filter)}
              </h1>
              <div className="mt-4 md:mt-0">
                <Link
                  href="/tasks/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <svg
                    className="-ml-1 mr-2 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  New Task
                </Link>
              </div>
            </div>

            {/* Filter options */}
            <div className="mb-6 bg-white shadow rounded-lg p-4">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label htmlFor="filter" className="block text-sm font-medium text-gray-700">
                    View
                  </label>
                  <select
                    id="filter"
                    name="filter"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    value={filter}
                    onChange={(e) => {
                      setFilter(e.target.value);
                      void router.push({
                        pathname: router.pathname,
                        query: { ...router.query, filter: e.target.value },
                      });
                    }}
                  >
                    <option value="all">All Tasks</option>
                    <option value="assigned">Assigned to Me</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="projectFilter" className="block text-sm font-medium text-gray-700">
                    Project
                  </label>
                  <select
                    id="projectFilter"
                    name="projectFilter"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    value={projectFilter || ''}
                    onChange={(e) => setProjectFilter(e.target.value || null)}
                  >
                    <option value="">All Projects</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    id="statusFilter"
                    name="statusFilter"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    value={statusFilter || ''}
                    onChange={(e) => setStatusFilter(e.target.value || null)}
                  >
                    <option value="">All Statuses</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="priorityFilter" className="block text-sm font-medium text-gray-700">
                    Priority
                  </label>
                  <select
                    id="priorityFilter"
                    name="priorityFilter"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    value={priorityFilter || ''}
                    onChange={(e) => setPriorityFilter(e.target.value || null)}
                  >
                    <option value="">All Priorities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Task form modal */}
            {showTaskForm && (
              <div className="fixed inset-0 overflow-y-auto z-50">
                <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                  </div>
                  <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                  <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                      <div className="sm:flex sm:items-start">
                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                            Add New Task
                          </h3>
                          <TaskForm 
                            onSuccess={handleTaskFormSuccess} 
                            onCancel={() => setShowTaskForm(false)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tasks list */}
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : tasks.length > 0 ? (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    id={task.id}
                    title={task.title}
                    description={task.description || undefined}
                    status={task.status as any}
                    priority={task.priority as any}
                    dueDate={task.due_date || undefined}
                    assignee={task.assignee ? {
                      id: task.assignee.id,
                      name: task.assignee.name || '',
                      email: task.assignee.email || '',
                      avatarUrl: task.assignee.avatar_url || undefined
                    } : null}
                    project={task.project}
                    tags={task.tags || []}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filter !== 'all' 
                    ? `No tasks match your current filters.` 
                    : `Get started by creating a new task.`}
                </p>
                <div className="mt-6">
                  <Link
                    href="/tasks/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <svg
                      className="-ml-1 mr-2 h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    New Task
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}

// Server-side authentication check
export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerAuthSession(context);

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  return {
    props: {}, // Will be passed to the page component as props
  };
};
