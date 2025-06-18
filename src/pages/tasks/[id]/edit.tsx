import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import Head from 'next/head';
import Layout from '@/components/layout/Layout';
import TaskForm from '@/components/tasks/TaskForm';

// Simple loading spinner component
const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
);

export default function EditTask() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (id && session) {
      fetchTaskDetails();
    }
  }, [id, session]);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/tasks/${id}`);
      setTask(response.data);
      
      // Fetch project members for the task's project
      if (response.data.project_id) {
        const membersResponse = await axios.get(`/api/projects/${response.data.project_id}/members`);
        setMembers(membersResponse.data || []);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching task details:', error);
      setError('Failed to load task details');
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    // Navigate back to task details page after successful update
    router.push(`/tasks/${id}`);
  };

  const handleCancel = () => {
    // Navigate back to task details page when cancelled
    router.push(`/tasks/${id}`);
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
          <button 
            onClick={() => router.push(`/tasks/${id}`)}
            className="text-blue-500 hover:underline"
          >
            Back to Task
          </button>
        </div>
      </Layout>
    );
  }

  if (!task) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Edit Task | TeamSync</title>
      </Head>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Edit Task</h1>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <TaskForm
            taskId={id as string}
            projectId={task.project_id}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            availableMembers={members}
          />
        </div>
      </div>
    </Layout>
  );
}
