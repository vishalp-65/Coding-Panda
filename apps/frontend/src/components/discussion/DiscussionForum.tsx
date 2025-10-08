import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, ThumbsUp, ThumbsDown, Pin, Lock, Plus, Search, Filter } from 'lucide-react';
import { DiscussionThread } from '@/types/collaboration';
import { Badge } from '@/components/ui/Badge';

interface DiscussionForumProps {
    category?: string;
    problemId?: string;
    contestId?: string;
}

const DiscussionForum: React.FC<DiscussionForumProps> = ({
    category,
    problemId,
    contestId
}) => {
    const [threads, setThreads] = useState<DiscussionThread[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>(category || 'all');
    const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'votes'>('recent');

    const categories = [
        { id: 'all', name: 'All', count: 0 },
        { id: 'general', name: 'General', count: 0 },
        { id: 'help', name: 'Help', count: 0 },
        { id: 'contest', name: 'Contest', count: 0 },
        { id: 'problem', name: 'Problem', count: 0 },
        { id: 'announcement', name: 'Announcements', count: 0 }
    ];

    useEffect(() => {
        fetchThreads();
    }, [selectedCategory, sortBy, problemId, contestId]);

    const fetchThreads = async () => {
        try {
            setIsLoading(true);

            // Mock data for demonstration
            const mockThreads: DiscussionThread[] = [
                {
                    id: '1',
                    title: 'How to approach dynamic programming problems?',
                    content: 'I\'m struggling with DP problems. Any tips or resources?',
                    author: {
                        id: 'user1',
                        username: 'coder123',
                        avatar: undefined
                    },
                    category: 'help',
                    tags: ['dynamic-programming', 'algorithms'],
                    isPinned: false,
                    isLocked: false,
                    votes: 15,
                    userVote: undefined,
                    replies: [],
                    replyCount: 8,
                    lastActivity: '2024-02-15T10:30:00Z',
                    createdAt: '2024-02-14T15:20:00Z',
                    updatedAt: '2024-02-15T10:30:00Z'
                },
                {
                    id: '2',
                    title: 'Weekly Contest 123 Discussion',
                    content: 'Let\'s discuss the problems from this week\'s contest!',
                    author: {
                        id: 'user2',
                        username: 'contestmaster',
                        avatar: undefined
                    },
                    category: 'contest',
                    tags: ['contest', 'weekly-123'],
                    isPinned: true,
                    isLocked: false,
                    votes: 42,
                    userVote: 'up',
                    replies: [],
                    replyCount: 25,
                    lastActivity: '2024-02-15T12:45:00Z',
                    createdAt: '2024-02-15T08:00:00Z',
                    updatedAt: '2024-02-15T12:45:00Z'
                }
            ];

            setThreads(mockThreads);
        } catch (error) {
            console.error('Failed to fetch threads:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVote = async (threadId: string, voteType: 'up' | 'down') => {
        try {
            // API call would go here
            setThreads(prev => prev.map(thread => {
                if (thread.id === threadId) {
                    const currentVote = thread.userVote;
                    let newVotes = thread.votes;
                    let newUserVote: 'up' | 'down' | undefined = voteType;

                    // Calculate vote changes
                    if (currentVote === voteType) {
                        // Remove vote
                        newVotes += voteType === 'up' ? -1 : 1;
                        newUserVote = undefined;
                    } else if (currentVote) {
                        // Change vote
                        newVotes += voteType === 'up' ? 2 : -2;
                    } else {
                        // New vote
                        newVotes += voteType === 'up' ? 1 : -1;
                    }

                    return { ...thread, votes: newVotes, userVote: newUserVote };
                }
                return thread;
            }));
        } catch (error) {
            console.error('Failed to vote:', error);
        }
    };

    const filteredThreads = threads
        .filter(thread => {
            if (selectedCategory !== 'all' && thread.category !== selectedCategory) return false;
            if (searchQuery && !thread.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            if (problemId && !thread.tags.includes(`problem-${problemId}`)) return false;
            if (contestId && !thread.tags.includes(`contest-${contestId}`)) return false;
            return true;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'popular':
                    return b.replyCount - a.replyCount;
                case 'votes':
                    return b.votes - a.votes;
                case 'recent':
                default:
                    return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
            }
        });

    const formatTimeAgo = (timestamp: string) => {
        const now = new Date();
        const date = new Date(timestamp);
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
        if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
        return date.toLocaleDateString();
    };

    const getCategoryColor = (cat: string) => {
        const colors = {
            general: 'bg-gray-100 text-gray-800',
            help: 'bg-blue-100 text-blue-800',
            contest: 'bg-purple-100 text-purple-800',
            problem: 'bg-green-100 text-green-800',
            announcement: 'bg-yellow-100 text-yellow-800'
        };
        return colors[cat as keyof typeof colors] || colors.general;
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Discussion Forum</h1>
                    <p className="text-gray-600 mt-1">
                        Share knowledge, ask questions, and connect with the community
                    </p>
                </div>

                <Link
                    to="/discussions/new"
                    className="btn-primary flex items-center space-x-2"
                >
                    <Plus className="h-4 w-4" />
                    <span>New Thread</span>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar */}
                <div className="lg:col-span-1">
                    {/* Search */}
                    <div className="bg-white rounded-lg shadow p-4 mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search discussions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="bg-white rounded-lg shadow p-4 mb-6">
                        <h3 className="font-semibold text-gray-900 mb-3">Categories</h3>
                        <div className="space-y-1">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === cat.id
                                            ? 'bg-primary-100 text-primary-700'
                                            : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span>{cat.name}</span>
                                        <span className="text-xs text-gray-500">{cat.count}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sort Options */}
                    <div className="bg-white rounded-lg shadow p-4">
                        <h3 className="font-semibold text-gray-900 mb-3">Sort by</h3>
                        <div className="space-y-1">
                            {[
                                { id: 'recent', name: 'Most Recent' },
                                { id: 'popular', name: 'Most Replies' },
                                { id: 'votes', name: 'Most Votes' }
                            ].map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => setSortBy(option.id as any)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${sortBy === option.id
                                            ? 'bg-primary-100 text-primary-700'
                                            : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    {option.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredThreads.map((thread) => (
                                <div key={thread.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                                    <div className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                {/* Thread header */}
                                                <div className="flex items-center space-x-2 mb-2">
                                                    {thread.isPinned && (
                                                        <Pin className="h-4 w-4 text-yellow-500" />
                                                    )}
                                                    {thread.isLocked && (
                                                        <Lock className="h-4 w-4 text-gray-500" />
                                                    )}
                                                    <Badge className={getCategoryColor(thread.category)}>
                                                        {thread.category}
                                                    </Badge>
                                                </div>

                                                {/* Title and content */}
                                                <Link
                                                    to={`/discussions/${thread.id}`}
                                                    className="block hover:text-primary-600"
                                                >
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                                        {thread.title}
                                                    </h3>
                                                    <p className="text-gray-600 text-sm line-clamp-2">
                                                        {thread.content}
                                                    </p>
                                                </Link>

                                                {/* Tags */}
                                                {thread.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-3">
                                                        {thread.tags.map((tag) => (
                                                            <span
                                                                key={tag}
                                                                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                                                            >
                                                                #{tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Meta info */}
                                                <div className="flex items-center space-x-4 mt-4 text-sm text-gray-500">
                                                    <div className="flex items-center space-x-1">
                                                        <span>by</span>
                                                        <span className="font-medium text-gray-700">
                                                            {thread.author.username}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <MessageSquare className="h-4 w-4" />
                                                        <span>{thread.replyCount} replies</span>
                                                    </div>
                                                    <span>Last activity {formatTimeAgo(thread.lastActivity)}</span>
                                                </div>
                                            </div>

                                            {/* Vote buttons */}
                                            <div className="flex flex-col items-center space-y-1 ml-4">
                                                <button
                                                    onClick={() => handleVote(thread.id, 'up')}
                                                    className={`p-1 rounded ${thread.userVote === 'up'
                                                            ? 'text-green-600 bg-green-50'
                                                            : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                                        }`}
                                                >
                                                    <ThumbsUp className="h-4 w-4" />
                                                </button>

                                                <span className={`text-sm font-medium ${thread.votes > 0 ? 'text-green-600' :
                                                        thread.votes < 0 ? 'text-red-600' : 'text-gray-500'
                                                    }`}>
                                                    {thread.votes}
                                                </span>

                                                <button
                                                    onClick={() => handleVote(thread.id, 'down')}
                                                    className={`p-1 rounded ${thread.userVote === 'down'
                                                            ? 'text-red-600 bg-red-50'
                                                            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                                        }`}
                                                >
                                                    <ThumbsDown className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {filteredThreads.length === 0 && (
                                <div className="text-center py-12">
                                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No discussions found</h3>
                                    <p className="text-gray-500 mb-4">
                                        {searchQuery
                                            ? 'Try adjusting your search terms or filters.'
                                            : 'Be the first to start a discussion in this category!'
                                        }
                                    </p>
                                    <Link to="/discussions/new" className="btn-primary">
                                        Start Discussion
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DiscussionForum;