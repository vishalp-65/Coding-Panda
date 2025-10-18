import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  CheckCircle,
  Clock,
  Bookmark,
  BookmarkCheck,
  Star,
} from 'lucide-react';
import ModernFooter from '@/components/layout/ModernFooter';
import { getDifficultyColor } from '@/utils/problemHelpers';

interface Problem {
  id: string;
  title: string;
  number: number;
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
  const [sortBy, setSortBy] = useState<string>('title');

  // Memoize all tags to avoid recalculation
  const allTags = useMemo(() =>
    Array.from(new Set(problems.flatMap(p => p.tags))),
    [problems]
  );

  // Load problems when filters change
  useEffect(() => {
    loadProblems();
  }, [selectedDifficulty, selectedTags, selectedStatus, sortBy, searchTerm]);

  const loadProblems = useCallback(async () => {
    try {
      const searchParams = {
        search: searchTerm || undefined,
        difficulty: selectedDifficulty !== 'all' ? selectedDifficulty : undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        sortBy,
        page: 1,
        limit: 50,
      };

      // Remove undefined values
      const cleanParams = Object.fromEntries(
        Object.entries(searchParams).filter(([_, v]) => v !== undefined)
      );

      const { problemsApi } = await import('@/services/api');
      const data = await problemsApi.searchProblems(cleanParams);

      // Transform backend data to frontend format
      const transformedProblems: Problem[] =
        data.data?.map((p: any) => ({
          id: p.id,
          title: p.title,
          number: p.number,
          difficulty: p.difficulty,
          tags: p.tags || [],
          acceptance: p.statistics?.acceptanceRate || 0,
          frequency: Math.floor(Math.random() * 100),
          status: p.userStatus?.status || null,
          isBookmarked: p.userStatus?.isBookmarked || false,
          isPremium: p.isPremium || false,
        })) || [];

      setProblems(transformedProblems);
    } catch (error) {
      console.error('Error loading problems:', error);
      // Keep existing problems on error
    }
  }, [searchTerm, selectedDifficulty, selectedTags, selectedStatus, sortBy]);

  const getStatusIcon = useCallback((status: string | null) => {
    switch (status) {
      case 'solved':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'attempted':
        return <Clock className="h-4 w-4 text-yellow-400" />;
      default:
        return null;
    }
  }, []);

  // Memoize filtered problems
  const filteredProblems = useMemo(() => {
    return problems.filter(problem => {
      const matchesSearch =
        problem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        problem.tags.some(tag =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        );
      const matchesDifficulty =
        selectedDifficulty === 'all' || problem.difficulty === selectedDifficulty;
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some(tag => problem.tags.includes(tag));
      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'solved' && problem.status === 'solved') ||
        (selectedStatus === 'attempted' && problem.status === 'attempted') ||
        (selectedStatus === 'todo' && !problem.status);

      return matchesSearch && matchesDifficulty && matchesTags && matchesStatus;
    });
  }, [problems, searchTerm, selectedDifficulty, selectedTags, selectedStatus]);

  const toggleBookmark = useCallback((problemId: string) => {
    setProblems(prev =>
      prev.map(p =>
        p.id === problemId ? { ...p, isBookmarked: !p.isBookmarked } : p
      )
    );
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, []);

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
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Difficulty filter */}
            <select
              value={selectedDifficulty}
              onChange={e => setSelectedDifficulty(e.target.value)}
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
              onChange={e => setSelectedStatus(e.target.value)}
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
              onChange={e => setSortBy(e.target.value)}
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
          {allTags.length > 0 && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
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
          )}
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
              {filteredProblems.map(problem => (
                <div
                  key={problem.id}
                  className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-700/50 transition-all duration-200 ease-in-out"
                >
                  {/* Status */}
                  <div className="col-span-1 flex items-center">
                    {getStatusIcon(problem.status)}
                  </div>

                  {/* Title */}
                  <div className="col-span-4">
                    <Link
                      to={`/problems/${problem.number}`}
                      className="flex items-center space-x-2 hover:text-blue-400 transition-all duration-200 ease-in-out transform hover:scale-[1.02]"
                    >
                      <span className="font-medium">
                        {problem.number}. {problem.title}
                      </span>
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
                      {problem.difficulty.charAt(0).toUpperCase() +
                        problem.difficulty.slice(1)}
                    </span>
                  </div>

                  {/* Acceptance */}
                  <div className="col-span-2 flex items-center text-gray-300">
                    {problem.acceptance.toFixed(1)}%
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
                      <span className="text-sm text-gray-400">
                        {problem.frequency}
                      </span>
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
                      aria-label={problem.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
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
              <p className="text-gray-400">
                No problems found matching your criteria
              </p>
            </div>
          )}
        </div>
      </div>
      <ModernFooter />
    </div>
  );
};

export default ModernProblemsPage;