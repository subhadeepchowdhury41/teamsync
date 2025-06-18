import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Layout from '@/components/layout/Layout';
import UserProfile from '@/components/auth/UserProfile';

export default function Profile() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to sign-in if not authenticated
  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Show loading state while checking session
  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // If not authenticated, don't render content
  if (session === null) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Profile | TeamSync</title>
        <meta name="description" content="Manage your TeamSync profile" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout>
        <div className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">Your Profile</h1>
            <div className="max-w-3xl">
              <UserProfile />
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
