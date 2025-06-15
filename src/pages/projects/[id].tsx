import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Layout from '@/components/layout/Layout';
import TaskCard from '@/components/tasks/TaskCard';
import TaskForm from '@/components/tasks/TaskForm';
import TagManager from '@/components/tags/TagManager';
import { api } from '@/utils/api';
import { TRPCClientError } from '@trpc/client';
import type { Session } from 'next-auth';
import { PrismaClient } from '@prisma/client';

// Add proper type definitions
interface TaskAssignee {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface TaskTag {
  id: string;
  name: string;
  color: string;
}

interface ProjectMember {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string;
  avatar_url?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
  creator_id?: string;
}

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus; 
  priority: TaskPriority; 
  due_date?: string | null;
  assignee?: {
    id: string;
    name: string | null;
    email: string | null;
    image?: string | null;
  } | null;
  // The API returns tags directly, not task_tags
  tags?: Array<{
    id: string;
    name: string;
    color: string | null;
  }>;
  creator?: {
    id: string;
    name: string | null;
    email: string | null;
    image?: string | null;
  };
  assignee_id?: string | null;
  project_id?: string;
  created_at?: string | Date;
  updated_at?: string | Date;
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

  // Fetch project data using tRPC
  const { data: projectData, error: projectError, isLoading } = api.project.getById.useQuery(
    { id: projectId as string },
    {
      enabled: !!projectId && !!session?.user,
    }
  );

  // Update state when project data is fetched
  useEffect(() => {
    if (projectData) {
      // Convert the project data to match our Project type
      setProject({
        ...projectData.project,
        description: projectData.project.description || undefined,
        created_at: projectData.project.created_at.toString()
      });
      
      setUserRole(projectData.userRole);
      
      // Convert the tasks data to match our Task type
      setTasks(projectData.tasks.map((task: Task) => ({
        ...task,
        description: task.description || undefined,
        due_date: task.due_date ? task.due_date.toString() : undefined,
        created_at: task.created_at?.toString() || undefined,
        updated_at: task.updated_at?.toString() || undefined,
        assignee: task.assignee ? {
          id: task.assignee.id,
          name: task.assignee.name || '',
          email: task.assignee.email || '',
          image: task.assignee.image || undefined
        } : undefined,
        tags: task.tags ? task.tags.map((tag): { id: string; name: string; color: string } => ({
          id: tag.id,
          name: tag.name,
          color: tag.color || ''
        })) : []
      })));

      // Convert the members data to match our ProjectMember type
      setMembers(projectData.members.map((member: ProjectMember) => ({
        id: member.id,
        name: member.name || '',
        email: member.email || '',
        role: member.role || 'member',
        avatar_url: member.avatar_url || '',
        image: member.image || '',
      })) as ProjectMember[]);
      
      setLoading(false);
    }
  }, [projectData]);

  // Handle error from tRPC query
  useEffect(() => {
    if (projectError) {
      console.error('Error fetching project data:', projectError);
      setError(projectError.message || 'Failed to load project data');
      setLoading(false);
    }
  }, [projectError]);

  // Update loading state based on tRPC query
  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading]);

  // Handle delete task using tRPC
  const deleteTaskMutation = api.task.delete.useMutation({
    onSuccess: (_: any, { id }: { id: string }) => {
      // Update tasks list on successful deletion
      setTasks(tasks.filter((task: Task) => task.id !== id));
    },
    onError: (error: TRPCClientError<any>) => {
      console.error('Error deleting task:', error);
      alert(`Error deleting task: ${error.message || 'Unknown error'}`);
    },
  });

  // Handle delete project using tRPC
  const deleteProjectMutation = api.project.delete.useMutation({
    onSuccess: () => {
      // Redirect to projects list after successful deletion
      router.push('/projects');
    },
    onError: (error: TRPCClientError<any>) => {
      console.error('Error deleting project:', error);
      alert(`Error deleting project: ${error.message || 'Unknown error'}`);
    },
  });

  // Handle delete project
  const handleDeleteProject = () => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
    if (projectId && typeof projectId === 'string') {
      deleteProjectMutation.mutate({ id: projectId });
    }
  };

  // Handle delete task
  const handleDeleteTask = (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    deleteTaskMutation.mutate({ id: taskId });
  };

  // Refetch project data after task creation
  const { refetch: refetchProjectData } = api.project.getById.useQuery(
    { id: projectId as string },
    {
      enabled: false, // Only fetch when manually triggered
    }
  );

  const handleTaskFormSuccess = async () => {
    setShowTaskForm(false);
    
    if (projectId && typeof projectId === 'string') {
      try {
        const result = await refetchProjectData();
        if (result.data && result.data.tasks) {
          // Convert the tasks data to match our Task type
          setTasks(result.data.tasks.map((task: Task) => ({
            ...task,
            description: task.description || undefined,
            due_date: task.due_date ? task.due_date.toString() : undefined,
            created_at: task.created_at?.toString() || undefined,
            updated_at: task.updated_at?.toString() || undefined,
            assignee: task.assignee ? {
              ...task.assignee,
              name: task.assignee.name || '',
              email: task.assignee.email || '',
              image: task.assignee.image || undefined
            } : undefined,
            tags: task.tags ? task.tags.map((tag: any) => ({
              ...tag,
              color: tag.color || ''
            })) : []
          })));
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
                <div className="flex justify-between items-center mb-6">
                  <h1 className="text-3xl font-bold text-gray-900">{project?.name}</h1>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setShowTaskForm(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      New Task
                    </button>
                    {userRole === 'owner' && (
                      <button
                        onClick={handleDeleteProject}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
                      >
                        Delete Project
                      </button>
                    )}
                  </div>
                </div>

                {tasks.length > 0 ? (
                  <div className="space-y-4">
                    {tasks.map((task) => (
                      <div key={task.id} className="mb-4">
                        <TaskCard
                          id={task.id}
                          title={task.title}
                          description={task.description || undefined}
                          status={task.status as 'todo' | 'in_progress' | 'review' | 'completed'}
                          priority={task.priority as 'low' | 'medium' | 'high' | 'urgent'}
                          dueDate={task.due_date || undefined}
                          assignee={task.assignee ? {
                            id: task.assignee.id,
                            name: task.assignee.name || '',
                            email: task.assignee.email || '',
                            avatarUrl: task.assignee.image || undefined
                          } : null}
                          tags={task.tags ? task.tags.map(tag => ({
                            id: tag.id,
                            name: tag.name,
                            color: tag.color || ''
                          })) : []}
                        />
                      </div>
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
                                alt={member.name || 'Member'}
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
                                <span className="text-sm font-medium text-white">
                                  {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{member.name || 'Unknown User'}</p>
                            <p className="text-sm text-gray-500 truncate">{member.email || 'No email'}</p>
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
