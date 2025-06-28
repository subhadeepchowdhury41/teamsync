import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Head from "next/head";
import Layout from "@/components/layout/Layout";
import TaskForm from "@/components/tasks/TaskForm";
import { api } from "@/utils/api";

// Simple loading spinner component
const LoadingSpinner = () => (
  <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-indigo-500"></div>
);

export default function EditTask() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [members, setMembers] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Compute taskId before any conditional returns
  const taskId = typeof id === "string" ? id : "";

  // Use tRPC query to fetch task details
  const {
    data: taskData,
    isLoading: taskLoading,
    error: taskError,
  } = api.task.getById.useQuery(
    { id: taskId },
    { enabled: !!taskId && !!session },
  );

  // Fetch project details (which includes members) when task data is available
  const projectId = taskData?.task?.project_id;
  const { data: projectData, isLoading: projectLoading } =
    api.project.getById.useQuery(
      { id: projectId as string },
      { enabled: !!projectId },
    );
    
  // Fetch project tags when project ID is available
  const { data: tagsData, isLoading: tagsLoading } =
    api.tag.getByProject.useQuery(
      { projectId: projectId as string },
      { enabled: !!projectId },
    );

  // Update state when data is fetched
  useEffect(() => {
    if (taskData?.task) {
      setTask(taskData.task);
    }
  }, [taskData]);

  useEffect(() => {
    if (projectData?.members) {
      setMembers(projectData.members);
    }
  }, [projectData]);
  
  // Update tags state when tag data is fetched
  useEffect(() => {
    if (tagsData?.tags) {
      setTags(tagsData.tags);
    }
  }, [tagsData]);

  useEffect(() => {
    if (taskError) {
      console.error("Error fetching task details:", taskError);
      setError("Failed to load task details");
    }
  }, [taskError]);

  // Update loading state based on tRPC queries
  useEffect(() => {
    setLoading(taskLoading || projectLoading || tagsLoading);
  }, [taskLoading, projectLoading, tagsLoading]);

  const handleSuccess = () => {
    // Navigate back to task details page after successful update
    router.push(`/tasks/${id}`);
  };

  const handleCancel = () => {
    // Navigate back to task details page when cancelled
    router.push(`/tasks/${id}`);
  };

  if (status === "loading" || loading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="py-10 text-center">
          <p className="mb-4 text-red-500">{error}</p>
          <button
            onClick={() => router.push(`/tasks/${id}`)}
            className="text-blue-500 hover:underline"
          >
            Back to Task
          </button>
        </div>
      </Layout>
    );
  }

  if (!task) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Edit Task | TeamSync</title>
      </Head>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Edit Task</h1>
        </div>

        <div className="overflow-hidden bg-white shadow sm:rounded-lg">
          <TaskForm
            taskId={id as string}
            projectId={task.project_id}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            availableMembers={members}
            availableTags={tags}
          />
        </div>
      </div>
    </Layout>
  );
}
