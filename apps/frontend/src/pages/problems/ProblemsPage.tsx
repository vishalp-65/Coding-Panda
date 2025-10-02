import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, BookmarkIcon, CheckCircle, Clock } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { fetchProblems, setSearchCriteria } from '@/store/slices/problemsSlice'

const ProblemsPage = () => {
  const dispatch = useAppDispatch()
  const { problems, searchCriteria, totalCount, isLoading } = useAppSelector(
    (state) => state.problems
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    dispatch(fetchProblems(searchCriteria))
  }, [dispatch, searchCriteria])

  const handleSearch = () => {
    dispatch(setSearchCriteria({
      ...searchCriteria,
      query: searchQuery,
      difficulty: selectedDifficulty,
      tags: selectedTags,
      page: 1,
    }))
  }

  const handlePageChange = (page: number) => {
    dispatch(setSearchCriteria({ ...searchCriteria, page }))
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-600 bg-green-100'
      case 'medium':
        return 'text-yellow-600 bg-yellow-100'
      case 'hard':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status?: string | null) => {
    switch (status) {
      case 'solved':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'attempted':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return null
    }
  }

  // Mock data for demonstration
  const mockProblems = [
    {
      id: '1',
      title: 'Two Sum',
      slug: 'two-sum',
      difficulty: 'easy',
      tags: ['Array', 'Hash Table'],
      statistics: { acceptanceRate: 49.5 },
      status: 'solved',
    },
    {
      id: '2',
      title: 'Add Two Numbers',
      slug: 'add-two-numbers',
      difficulty: 'medium',
      tags: ['Linked List', 'Math'],
      statistics: { acceptanceRate: 37.8 },
      status: 'attempted',
    },
    {
      id: '3',
      title: 'Longest Substring Without Repeating Characters',
      slug: 'longest-substring-without-repeating-characters',
      difficulty: 'medium',
      tags: ['Hash Table', 'String', 'Sliding Window'],
      statistics: { acceptanceRate: 33.8 },
      status: null,
    },
  ]

  const displayProblems = problems.length > 0 ? problems : mockProblems

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Problems</h1>
          <p className="text-gray-600">
            Solve coding problems to improve your skills
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {totalCount || displayProblems.length} problems
          </span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="card-content">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search problems..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="input pl-10"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-outline flex items-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </button>
            <button onClick={handleSearch} className="btn-primary">
              Search
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty
                  </label>
                  <div className="space-y-2">
                    {['easy', 'medium', 'hard'].map((difficulty) => (
                      <label key={difficulty} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedDifficulty.includes(difficulty)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDifficulty([...selectedDifficulty, difficulty])
                            } else {
                              setSelectedDifficulty(
                                selectedDifficulty.filter((d) => d !== difficulty)
                              )
                            }
                          }}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm capitalize">{difficulty}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <div className="space-y-2">
                    {['solved', 'attempted', 'unsolved'].map((status) => (
                      <label key={status} className="flex items-center">
                        <input
                          type="radio"
                          name="status"
                          className="border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm capitalize">{status}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Array', 'String', 'Hash Table', 'Dynamic Programming', 'Math'].map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          if (selectedTags.includes(tag)) {
                            setSelectedTags(selectedTags.filter((t) => t !== tag))
                          } else {
                            setSelectedTags([...selectedTags, tag])
                          }
                        }}
                        className={`px-3 py-1 text-xs rounded-full border ${
                          selectedTags.includes(tag)
                            ? 'bg-primary-100 text-primary-700 border-primary-300'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Problems List */}
      <div className="card">
        <div className="card-content p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading problems...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Difficulty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acceptance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayProblems.map((problem) => (
                    <tr key={problem.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center w-6">
                          {getStatusIcon(problem.status)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <Link
                            to={`/problems/${problem.id}`}
                            className="text-sm font-medium text-gray-900 hover:text-primary-600"
                          >
                            {problem.title}
                          </Link>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {problem.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(
                            problem.difficulty
                          )}`}
                        >
                          {problem.difficulty}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {problem.statistics.acceptanceRate}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button className="p-1 text-gray-400 hover:text-yellow-500">
                            <BookmarkIcon className="h-4 w-4" />
                          </button>
                          <Link
                            to={`/problems/${problem.id}`}
                            className="btn-outline text-xs"
                          >
                            Solve
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Showing 1 to {displayProblems.length} of {totalCount || displayProblems.length} problems
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange((searchCriteria.page || 1) - 1)}
            disabled={(searchCriteria.page || 1) <= 1}
            className="btn-outline text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded text-sm">
            {searchCriteria.page || 1}
          </span>
          <button
            onClick={() => handlePageChange((searchCriteria.page || 1) + 1)}
            className="btn-outline text-sm"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProblemsPage