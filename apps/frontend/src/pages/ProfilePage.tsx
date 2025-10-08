import React from 'react'
import { useAppSelector } from '@/hooks/redux'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { CheckCircle, XCircle, Shield, Mail, Calendar, Trophy, TrendingUp } from 'lucide-react'

const ProfilePage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth)

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    )
  }

  const { profile, preferences, stats } = user

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-600">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user.username}</h1>
              <p className="text-gray-600">{profile.firstName} {profile.lastName}</p>
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant={user.isEmailVerified ? 'success' : 'warning'}>
                  {user.isEmailVerified ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 mr-1" />
                      Unverified
                    </>
                  )}
                </Badge>
                {user.twoFactorEnabled && (
                  <Badge variant="info">
                    <Shield className="w-3 h-3 mr-1" />
                    2FA Enabled
                  </Badge>
                )}
                <Badge variant="outline" className="capitalize">
                  {profile.skillLevel}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Mail className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">Email</p>
                <p className="text-sm text-gray-900">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">Member Since</p>
                <p className="text-sm text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Programming Languages</p>
              <div className="flex flex-wrap gap-2">
                {profile.programmingLanguages.length > 0 ? (
                  profile.programmingLanguages.map((lang, index) => (
                    <Badge key={index} variant="outline">{lang}</Badge>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No languages specified</p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Statistics */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-gray-700">Problems Solved</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{stats.problemsSolved}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">Acceptance Rate</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{stats.acceptanceRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-gray-700">Contests Participated</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{stats.contestsParticipated}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-700">Current Streak</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{stats.streak} days</span>
            </div>
            {stats.ranking > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Trophy className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium text-gray-700">Global Ranking</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">#{stats.ranking}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Preferences */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">General</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Theme</span>
                <Badge variant="outline" className="capitalize">{preferences.theme}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Language</span>
                <Badge variant="outline">{preferences.language}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Timezone</span>
                <Badge variant="outline">{preferences.timezone}</Badge>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Privacy</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Profile Visibility</span>
                <Badge variant={preferences.privacySettings.profileVisibility === 'public' ? 'success' : 'warning'}>
                  {preferences.privacySettings.profileVisibility}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Show Email</span>
                <Badge variant={preferences.privacySettings.showEmail ? 'success' : 'secondary'}>
                  {preferences.privacySettings.showEmail ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Direct Messages</span>
                <Badge variant={preferences.privacySettings.allowDirectMessages ? 'success' : 'secondary'}>
                  {preferences.privacySettings.allowDirectMessages ? 'Allowed' : 'Disabled'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default ProfilePage