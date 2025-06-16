import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/utils/api";
import { TRPCClientErrorLike } from "@trpc/client";

interface Tag {
  id: string;
  name: string;
  color: string | null;
  project_id: string;
}

interface TagManagerProps {
  projectId: string;
  onTagsChange?: () => void;
}

export default function TagManager({ projectId, onTagsChange }: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "#3B82F6", // Default blue color
  });

  // Fetch tags when component mounts or projectId changes
  useEffect(() => {
    if (projectId) {
      fetchTags();
    }
  }, [projectId]);

  // Use tRPC query for fetching tags
  const { data: tagData, refetch: refetchTags, isLoading: isFetchingTags, error: tagsError } = api.project.getTags.useQuery(
    { projectId },
    {
      enabled: !!projectId,
    }
  );

  // Handle data from tRPC query
  useEffect(() => {
    if (tagData) {
      setTags(tagData.map(tag => ({
        ...tag,
        color: tag.color || "#3B82F6" // Provide default color if null
      })));
      setIsLoading(false);
    }
  }, [tagData]);

  // Handle error from tRPC query
  useEffect(() => {
    if (tagsError) {
      setError(tagsError.message || "Failed to fetch tags");
      setIsLoading(false);
    }
  }, [tagsError]);

  // Update loading state based on tRPC query
  useEffect(() => {
    setIsLoading(isFetchingTags);
  }, [isFetchingTags]);

  const fetchTags = async () => {
    try {
      await refetchTags();
    } catch (err: any) {
      setError(err.message || "Failed to fetch tags");
      console.error("Error fetching tags:", err);
    }
  };

  const handleOpenModal = (tag?: Tag) => {
    if (tag) {
      setEditingTag(tag);
      setFormData({
        name: tag.name,
        color: tag.color || "#3B82F6",
      });
    } else {
      setEditingTag(null);
      setFormData({
        name: "",
        color: "#3B82F6",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTag(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Create tag mutation
  const createTagMutation = api.project.createTag.useMutation({
    onSuccess: () => {
      void fetchTags();
      handleCloseModal();
      if (onTagsChange) onTagsChange();
    },
    onError: (error) => {
      setError(error.message || "Failed to create tag");
      console.error("Error creating tag:", error);
    },
  });

  // Update tag mutation
  const updateTagMutation = api.project.updateTag.useMutation({
    onSuccess: () => {
      void fetchTags();
      handleCloseModal();
      if (onTagsChange) onTagsChange();
    },
    onError: (error) => {
      setError(error.message || "Failed to update tag");
      console.error("Error updating tag:", error);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError("Tag name is required");
      return;
    }

    try {
      if (editingTag) {
        // Update existing tag
        updateTagMutation.mutate({
          id: editingTag.id,
          projectId,
          name: formData.name,
          color: formData.color || "#3B82F6",
        });
      } else {
        // Create new tag
        createTagMutation.mutate({
          projectId,
          name: formData.name,
          color: formData.color || "#3B82F6",
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to save tag");
      console.error("Error saving tag:", err);
    }
  };

  // Delete tag mutation
  const deleteTagMutation = api.project.deleteTag.useMutation({
    onSuccess: () => {
      void fetchTags();
      if (onTagsChange) onTagsChange();
    },
    onError: (error) => {
      setError(error.message || "Failed to delete tag");
      console.error("Error deleting tag:", error);
    },
  });

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm("Are you sure you want to delete this tag? It will be removed from all tasks.")) {
      return;
    }

    try {
      deleteTagMutation.mutate({
        id: tagId,
        projectId,
      });
    } catch (err: any) {
      setError(err.message || "Failed to delete tag");
      console.error("Error deleting tag:", err);
    }
  };

  // Common tag colors
  const predefinedColors = [
    "#EF4444", // Red
    "#F97316", // Orange
    "#F59E0B", // Amber
    "#10B981", // Emerald
    "#3B82F6", // Blue
    "#6366F1", // Indigo
    "#8B5CF6", // Violet
    "#EC4899", // Pink
    "#6B7280", // Gray
  ];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Project Tags</h2>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-indigo-600 text-xs text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Add Tag
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : tags.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No tags found. Create your first tag to categorize tasks.
        </div>
      ) : (
        <div className="grid grid-cols-1 w-full gap-4">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md"
            >
              <div className="flex items-center">
                <div
                  className="w-4 h-4 rounded-full mr-3"
                  style={{ backgroundColor: tag.color || "#3B82F6" }}
                ></div>
                <span className="text-lg font-medium">{tag.name}</span>
              </div>
              <div className="flex items-center">
                <button
                  onClick={() => handleOpenModal(tag)}
                  className="p-1 text-gray-500 hover:text-indigo-600"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteTag(tag.id)}
                  className="p-1 text-gray-500 hover:text-red-600"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for adding/editing tags */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {editingTag ? "Edit Tag" : "Add New Tag"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Tag Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter tag name"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tag Color
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {predefinedColors.map((color: string) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color
                          ? "border-gray-900"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() =>
                        setFormData((prev: {name: string; color: string}) => ({ ...prev, color }))
                      }
                    ></button>
                  ))}
                </div>
                <div className="flex items-center">
                  <input
                    type="color"
                    id="color"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    className="w-10 h-10 rounded-md border-0 p-0"
                  />
                  <span className="ml-2 text-sm text-gray-500">
                    Or pick a custom color
                  </span>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {editingTag ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
