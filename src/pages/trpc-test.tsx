import { NextPage } from "next";
import { useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { api } from "../utils/api";
import Layout from "../components/layout/Layout";

const TrpcTestPage: NextPage = () => {
  const { data: session } = useSession();
  const hello = api.example.hello.useQuery({ text: "TeamSync" });
  const sessionData = api.example.getSession.useQuery();

  return (
    <Layout>
      <Head>
        <title>tRPC Test | TeamSync</title>
      </Head>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">tRPC Test Page</h1>
          <p className="text-gray-600">
            This page demonstrates that tRPC is working correctly in your application.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Hello Query Test</h2>
          {hello.isLoading ? (
            <div className="animate-pulse bg-gray-200 h-8 w-64 rounded"></div>
          ) : (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              <p className="font-medium">{hello.data?.greeting}</p>
              <p className="text-sm">Timestamp: {hello.data?.timestamp}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Session Data Test</h2>
          {sessionData.isLoading ? (
            <div className="animate-pulse bg-gray-200 h-32 w-full rounded"></div>
          ) : (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
              <p className="font-medium">Session Status: {session ? "Authenticated" : "Not authenticated"}</p>
              {session && (
                <div className="mt-2">
                  <p>User: {session.user?.name}</p>
                  <p>Email: {session.user?.email}</p>
                </div>
              )}
              <pre className="mt-4 bg-gray-800 text-white p-4 rounded overflow-auto text-sm">
                {JSON.stringify(sessionData.data, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="flex space-x-4">
          <Link 
            href="/dashboard" 
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default TrpcTestPage;
