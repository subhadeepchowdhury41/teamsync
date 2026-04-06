import React from "react";
import Head from "next/head";
import { GetServerSideProps } from "next";
import { getServerAuthSession } from "@/server/auth";
import Layout from "@/components/layout/Layout";
import DashboardOverview from "@/components/dashboard/DashboardOverview";

export default function DashboardPage() {
  return (
    <Layout>
      <Head>
        <title>Dashboard · TeamSync</title>
        <meta name="description" content="TeamSync Dashboard - Manage your tasks and projects" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <style dangerouslySetInnerHTML={{ __html: `
        * { font-family: 'DM Sans', sans-serif; }
        .fade-in { animation: fadeUp .2s ease; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .line-clamp-2 { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
      ` }} />

      <div className="min-h-screen bg-slate-50">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <DashboardOverview />
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerAuthSession(context);

  if (!session) {
    return {
      redirect: {
        destination: "/auth/signin",
        permanent: false,
      },
    };
  }

  return { props: { session } };
};
