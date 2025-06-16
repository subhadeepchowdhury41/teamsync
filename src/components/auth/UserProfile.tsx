import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '@/utils/api';
import { useSession } from 'next-auth/react';
import { type TRPCClientErrorLike } from '@trpc/client';
import { type RouterOutputs } from '@/utils/api';
import { AppRouter } from '@/server/trpc';

type ProfileFormData = {
  name: string;
  email: string;
};


export default function UserProfile() {
  const { data: session } = useSession();
  const utils = api.useUtils();
  const userId = session?.user?.id;

  // State management
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form handling
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormData>();
  
  // Check if user is authenticated
  if (!session?.user) {
    return null;
  }

  // Profile query
  const { data: profileData, isLoading: isProfileLoading, error: profileError } = api.user.me.useQuery(
    undefined,
    {
      enabled: !!session?.user,
    }
  );

  // Handle profile data and errors
  useEffect(() => {
    if (profileError) {
      setMessage({ 
        type: 'error', 
        text: profileError.message || 'Failed to fetch profile' 
      });
    }
    if (profileData) {
      setValue('name', profileData.name || '');
      setValue('email', profileData.email || '');
      setAvatarUrl(profileData.avatar_url);
    }
  }, [profileError, profileData, setValue, setAvatarUrl]);

  // Loading state
  useEffect(() => {
    setLoading(isProfileLoading);
  }, [isProfileLoading]);

  // Use tRPC mutation for avatar upload
  const uploadAvatarMutation = api.user.updateProfile.useMutation({
    onSuccess: (data: RouterOutputs['user']['updateProfile']) => {
      setAvatarUrl(data.avatar_url);
      setMessage({ type: 'success', text: 'Avatar updated successfully!' });
      void utils.user.me.invalidate();
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      setMessage({ 
        type: 'error', 
        text: error.message 
      });
    },
    onSettled: () => {
      setUploading(false);
    }
  });

  // Handle avatar upload
  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      if (!file) {
        throw new Error('File not found');
      }

      const reader = new FileReader();
      
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64Image = reader.result as string;
        uploadAvatarMutation.mutate({ 
          name: profileData?.name || '',
          image: base64Image,
        });
      };
      reader.onerror = () => {
        setMessage({ type: 'error', text: 'Failed to process image' });
        setUploading(false);
      };
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to upload avatar' 
      });
      setUploading(false);
    }
  };

  // Use tRPC mutation for profile update
  const { mutate: updateProfile, isPending: isLoading } = api.user.updateProfile.useMutation({
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Profile updated successfully' });
      void utils.user.me.invalidate();
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      setMessage({ type: 'error', text: error.message });
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      updateProfile({
        name: data.name,
      });
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to update profile' 
      });
    }
  };


  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Profile Information</h3>
        <p className="mt-1 text-sm text-gray-500">
          Update your profile information and manage your account settings.
        </p>

        {message && (
          <div className={`mt-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {message.type === 'success' ? (
                  <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                  {message.text}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row">
          <div className="sm:w-1/3 mb-6 sm:mb-0">
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <svg className="h-full w-full text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                </div>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow cursor-pointer"
                >
                  <span className="sr-only">Change avatar</span>
                  <svg className="h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={uploadAvatar}
                  disabled={uploading}
                  className="hidden"
                />
              </div>
              {uploading && (
                <p className="mt-2 text-sm text-gray-500">Uploading...</p>
              )}
            </div>
          </div>

          <div className="sm:w-2/3">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  {...register('name', { required: 'Name is required' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Email cannot be changed. Contact support if you need to update your email.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
