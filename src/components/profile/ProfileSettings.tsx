import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Camera, Save, User, Mail, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuthStore } from '../../stores/authStore';

interface ProfileFormData {
  display_name: string;
  bio: string;
  status: 'online' | 'offline' | 'away';
}

export const ProfileSettings: React.FC = () => {
  const { profile, updateProfile, isLoading } = useAuthStore();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileFormData>({
    defaultValues: {
      display_name: profile?.display_name || '',
      bio: profile?.bio || '',
      status: profile?.status || 'online',
    },
  });

  React.useEffect(() => {
    if (profile) {
      reset({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        status: profile.status,
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile(data);
      reset(data);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // In a real app, you would upload the file to storage
      // For demo purposes, we'll just show the preview
    }
  };

  if (!profile) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto p-6"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Profile Settings
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex items-center space-x-6">
              <div className="relative">
                <Avatar
                  src={avatarPreview || profile.avatar_url}
                  alt={profile.username}
                  size="xl"
                />
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full cursor-pointer transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {profile.display_name || profile.username}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">@{profile.username}</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Click the camera icon to change your avatar
                </p>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 gap-6">
              <Input
                label="Display Name"
                icon={<User className="w-5 h-5" />}
                placeholder="Enter your display name"
                {...register('display_name', {
                  maxLength: {
                    value: 50,
                    message: 'Display name must be less than 50 characters',
                  },
                })}
                error={errors.display_name?.message}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="block w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Email cannot be changed
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bio
                </label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <FileText className="w-5 h-5 text-gray-400" />
                  </div>
                  <textarea
                    {...register('bio', {
                      maxLength: {
                        value: 200,
                        message: 'Bio must be less than 200 characters',
                      },
                    })}
                    placeholder="Tell us about yourself..."
                    rows={4}
                    className="block w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                </div>
                {errors.bio && (
                  <p className="mt-1 text-sm text-error-600 dark:text-error-400">
                    {errors.bio.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'online', label: 'Online', color: 'success' },
                    { value: 'away', label: 'Away', color: 'warning' },
                    { value: 'offline', label: 'Offline', color: 'error' },
                  ].map((status) => (
                    <label
                      key={status.value}
                      className="relative flex items-center justify-center p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <input
                        type="radio"
                        value={status.value}
                        {...register('status')}
                        className="sr-only"
                      />
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full bg-${status.color}-500`} />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {status.label}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!isDirty}
                isLoading={isLoading}
                className="flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
};