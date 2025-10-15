import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import {
    Play,
    Send,
    RotateCcw,
    Settings,
    Maximize2,
    Minimize2,
    ChevronRight,
    Clock,
    Database,
    CheckCircle,
    XCircle,
    AlertCircle
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { fetchProblemById } from '@/store/slices/problemsSlice';
import ModernCodeEditor from '@/components/problemSolving/ModernCodeEditor';
import ModernProblemDescription from '@/components/problemSolving/ModernProblemDescription';
import ModernTestResults from '@/components/problemSolving/ModernTestResults';
import { ExecutionResult } from '@/types/problemSolving';
import toast from 'react-hot-toast';

const ModernProblemDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const dispatch = useAppDispatch();
    const { currentProblem, isLoading } = useAppSelector((state) => state.problems);

    // Code editor state
    const [selectedLanguage, setSelectedLanguage] = useState('javascript');
    const [code, setCode] = useState('');

    // UI state
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showConsole, setShowConsole] = useState(false);

    // Execution state
    const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Mock problem data
    const mockProblem = {
        id: '1',
        title: 'Two Sum',
        slug: 'two-sum',
        difficulty: 'easy' as const,
        description: `Given an array of integers \`nums\` and an integer \`target\`, return *indices of the two numbers such that they add up to target*.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

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
- \`2 <= nums.length <= 10^4\`
- \`-10^9 <= nums[i] <= 10^9\`
- \`-10^9 <= target <= 10^9\`
- **Only one valid answer exists.**

**Follow-up:** Can you come up with an algorithm that is less than O(n²) time complexity?`,
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
    };

    useEffect(() => {
        if (id) {
            loadProblem(id);
        }
    }, [id]);

    const loadProblem = async (problemId: string) => {
        try {
            // Use the API service
            const { problemsApi } = await import('@/services/api');
            const data = await problemsApi.getProblem(problemId);
            // The problem will be set via Redux or local state
            dispatch(fetchProblemById(problemId));
        } catch (error) {
            console.error('Error loading problem:', error);
            // Fallback to mock data
        }
    };

    const problem = currentProblem || mockProblem;

    const handleRunCode = async () => {
        if (!code.trim()) {
            toast.error('Please write some code first');
            return;
        }

        setIsRunning(true);
        setShowConsole(true);

        try {
            // Use the API service for code execution
            const { problemsApi } = await import('@/services/api');
            const result = await problemsApi.executeCode({
                code,
                language: selectedLanguage,
                problemId: problem.id,
                testCases: problem.testCases?.filter((tc: any) => !tc.isHidden)
            });

            setExecutionResult(result);
            toast.success('Code executed successfully!');
        } catch (error: any) {
            console.error('Error running code:', error);
            toast.error(error.message || 'Failed to execute code');

            // Fallback to mock result for demo
            const mockResult: ExecutionResult = {
                status: 'success',
                executionTime: 125,
                memoryUsed: 1536,
                testResults: [
                    { input: 'nums = [2,7,11,15], target = 9', expected: '[0,1]', actual: '[0,1]', passed: true, executionTime: 45, memoryUsed: 512 },
                    { input: 'nums = [3,2,4], target = 6', expected: '[1,2]', actual: '[1,2]', passed: true, executionTime: 38, memoryUsed: 480 },
                    { input: 'nums = [3,3], target = 6', expected: '[0,1]', actual: '[0,1]', passed: true, executionTime: 42, memoryUsed: 544 },
                ]
            };
            setExecutionResult(mockResult);
        } finally {
            setIsRunning(false);
        }
    };

    const handleSubmit = async () => {
        if (!code.trim()) {
            toast.error('Please write some code first');
            return;
        }

        setIsSubmitting(true);

        try {
            // Use the API service for solution submission
            const { problemsApi } = await import('@/services/api');
            await problemsApi.submitSolution(problem.id, {
                code,
                language: selectedLanguage
            });
            toast.success('Solution submitted successfully!');
        } catch (error: any) {
            console.error('Error submitting solution:', error);
            toast.error(error.message || 'Failed to submit solution');
        } finally {
            setIsSubmitting(false);
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className={`h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-gray-900' : ''}`}>
            {/* Top bar */}
            <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
                <div className="flex items-center space-x-4">
                    <h1 className="text-lg font-semibold text-white">
                        {problem.id}. {problem.title}
                    </h1>
                    <span className={`text-sm font-medium ${getDifficultyColor(problem.difficulty)}`}>
                        {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
                    </span>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-2 rounded-md hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                    >
                        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                    <button className="p-2 rounded-md hover:bg-gray-700 text-gray-300 hover:text-white transition-colors">
                        <Settings className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div className="h-[calc(100%-3rem)]">
                <PanelGroup direction="horizontal">
                    {/* Left panel - Problem description */}
                    <Panel defaultSize={40} minSize={25}>
                        <ModernProblemDescription problem={problem} />
                    </Panel>

                    <PanelResizeHandle className="w-2 bg-gray-700 hover:bg-gray-600 transition-colors" />

                    {/* Right panel - Code editor and console */}
                    <Panel defaultSize={60} minSize={35}>
                        <PanelGroup direction="vertical">
                            {/* Code editor */}
                            <Panel defaultSize={showConsole ? 70 : 100} minSize={40}>
                                <div className="h-full flex flex-col">
                                    {/* Editor header */}
                                    <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
                                        <div className="flex items-center space-x-4">
                                            <select
                                                value={selectedLanguage}
                                                onChange={(e) => setSelectedLanguage(e.target.value)}
                                                className="bg-gray-700 border border-gray-600 rounded-md px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="javascript">JavaScript</option>
                                                <option value="python">Python</option>
                                                <option value="java">Java</option>
                                                <option value="cpp">C++</option>
                                            </select>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => setCode('')}
                                                className="flex items-center space-x-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-gray-300 hover:text-white transition-colors text-sm"
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                                <span>Reset</span>
                                            </button>
                                            <button
                                                onClick={handleRunCode}
                                                disabled={isRunning}
                                                className="flex items-center space-x-2 px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 rounded-md text-white transition-colors text-sm"
                                            >
                                                <Play className="h-4 w-4" />
                                                <span>{isRunning ? 'Running...' : 'Run'}</span>
                                            </button>
                                            <button
                                                onClick={handleSubmit}
                                                disabled={isSubmitting}
                                                className="flex items-center space-x-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 rounded-md text-white transition-colors text-sm"
                                            >
                                                <Send className="h-4 w-4" />
                                                <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Code editor */}
                                    <div className="flex-1">
                                        <ModernCodeEditor
                                            code={code}
                                            language={selectedLanguage}
                                            onChange={setCode}
                                            problem={problem}
                                        />
                                    </div>
                                </div>
                            </Panel>

                            {/* Console panel */}
                            {showConsole && (
                                <>
                                    <PanelResizeHandle className="h-2 bg-gray-700 hover:bg-gray-600 transition-colors" />
                                    <Panel defaultSize={30} minSize={20}>
                                        <ModernTestResults
                                            executionResult={executionResult}
                                            onClose={() => setShowConsole(false)}
                                        />
                                    </Panel>
                                </>
                            )}
                        </PanelGroup>
                    </Panel>
                </PanelGroup>
            </div>
        </div>
    );
};

export default ModernProblemDetailPage;