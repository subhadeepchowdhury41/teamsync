import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import SignUpForm from '@/components/auth/SignUpForm';

export default function SignUp() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // If user is already signed in, redirect to dashboard
  React.useEffect(() => {
    if (status === "authenticated" && session) {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  return (
    <>
      <Head>
        <title>Sign Up | TeamSync</title>
        <meta name="description" content="Create a new TeamSync account" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create a new account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/auth/signin" className="font-medium text-indigo-600 hover:text-indigo-500">
              sign in to your existing account
            </Link>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <SignUpForm />
          </div>
        </div>
      </div>
    </>
  );
}
