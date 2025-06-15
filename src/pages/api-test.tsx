import { type NextPage } from "next";
import { useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { api } from "../utils/api";
import Layout from "../components/layout/Layout";

const ApiTestPage: NextPage = () => {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Use tRPC hooks to fetch data
  const dashboardQuery = api.dashboard.getData.useQuery(undefined, {
    enabled: !!session,
  });
  
  const projectsQuery = api.project.getAll.useQuery(undefined, {
    enabled: !!session,
  });
  
  const userQuery = api.user.me.useQuery(undefined, {
    enabled: !!session,
  });
  
  const userSearchQuery = api.user.search.useQuery(
    { query: searchQuery, limit: 5 },
    { enabled: !!session && searchQuery.length > 0 }
  );

  return (
    <>
      <Head>
        <title>API Test | TeamSync</title>
        <meta name="description" content="Testing tRPC API integration" />
      </Head>
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">tRPC API Test</h1>
          
          {!session ? (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6">
              <p>Please sign in to test the API</p>
            </div>
          ) : (
            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-semibold mb-4">User Profile</h2>
                {userQuery.isLoading ? (
                  <p>Loading user data...</p>
                ) : userQuery.error ? (
                  <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
                    <p>Error: {userQuery.error.message}</p>
                  </div>
                ) : (
                  <div className="bg-white shadow overflow-hidden rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <div className="flex items-center">
                        {userQuery.data?.avatar_url && (
                          <img 
                            src={userQuery.data.avatar_url} 
                            alt="Profile" 
                            className="h-16 w-16 rounded-full mr-4"
                          />
                        )}
                        <div>
                          <h3 className="text-lg font-medium">{userQuery.data?.name}</h3>
                          <p className="text-sm text-gray-500">{userQuery.data?.email}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
              
              <section>
                <h2 className="text-2xl font-semibold mb-4">User Search</h2>
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search users by name or email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                {searchQuery.length > 0 && (
                  <div className="bg-white shadow overflow-hidden rounded-lg">
                    {userSearchQuery.isLoading ? (
                      <p className="p-4">Searching...</p>
                    ) : userSearchQuery.error ? (
                      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
                        <p>Error: {userSearchQuery.error.message}</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-200">
                        {userSearchQuery.data?.map((user) => (
                          <li key={user.id} className="px-4 py-4 flex items-center">
                            {user.avatar_url && (
                              <img 
                                src={user.avatar_url} 
                                alt={user.name || "User"} 
                                className="h-10 w-10 rounded-full mr-4"
                              />
                            )}
                            <div>
                              <h3 className="text-md font-medium">{user.name}</h3>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </li>
                        ))}
                        {userSearchQuery.data?.length === 0 && (
                          <li className="px-4 py-4 text-center text-gray-500">
                            No users found matching "{searchQuery}"
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                )}
              </section>
              
              <section>
                <h2 className="text-2xl font-semibold mb-4">Dashboard Data</h2>
                {dashboardQuery.isLoading ? (
                  <p>Loading dashboard data...</p>
                ) : dashboardQuery.error ? (
                  <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
                    <p>Error: {dashboardQuery.error.message}</p>
                  </div>
                ) : (
                  <div className="bg-white shadow overflow-hidden rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg font-medium">Task Counts</h3>
                      <dl className="grid grid-cols-3 gap-4 mt-2">
                        <div className="bg-blue-50 p-3 rounded">
                          <dt className="text-sm font-medium text-gray-500">Total</dt>
                          <dd className="mt-1 text-3xl font-semibold">
                            {dashboardQuery.data?.taskCounts.total}
                          </dd>
                        </div>
                        <div className="bg-green-50 p-3 rounded">
                          <dt className="text-sm font-medium text-gray-500">Completed</dt>
                          <dd className="mt-1 text-3xl font-semibold">
                            {dashboardQuery.data?.taskCounts.completed}
                          </dd>
                        </div>
                        <div className="bg-red-50 p-3 rounded">
                          <dt className="text-sm font-medium text-gray-500">Overdue</dt>
                          <dd className="mt-1 text-3xl font-semibold">
                            {dashboardQuery.data?.taskCounts.overdue}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                )}
              </section>
              
              <section>
                <h2 className="text-2xl font-semibold mb-4">Projects</h2>
                {projectsQuery.isLoading ? (
                  <p>Loading projects...</p>
                ) : projectsQuery.error ? (
                  <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
                    <p>Error: {projectsQuery.error.message}</p>
                  </div>
                ) : (
                  <div className="bg-white shadow overflow-hidden rounded-lg">
                    <ul className="divide-y divide-gray-200">
                      {projectsQuery.data?.projects.map((project) => (
                        <li key={project.id} className="px-4 py-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-medium">{project.name}</h3>
                              <p className="text-sm text-gray-500">{project.description}</p>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {project.role}
                            </span>
                          </div>
                        </li>
                      ))}
                      {projectsQuery.data?.projects.length === 0 && (
                        <li className="px-4 py-4 text-center text-gray-500">
                          No projects found
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </section>
            </div>
          )}
          
          <div className="mt-8">
            <Link href="/" className="text-blue-600 hover:text-blue-800">
              ← Back to Home
            </Link>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default ApiTestPage;
