import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Head from 'next/head';
import Layout from '@/components/layout/Layout';
import { api } from '@/utils/api';
import { CommentList } from '@/components/comments/CommentList';

// Simple loading spinner component
const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
);

export default function TaskDetails() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();
  const [error, setError] = useState('');
  
  // Compute taskId before any conditional returns
  const taskId = typeof id === 'string' ? id : '';
  
  // Use tRPC query to fetch task details - declare before conditional return
  const { data: taskData, isLoading: loading, error: trpcError } = api.task.getById.useQuery(
    { id: taskId },
    { enabled: !!taskId && !!session }
  );

  // Redirect to signin if unauthenticated
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  useEffect(() => {
    if (trpcError) {
      setError(trpcError.message);
    }
  }, [trpcError]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'No date set';
    
    try {
      // Handle different types of date values
      if (typeof dateString === 'object' && dateString !== null && Object.keys(dateString).length === 0) {
        return 'No date set';
      }
      
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch (error) {
      console.error('Invalid date format:', dateString, error);
      return 'Invalid date';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const statusColors: Record<string, string> = {
      todo: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      review: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityBadgeColor = (priority: string) => {
    const priorityColors: Record<string, string> = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800',
      urgent: 'bg-purple-100 text-purple-800',
    };
    return priorityColors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      todo: 'To Do',
      in_progress: 'In Progress',
      review: 'Review',
      completed: 'Completed',
    };
    return statusLabels[status] || status;
  };

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center py-10">
          <p className="text-red-500 mb-4">{error}</p>
          <Link href="/tasks" className="text-blue-500 hover:underline">
            Back to Tasks
          </Link>
        </div>
      </Layout>
    );
  }

  if (!taskData?.task) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }
  
  const task = taskData.task;

  return (
    <Layout>
      <Head>
        <title>{task.title} | TeamSync</title>
      </Head>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/tasks" className="text-blue-500 hover:underline flex items-center">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Tasks
          </Link>
          
          <div className="flex space-x-2">
            <Link 
              href={`/tasks/${task.id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Task
            </Link>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
              <div className="flex space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadgeColor(task.priority)}`}>
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(task.status)}`}>
                  {getStatusLabel(task.status)}
                </span>
              </div>
            </div>
          </div>

          <div className="px-4 py-5 sm:p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-gray-900 whitespace-pre-wrap">{task.description || 'No description provided'}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Project</dt>
                <dd className="mt-1 text-gray-900">
                  {task.project ? (
                    <Link href={`/projects/${task.project_id}`} className="text-blue-500 hover:underline">
                      {task.project.name}
                    </Link>
                  ) : 'Not assigned to a project'}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                <dd className="mt-1 text-gray-900">{formatDate(task.due_date)}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Assignee</dt>
                <dd className="mt-1 text-gray-900 flex items-center">
                  {task.assignee ? (
                    <>
                      {task.assignee.avatar_url && (
                        <img 
                          src={task.assignee.avatar_url} 
                          alt={task.assignee.name} 
                          className="h-6 w-6 rounded-full mr-2"
                        />
                      )}
                      {task.assignee.name}
                    </>
                  ) : 'Unassigned'}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Created By</dt>
                <dd className="mt-1 text-gray-900 flex items-center">
                  {task.creator && (
                    <>
                      {task.creator.avatar_url && (
                        <img 
                          src={task.creator.avatar_url} 
                          alt={task.creator.name} 
                          className="h-6 w-6 rounded-full mr-2"
                        />
                      )}
                      {task.creator.name}
                    </>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Created At</dt>
                <dd className="mt-1 text-gray-900">{formatDate(task.created_at)}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-gray-900">{formatDate(task.updated_at)}</dd>
              </div>

              {task.tags && task.tags.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Tags</dt>
                  <dd className="mt-1">
                    <div className="flex flex-wrap gap-2">
                      {task.tags.map((tag: any) => (
                        <span 
                          key={tag.id} 
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </dd>
                </div>
              )}
            </dl>
          </div>
          
          {/* Add comments section */}
          <div className="bg-white shadow sm:rounded-lg mt-6">
            <div className="px-4 py-5 sm:p-6">
              <CommentList taskId={task.id} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
