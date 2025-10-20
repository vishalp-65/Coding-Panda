// pages/ModernProblemsPage.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  CheckCircle,
  Clock,
  Bookmark,
  BookmarkCheck,
  Star,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import ModernFooter from '@/components/layout/ModernFooter';
import { getDifficultyColor } from '@/utils/problemHelpers';
import { useDebounce } from '@/hooks/useDebounce';
import Pagination from '@/components/Pagination';
import { Problem, ProblemPagination } from '@/types/problemSolving';

const ITEMS_PER_PAGE = 20;

const ModernProblemsPage = () => {
  // State management
  const [problems, setProblems] = useState<Problem[]>([]);
  const [pagination, setPagination] = useState<ProblemPagination>({
    totalProblems: 0,
    page: 1,
    limit: ITEMS_PER_PAGE,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Debounce search to reduce API calls
  const debouncedSearch = useDebounce<string>(searchTerm, 500);

  // Memoize all available tags
  const allTags = useMemo(
    () => Array.from(new Set(problems.flatMap(p => p.tags))),
    [problems]
  );

  // Map frontend sortBy values to backend expected values
  const getSortByValue = useCallback((value: string) => {
    const sortMapping: Record<string, string> = {
      id: 'created_at',
      title: 'title',
      difficulty: 'difficulty',
      acceptance: 'acceptance_rate',
      frequency: 'created_at', // Frequency not in backend, fallback to created_at
    };
    return sortMapping[value] || 'created_at';
  }, []);

  // Load problems from API
  const loadProblems = useCallback(
    async (abortSignal?: AbortSignal) => {
      try {
        setLoading(true);
        setError(null);

        const params: Record<string, any> = {
          page: pagination.page,
          limit: pagination.limit,
          sortBy: getSortByValue(sortBy),
          sortOrder,
        };

        // Add optional filters
        if (debouncedSearch) params.query = debouncedSearch;
        if (selectedDifficulty !== 'all')
          params.difficulty = selectedDifficulty;
        if (selectedTags.length > 0) params.tags = selectedTags;
        if (selectedStatus !== 'all') {
          params.status =
            selectedStatus === 'todo' ? 'unsolved' : selectedStatus;
        }

        const { problemsApi } = await import('@/services/api');
        const response = await problemsApi.searchProblems(params);

        if (!response.data) {
          throw new Error('Invalid response from server');
        }

        // Transform backend data
        const transformedProblems: Problem[] = response.data.map((p: any) => ({
          id: p.id,
          title: p.title,
          number: p.number,
          difficulty: p.difficulty,
          tags: p.tags || [],
          acceptance: p.statistics?.acceptanceRate || 0,
          frequency: Math.floor(Math.random() * 100), // Mock frequency
          status: p.userStatus?.status || null,
          isBookmarked: p.userStatus?.isBookmarked || false,
          isPremium: p.isPremium || false,
        }));

        setProblems(transformedProblems);
        setPagination({
          totalProblems: response.pagination?.totalProblems || 0,
          page: response.pagination?.page || 1,
          limit: response.pagination?.limit || ITEMS_PER_PAGE,
          totalPages: response.pagination?.totalPages || 0,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error loading problems:', err);
          setError(err.message || 'Failed to load problems');
        }
      } finally {
        setLoading(false);
      }
    },
    [
      pagination.page,
      pagination.limit,
      debouncedSearch,
      selectedDifficulty,
      selectedTags,
      selectedStatus,
      sortBy,
      sortOrder,
      getSortByValue,
    ]
  );

  // Load problems with abort controller for cleanup
  useEffect(() => {
    const controller = new AbortController();
    loadProblems(controller.signal);
    return () => controller.abort();
  }, [loadProblems]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [
    debouncedSearch,
    selectedDifficulty,
    selectedTags,
    selectedStatus,
    sortBy,
    sortOrder,
  ]);

  // Handlers
  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const toggleBookmark = useCallback(async (problemId: string) => {
    setProblems(prev =>
      prev.map(p =>
        p.id === problemId ? { ...p, isBookmarked: !p.isBookmarked } : p
      )
    );
    // TODO: Call API to persist bookmark
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleSort = useCallback((column: string) => {
    setSortBy(prev => {
      if (prev === column) {
        setSortOrder(order => (order === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortOrder('asc');
      return column;
    });
  }, []);

  const getSortIcon = useCallback(
    (column: string) => {
      if (sortBy !== column) {
        return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
      }
      return sortOrder === 'asc' ? (
        <ArrowUp className="h-3 w-3 ml-1" />
      ) : (
        <ArrowDown className="h-3 w-3 ml-1" />
      );
    },
    [sortBy, sortOrder]
  );

  const getStatusIcon = useCallback((status: string | null) => {
    switch (status) {
      case 'solved':
        return (
          <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
        );
      case 'attempted':
        return (
          <Clock className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
        );
      default:
        return <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />;
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-200">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto p-6">
          <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
            Problems
          </h1>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="search"
                placeholder="Search problems..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent transition-colors duration-200"
                aria-label="Search problems"
              />
            </div>

            {/* Difficulty filter */}
            <select
              value={selectedDifficulty}
              onChange={e => setSelectedDifficulty(e.target.value)}
              className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition-colors duration-200"
              aria-label="Filter by difficulty"
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
              className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition-colors duration-200"
              aria-label="Filter by status"
            >
              <option value="all">All Status</option>
              <option value="solved">Solved</option>
              <option value="attempted">Attempted</option>
              <option value="todo">Todo</option>
            </select>
          </div>

          {/* Tags filter */}
          {allTags.length > 0 && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {allTags.slice(0, 15).map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedTags.includes(tag)
                        ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-md'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                    aria-pressed={selectedTags.includes(tag)}
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
      <div className="flex-1">
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <div className="col-span-1">Status</div>
              <button
                onClick={() => handleSort('title')}
                className="col-span-4 text-left flex items-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Title {getSortIcon('title')}
              </button>
              <button
                onClick={() => handleSort('difficulty')}
                className="col-span-2 text-left flex items-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Difficulty {getSortIcon('difficulty')}
              </button>
              <button
                onClick={() => handleSort('acceptance')}
                className="col-span-2 text-left flex items-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Acceptance {getSortIcon('acceptance')}
              </button>
              <div className="col-span-2">Frequency</div>
              <div className="col-span-1">Actions</div>
            </div>

            {/* Loading state */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
              </div>
            )}

            {/* Error state */}
            {error && !loading && (
              <div className="text-center py-12">
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <button
                  onClick={() => loadProblems()}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Problems */}
            {!loading && !error && (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {problems.map(problem => (
                  <div
                    key={problem.id}
                    className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all duration-200"
                  >
                    {/* Status */}
                    <div className="col-span-1 flex items-center">
                      {getStatusIcon(problem.status)}
                    </div>

                    {/* Title */}
                    <div className="col-span-4">
                      <Link
                        to={`/problems/${problem.number}`}
                        className="flex items-center space-x-2 font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                      >
                        <span>{problem.title}</span>
                        {problem.isPremium && (
                          <Star className="h-4 w-4 text-yellow-500 dark:text-yellow-400 fill-current" />
                        )}
                      </Link>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {problem.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Difficulty */}
                    <div className="col-span-2 flex items-center">
                      <span
                        className={`font-semibold ${getDifficultyColor(problem.difficulty)}`}
                      >
                        {problem.difficulty.charAt(0).toUpperCase() +
                          problem.difficulty.slice(1)}
                      </span>
                    </div>

                    {/* Acceptance */}
                    <div className="col-span-2 flex items-center text-gray-600 dark:text-gray-400">
                      {problem.acceptance.toFixed(1)}%
                    </div>

                    {/* Frequency */}
                    <div className="col-span-2 flex items-center">
                      <div className="flex items-center space-x-2 w-full">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 dark:bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${problem.frequency}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400 w-8">
                          {problem.frequency}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center">
                      <button
                        onClick={() => toggleBookmark(problem.id)}
                        className={`p-1 rounded transition-colors duration-200 ${
                          problem.isBookmarked
                            ? 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'
                            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
                        }`}
                        aria-label={
                          problem.isBookmarked
                            ? 'Remove bookmark'
                            : 'Add bookmark'
                        }
                      >
                        {problem.isBookmarked ? (
                          <BookmarkCheck className="h-5 w-5" />
                        ) : (
                          <Bookmark className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && problems.length === 0 && (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No problems found matching your criteria
                </p>
              </div>
            )}

            {/* Pagination */}
            {!loading && !error && problems.length > 0 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                totalItems={pagination.totalProblems}
                itemsPerPage={pagination.limit}
              />
            )}
          </div>
        </div>
      </div>

      <ModernFooter />
    </div>
  );
};

export default ModernProblemsPage;
