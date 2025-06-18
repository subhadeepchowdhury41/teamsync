import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useSession } from "next-auth/react";
import { api } from "@/utils/api";

type TaskFormData = {
  title: string;
  description: string;
  status: "todo" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate: string;
  projectId: string;
  assigneeId: string;
  tags: string[];
};

interface TaskFormProps {
  taskId?: string;
  projectId?: string;
  onSuccess: () => void;
  onCancel: () => void;
  availableMembers?: Array<{
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  }>;
}

export default function TaskForm({
  taskId,
  projectId: initialProjectId,
  onSuccess,
  onCancel,
  availableMembers,
}: TaskFormProps) {
  useSession(); // Session is required for authentication but not used directly
  const [error, setError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TaskFormData>({
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      dueDate: "",
      projectId: initialProjectId || "",
      assigneeId: "",
      tags: [],
    },
  });

  const watchedProjectId = watch("projectId");

  const {
    data: taskData,
    isLoading: isTaskLoading,
    error: taskLoadingError,
  } = api.task.getById.useQuery(
    { id: taskId! },
    { enabled: !!taskId }
  );

  useEffect(() => {
    if (taskData?.task) {
      const task = taskData.task;
      setValue("title", task.title);
      setValue("description", task.description || "");
      setValue("status", task.status as TaskFormData["status"]);
      setValue("priority", task.priority as TaskFormData["priority"]);
      if (task.due_date) {
        setValue("dueDate", new Date(task.due_date).toISOString().split("T")[0]!);
      } else {
        setValue("dueDate", "");
      }
      setValue("projectId", task.project_id);
      setValue("assigneeId", task.assignee_id || "");
      setSelectedTags(task.tags?.map((tag: { id: string }) => tag.id) || []);
    }
  }, [taskData, setValue]);

  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    error: projectsError,
  } = api.project.getAll.useQuery(undefined, {});
  const projectsList = projectsData?.projects || [];

  const {
    data: selectedProjectDetails,
    isLoading: isLoadingSelectedProjectDetails,
    error: selectedProjectError,
  } = api.project.getById.useQuery(
    { id: watchedProjectId },
    { enabled: !!watchedProjectId }
  );

  const teamMembersToDisplay = availableMembers && availableMembers.length > 0
    ? availableMembers
    : selectedProjectDetails?.members || [];

  // Initialize with empty array as tags might not be available in the current API response
  // In a real implementation, you might need to fetch tags separately if they're not included
  const availableTagsToDisplay: Array<{id: string; name: string; color: string}> = [];

  const createTaskMutation = api.task.create.useMutation({
    onSuccess: () => {
      onSuccess();
      reset();
      setSelectedTags([]);
    },
    onError: (err) => {
      setError(err.message || "Failed to create task");
    },
  });

  const updateTaskMutation = api.task.update.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: (err) => {
      setError(err.message || "Failed to update task");
    },
  });

  const onSubmit = (data: TaskFormData) => {
    setError(null);
    const payload = {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      tags: selectedTags,
      projectId: data.projectId,
    };

    if (taskId) {
      updateTaskMutation.mutate({ ...payload, id: taskId });
    } else {
      if (!payload.projectId && initialProjectId) {
        payload.projectId = initialProjectId;
      }
      if (!payload.projectId) {
        setError("Project ID is required to create a task.");
        return;
      }
      createTaskMutation.mutate(payload);
    }
  };

  useEffect(() => {
    if (initialProjectId) {
      setValue("projectId", initialProjectId);
    }
  }, [initialProjectId, setValue]);

  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const overallLoading = isTaskLoading || isLoadingProjects || isLoadingSelectedProjectDetails;
  const isSubmitting = createTaskMutation.isPending || updateTaskMutation.isPending;

  useEffect(() => {
    if (taskLoadingError) {
      console.error("Error fetching task data:", taskLoadingError.message);
      setError(taskLoadingError.message || "Failed to load task details.");
    } else if (projectsError) {
      console.error("Error fetching projects:", projectsError.message);
      setError(projectsError.message || "Failed to load projects.");
    } else if (selectedProjectError) {
      console.error("Error fetching selected project details:", selectedProjectError.message);
      setError(selectedProjectError.message || "Failed to load project details.");
    } else {
      setError(null); // Clear error if none of the queries have errors
    }
  }, [taskLoadingError, projectsError, selectedProjectError]);

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="mb-6 text-lg font-medium text-gray-900">
        {taskId ? "Edit Task" : "Create New Task"}
      </h2>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700"
          >
            Title *
          </label>
          <input
            id="title"
            type="text"
            {...register("title", { required: "Title is required" })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            disabled={overallLoading}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            {...register("description")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            disabled={overallLoading}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label
              htmlFor="projectId"
              className="block text-sm font-medium text-gray-700"
            >
              Project *
            </label>
            <select
              id="projectId"
              {...register("projectId", { required: "Project is required" })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              disabled={isLoadingProjects || overallLoading}
            >
              <option value="">Select a project</option>
              {projectsList.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            {errors.projectId && (
              <p className="mt-1 text-sm text-red-600">
                {errors.projectId.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="assigneeId"
              className="block text-sm font-medium text-gray-700"
            >
              Assignee
            </label>
            <select
              id="assigneeId"
              {...register("assigneeId")}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              disabled={isLoadingSelectedProjectDetails || (!!watchedProjectId && !selectedProjectDetails) || overallLoading}
            >
              <option value="">Unassigned</option>
              {teamMembersToDisplay.map((member: any) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700"
            >
              Status
            </label>
            <select
              id="status"
              {...register("status")}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              disabled={overallLoading}
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="priority"
              className="block text-sm font-medium text-gray-700"
            >
              Priority
            </label>
            <select
              id="priority"
              {...register("priority")}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              disabled={overallLoading}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="dueDate"
              className="block text-sm font-medium text-gray-700"
            >
              Due Date
            </label>
            <input
              id="dueDate"
              type="date"
              {...register("dueDate")}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              disabled={overallLoading}
            />
          </div>
        </div>

        {availableTagsToDisplay.length > 0 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {availableTagsToDisplay.map((tag: any) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagToggle(tag.id)}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                    selectedTags.includes(tag.id)
                      ? "bg-indigo-100 text-indigo-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                  style={
                    selectedTags.includes(tag.id)
                      ? { backgroundColor: `${tag.color}40`, color: tag.color }
                      : { backgroundColor: `${tag.color}20`, color: tag.color }
                  }
                  disabled={isLoadingSelectedProjectDetails || (!!watchedProjectId && !selectedProjectDetails) || overallLoading}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || overallLoading}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {isSubmitting ? "Saving..." : taskId ? "Update Task" : "Create Task"}
          </button>
        </div>
      </form>
    </div>
  );
}
