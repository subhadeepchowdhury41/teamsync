import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

export default function AuthError() {
  const router = useRouter();
  const { error } = router.query;

  // Map error codes to user-friendly messages
  const getErrorMessage = (errorCode: string | string[] | undefined) => {
    if (!errorCode) return 'An unknown authentication error occurred';
    
    const code = Array.isArray(errorCode) ? errorCode[0] : errorCode;
    
    switch (code) {
      case 'Configuration':
        return 'There is a problem with the server configuration. Please contact support.';
      case 'AccessDenied':
        return 'Access denied. You do not have permission to sign in.';
      case 'Verification':
        return 'The verification link may have been used or is invalid. Please request a new link.';
      case 'OAuthSignin':
      case 'OAuthCallback':
      case 'OAuthCreateAccount':
      case 'EmailCreateAccount':
      case 'Callback':
        return 'There was a problem with the authentication service. Please try again.';
      case 'OAuthAccountNotLinked':
        return 'To confirm your identity, sign in with the same account you used originally.';
      case 'EmailSignin':
        return 'The e-mail could not be sent. Please try again later.';
      case 'CredentialsSignin':
        return 'The sign in details you provided were invalid. Please check your credentials and try again.';
      case 'SessionRequired':
        return 'Please sign in to access this page.';
      case 'Default':
      default:
        return 'An unexpected error occurred. Please try again later.';
    }
  };

  return (
    <>
      <Head>
        <title>Authentication Error - TeamSync</title>
      </Head>
      <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Authentication Error
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {getErrorMessage(error)}
                </h3>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Link href="/auth/signin" className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
              Return to Sign In
            </Link>
          </div>
          
          <div className="mt-4">
            <Link href="/" className="flex w-full justify-center text-sm text-gray-500 hover:text-gray-700">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
