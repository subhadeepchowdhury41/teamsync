import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useSession } from "next-auth/react";
import { GetServerSideProps } from "next";
import { getServerAuthSession } from "@/server/auth";
import Layout from "@/components/layout/Layout";
import InviteMemberModal from "@/components/projects/InviteMemberModal";
import axios from "axios";

type ProjectMember = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  avatar_url?: string;
};

export default function ProjectTeam() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session } = useSession();

  const [project, setProject] = useState<any>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch project and members data
  useEffect(() => {
    async function fetchProjectAndMembers() {
      if (!id || !session) return;

      try {
        setLoading(true);

        // Get project details
        const projectResponse = await axios.get(`/api/projects/${id}`);
        const projectData = projectResponse.data;

        if (!projectData) throw new Error("Project not found");
        setProject(projectData);

        // Get project members with user role information
        const membersResponse = await axios.get(`/api/projects/${id}/members`);
        const membersData = membersResponse.data;

        console.log("Members API Response:", membersData);
        console.log("Current user ID:", session?.user?.id);

        if (!membersData || !Array.isArray(membersData)) {
          throw new Error("Failed to load project members");
        }

        // Find current user's role in the project
        const currentUserMember = membersData.find(
          (member: any) => member.id === session.user.id,
        );

        console.log("Found current user member?", currentUserMember);
        console.log(
          "All members:",
          membersData.map((m) => ({
            id: m.id,
            user_id: m.user_id,
            role: m.role,
          })),
        );

        // If user is not a member of this project, redirect to projects page
        if (!currentUserMember) {
          console.log("User not found as member, redirecting to projects page");
          router.push("/projects");
          return;
        }

        setUserRole(currentUserMember.role);

        // The members data is already formatted correctly from the API
        const formattedMembers = membersData;

        setMembers(formattedMembers);
      } catch (err: any) {
        console.error("Error fetching project data:", err);
        setError(
          err.response?.data?.error ||
            err.message ||
            "Failed to load project data",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchProjectAndMembers();
  }, [id, session, router, refreshKey]);

  // Handle member role change
  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      // Only owners and admins can change roles
      if (userRole !== "owner" && userRole !== "admin") {
        setError("You do not have permission to change roles");
        return;
      }

      // Owner cannot be demoted
      const memberToUpdate = members.find((m) => m.id === memberId);
      if (memberToUpdate?.role === "owner") {
        setError("The project owner role cannot be changed");
        return;
      }

      // Admin cannot change other admin's role
      if (userRole === "admin" && memberToUpdate?.role === "admin") {
        setError("Admins cannot change other admin roles");
        return;
      }

      // Use user_id for the API call
      if (!memberToUpdate?.id) {
        setError("Could not find user ID for this member");
        return;
      }

      await axios.patch(
        `/api/projects/${id}/members/${memberToUpdate.id}`,
        {
          role: newRole,
        },
      );

      // Refresh the member list
      setRefreshKey((prev) => prev + 1);
    } catch (err: any) {
      console.error("Error updating member role:", err);
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to update member role",
      );
    }
  };

  // Handle member removal
  const handleRemoveMember = async (memberId: string) => {
    try {
      // Only owners and admins can remove members
      if (userRole !== "owner" && userRole !== "admin") {
        setError("You do not have permission to remove members");
        return;
      }

      // Owner cannot be removed
      const memberToRemove = members.find((m) => m.id === memberId);
      if (memberToRemove?.role === "owner") {
        setError("The project owner cannot be removed");
        return;
      }

      // Admin cannot remove other admins
      if (userRole === "admin" && memberToRemove?.role === "admin") {
        setError("Admins cannot remove other admins");
        return;
      }

      // Use user_id for the API call
      if (!memberToRemove?.id) {
        setError("Could not find user ID for this member");
        return;
      }

      await axios.delete(
        `/api/projects/${id}/members/${memberToRemove.id}`,
      );

      // Refresh the member list
      setRefreshKey((prev) => prev + 1);
    } catch (err: any) {
      console.error("Error removing member:", err);
      setError(
        err.response?.data?.error || err.message || "Failed to remove member",
      );
    }
  };

  // Handle invite success
  const handleInviteSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Show loading state while checking session
  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-indigo-500"></div>
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
        <title>Team Management | TeamSync</title>
        <meta name="description" content="Manage your project team" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout>
        <div className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-gray-900">
                Team Management
              </h1>
              <div className="flex space-x-3">
                <button
                  onClick={() => router.push(`/projects/${id}`)}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Back to Project
                </button>
                {(userRole === "owner" || userRole === "admin") && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Invite Member
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-indigo-500"></div>
              </div>
            ) : error ? (
              <div className="mb-6 border-l-4 border-red-400 bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="mb-2 text-lg font-medium text-gray-900">
                    Project: {project?.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {members.length} team members
                  </p>
                </div>

                <div className="overflow-hidden bg-white shadow sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {members.map((member) => (
                      <li key={member.id}>
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0">
                                {member.avatar_url ? (
                                  <img
                                    className="h-10 w-10 rounded-full"
                                    src={member.avatar_url}
                                    alt={member.name}
                                  />
                                ) : (
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                                    <span className="font-medium text-gray-500">
                                      {member.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {member.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {member.email}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              {/* Role badge */}
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  member.role === "owner"
                                    ? "bg-purple-100 text-purple-800"
                                    : member.role === "admin"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-green-100 text-green-800"
                                }`}
                              >
                                {member.role.charAt(0).toUpperCase() +
                                  member.role.slice(1)}
                              </span>

                              {/* Role change dropdown (only for owners/admins) */}
                              {(userRole === "owner" ||
                                (userRole === "admin" &&
                                  member.role === "member")) &&
                                member.role !== "owner" &&
                                member.id !== session.user.id && (
                                  <select
                                    className="block w-full rounded-md border-gray-300 py-1 pl-3 pr-10 text-xs focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                                    value={member.role}
                                    onChange={(e) =>
                                      handleRoleChange(
                                        member.id,
                                        e.target.value,
                                      )
                                    }
                                  >
                                    {userRole === "owner" && (
                                      <option value="admin">Admin</option>
                                    )}
                                    <option value="member">Member</option>
                                  </select>
                                )}

                              {/* Remove button (only for owners/admins) */}
                              {(userRole === "owner" ||
                                (userRole === "admin" &&
                                  member.role === "member")) &&
                                member.role !== "owner" &&
                                member.id !== session.user.id && (
                                  <button
                                    onClick={() =>
                                      handleRemoveMember(member.id)
                                    }
                                    className="inline-flex items-center rounded-full border border-transparent bg-red-600 p-1 text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                  >
                                    <svg
                                      className="h-4 w-4"
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </button>
                                )}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </Layout>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <InviteMemberModal
          projectId={id as string}
          onClose={() => setShowInviteModal(false)}
          onSuccess={handleInviteSuccess}
        />
      )}
    </>
  );
}

// Server-side authentication check
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
    props: {}, // Will be passed to the page component as props
  };
};
