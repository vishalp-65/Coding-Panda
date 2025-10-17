import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, UserMinus, Users, Search, Filter } from 'lucide-react';
import { UserProfile, Follow } from '@/types/social';
import { Badge } from '@/components/ui/Badge';
import toast from 'react-hot-toast';

interface UserFollowingProps {
  userId: string;
  type: 'followers' | 'following' | 'suggestions';
}

const UserFollowing: React.FC<UserFollowingProps> = ({ userId, type }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'new'>('all');

  useEffect(() => {
    fetchUsers();
  }, [userId, type, filter]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);

      // TODO: Fetch original User (Mock data for demonstration)
      const mockUsers: UserProfile[] = [
        {
          id: 'user1',
          username: 'alice_codes',
          email: 'alice@example.com',
          avatar: undefined,
          bio: 'Full-stack developer passionate about algorithms and clean code',
          location: 'San Francisco, CA',
          company: 'TechCorp',
          position: 'Senior Software Engineer',
          experience: 'advanced',
          skills: ['JavaScript', 'Python', 'React', 'Node.js'],
          interests: ['Algorithms', 'Web Development', 'Machine Learning'],
          stats: {
            problemsSolved: 245,
            totalSubmissions: 892,
            acceptanceRate: 78.5,
            contestsParticipated: 15,
            bestRank: 23,
            currentStreak: 12,
            longestStreak: 45,
            skillRatings: {
              algorithms: 1850,
              dataStructures: 1720,
              dynamicProgramming: 1650,
            },
            badges: [],
            achievements: [],
          },
          preferences: {
            theme: 'dark',
            language: 'en',
            notifications: {
              email: true,
              push: true,
              contests: true,
              followers: true,
              mentions: true,
              achievements: true,
              weeklyDigest: true,
            },
            privacy: {
              profileVisibility: 'public',
              showStats: true,
              showActivity: true,
              allowMessages: true,
              allowFollows: true,
            },
            editor: {
              theme: 'dark',
              fontSize: 14,
              tabSize: 2,
              wordWrap: true,
              showLineNumbers: true,
              autoComplete: true,
            },
          },
          isFollowing: type === 'following',
          isFollowedBy: type === 'followers',
          createdAt: '2023-01-15T10:00:00Z',
          lastActive: '2024-02-15T14:30:00Z',
        },
        {
          id: 'user2',
          username: 'bob_developer',
          email: 'bob@example.com',
          avatar: undefined,
          bio: 'Competitive programmer and algorithm enthusiast',
          location: 'New York, NY',
          company: 'StartupXYZ',
          position: 'Software Engineer',
          experience: 'intermediate',
          skills: ['C++', 'Java', 'Python', 'Algorithms'],
          interests: ['Competitive Programming', 'Data Structures', 'Math'],
          stats: {
            problemsSolved: 189,
            totalSubmissions: 654,
            acceptanceRate: 82.1,
            contestsParticipated: 28,
            bestRank: 12,
            currentStreak: 8,
            longestStreak: 32,
            skillRatings: {
              algorithms: 1920,
              dataStructures: 1880,
              math: 1750,
            },
            badges: [],
            achievements: [],
          },
          preferences: {
            theme: 'light',
            language: 'en',
            notifications: {
              email: true,
              push: false,
              contests: true,
              followers: true,
              mentions: true,
              achievements: true,
              weeklyDigest: false,
            },
            privacy: {
              profileVisibility: 'public',
              showStats: true,
              showActivity: true,
              allowMessages: true,
              allowFollows: true,
            },
            editor: {
              theme: 'light',
              fontSize: 12,
              tabSize: 4,
              wordWrap: false,
              showLineNumbers: true,
              autoComplete: true,
            },
          },
          isFollowing: false,
          isFollowedBy: false,
          createdAt: '2023-03-20T15:30:00Z',
          lastActive: '2024-02-15T12:15:00Z',
        },
      ];

      setUsers(mockUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async (targetUserId: string) => {
    try {
      setUsers(prev =>
        prev.map(user => {
          if (user.id === targetUserId) {
            return {
              ...user,
              isFollowing: !user.isFollowing,
            };
          }
          return user;
        })
      );

      const user = users.find(u => u.id === targetUserId);
      toast.success(
        user?.isFollowing
          ? `Unfollowed ${user.username}`
          : `Now following ${user?.username}`
      );
    } catch (error) {
      console.error('Failed to follow/unfollow user:', error);
      toast.error('Failed to update follow status');
    }
  };

  const getExperienceColor = (experience: string) => {
    switch (experience) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-blue-100 text-blue-800';
      case 'advanced':
        return 'bg-purple-100 text-purple-800';
      case 'expert':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatLastActive = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) return 'Active now';
    if (diffInHours < 24) return `Active ${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 168) return `Active ${Math.floor(diffInHours / 24)}d ago`;
    return `Last seen ${date.toLocaleDateString()}`;
  };

  const filteredUsers = users.filter(user => {
    if (
      searchQuery &&
      !user.username.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    if (filter === 'active') {
      const lastActive = new Date(user.lastActive);
      const daysSinceActive =
        (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceActive <= 7;
    }

    if (filter === 'new') {
      const created = new Date(user.createdAt);
      const daysSinceCreated =
        (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreated <= 30;
    }

    return true;
  });

  const getTitle = () => {
    switch (type) {
      case 'followers':
        return 'Followers';
      case 'following':
        return 'Following';
      case 'suggestions':
        return 'Suggested Users';
      default:
        return 'Users';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
              <div className="h-8 w-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            {getTitle()}
          </h2>
          <span className="text-sm text-gray-500">
            {filteredUsers.length} users
          </span>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex space-x-2">
            {['all', 'active', 'new'].map(filterOption => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === filterOption
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="space-y-4">
        {filteredUsers.map(user => (
          <div
            key={user.id}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  {/* Avatar */}
                  <Link to={`/profile/${user.username}`}>
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="h-12 w-12 rounded-full"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-lg font-medium text-gray-600">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </Link>

                  <div className="flex-1">
                    {/* User Info */}
                    <div className="flex items-center space-x-2 mb-1">
                      <Link
                        to={`/profile/${user.username}`}
                        className="font-semibold text-gray-900 hover:text-primary-600"
                      >
                        {user.username}
                      </Link>
                      <Badge className={getExperienceColor(user.experience)}>
                        {user.experience}
                      </Badge>
                    </div>

                    {user.bio && (
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                        {user.bio}
                      </p>
                    )}

                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                      {user.location && <span>{user.location}</span>}
                      {user.company && <span>@ {user.company}</span>}
                      <span>{formatLastActive(user.lastActive)}</span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <span className="font-medium text-gray-900">
                          {user.stats.problemsSolved}
                        </span>
                        <span className="text-gray-500">problems solved</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="font-medium text-gray-900">
                          {user.stats.acceptanceRate}%
                        </span>
                        <span className="text-gray-500">acceptance rate</span>
                      </div>
                      {user.stats.bestRank && (
                        <div className="flex items-center space-x-1">
                          <span className="font-medium text-gray-900">
                            #{user.stats.bestRank}
                          </span>
                          <span className="text-gray-500">best rank</span>
                        </div>
                      )}
                    </div>

                    {/* Skills */}
                    {user.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {user.skills.slice(0, 4).map(skill => (
                          <span
                            key={skill}
                            className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                          >
                            {skill}
                          </span>
                        ))}
                        {user.skills.length > 4 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            +{user.skills.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Follow Button */}
                <div className="flex flex-col items-end space-y-2">
                  <button
                    onClick={() => handleFollow(user.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      user.isFollowing
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                  >
                    {user.isFollowing ? (
                      <>
                        <UserMinus className="h-4 w-4" />
                        <span>Unfollow</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>

                  <Link
                    to={`/profile/${user.username}`}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No users found
            </h3>
            <p className="text-gray-500">
              {searchQuery
                ? 'Try adjusting your search terms or filters.'
                : `No ${type} to show at the moment.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserFollowing;
