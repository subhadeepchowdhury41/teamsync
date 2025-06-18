import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { GetServerSideProps } from 'next';
import { getServerAuthSession } from '@/server/auth';
import Layout from '@/components/layout/Layout';
import ProjectForm from '@/components/projects/ProjectForm';

export default function NewProject() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleSuccess = () => {
    void router.push('/projects');
  };

  const handleCancel = () => {
    void router.push('/projects');
  };

  return (
    <>
      <Head>
        <title>New Project | TeamSync</title>
        <meta name="description" content="Create a new project in TeamSync" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout>
        <div className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">Create New Project</h1>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new project for your team.
              </p>
            </div>

            <div className="max-w-3xl">
              <ProjectForm onSuccess={handleSuccess} onCancel={handleCancel} />
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
