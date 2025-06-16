import Head from 'next/head';
import Layout from "@/components/layout/Layout";
import { GetServerSideProps } from "next";
import { getServerAuthSession } from "@/server/auth";

export default function Home() {

  // Show welcome page for non-authenticated users
  // (Server-side will handle redirects for authenticated users)
  return (
    <>
      <Head>
        <title>TeamSync | Task Management and Team Collaboration</title>
        <meta name="description" content="TeamSync - Task Management and Team Collaboration" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout>
        <div className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
            <h1 className="text-3xl font-bold">Welcome to TeamSync</h1>
            <p className="mt-4">Please sign in to access your dashboard.</p>
          </div>
        </div>
      </Layout>
    </>
  );
}

// Server-side authentication check
export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerAuthSession(context);

  // If authenticated, redirect to dashboard
  if (session) {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    };
  }

  // If not authenticated, show the home page
  return {
    props: {}, 
  };
};
