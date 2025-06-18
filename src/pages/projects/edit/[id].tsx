import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { GetServerSideProps } from 'next';
import { getServerAuthSession } from '@/server/auth';
import Layout from '@/components/layout/Layout';
import ProjectForm from '@/components/projects/ProjectForm';
import { api } from '@/utils/api';

export default function EditProject() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session } = useSession();
  
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fetch project data using tRPC
  const { data: projectData, error: projectError, isLoading } = api.project.getById.useQuery(
    { id: id as string },
    {
      enabled: !!id && !!session,
    }
  );
  
  // Handle successful data fetch
  useEffect(() => {
    if (projectData) {
      setProject(projectData.project);
      setUserRole(projectData.userRole);
      
      // Only owners and admins can edit projects
      if (projectData.userRole !== 'owner' && projectData.userRole !== 'admin') {
        setError('You do not have permission to edit this project');
      }
    }
  }, [projectData]);
  
  // Handle error from tRPC query
  useEffect(() => {
    if (projectError) {
      console.error('Error fetching project:', projectError);
      setError(projectError.message || 'Failed to load project');
    }
  }, [projectError]);
  
  // Update loading state based on tRPC query
  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading]);
  
  // Set error from tRPC if any
  useEffect(() => {
    if (projectError) {
      setError(projectError.message);
    }
  }, [projectError]);

  // Handle successful update
  const handleSuccess = () => {
    router.push(`/projects/${id}`);
  };

  // Handle cancel
  const handleCancel = () => {
    router.push(`/projects/${id}`);
  };

  // Show loading state while fetching data
  if (loading && !project) {
    return (
      <Layout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>Edit Project | TeamSync</title>
        <meta name="description" content="Edit your project details" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout>
        <div className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">Edit Project</h1>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-3xl">
                <ProjectForm 
                  project={project} 
                  onSuccess={handleSuccess} 
                  onCancel={handleCancel} 
                  isEditing={true}
                />
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
