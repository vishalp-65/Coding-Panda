import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Clock, Users, Trophy } from 'lucide-react'
import { contestApi } from '@/services/api'
import toast from 'react-hot-toast'

interface Contest {
  id: string
  title: string
  description: string
  startTime: string
  endTime: string
  duration: number
  participants: number
  status: 'upcoming' | 'live' | 'ended'
  difficulty: 'easy' | 'medium' | 'hard'
}

const ContestsPage = () => {
  const [contests, setContests] = useState<Contest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'live' | 'ended'>('all')

  useEffect(() => {
    fetchContests()
  }, [])

  const fetchContests = async () => {
    try {
      setIsLoading(true)
      const response = await contestApi.getContests()
      setContests(response)
    } catch (error) {
      console.error('Failed to fetch contests:', error)
      // Use mock data as fallback
      setContests([
        {
          id: '1',
          title: 'Weekly Contest 123',
          description: 'Test your algorithmic skills in this weekly contest',
          startTime: '2024-02-15T10:00:00Z',
          endTime: '2024-02-15T11:30:00Z',
          duration: 90,
          participants: 1250,
          status: 'upcoming',
          difficulty: 'medium',
        },
        {
          id: '2',
          title: 'Biweekly Contest 45',
          description: 'Challenge yourself with advanced problems',
          startTime: '2024-02-10T14:00:00Z',
          endTime: '2024-02-10T16:00:00Z',
          duration: 120,
          participants: 890,
          status: 'ended',
          difficulty: 'hard',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinContest = async (contestId: string) => {
    try {
      await contestApi.joinContest(contestId)
      toast.success('Successfully joined contest!')
      fetchContests() // Refresh data
    } catch (error: any) {
      toast.error(error.message || 'Failed to join contest')
    }
  }

  const filteredContests = contests.filter(contest => 
    filter === 'all' || contest.status === filter
  )

  const getStatusColor = (status: Contest['status']) => {
    switch (status) {
      case 'live':
        return 'bg-green-100 text-green-800'
      case 'upcoming':
        return 'bg-blue-100 text-blue-800'
      case 'ended':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyColor = (difficulty: Contest['difficulty']) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-600'
      case 'medium':
        return 'text-yellow-600'
      case 'hard':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Contests</h1>
        </div>
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Contests</h1>
        <div className="flex space-x-2">
          {(['all', 'upcoming', 'live', 'ended'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === status
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6">
        {filteredContests.map((contest) => (
          <div key={contest.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {contest.title}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(contest.status)}`}>
                    {contest.status}
                  </span>
                  <span className={`text-sm font-medium ${getDifficultyColor(contest.difficulty)}`}>
                    {contest.difficulty}
                  </span>
                </div>
                <p className="text-gray-600 mb-4">{contest.description}</p>
              </div>
              <div className="flex space-x-2">
                {contest.status === 'upcoming' && (
                  <button
                    onClick={() => handleJoinContest(contest.id)}
                    className="btn-primary"
                  >
                    Join Contest
                  </button>
                )}
                {contest.status === 'live' && (
                  <Link to={`/contests/${contest.id}`} className="btn-primary">
                    Enter Contest
                  </Link>
                )}
                {contest.status === 'ended' && (
                  <Link to={`/contests/${contest.id}/results`} className="btn-secondary">
                    View Results
                  </Link>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {new Date(contest.startTime).toLocaleDateString()}
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {contest.duration} minutes
              </div>
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                {contest.participants} participants
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredContests.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No contests found</h3>
          <p className="text-gray-500">
            {filter === 'all' 
              ? 'There are no contests available at the moment.'
              : `There are no ${filter} contests at the moment.`
            }
          </p>
        </div>
      )}
    </div>
  )
}

export default ContestsPage