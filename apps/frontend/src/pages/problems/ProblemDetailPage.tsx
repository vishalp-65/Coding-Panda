import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { History, Code } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { fetchProblemById, bookmarkProblem, unbookmarkProblem } from '@/store/slices/problemsSlice'
import ProblemDisplay from '@/components/problemSolving/ProblemDisplay'
import CodeEditorPanel from '@/components/problemSolving/CodeEditorPanel'
import TestResultsPanel from '@/components/problemSolving/TestResultsPanel'
import HintSystem from '@/components/problemSolving/HintSystem'
import AIFeedbackPanel from '@/components/problemSolving/AIFeedbackPanel'
import SubmissionHistory from '@/components/problemSolving/SubmissionHistory'
import { ExecutionResult, Hint, AIFeedback, Submission } from '@/types/problemSolving'
import { problemsApi } from '@/services/api'
import toast from 'react-hot-toast'

const ProblemDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()
  const { currentProblem, isLoading, bookmarkedProblems } = useAppSelector((state) => state.problems)

  // Code editor state
  const [selectedLanguage, setSelectedLanguage] = useState('javascript')
  const [code, setCode] = useState('')

  // UI state
  const [activeTab, setActiveTab] = useState<'description' | 'editorial' | 'submissions' | 'discussion'>('description')
  const [rightPanelTab, setRightPanelTab] = useState<'editor' | 'history'>('editor')

  // Execution state
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showTestResults, setShowTestResults] = useState(false)

  // AI features state
  const [hints, setHints] = useState<Hint[]>([])
  const [aiFeedback, setAIFeedback] = useState<AIFeedback | null>(null)
  const [isLoadingHint, setIsLoadingHint] = useState(false)
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false)
  const [showAIFeedback, setShowAIFeedback] = useState(false)

  // Submission history state
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false)

  // Mock problem data for development
  const mockProblem = {
    id: '1',
    title: 'Two Sum',
    slug: 'two-sum',
    difficulty: 'easy' as const,
    description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

**Example 1:**
\`\`\`
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
\`\`\`

**Example 2:**
\`\`\`
Input: nums = [3,2,4], target = 6
Output: [1,2]
\`\`\`

**Example 3:**
\`\`\`
Input: nums = [3,3], target = 6
Output: [0,1]
\`\`\``,
    tags: ['Array', 'Hash Table'],
    constraints: {
      timeLimit: 1000,
      memoryLimit: 256,
      inputFormat: 'Array of integers and target integer',
      outputFormat: 'Array of two indices'
    },
    testCases: [
      { input: 'nums = [2,7,11,15], target = 9', expectedOutput: '[0,1]', isHidden: false },
      { input: 'nums = [3,2,4], target = 6', expectedOutput: '[1,2]', isHidden: false },
      { input: 'nums = [3,3], target = 6', expectedOutput: '[0,1]', isHidden: false },
    ],
    statistics: {
      totalSubmissions: 1000000,
      acceptedSubmissions: 495000,
      acceptanceRate: 49.5,
    },
    status: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }

  useEffect(() => {
    if (id) {
      dispatch(fetchProblemById(id))
      loadSubmissionHistory()
    }
  }, [dispatch, id])

  const problem = currentProblem || mockProblem
  const isBookmarked = bookmarkedProblems.includes(problem.id)

  const loadSubmissionHistory = async () => {
    if (!id) return

    setIsLoadingSubmissions(true)
    try {
      // Mock submissions for development
      const mockSubmissions: Submission[] = [
        {
          id: '1',
          problemId: id,
          userId: 'user1',
          code: 'function twoSum(nums, target) {\n  // Previous attempt\n  return [];\n}',
          language: 'javascript',
          status: 'wrong_answer',
          executionTime: 150,
          memoryUsed: 1024,
          submittedAt: '2024-01-01T10:00:00Z',
          testResults: [
            { input: '[2,7,11,15], 9', expected: '[0,1]', actual: '[]', passed: false }
          ]
        },
        {
          id: '2',
          problemId: id,
          userId: 'user1',
          code: 'function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    map.set(nums[i], i);\n  }\n  return [];\n}',
          language: 'javascript',
          status: 'accepted',
          executionTime: 85,
          memoryUsed: 2048,
          submittedAt: '2024-01-01T11:00:00Z',
          testResults: [
            { input: '[2,7,11,15], 9', expected: '[0,1]', actual: '[0,1]', passed: true },
            { input: '[3,2,4], 6', expected: '[1,2]', actual: '[1,2]', passed: true }
          ]
        }
      ]
      setSubmissions(mockSubmissions)
    } catch (error) {
      console.error('Error loading submissions:', error)
      toast.error('Failed to load submission history')
    } finally {
      setIsLoadingSubmissions(false)
    }
  }

  const handleRunCode = async () => {
    if (!code.trim()) {
      toast.error('Please write some code first')
      return
    }

    setIsRunning(true)
    setShowTestResults(false)

    try {
      // Mock API call to run code
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Mock execution result
      const mockResult: ExecutionResult = {
        status: 'success',
        executionTime: 125,
        memoryUsed: 1536,
        testResults: [
          { input: 'nums = [2,7,11,15], target = 9', expected: '[0,1]', actual: '[0,1]', passed: true, executionTime: 45, memoryUsed: 512 },
          { input: 'nums = [3,2,4], target = 6', expected: '[1,2]', actual: '[1,2]', passed: true, executionTime: 38, memoryUsed: 480 },
          { input: 'nums = [3,3], target = 6', expected: '[0,1]', actual: '[0,1]', passed: true, executionTime: 42, memoryUsed: 544 },
        ]
      }

      setExecutionResult(mockResult)
      setShowTestResults(true)
      toast.success('Code executed successfully!')
    } catch (error) {
      console.error('Error running code:', error)
      toast.error('Failed to execute code')
    } finally {
      setIsRunning(false)
    }
  }

  const handleSubmit = async () => {
    if (!code.trim()) {
      toast.error('Please write some code first')
      return
    }

    setIsSubmitting(true)

    try {
      // Mock API call to submit solution
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Create new submission
      const newSubmission: Submission = {
        id: Date.now().toString(),
        problemId: problem.id,
        userId: 'current-user',
        code,
        language: selectedLanguage,
        status: 'accepted',
        executionTime: 95,
        memoryUsed: 1800,
        submittedAt: new Date().toISOString(),
        testResults: [
          { input: 'nums = [2,7,11,15], target = 9', expected: '[0,1]', actual: '[0,1]', passed: true },
          { input: 'nums = [3,2,4], target = 6', expected: '[1,2]', actual: '[1,2]', passed: true },
          { input: 'nums = [3,3], target = 6', expected: '[0,1]', actual: '[0,1]', passed: true },
        ]
      }

      setSubmissions(prev => [newSubmission, ...prev])
      toast.success('Solution submitted successfully!')
    } catch (error) {
      console.error('Error submitting solution:', error)
      toast.error('Failed to submit solution')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRequestHint = async () => {
    setIsLoadingHint(true)

    try {
      // Mock API call to get AI hint
      await new Promise(resolve => setTimeout(resolve, 1500))

      const nextLevel = hints.length + 1
      const mockHint: Hint = {
        id: `hint-${nextLevel}`,
        level: nextLevel,
        content: nextLevel === 1
          ? "Consider using a hash map to store numbers you've seen and their indices. This allows O(1) lookup time."
          : nextLevel === 2
            ? "For each number, calculate what its complement should be (target - current number) and check if you've seen it before."
            : "Iterate through the array once, storing each number and its index in the hash map as you go.",
        type: nextLevel === 1 ? 'conceptual' : nextLevel === 2 ? 'implementation' : 'optimization',
        revealed: false
      }

      setHints(prev => [...prev, mockHint])
      toast.success('New hint generated!')
    } catch (error) {
      console.error('Error getting hint:', error)
      toast.error('Failed to generate hint')
    } finally {
      setIsLoadingHint(false)
    }
  }

  const handleRevealHint = (hintId: string) => {
    setHints(prev => prev.map(hint =>
      hint.id === hintId ? { ...hint, revealed: true } : hint
    ))
  }

  const handleGetAIFeedback = async () => {
    if (!code.trim()) {
      toast.error('Please write some code first')
      return
    }

    setIsLoadingFeedback(true)

    try {
      // Mock API call to get AI feedback
      await new Promise(resolve => setTimeout(resolve, 2000))

      const mockFeedback: AIFeedback = {
        codeQuality: {
          score: 85,
          suggestions: [
            'Consider adding input validation for edge cases',
            'Variable names are clear and descriptive',
            'Good use of modern JavaScript features'
          ]
        },
        complexity: {
          time: 'O(n)',
          space: 'O(n)',
          analysis: 'The algorithm uses a hash map for O(1) lookups, resulting in linear time complexity. Space complexity is also linear due to the hash map storage.'
        },
        security: {
          issues: []
        },
        performance: {
          suggestions: [
            'The current solution is already optimal for this problem',
            'Consider using Map instead of object for better performance with large datasets'
          ],
          bottlenecks: []
        },
        explanation: 'This solution uses the two-pointer technique with a hash map. It iterates through the array once, storing each number and its index. For each element, it calculates the complement needed to reach the target and checks if it exists in the hash map.'
      }

      setAIFeedback(mockFeedback)
      setShowAIFeedback(true)
      toast.success('AI feedback generated!')
    } catch (error) {
      console.error('Error getting AI feedback:', error)
      toast.error('Failed to generate AI feedback')
    } finally {
      setIsLoadingFeedback(false)
    }
  }

  const handleBookmark = async () => {
    try {
      if (isBookmarked) {
        await dispatch(unbookmarkProblem(problem.id)).unwrap()
        toast.success('Problem removed from bookmarks')
      } else {
        await dispatch(bookmarkProblem(problem.id)).unwrap()
        toast.success('Problem bookmarked!')
      }
    } catch (error) {
      toast.error('Failed to update bookmark')
    }
  }

  const handleViewSubmission = (submission: Submission) => {
    setCode(submission.code)
    setSelectedLanguage(submission.language)
    setRightPanelTab('editor')
    toast.success('Submission loaded in editor')
  }

  const handleCompareSubmissions = (submission1: Submission, submission2: Submission) => {
    // This would open a comparison modal/page
    toast.success('Comparison feature coming soon!')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        {/* Left Panel - Problem Description */}
        <div className="flex flex-col space-y-4">
          <ProblemDisplay
            problem={problem}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onBookmark={handleBookmark}
            isBookmarked={isBookmarked}
          />

          {/* Hints System */}
          <HintSystem
            hints={hints}
            onRevealHint={handleRevealHint}
            onRequestMoreHints={handleRequestHint}
            isLoading={isLoadingHint}
          />
        </div>

        {/* Right Panel - Code Editor and History */}
        <div className="flex flex-col space-y-4">
          {/* Tab Switcher */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setRightPanelTab('editor')}
              className={`px-4 py-2 text-sm font-medium flex items-center space-x-2 ${rightPanelTab === 'editor'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <Code className="h-4 w-4" />
              <span>Code Editor</span>
            </button>
            <button
              onClick={() => setRightPanelTab('history')}
              className={`px-4 py-2 text-sm font-medium flex items-center space-x-2 ${rightPanelTab === 'history'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <History className="h-4 w-4" />
              <span>Submissions ({submissions.length})</span>
            </button>
          </div>

          {/* Panel Content */}
          {rightPanelTab === 'editor' ? (
            <CodeEditorPanel
              code={code}
              language={selectedLanguage}
              onCodeChange={setCode}
              onLanguageChange={setSelectedLanguage}
              onRun={handleRunCode}
              onSubmit={handleSubmit}
              onRequestHint={handleRequestHint}
              onGetAIFeedback={handleGetAIFeedback}
              isRunning={isRunning}
              isSubmitting={isSubmitting}
              isLoadingHint={isLoadingHint}
              isLoadingFeedback={isLoadingFeedback}
            />
          ) : (
            <SubmissionHistory
              submissions={submissions}
              onViewSubmission={handleViewSubmission}
              onCompareSubmissions={handleCompareSubmissions}
              isLoading={isLoadingSubmissions}
            />
          )}
        </div>
      </div>

      {/* Bottom Panel - Test Results */}
      <TestResultsPanel
        executionResult={executionResult}
        isVisible={showTestResults}
      />

      {/* AI Feedback Modal/Panel */}
      {showAIFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <AIFeedbackPanel
              feedback={aiFeedback}
              isVisible={showAIFeedback}
              onClose={() => setShowAIFeedback(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ProblemDetailPage