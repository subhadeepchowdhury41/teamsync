import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import SignInForm from '@/components/auth/SignInForm';

export default function SignIn() {
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
        <title>Sign In | TeamSync</title>
        <meta name="description" content="Sign in to your TeamSync account" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to TeamSync
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/auth/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
              create a new account
            </Link>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <SignInForm />
          </div>
        </div>
      </div>
    </>
  );
}
