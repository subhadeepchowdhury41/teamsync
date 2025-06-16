import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useSession } from 'next-auth/react';
import { api } from '@/utils/api';

type ProjectFormData = {
  name: string;
  description: string;
};

interface ProjectFormProps {
  projectId?: string;
  project?: any;
  isEditing?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ProjectForm({ projectId, project, isEditing, onSuccess, onCancel }: ProjectFormProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProjectFormData>();

  // Set form values if project data is provided
  useEffect(() => {
    if (project) {
      setValue('name', project.name);
      setValue('description', project.description || '');
    }
  }, [project, setValue]);
  
  // Fetch project data if editing but no project data provided
  const { data: fetchedProject, error: fetchError } = api.project.getById.useQuery(
    { id: projectId! },
    {
      enabled: !!projectId && !project,
    }
  );
  
  // Handle project data when it's fetched
  useEffect(() => {
    if (fetchedProject?.project) {
      setValue('name', fetchedProject.project.name);
      setValue('description', fetchedProject.project.description || '');
      setLoading(false);
    }
  }, [fetchedProject, setValue]);
  
  // Handle fetch errors
  useEffect(() => {
    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
    }
  }, [fetchError]);

  // tRPC mutations
  const createProject = api.project.create.useMutation({
    onSuccess: () => onSuccess(),
    onError: (error) => {
      console.error('Error creating project:', error);
      setError(error.message || 'Failed to create project');
      setLoading(false);
    },
  });

  const updateProject = api.project.update.useMutation({
    onSuccess: () => onSuccess(),
    onError: (error) => {
      console.error('Error updating project:', error);
      setError(error.message || 'Failed to update project');
      setLoading(false);
    },
  });

  const onSubmit = async (data: ProjectFormData) => {
    if (!session?.user) return;
    
    try {
      setLoading(true);
      setError(null);

      if (projectId || isEditing) {
        // Update existing project
        updateProject.mutate({
          id: projectId || project.id,
          name: data.name,
          description: data.description || undefined,
        });
      } else {
        // Create new project
        createProject.mutate({
          name: data.name,
          description: data.description || undefined,
        });
      }
      
      // Note: loading state and success handling is managed by the mutation hooks
    } catch (error: any) {
      console.error('Error submitting form:', error);
      setError(error.message || 'Failed to process form');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-medium text-gray-900 mb-6">
        {projectId || isEditing ? 'Edit Project' : 'Create New Project'}
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
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Project Name *
          </label>
          <input
            id="name"
            type="text"
            {...register('name', { required: 'Project name is required' })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            {...register('description')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Describe your project..."
          />
        </div>

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
            {loading ? 'Saving...' : (projectId || isEditing) ? 'Update Project' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
}
