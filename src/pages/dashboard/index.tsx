import React from "react";
import Head from "next/head";
import { useSession } from "next-auth/react";
import Layout from "@/components/layout/Layout";
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import { GetServerSideProps } from "next";
import { getServerAuthSession } from "@/server/auth";

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <>
      <Head>
        <title>Dashboard | TeamSync</title>
        <meta
          name="description"
          content="TeamSync Dashboard - Manage your tasks and projects"
        />
      </Head>
      <Layout>
        <div className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
            <h1 className="text-2xl font-semibold text-gray-900">
              Dashboard
            </h1>
          </div>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
            <div className="py-4">
              <DashboardOverview />
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}

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
    props: { session },
  };
}
