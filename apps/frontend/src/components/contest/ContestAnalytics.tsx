import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Code, Clock, Trophy, Target } from 'lucide-react';
import { ContestAnalytics as ContestAnalyticsType, Contest } from '@/types/contest';

interface ContestAnalyticsProps {
    contestId: string;
}

const ContestAnalytics: React.FC<ContestAnalyticsProps> = ({ contestId }) => {
    const [analytics, setAnalytics] = useState<ContestAnalyticsType | null>(null);
    const [contest, setContest] = useState<Contest | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMetric, setSelectedMetric] = useState<'submissions' | 'participants' | 'problems'>('submissions');

    useEffect(() => {
        fetchAnalytics();
    }, [contestId]);

    const fetchAnalytics = async () => {
        try {
            setIsLoading(true);

            // Mock data for demonstration
            const mockAnalytics: ContestAnalyticsType = {
                contestId,
                totalParticipants: 1247,
                totalSubmissions: 4892,
                problemStats: [
                    {
                        problemId: 'A',
                        title: 'Two Sum Variant',
                        totalSubmissions: 1205,
                        acceptedSubmissions: 892,
                        acceptanceRate: 74.0,
                        averageAttempts: 2.3,
                        firstSolveTime: 3
                    },
                    {
                        problemId: 'B',
                        title: 'Binary Tree Traversal',
                        totalSubmissions: 1089,
                        acceptedSubmissions: 654,
                        acceptanceRate: 60.1,
                        averageAttempts: 3.1,
                        firstSolveTime: 8
                    },
                    {
                        problemId: 'C',
                        title: 'Dynamic Programming Challenge',
                        totalSubmissions: 987,
                        acceptedSubmissions: 234,
                        acceptanceRate: 23.7,
                        averageAttempts: 4.8,
                        firstSolveTime: 15
                    },
                    {
                        problemId: 'D',
                        title: 'Graph Algorithm',
                        totalSubmissions: 456,
                        acceptedSubmissions: 89,
                        acceptanceRate: 19.5,
                        averageAttempts: 6.2,
                        firstSolveTime: 28
                    }
                ],
                participantDistribution: {
                    byCountry: {
                        'United States': 312,
                        'India': 298,
                        'China': 187,
                        'Russia': 156,
                        'Germany': 89,
                        'Others': 205
                    },
                    byExperience: {
                        'Beginner': 298,
                        'Intermediate': 456,
                        'Advanced': 387,
                        'Expert': 106
                    }
                },
                submissionTrends: [
                    { timestamp: '2024-02-15T10:00:00Z', submissions: 0 },
                    { timestamp: '2024-02-15T10:15:00Z', submissions: 234 },
                    { timestamp: '2024-02-15T10:30:00Z', submissions: 567 },
                    { timestamp: '2024-02-15T10:45:00Z', submissions: 892 },
                    { timestamp: '2024-02-15T11:00:00Z', submissions: 1205 },
                    { timestamp: '2024-02-15T11:15:00Z', submissions: 1456 },
                    { timestamp: '2024-02-15T11:30:00Z', submissions: 1678 }
                ]
            };

            const mockContest: Contest = {
                id: contestId,
                title: 'Weekly Contest 123',
                description: 'Test your algorithmic skills',
                startTime: '2024-02-15T10:00:00Z',
                endTime: '2024-02-15T11:30:00Z',
                duration: 90,
                participants: 1247,
                status: 'ended',
                difficulty: 'medium',
                problems: [
                    { id: 'A', title: 'Two Sum Variant', difficulty: 'easy', points: 100, order: 1 },
                    { id: 'B', title: 'Binary Tree Traversal', difficulty: 'medium', points: 200, order: 2 },
                    { id: 'C', title: 'Dynamic Programming Challenge', difficulty: 'hard', points: 300, order: 3 },
                    { id: 'D', title: 'Graph Algorithm', difficulty: 'hard', points: 400, order: 4 }
                ],
                rules: {
                    allowedLanguages: ['python', 'javascript', 'java', 'cpp'],
                    penaltyPerWrongSubmission: 5,
                    maxSubmissionsPerProblem: 10,
                    showLeaderboardDuringContest: true
                },
                createdBy: 'admin',
                createdAt: '2024-02-10T00:00:00Z',
                updatedAt: '2024-02-15T11:30:00Z'
            };

            setAnalytics(mockAnalytics);
            setContest(mockContest);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'];

    if (isLoading) {
        return (
            <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                        <div className="h-64 bg-gray-200 rounded"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (!analytics || !contest) {
        return (
            <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No analytics available</h3>
                <p className="text-gray-500">Analytics data is not available for this contest.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{contest.title} - Analytics</h1>
                        <p className="text-gray-600 mt-1">Contest performance and participation insights</p>
                    </div>

                    <div className="flex space-x-2">
                        {['submissions', 'participants', 'problems'].map((metric) => (
                            <button
                                key={metric}
                                onClick={() => setSelectedMetric(metric as any)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedMetric === metric
                                        ? 'bg-primary-100 text-primary-700'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                {metric.charAt(0).toUpperCase() + metric.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Users className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Participants</p>
                            <p className="text-2xl font-bold text-gray-900">{analytics.totalParticipants.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Code className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                            <p className="text-2xl font-bold text-gray-900">{analytics.totalSubmissions.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <Clock className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Contest Duration</p>
                            <p className="text-2xl font-bold text-gray-900">{formatTime(contest.duration)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Trophy className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Problems</p>
                            <p className="text-2xl font-bold text-gray-900">{contest.problems.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Submission Trends */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Submission Trends</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analytics.submissionTrends}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="timestamp"
                                tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            />
                            <YAxis />
                            <Tooltip
                                labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                                formatter={(value) => [value, 'Submissions']}
                            />
                            <Line
                                type="monotone"
                                dataKey="submissions"
                                stroke="#3B82F6"
                                strokeWidth={2}
                                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Problem Statistics */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Problem Performance</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.problemStats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="problemId" />
                                <YAxis />
                                <Tooltip
                                    formatter={(value, name) => [
                                        name === 'acceptanceRate' ? `${value}%` : value,
                                        name === 'acceptanceRate' ? 'Acceptance Rate' : 'Submissions'
                                    ]}
                                />
                                <Bar dataKey="totalSubmissions" fill="#3B82F6" name="Total Submissions" />
                                <Bar dataKey="acceptedSubmissions" fill="#10B981" name="Accepted Submissions" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Participant Distribution by Experience */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Participants by Experience</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={Object.entries(analytics.participantDistribution.byExperience).map(([key, value]) => ({
                                        name: key,
                                        value
                                    }))}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {Object.entries(analytics.participantDistribution.byExperience).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detailed Problem Analysis */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Detailed Problem Analysis</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Problem
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Submissions
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acceptance Rate
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Avg Attempts
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    First Solve
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {analytics.problemStats.map((problem) => (
                                <tr key={problem.problemId} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">
                                                {problem.problemId}. {problem.title}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {problem.acceptedSubmissions} / {problem.totalSubmissions}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="text-sm text-gray-900 mr-2">
                                                {problem.acceptanceRate.toFixed(1)}%
                                            </div>
                                            <div className="w-16 bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-green-600 h-2 rounded-full"
                                                    style={{ width: `${problem.acceptanceRate}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {problem.averageAttempts.toFixed(1)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {problem.firstSolveTime ? formatTime(problem.firstSolveTime) : 'N/A'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Geographic Distribution */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Geographic Distribution</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {Object.entries(analytics.participantDistribution.byCountry).map(([country, count]) => (
                        <div key={country} className="text-center">
                            <div className="text-2xl font-bold text-gray-900">{count}</div>
                            <div className="text-sm text-gray-600">{country}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ContestAnalytics;