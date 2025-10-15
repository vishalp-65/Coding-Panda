import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    TrendingUp,
    Calendar,
    Clock,
    Target,
    Award,
    Flame,
    CheckCircle,
    Code,
    Trophy,
    Users,
    ArrowRight,
    BookOpen
} from 'lucide-react';
import { useAppSelector } from '@/hooks/redux';
import ModernFooter from '@/components/layout/ModernFooter';

const ModernDashboardPage = () => {
    const { user } = useAppSelector(state => state.auth);
    const [streak, setStreak] = useState(7);
    const [todaysSolved, setTodaysSolved] = useState(3);
    const [weeklyGoal, setWeeklyGoal] = useState({ current: 12, target: 20 });

    // Mock data
    const recentActivity = [
        { id: '1', title: 'Two Sum', difficulty: 'easy', status: 'solved', time: '2 hours ago' },
        { id: '2', title: 'Add Two Numbers', difficulty: 'medium', status: 'attempted', time: '5 hours ago' },
        { id: '3', title: 'Longest Substring', difficulty: 'medium', status: 'solved', time: '1 day ago' },
    ];

    const recommendedProblems = [
        { id: '4', title: 'Median of Two Sorted Arrays', difficulty: 'hard', tags: ['Array', 'Binary Search'] },
        { id: '5', title: 'Longest Palindromic Substring', difficulty: 'medium', tags: ['String', 'Dynamic Programming'] },
        { id: '6', title: 'ZigZag Conversion', difficulty: 'medium', tags: ['String'] },
    ];

    const upcomingContests = [
        { id: '1', title: 'Weekly Contest 372', date: '2024-01-15', time: '10:30 AM', participants: 15420 },
        { id: '2', title: 'Biweekly Contest 118', date: '2024-01-20', time: '8:00 PM', participants: 8930 },
    ];

    const stats = {
        totalSolved: 145,
        easySolved: 89,
        mediumSolved: 45,
        hardSolved: 11,
        ranking: 12450,
        acceptanceRate: 68.5,
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return 'text-green-400';
            case 'medium': return 'text-yellow-400';
            case 'hard': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'solved':
                return <CheckCircle className="h-4 w-4 text-green-400" />;
            case 'attempted':
                return <Clock className="h-4 w-4 text-yellow-400" />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Welcome Section */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold mb-2">Welcome back, {user?.username || 'Coder'}! 👋</h1>
                            <p className="text-blue-100">Ready to solve some problems today?</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-center">
                                <div className="flex items-center space-x-2 mb-1">
                                    <Flame className="h-5 w-5 text-orange-400" />
                                    <span className="text-2xl font-bold">{streak}</span>
                                </div>
                                <p className="text-sm text-blue-100">Day Streak</p>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold mb-1">{todaysSolved}</div>
                                <p className="text-sm text-blue-100">Solved Today</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gray-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-green-500/20 rounded-lg">
                                <CheckCircle className="h-6 w-6 text-green-400" />
                            </div>
                            <span className="text-2xl font-bold">{stats.totalSolved}</span>
                        </div>
                        <h3 className="text-gray-400 text-sm">Total Solved</h3>
                        <div className="flex space-x-4 mt-2 text-xs">
                            <span className="text-green-400">{stats.easySolved} Easy</span>
                            <span className="text-yellow-400">{stats.mediumSolved} Medium</span>
                            <span className="text-red-400">{stats.hardSolved} Hard</span>
                        </div>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <TrendingUp className="h-6 w-6 text-blue-400" />
                            </div>
                            <span className="text-2xl font-bold">#{stats.ranking.toLocaleString()}</span>
                        </div>
                        <h3 className="text-gray-400 text-sm">Global Ranking</h3>
                        <p className="text-green-400 text-xs mt-2">↑ 245 this week</p>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-purple-500/20 rounded-lg">
                                <Target className="h-6 w-6 text-purple-400" />
                            </div>
                            <span className="text-2xl font-bold">{stats.acceptanceRate}%</span>
                        </div>
                        <h3 className="text-gray-400 text-sm">Acceptance Rate</h3>
                        <p className="text-green-400 text-xs mt-2">↑ 2.3% this month</p>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-orange-500/20 rounded-lg">
                                <Award className="h-6 w-6 text-orange-400" />
                            </div>
                            <span className="text-2xl font-bold">{weeklyGoal.current}/{weeklyGoal.target}</span>
                        </div>
                        <h3 className="text-gray-400 text-sm">Weekly Goal</h3>
                        <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                            <div
                                className="bg-orange-400 h-2 rounded-full"
                                style={{ width: `${(weeklyGoal.current / weeklyGoal.target) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Activity */}
                    <div className="lg:col-span-2 bg-gray-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold">Recent Activity</h2>
                            <Link
                                to="/problems"
                                className="text-blue-400 hover:text-blue-300 text-sm flex items-center space-x-1"
                            >
                                <span>View all</span>
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                        <div className="space-y-4">
                            {recentActivity.map((activity) => (
                                <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        {getStatusIcon(activity.status)}
                                        <div>
                                            <Link
                                                to={`/problems/${activity.id}`}
                                                className="font-medium hover:text-blue-400 transition-colors"
                                            >
                                                {activity.title}
                                            </Link>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <span className={`text-xs ${getDifficultyColor(activity.difficulty)}`}>
                                                    {activity.difficulty}
                                                </span>
                                                <span className="text-xs text-gray-400">•</span>
                                                <span className="text-xs text-gray-400">{activity.time}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs ${activity.status === 'solved'
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                        {activity.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recommended Problems */}
                    <div className="bg-gray-800 rounded-xl p-6">
                        <h2 className="text-xl font-semibold mb-6">Recommended for You</h2>
                        <div className="space-y-4">
                            {recommendedProblems.map((problem) => (
                                <Link
                                    key={problem.id}
                                    to={`/problems/${problem.id}`}
                                    className="block p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    <h3 className="font-medium mb-2">{problem.title}</h3>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-xs ${getDifficultyColor(problem.difficulty)}`}>
                                            {problem.difficulty}
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                            {problem.tags.slice(0, 2).map((tag) => (
                                                <span key={tag} className="px-2 py-0.5 bg-gray-600 text-gray-300 rounded text-xs">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Upcoming Contests */}
                <div className="bg-gray-800 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold">Upcoming Contests</h2>
                        <Link
                            to="/contests"
                            className="text-blue-400 hover:text-blue-300 text-sm flex items-center space-x-1"
                        >
                            <span>View all</span>
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {upcomingContests.map((contest) => (
                            <div key={contest.id} className="p-4 bg-gray-700/50 rounded-lg">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-medium">{contest.title}</h3>
                                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                                            <div className="flex items-center space-x-1">
                                                <Calendar className="h-4 w-4" />
                                                <span>{contest.date}</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <Clock className="h-4 w-4" />
                                                <span>{contest.time}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Trophy className="h-5 w-5 text-yellow-400" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-1 text-sm text-gray-400">
                                        <Users className="h-4 w-4" />
                                        <span>{contest.participants.toLocaleString()} registered</span>
                                    </div>
                                    <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors">
                                        Register
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <ModernFooter />
        </div>
    );
};

export default ModernDashboardPage;