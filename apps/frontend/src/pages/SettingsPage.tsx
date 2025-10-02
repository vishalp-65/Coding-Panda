import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, User, Bell, Shield, Palette } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@/hooks/redux'
import { authApi } from '@/services/api'
import toast from 'react-hot-toast'

const profileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  theme: z.enum(['light', 'dark']),
  language: z.string(),
  notifications: z.boolean(),
})

type ProfileFormData = z.infer<typeof profileSchema>

const SettingsPage = () => {
  const { user } = useAppSelector((state) => state.auth)
  const [activeTab, setActiveTab] = useState('profile')
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.profile?.firstName || '',
      lastName: user?.profile?.lastName || '',
      bio: user?.profile?.bio || '',
      theme: user?.preferences?.theme || 'light',
      language: user?.preferences?.language || 'en',
      notifications: user?.preferences?.notifications ?? true,
    },
  })

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'appearance', name: 'Appearance', icon: Palette },
    { id: 'security', name: 'Security', icon: Shield },
  ]

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsLoading(true)
      await authApi.updateProfile(data)
      toast.success('Settings updated successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update settings')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences.</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'profile' && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <input
                    {...register('firstName')}
                    type="text"
                    className="input mt-1"
                    placeholder="Enter your first name"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <input
                    {...register('lastName')}
                    type="text"
                    className="input mt-1"
                    placeholder="Enter your last name"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Bio
                </label>
                <textarea
                  {...register('bio')}
                  rows={4}
                  className="input mt-1"
                  placeholder="Tell us about yourself..."
                />
                {errors.bio && (
                  <p className="mt-1 text-sm text-red-600">{errors.bio.message}</p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Email Notifications</h3>
                  <p className="text-sm text-gray-500">
                    Receive notifications about your account activity
                  </p>
                </div>
                <input
                  {...register('notifications')}
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Theme
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      {...register('theme')}
                      type="radio"
                      value="light"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Light</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      {...register('theme')}
                      type="radio"
                      value="dark"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Dark</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Language
                </label>
                <select {...register('language')} className="input mt-1">
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Password</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Change your password to keep your account secure
                </p>
                <button className="btn-secondary">
                  Change Password
                </button>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Add an extra layer of security to your account
                </p>
                <button className="btn-secondary">
                  Enable 2FA
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsPage