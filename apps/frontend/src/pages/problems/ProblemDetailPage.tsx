import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Play, Send, BookmarkIcon, ThumbsUp, MessageSquare, Lightbulb } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { fetchProblemById } from '@/store/slices/problemsSlice'
import CodeEditor from '@/components/editor/CodeEditor'

const ProblemDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()
  const { currentProblem, isLoading } = useAppSelector((state) => state.problems)
  
  const [selectedLanguage, setSelectedLanguage] = useState('javascript')
  const [code, setCode] = useState('')
  const [activeTab, setActiveTab] = useState<'description' | 'editorial' | 'submissions'>('description')
  const [testResults, setTestResults] = useState<any[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
  ]

  const codeTemplates = {
    javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    // Your code here
};`,
    python: `def two_sum(nums, target):
    """
    :type nums: List[int]
    :type target: int
    :rtype: List[int]
    """
    # Your code here
    pass`,
    java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Your code here
        return new int[0];
    }
}`,
    cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Your code here
        return {};
    }
};`,
    go: `func twoSum(nums []int, target int) []int {
    // Your code here
    return []int{}
}`,
    rust: `impl Solution {
    pub fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {
        // Your code here
        vec![]
    }
}`,
  }

  // Mock problem data
  const mockProblem = {
    id: '1',
    title: 'Two Sum',
    difficulty: 'easy',
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
\`\`\`

**Constraints:**
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- -10^9 <= target <= 10^9
- Only one valid answer exists.`,
    tags: ['Array', 'Hash Table'],
    statistics: {
      totalSubmissions: 1000000,
      acceptedSubmissions: 495000,
      acceptanceRate: 49.5,
    },
    testCases: [
      { input: 'nums = [2,7,11,15], target = 9', expectedOutput: '[0,1]' },
      { input: 'nums = [3,2,4], target = 6', expectedOutput: '[1,2]' },
      { input: 'nums = [3,3], target = 6', expectedOutput: '[0,1]' },
    ],
  }

  useEffect(() => {
    if (id) {
      dispatch(fetchProblemById(id))
    }
  }, [dispatch, id])

  useEffect(() => {
    // Set initial code template when language changes
    setCode(codeTemplates[selectedLanguage as keyof typeof codeTemplates] || '')
  }, [selectedLanguage])

  const problem = currentProblem || mockProblem

  const handleRunCode = async () => {
    setIsRunning(true)
    try {
      // Mock API call to run code
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock test results
      setTestResults([
        { input: 'nums = [2,7,11,15], target = 9', expected: '[0,1]', actual: '[0,1]', passed: true },
        { input: 'nums = [3,2,4], target = 6', expected: '[1,2]', actual: '[1,2]', passed: true },
        { input: 'nums = [3,3], target = 6', expected: '[0,1]', actual: '[0,1]', passed: true },
      ])
    } catch (error) {
      console.error('Error running code:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // Mock API call to submit solution
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Show success message
      alert('Solution submitted successfully!')
    } catch (error) {
      console.error('Error submitting solution:', error)
    } finally {
      setIsSubmitting(false)
    }
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-8rem)]">
      {/* Problem Description */}
      <div className="flex flex-col">
        <div className="card flex-1 flex flex-col">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h1 className="text-xl font-bold text-gray-900">{problem.title}</h1>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(
                    problem.difficulty
                  )}`}
                >
                  {problem.difficulty}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-yellow-500">
                  <BookmarkIcon className="h-4 w-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-green-500">
                  <ThumbsUp className="h-4 w-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-blue-500">
                  <MessageSquare className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>Acceptance Rate: {problem.statistics.acceptanceRate}%</span>
              <span>•</span>
              <span>{problem.statistics.totalSubmissions.toLocaleString()} submissions</span>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
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

          <div className="card-content flex-1">
            <div className="flex border-b border-gray-200 mb-4">
              <button
                onClick={() => setActiveTab('description')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'description'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Description
              </button>
              <button
                onClick={() => setActiveTab('editorial')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'editorial'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Editorial
              </button>
              <button
                onClick={() => setActiveTab('submissions')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'submissions'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Submissions
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {activeTab === 'description' && (
                <div className="prose prose-sm max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: problem.description.replace(/\n/g, '<br>') }} />
                </div>
              )}
              {activeTab === 'editorial' && (
                <div className="text-center py-8 text-gray-500">
                  <Lightbulb className="h-8 w-8 mx-auto mb-2" />
                  <p>Editorial will be available after you solve the problem</p>
                </div>
              )}
              {activeTab === 'submissions' && (
                <div className="text-center py-8 text-gray-500">
                  <p>No submissions yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex flex-col">
        <div className="card flex-1 flex flex-col">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="input w-auto"
                >
                  {languages.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRunCode}
                  disabled={isRunning}
                  className="btn-outline flex items-center space-x-2"
                >
                  <Play className="h-4 w-4" />
                  <span>{isRunning ? 'Running...' : 'Run'}</span>
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="card-content flex-1 flex flex-col">
            <div className="flex-1 mb-4">
              <CodeEditor
                value={code}
                onChange={setCode}
                language={selectedLanguage}
                height="300px"
              />
            </div>

            {/* Test Results */}
            {testResults.length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Test Results</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {testResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-md text-sm ${
                        result.passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">Test Case {index + 1}</span>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            result.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {result.passed ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        <div>Input: {result.input}</div>
                        <div>Expected: {result.expected}</div>
                        <div>Actual: {result.actual}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProblemDetailPage