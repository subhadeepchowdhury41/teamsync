import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { GetServerSideProps } from 'next';
import { getServerAuthSession } from '@/server/auth';
import Layout from '@/components/layout/Layout';
import TaskForm from '@/components/tasks/TaskForm';

export default function NewTask() {
  const { data: session } = useSession();
  const router = useRouter();
  const { projectId } = router.query;

  const handleSuccess = () => {
    // If we came from a specific project, go back to that project's tasks
    if (projectId) {
      void router.push(`/projects/${projectId}/tasks`);
    } else {
      // Otherwise go to the main tasks page
      void router.push('/tasks');
    }
  };

  const handleCancel = () => {
    // If we came from a specific project, go back to that project's tasks
    if (projectId) {
      void router.push(`/projects/${projectId}/tasks`);
    } else {
      // Otherwise go to the main tasks page
      void router.push('/tasks');
    }
  };

  return (
    <>
      <Head>
        <title>New Task | TeamSync</title>
        <meta name="description" content="Create a new task in TeamSync" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout>
        <div className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">Create New Task</h1>
              <p className="mt-1 text-sm text-gray-500">
                Add a new task to track your work.
              </p>
            </div>

            <div className="max-w-3xl">
              <TaskForm 
                projectId={typeof projectId === 'string' ? projectId : undefined}
                onSuccess={handleSuccess} 
                onCancel={handleCancel} 
              />
            </div>
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
