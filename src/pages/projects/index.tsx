import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { GetServerSideProps } from "next";
import { getServerAuthSession } from "@/server/auth";
import Layout from "@/components/layout/Layout";
import ProjectCard from "@/components/projects/ProjectCard";
import { api } from "@/utils/api";

type Project = {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  taskCount: number;
  completedTaskCount: number;
};

export default function Projects() {
  const { data: session } = useSession();
  const router = useRouter();
  const { data: projectsData, error } = api.project.list.useQuery();

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Error loading projects
          </h3>
          <p className="mt-2 text-sm text-gray-500">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    router.push("/auth/signin");
    return null;
  }

  return (
    <>
      <Head>
        <title>Projects | TeamSync</title>
        <meta name="description" content="Manage your TeamSync projects" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout>
        <div className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
              <Link
                href="/projects/new"
                className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
              >
                New Project
              </Link>
            </div>

            {projectsData?.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projectsData.map((project: Project) => (
                  <ProjectCard
                    key={project.id}
                    id={project.id}
                    name={project.name}
                    description={project.description}
                    memberCount={project.memberCount}
                    taskCount={project.taskCount}
                    completedTaskCount={project.completedTaskCount}
                  />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  No projects yet
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Get started by creating your first project
                </p>
              </div>
            )}
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
        destination: "/auth/signin",
        permanent: false,
      },
    };
  }

  return {
    props: { session },
  };
};
