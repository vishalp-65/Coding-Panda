import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Trophy, Code, Users, Award, Star } from 'lucide-react';
import { ActivityFeed as ActivityFeedType, UserProfile } from '@/types/social';
import { Badge } from '@/components/ui/Badge';

interface ActivityFeedProps {
    userId?: string; // If provided, shows activities for specific user
    following?: boolean; // If true, shows activities from followed users only
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ userId, following = false }) => {
    const [activities, setActivities] = useState<ActivityFeedType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'problems' | 'contests' | 'social'>('all');

    useEffect(() => {
        fetchActivities();
    }, [userId, following, filter]);

    const fetchActivities = async () => {
        try {
            setIsLoading(true);

            // Mock data for demonstration
            const mockActivities: ActivityFeedType[] = [
                {
                    id: '1',
                    userId: 'user1',
                    username: 'alice_codes',
                    avatar: undefined,
                    type: 'problem_solved',
                    content: {
                        title: 'Solved "Two Sum"',
                        description: 'Completed in 5 minutes with optimal solution',
                        metadata: {
                            problemId: 'two-sum',
                            problemTitle: 'Two Sum',
                            difficulty: 'easy',
                            language: 'python',
                            executionTime: 45
                        }
                    },
                    timestamp: '2024-02-15T10:30:00Z',
                    isPublic: true,
                    likes: 12,
                    comments: 3,
                    userLiked: false
                },
                {
                    id: '2',
                    userId: 'user2',
                    username: 'bob_developer',
                    avatar: undefined,
                    type: 'contest_won',
                    content: {
                        title: 'Won Weekly Contest 123',
                        description: 'Achieved 1st place with perfect score!',
                        metadata: {
                            contestId: 'weekly-123',
                            contestTitle: 'Weekly Contest 123',
                            rank: 1
                        }
                    },
                    timestamp: '2024-02-15T09:15:00Z',
                    isPublic: true,
                    likes: 45,
                    comments: 8,
                    userLiked: true
                },
                {
                    id: '3',
                    userId: 'user3',
                    username: 'charlie_algo',
                    avatar: undefined,
                    type: 'badge_earned',
                    content: {
                        title: 'Earned "Algorithm Master" badge',
                        description: 'Solved 100 algorithm problems',
                        metadata: {
                            badgeId: 'algo-master'
                        }
                    },
                    timestamp: '2024-02-15T08:45:00Z',
                    isPublic: true,
                    likes: 23,
                    comments: 5,
                    userLiked: false
                },
                {
                    id: '4',
                    userId: 'user4',
                    username: 'diana_coder',
                    avatar: undefined,
                    type: 'follow',
                    content: {
                        title: 'Started following alice_codes',
                        metadata: {
                            followedUserId: 'user1',
                            followedUsername: 'alice_codes'
                        }
                    },
                    timestamp: '2024-02-15T08:00:00Z',
                    isPublic: true,
                    likes: 2,
                    comments: 0,
                    userLiked: false
                }
            ];

            setActivities(mockActivities);
        } catch (error) {
            console.error('Failed to fetch activities:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLike = async (activityId: string) => {
        try {
            setActivities(prev => prev.map(activity => {
                if (activity.id === activityId) {
                    return {
                        ...activity,
                        likes: activity.userLiked ? activity.likes - 1 : activity.likes + 1,
                        userLiked: !activity.userLiked
                    };
                }
                return activity;
            }));
        } catch (error) {
            console.error('Failed to like activity:', error);
        }
    };

    const getActivityIcon = (type: ActivityFeedType['type']) => {
        switch (type) {
            case 'problem_solved':
                return <Code className="h-5 w-5 text-green-600" />;
            case 'contest_joined':
            case 'contest_won':
                return <Trophy className="h-5 w-5 text-yellow-600" />;
            case 'badge_earned':
            case 'achievement_unlocked':
                return <Award className="h-5 w-5 text-purple-600" />;
            case 'follow':
                return <Users className="h-5 w-5 text-blue-600" />;
            case 'post_created':
                return <MessageCircle className="h-5 w-5 text-gray-600" />;
            default:
                return <Star className="h-5 w-5 text-gray-600" />;
        }
    };

    const getActivityColor = (type: ActivityFeedType['type']) => {
        switch (type) {
            case 'problem_solved':
                return 'bg-green-50 border-green-200';
            case 'contest_joined':
            case 'contest_won':
                return 'bg-yellow-50 border-yellow-200';
            case 'badge_earned':
            case 'achievement_unlocked':
                return 'bg-purple-50 border-purple-200';
            case 'follow':
                return 'bg-blue-50 border-blue-200';
            case 'post_created':
                return 'bg-gray-50 border-gray-200';
            default:
                return 'bg-white border-gray-200';
        }
    };

    const formatTimeAgo = (timestamp: string) => {
        const now = new Date();
        const date = new Date(timestamp);
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
        if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
        return date.toLocaleDateString();
    };

    const filteredActivities = activities.filter(activity => {
        if (filter === 'all') return true;
        if (filter === 'problems') return activity.type === 'problem_solved';
        if (filter === 'contests') return activity.type.includes('contest');
        if (filter === 'social') return ['follow', 'post_created'].includes(activity.type);
        return true;
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                        <div className="flex space-x-3">
                            <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                            <div className="flex-1">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filter Tabs */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="flex space-x-1">
                    {[
                        { id: 'all', name: 'All Activity' },
                        { id: 'problems', name: 'Problems' },
                        { id: 'contests', name: 'Contests' },
                        { id: 'social', name: 'Social' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === tab.id
                                    ? 'bg-primary-100 text-primary-700'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            {tab.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Activity Feed */}
            <div className="space-y-4">
                {filteredActivities.map((activity) => (
                    <div
                        key={activity.id}
                        className={`bg-white rounded-lg shadow border-l-4 ${getActivityColor(activity.type)}`}
                    >
                        <div className="p-6">
                            <div className="flex items-start space-x-3">
                                {/* Avatar */}
                                <Link to={`/profile/${activity.username}`}>
                                    {activity.avatar ? (
                                        <img
                                            src={activity.avatar}
                                            alt={activity.username}
                                            className="h-10 w-10 rounded-full"
                                        />
                                    ) : (
                                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                            <span className="text-sm font-medium text-gray-600">
                                                {activity.username.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                </Link>

                                <div className="flex-1 min-w-0">
                                    {/* Header */}
                                    <div className="flex items-center space-x-2 mb-2">
                                        {getActivityIcon(activity.type)}
                                        <Link
                                            to={`/profile/${activity.username}`}
                                            className="font-medium text-gray-900 hover:text-primary-600"
                                        >
                                            {activity.username}
                                        </Link>
                                        <span className="text-gray-500">•</span>
                                        <span className="text-sm text-gray-500">
                                            {formatTimeAgo(activity.timestamp)}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <div className="mb-3">
                                        <h3 className="font-medium text-gray-900 mb-1">
                                            {activity.content.title}
                                        </h3>
                                        {activity.content.description && (
                                            <p className="text-gray-600 text-sm">
                                                {activity.content.description}
                                            </p>
                                        )}

                                        {/* Metadata */}
                                        {activity.content.metadata && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {activity.content.metadata.difficulty && (
                                                    <Badge className={
                                                        activity.content.metadata.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                                                            activity.content.metadata.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-red-100 text-red-800'
                                                    }>
                                                        {activity.content.metadata.difficulty}
                                                    </Badge>
                                                )}
                                                {activity.content.metadata.language && (
                                                    <Badge className="bg-blue-100 text-blue-800">
                                                        {activity.content.metadata.language}
                                                    </Badge>
                                                )}
                                                {activity.content.metadata.rank && (
                                                    <Badge className="bg-yellow-100 text-yellow-800">
                                                        Rank #{activity.content.metadata.rank}
                                                    </Badge>
                                                )}
                                                {activity.content.metadata.executionTime && (
                                                    <Badge className="bg-gray-100 text-gray-800">
                                                        {activity.content.metadata.executionTime}ms
                                                    </Badge>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                                        <button
                                            onClick={() => handleLike(activity.id)}
                                            className={`flex items-center space-x-1 hover:text-red-600 ${activity.userLiked ? 'text-red-600' : ''
                                                }`}
                                        >
                                            <Heart className={`h-4 w-4 ${activity.userLiked ? 'fill-current' : ''}`} />
                                            <span>{activity.likes}</span>
                                        </button>

                                        <Link
                                            to={`/activity/${activity.id}`}
                                            className="flex items-center space-x-1 hover:text-blue-600"
                                        >
                                            <MessageCircle className="h-4 w-4" />
                                            <span>{activity.comments}</span>
                                        </Link>

                                        <button className="flex items-center space-x-1 hover:text-green-600">
                                            <Share2 className="h-4 w-4" />
                                            <span>Share</span>
                                        </button>

                                        {/* Problem/Contest Link */}
                                        {activity.content.metadata?.problemId && (
                                            <Link
                                                to={`/problems/${activity.content.metadata.problemId}`}
                                                className="text-primary-600 hover:text-primary-700 font-medium"
                                            >
                                                View Problem
                                            </Link>
                                        )}
                                        {activity.content.metadata?.contestId && (
                                            <Link
                                                to={`/contests/${activity.content.metadata.contestId}`}
                                                className="text-primary-600 hover:text-primary-700 font-medium"
                                            >
                                                View Contest
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredActivities.length === 0 && (
                    <div className="text-center py-12">
                        <div className="h-12 w-12 text-gray-400 mx-auto mb-4">
                            {getActivityIcon('problem_solved')}
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
                        <p className="text-gray-500">
                            {filter === 'all'
                                ? 'No recent activities to show.'
                                : `No ${filter} activities to show.`
                            }
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityFeed;