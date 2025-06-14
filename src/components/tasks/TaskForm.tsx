import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useSession } from "next-auth/react";
import axios from "axios";

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
  projectId,
  onSuccess,
  onCancel,
  availableMembers,
}: TaskFormProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TaskFormData>({
    defaultValues: {
      status: "todo",
      priority: "medium",
      projectId: projectId || "",
    },
  });

  // Fetch task data if editing
  useEffect(() => {
    const fetchTaskData = async () => {
      if (!taskId) return;

      try {
        setLoading(true);
        const response = await axios.get(`/api/tasks/${taskId}`);
        const data = response.data;

        if (data) {
          setValue("title", data.title);
          setValue("description", data.description);
          setValue("status", data.status);
          setValue("priority", data.priority);
          if (data.due_date) {
            setValue(
              "dueDate",
              new Date(data.due_date).toISOString().split("T")[0]!,
            );
          } else {
            setValue("dueDate", "");
          }
          setValue("projectId", data.project_id);
          setValue("assigneeId", data.assignee_id || "");

          // Set selected tags
          if (data.task_tags) {
            const tagIds = data.task_tags.map((tt: any) => tt.tag.id);
            setSelectedTags(tagIds);
          }
        }
      } catch (error: any) {
        setError(error.response?.data?.error || "Failed to fetch task data");
      } finally {
        setLoading(false);
      }
    };

    fetchTaskData();
  }, [taskId, setValue]);

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axios.get("/api/projects");
        // Access the projects array from the response data
        setProjects(response.data.projects || []);
      } catch (error: any) {
        console.error("Error fetching projects:", error.message);
      }
    };

    void fetchProjects();
  }, []);

  // Use team members from props if available
  useEffect(() => {
    if (availableMembers && availableMembers.length > 0) {
      setTeamMembers(availableMembers);
    }
  }, [availableMembers]);

  // Fetch team members when project changes
  useEffect(() => {
    const fetchMembers = async () => {
      if (!projectId || availableMembers) return;

      try {
        const response = await axios.get(`/api/projects/${projectId}/members`);
        setTeamMembers(response.data);
      } catch (error) {
        console.error("Error fetching members:", error);
      }
    };

    if (projectId && !availableMembers) {
      void fetchMembers();
    }
  }, [projectId, availableMembers]);

  // Fetch tags when project changes
  useEffect(() => {
    const fetchTags = async () => {
      if (!projectId) return;

      try {
        const response = await axios.get(`/api/projects/${projectId}/tags`);
        setAvailableTags(response.data || []);
      } catch (error: any) {
        console.error("Error fetching tags:", error.message);
      }
    };

    if (projectId) {
      void fetchTags();
    }
  }, [projectId]);

  const onSubmit = async (data: TaskFormData) => {
    if (!session?.user) return;

    try {
      setLoading(true);
      setError(null);

      const taskData = {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate ? data.dueDate : null,
        projectId: data.projectId,
        assigneeId: data.assigneeId || null,
        tags: selectedTags,
      };
      
      console.log('Submitting task with due date:', data.dueDate);

      if (taskId) {
        // Update existing task
        await axios.put(`/api/tasks/${taskId}`, taskData);
      } else {
        // Create new task
        await axios.post('/api/tasks', taskData);
      }

      onSuccess();
    } catch (error: any) {
      setError(error.response?.data?.error || "An error occurred while saving the task");
    } finally {
      setLoading(false);
    }
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  };

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
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
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
            >
              <option value="">Unassigned</option>
              {teamMembers.map((member) => (
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
            />
          </div>
        </div>

        {availableTags.length > 0 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
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
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {loading ? "Saving..." : taskId ? "Update Task" : "Create Task"}
          </button>
        </div>
      </form>
    </div>
  );
}
