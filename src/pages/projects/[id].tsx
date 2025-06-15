import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import Layout from '@/components/layout/Layout';
import TaskCard from '@/components/tasks/TaskCard';
import TaskForm from '@/components/tasks/TaskForm';
import TagManager from '@/components/tags/TagManager';

type ProjectMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string;
};

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

type Task = {
  id: string;
  title: string;
  description?: string;
  status: string; // Keep as string from API
  priority: string; // Keep as string from API
  due_date?: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  // The API returns tags directly, not task_tags
  tags?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
};

type Project = {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
};

export default function ProjectDetail() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id: projectId } = router.query;
  
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTags, setRefreshTags] = useState(0);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      void router.push('/auth/signin');
    }
  }, [status, router]);

  // Fetch project data
  useEffect(() => {
    const fetchProjectData = async () => {
      if (!session?.user || !projectId || typeof projectId !== 'string') return;

      try {
        setLoading(true);
        setError(null);

        // Fetch all project data in a single request
        const response = await axios.get(`/api/projects/${projectId}/data`);
        const data = response.data;
        
        if (!data || !data.project) {
          setError('Project not found');
          setLoading(false);
          return;
        }

        setProject(data.project);
        setUserRole(data.userRole);
        setTasks(data.tasks || []);
        setMembers(data.members || []);

      } catch (error: any) {
        console.error('Error fetching project data:', error);
        setError(error.response?.data?.error || 'Failed to load project data');
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId, session?.user]);

  // Handle delete task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await axios.delete(`/api/tasks/${taskId}`);
      
      if (response.status === 200) {
        // Update tasks list
        setTasks(tasks.filter(task => task.id !== taskId));
      }
    } catch (error: any) {
      console.error('Error deleting task:', error);
      alert(`Error deleting task: ${error.response?.data?.error || 'Unknown error'}`);
    }
  };

  const handleTaskFormSuccess = async () => {
    setShowTaskForm(false);
    
    if (projectId && typeof projectId === 'string') {
      try {
        const response = await axios.get(`/api/projects/${projectId}/data`);
        if (response.data && response.data.tasks) {
          setTasks(response.data.tasks);
        }
      } catch (error) {
        console.error('Error refreshing tasks:', error);
      }
    }
  };
  
  const handleTagsChange = () => {
    setRefreshTags(prev => prev + 1);
  };

  // Show loading state while checking session or loading data
  if (status === "loading" || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </Layout>
    );
  }

  // Show error state
  if (error) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p>Project not found</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>{project.name} | TeamSync</title>
        <meta name="description" content={`${project.name} - TeamSync Project`} />
      </Head>
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Task Form Modal */}
          {showTaskForm && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {`${projectId ? 'Add Task to ' + project.name : 'Create New Task'}`}
                    </h2>
                    <button
                      onClick={() => setShowTaskForm(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <TaskForm
                    projectId={projectId as string}
                    onSuccess={handleTaskFormSuccess}
                    onCancel={() => setShowTaskForm(false)}
                    availableMembers={members}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Project Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-4 border-b border-gray-200">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl sm:truncate">{project.name}</h1>
              {project.description && (
                <p className="mt-1 text-sm text-gray-500">{project.description}</p>
              )}
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              {(userRole === 'owner' || userRole === 'admin') && (
                <div className="flex space-x-3">
                  <button
                    onClick={() => router.push(`/projects/edit/${projectId}`)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Project
                  </button>
                  <button
                    onClick={() => router.push(`/projects/team/${projectId}`)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Manage Team
                  </button>
                  <button
                    onClick={() => setShowTaskForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Add Task
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Project Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Project Details and Tasks */}
            <div className="lg:col-span-2 space-y-6">
              {/* Project Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <dt className="text-sm font-medium text-gray-500 truncate">Completed Tasks</dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">
                      {tasks.filter(task => task.status === 'completed').length}
                    </dd>
                  </div>
                </div>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Tasks</dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">{tasks.length}</dd>
                  </div>
                </div>
              </div>

              {/* Tasks Section */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Tasks</h2>
                  <button
                    onClick={() => setShowTaskForm(true)}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    New Task
                  </button>
                </div>

                {tasks.length > 0 ? (
                  <div className="space-y-4">
                    {tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        id={task.id}
                        title={task.title}
                        description={task.description}
                        status={task.status as TaskStatus}
                        priority={task.priority as TaskPriority}
                        dueDate={task.due_date}
                        assignee={task.assignee ? {
                          ...task.assignee,
                          avatarUrl: task.assignee.image // Map image to avatarUrl expected by TaskCard
                        } : undefined}
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
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new task.</p>
                    <div className="mt-6">
                      <button
                        onClick={() => setShowTaskForm(true)}
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
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Team Members and Tags */}
            <div className="space-y-6">
              {/* Team Members Section */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Team Members</h2>
                  {(userRole === 'owner' || userRole === 'admin') && (
                    <button
                      onClick={() => router.push(`/projects/team/${projectId}`)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Manage
                    </button>
                  )}
                </div>
                
                {members.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {members.map((member) => (
                      <li key={member.id} className="py-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            {member.image ? (
                              <img
                                className="h-8 w-8 rounded-full"
                                src={member.image}
                                alt={member.name}
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
                                <span className="text-sm font-medium text-white">
                                  {member.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                            <p className="text-sm text-gray-500 truncate">{member.email}</p>
                          </div>
                          <div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${member.role === 'owner' ? 'bg-purple-100 text-purple-800' : 
                               member.role === 'admin' ? 'bg-blue-100 text-blue-800' : 
                               'bg-green-100 text-green-800'}`}
                            >
                              {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No team members found
                  </div>
                )}
              </div>
              
              {/* Tag Management Section - Only visible to admins and owners */}
              {(userRole === 'owner' || userRole === 'admin') && projectId && typeof projectId === 'string' && (
                <TagManager 
                  projectId={projectId} 
                  onTagsChange={handleTagsChange} 
                />
              )}
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
