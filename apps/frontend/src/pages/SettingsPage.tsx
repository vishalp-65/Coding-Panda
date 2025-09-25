import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Save, User, Bell, Shield, Palette, Moon, Sun } from 'lucide-react'
import { useAppSelector } from '@/hooks/redux'
import { authApi } from '@/services/api'
import toast from 'react-hot-toast'
import ModernFooter from '@/components/layout/ModernFooter'

interface ProfileFormData {
  firstName?: string;
  lastName?: string;
  bio?: string;
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
}

const SettingsPage = () => {
  const { user } = useAppSelector((state) => state.auth)
  const [activeTab, setActiveTab] = useState('profile')
  const [isLoading, setIsLoading] = useState(false)
  const [currentTheme, setCurrentTheme] = useState('dark')

  const {
    register,
    handleSubmit,
  } = useForm<ProfileFormData>({
    defaultValues: {
      firstName: user?.profile?.firstName || '',
      lastName: user?.profile?.lastName || '',
      bio: user?.profile?.bio || '',
      theme: (user?.preferences?.theme as 'light' | 'dark') || 'dark',
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

  useEffect(() => {
    // Initialize theme from localStorage or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark'
    setCurrentTheme(savedTheme)

    // Apply theme to document
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark')
      document.body.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.body.classList.remove('dark')
    }
  }, [])

  const handleThemeChange = (theme: string) => {
    setCurrentTheme(theme)
    localStorage.setItem('theme', theme)

    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
      document.body.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.body.classList.remove('dark')
    }

    toast.success(`Theme changed to ${theme}`)
  }

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsLoading(true)

      // Basic validation
      if (data.bio && data.bio.length > 500) {
        toast.error('Bio must be less than 500 characters')
        return
      }

      await authApi.updateProfile(data)

      // Handle theme change
      if (data.theme !== currentTheme) {
        handleThemeChange(data.theme)
      }

      toast.success('Settings updated successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update settings')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`min-h-screen pt-14 transition-colors duration-200 ${currentTheme === 'dark'
      ? 'bg-gray-900 text-white'
      : 'bg-gray-50 text-gray-900'
      }`}>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className={`text-2xl font-bold ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>Settings</h1>
          <p className={`${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Manage your account settings and preferences.</p>
        </div>

        <div className={`rounded-lg shadow-xl border transition-colors duration-200 ${currentTheme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
          }`}>
          <div className={`border-b transition-colors duration-200 ${currentTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-500'
                    : currentTheme === 'dark'
                      ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                      : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
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
                    <label className={`block text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                      First Name
                    </label>
                    <input
                      {...register('firstName')}
                      type="text"
                      className={`w-full mt-1 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ${currentTheme === 'dark'
                        ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      placeholder="Enter your first name"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                      Last Name
                    </label>
                    <input
                      {...register('lastName')}
                      type="text"
                      className={`w-full mt-1 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ${currentTheme === 'dark'
                        ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Bio
                  </label>
                  <textarea
                    {...register('bio')}
                    rows={4}
                    className={`w-full mt-1 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ${currentTheme === 'dark'
                      ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg font-medium transition-colors flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className={`flex items-center justify-between p-4 rounded-lg transition-colors duration-200 ${currentTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                  <div>
                    <h3 className={`text-lg font-medium ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>Email Notifications</h3>
                    <p className={`text-sm ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                      Receive notifications about your account activity
                    </p>
                  </div>
                  <input
                    {...register('notifications')}
                    type="checkbox"
                    className={`h-5 w-5 text-blue-600 focus:ring-blue-500 rounded transition-colors duration-200 ${currentTheme === 'dark'
                      ? 'border-gray-600 bg-gray-700'
                      : 'border-gray-300 bg-white'
                      }`}
                  />
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <label className={`block text-sm font-medium mb-4 ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Theme Preference
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => handleThemeChange('light')}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 ${currentTheme === 'light'
                        ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20'
                        : currentTheme === 'dark'
                          ? 'border-gray-600 bg-gray-700 hover:border-gray-500'
                          : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                        }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Sun className="h-6 w-6 text-yellow-500" />
                        <div className="text-left">
                          <div className={`font-medium ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>Light</div>
                          <div className={`text-sm ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>Bright and clean interface</div>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleThemeChange('dark')}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 ${currentTheme === 'dark'
                        ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20'
                        : currentTheme === 'light'
                          ? 'border-gray-300 bg-gray-50 hover:border-gray-400'
                          : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                        }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Moon className="h-6 w-6 text-blue-500" />
                        <div className="text-left">
                          <div className={`font-medium ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>Dark</div>
                          <div className={`text-sm ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>Easy on the eyes</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Language
                  </label>
                  <select
                    {...register('language')}
                    className={`w-full mt-1 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ${currentTheme === 'dark'
                      ? 'bg-gray-700 border border-gray-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-900'
                      }`}
                  >
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
                  <h3 className={`text-lg font-medium ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>Password</h3>
                  <p className={`text-sm mb-4 ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                    Change your password to keep your account secure
                  </p>
                  <button className={`px-4 py-2 rounded-lg font-medium transition-colors border ${currentTheme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-300'
                    }`}>
                    Change Password
                  </button>
                </div>

                <div>
                  <h3 className={`text-lg font-medium ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>Two-Factor Authentication</h3>
                  <p className={`text-sm mb-4 ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                    Add an extra layer of security to your account
                  </p>
                  <button className={`px-4 py-2 rounded-lg font-medium transition-colors border ${currentTheme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-300'
                    }`}>
                    Enable 2FA
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <ModernFooter />
      </div>
    </div>
  )
}

export default SettingsPage