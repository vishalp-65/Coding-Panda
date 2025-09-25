import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Search,
    Filter,
    CheckCircle,
    Clock,
    Bookmark,
    BookmarkCheck,
    TrendingUp,
    Star,
    Users
} from 'lucide-react';
import ModernFooter from '@/components/layout/ModernFooter';

interface Problem {
    id: string;
    title: string;
    difficulty: 'easy' | 'medium' | 'hard';
    tags: string[];
    acceptance: number;
    frequency: number;
    status: 'solved' | 'attempted' | null;
    isBookmarked: boolean;
    isPremium: boolean;
}

const ModernProblemsPage = () => {
    const [problems, setProblems] = useState<Problem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('id');

    const allTags = Array.from(new Set(problems.flatMap(p => p.tags)));

    useEffect(() => {
        loadProblems();
    }, [selectedDifficulty, selectedTags, selectedStatus, sortBy, searchTerm]);

    const loadProblems = async () => {
        try {
            const searchParams = {
                search: searchTerm,
                difficulty: selectedDifficulty !== 'all' ? selectedDifficulty : undefined,
                tags: selectedTags.length > 0 ? selectedTags : undefined,
                status: selectedStatus !== 'all' ? selectedStatus : undefined,
                sortBy: sortBy,
                page: 1,
                limit: 50
            };

            // Remove undefined values
            const cleanParams = Object.fromEntries(
                Object.entries(searchParams).filter(([_, v]) => v !== undefined)
            );

            // Use the API service
            const { problemsApi } = await import('@/services/api');
            const data = await problemsApi.searchProblems(cleanParams);

            // Transform backend data to frontend format
            const transformedProblems: Problem[] = data.problems?.map((p: any) => ({
                id: p.id,
                title: p.title,
                difficulty: p.difficulty,
                tags: p.tags || [],
                acceptance: p.statistics?.acceptanceRate || 0,
                frequency: Math.floor(Math.random() * 100), // Mock frequency for now
                status: p.userStatus?.status || null,
                isBookmarked: p.userStatus?.isBookmarked || false,
                isPremium: p.isPremium || false,
            })) || [];

            setProblems(transformedProblems);
        } catch (error) {
            console.error('Error loading problems:', error);
            // Fallback to mock data if API fails
            const mockProblems: Problem[] = [
                {
                    id: '1',
                    title: 'Two Sum',
                    difficulty: 'easy',
                    tags: ['Array', 'Hash Table'],
                    acceptance: 49.5,
                    frequency: 85,
                    status: 'solved',
                    isBookmarked: false,
                    isPremium: false,
                },
                {
                    id: '2',
                    title: 'Add Two Numbers',
                    difficulty: 'medium',
                    tags: ['Linked List', 'Math', 'Recursion'],
                    acceptance: 38.2,
                    frequency: 72,
                    status: 'attempted',
                    isBookmarked: true,
                    isPremium: false,
                },
                {
                    id: '3',
                    title: 'Longest Substring Without Repeating Characters',
                    difficulty: 'medium',
                    tags: ['Hash Table', 'String', 'Sliding Window'],
                    acceptance: 33.8,
                    frequency: 91,
                    status: null,
                    isBookmarked: false,
                    isPremium: false,
                },
                {
                    id: '4',
                    title: 'Median of Two Sorted Arrays',
                    difficulty: 'hard',
                    tags: ['Array', 'Binary Search', 'Divide and Conquer'],
                    acceptance: 35.2,
                    frequency: 68,
                    status: null,
                    isBookmarked: false,
                    isPremium: true,
                },
            ];
            setProblems(mockProblems);
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return 'text-green-400';
            case 'medium': return 'text-yellow-400';
            case 'hard': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    const getStatusIcon = (status: string | null) => {
        switch (status) {
            case 'solved':
                return <CheckCircle className="h-4 w-4 text-green-400" />;
            case 'attempted':
                return <Clock className="h-4 w-4 text-yellow-400" />;
            default:
                return null;
        }
    };

    const filteredProblems = problems.filter(problem => {
        const matchesSearch = problem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            problem.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesDifficulty = selectedDifficulty === 'all' || problem.difficulty === selectedDifficulty;
        const matchesTags = selectedTags.length === 0 || selectedTags.some(tag => problem.tags.includes(tag));
        const matchesStatus = selectedStatus === 'all' ||
            (selectedStatus === 'solved' && problem.status === 'solved') ||
            (selectedStatus === 'attempted' && problem.status === 'attempted') ||
            (selectedStatus === 'todo' && !problem.status);

        return matchesSearch && matchesDifficulty && matchesTags && matchesStatus;
    });

    const toggleBookmark = (problemId: string) => {
        setProblems(prev => prev.map(p =>
            p.id === problemId ? { ...p, isBookmarked: !p.isBookmarked } : p
        ));
    };

    return (
        <div className="h-full bg-gray-900 text-white">
            {/* Header */}
            <div className="p-6 border-b border-gray-700">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-2xl font-bold mb-6">Problems</h1>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-4 items-center">
                        {/* Search */}
                        <div className="relative flex-1 min-w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search problems..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Difficulty filter */}
                        <select
                            value={selectedDifficulty}
                            onChange={(e) => setSelectedDifficulty(e.target.value)}
                            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Difficulties</option>
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                        </select>

                        {/* Status filter */}
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Status</option>
                            <option value="solved">Solved</option>
                            <option value="attempted">Attempted</option>
                            <option value="todo">Todo</option>
                        </select>

                        {/* Sort */}
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="id">Default</option>
                            <option value="title">Title</option>
                            <option value="difficulty">Difficulty</option>
                            <option value="acceptance">Acceptance</option>
                            <option value="frequency">Frequency</option>
                        </select>
                    </div>

                    {/* Tags filter */}
                    <div className="mt-4">
                        <div className="flex flex-wrap gap-2">
                            {allTags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => {
                                        setSelectedTags(prev =>
                                            prev.includes(tag)
                                                ? prev.filter(t => t !== tag)
                                                : [...prev, tag]
                                        );
                                    }}
                                    className={`px-3 py-1 rounded-full text-sm transition-colors ${selectedTags.includes(tag)
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Problems list */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto p-6">
                    <div className="bg-gray-800 rounded-lg overflow-hidden">
                        {/* Table header */}
                        <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-700 text-sm font-medium text-gray-400">
                            <div className="col-span-1">Status</div>
                            <div className="col-span-4">Title</div>
                            <div className="col-span-2">Difficulty</div>
                            <div className="col-span-2">Acceptance</div>
                            <div className="col-span-2">Frequency</div>
                            <div className="col-span-1">Actions</div>
                        </div>

                        {/* Problems */}
                        <div className="divide-y divide-gray-700">
                            {filteredProblems.map((problem) => (
                                <div
                                    key={problem.id}
                                    className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-700/50 transition-colors"
                                >
                                    {/* Status */}
                                    <div className="col-span-1 flex items-center">
                                        {getStatusIcon(problem.status)}
                                    </div>

                                    {/* Title */}
                                    <div className="col-span-4">
                                        <Link
                                            to={`/problems/${problem.id}`}
                                            className="flex items-center space-x-2 hover:text-blue-400 transition-colors"
                                        >
                                            <span className="font-medium">{problem.id}. {problem.title}</span>
                                            {problem.isPremium && (
                                                <Star className="h-4 w-4 text-yellow-400" />
                                            )}
                                        </Link>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {problem.tags.map(tag => (
                                                <span
                                                    key={tag}
                                                    className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Difficulty */}
                                    <div className="col-span-2 flex items-center">
                                        <span className={`font-medium ${getDifficultyColor(problem.difficulty)}`}>
                                            {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
                                        </span>
                                    </div>

                                    {/* Acceptance */}
                                    <div className="col-span-2 flex items-center text-gray-300">
                                        {problem.acceptance}%
                                    </div>

                                    {/* Frequency */}
                                    <div className="col-span-2 flex items-center">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-16 bg-gray-700 rounded-full h-2">
                                                <div
                                                    className="bg-blue-500 h-2 rounded-full"
                                                    style={{ width: `${problem.frequency}%` }}
                                                />
                                            </div>
                                            <span className="text-sm text-gray-400">{problem.frequency}</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="col-span-1 flex items-center">
                                        <button
                                            onClick={() => toggleBookmark(problem.id)}
                                            className={`p-1 rounded transition-colors ${problem.isBookmarked
                                                ? 'text-blue-400 hover:text-blue-300'
                                                : 'text-gray-400 hover:text-gray-300'
                                                }`}
                                        >
                                            {problem.isBookmarked ? (
                                                <BookmarkCheck className="h-4 w-4" />
                                            ) : (
                                                <Bookmark className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {filteredProblems.length === 0 && (
                        <div className="text-center py-12">
                            <Search className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                            <p className="text-gray-400">No problems found matching your criteria</p>
                        </div>
                    )}
                </div>
            </div>
            <ModernFooter />
        </div>
    );
};

export default ModernProblemsPage;