import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { History, Code } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import {
  fetchProblemById,
  bookmarkProblem,
  unbookmarkProblem,
} from '@/store/slices/problemsSlice';
import ProblemDisplay from '@/components/problemSolving/ProblemDisplay';
import CodeEditorPanel from '@/components/problemSolving/CodeEditorPanel';
import TestResultsPanel from '@/components/problemSolving/TestResultsPanel';
import HintSystem from '@/components/problemSolving/HintSystem';
import AIFeedbackPanel from '@/components/problemSolving/AIFeedbackPanel';
import SubmissionHistory from '@/components/problemSolving/SubmissionHistory';
import {
  ExecutionResult,
  Hint,
  AIFeedback,
  Submission,
} from '@/types/problemSolving';
import toast from 'react-hot-toast';

const ProblemDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { currentProblem, isLoading, bookmarkedProblems } = useAppSelector(
    state => state.problems
  );

  // Code editor state
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [code, setCode] = useState('');

  // UI state
  const [activeTab, setActiveTab] = useState<
    'description' | 'editorial' | 'submissions' | 'discussion'
  >('description');
  const [rightPanelTab, setRightPanelTab] = useState<'editor' | 'history'>(
    'editor'
  );

  // Execution state
  const [executionResult, setExecutionResult] =
    useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTestResults, setShowTestResults] = useState(false);

  // AI features state
  const [hints, setHints] = useState<Hint[]>([]);
  const [aiFeedback, setAIFeedback] = useState<AIFeedback | null>(null);
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [showAIFeedback, setShowAIFeedback] = useState(false);

  // Submission history state
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchProblemById(id));
    }
  }, [id, dispatch]);

  const problem = currentProblem!;
  const isBookmarked = bookmarkedProblems.includes(problem.id);

  const handleRunCode = useCallback(async () => {
    if (!code.trim()) {
      toast.error('Please write some code first');
      return;
    }

    setIsRunning(true);
    setShowTestResults(false);

    try {
      // Mock API call to run code
      await new Promise(resolve => setTimeout(resolve, 2000));

      // setExecutionResult();
      setShowTestResults(true);
      toast.success('Code executed successfully!');
    } catch (error) {
      console.error('Error running code:', error);
      toast.error('Failed to execute code');
    } finally {
      setIsRunning(false);
    }
  }, [code]);

  const handleSubmit = useCallback(async () => {
    if (!code.trim()) {
      toast.error('Please write some code first');
      return;
    }

    setIsSubmitting(true);

    try {
      // Mock API call to submit solution
      await new Promise(resolve => setTimeout(resolve, 3000));

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
          {
            input: 'nums = [2,7,11,15], target = 9',
            expected: '[0,1]',
            actual: '[0,1]',
            passed: true,
          },
          {
            input: 'nums = [3,2,4], target = 6',
            expected: '[1,2]',
            actual: '[1,2]',
            passed: true,
          },
          {
            input: 'nums = [3,3], target = 6',
            expected: '[0,1]',
            actual: '[0,1]',
            passed: true,
          },
        ],
      };

      setSubmissions(prev => [newSubmission, ...prev]);
      toast.success('Solution submitted successfully!');
    } catch (error) {
      console.error('Error submitting solution:', error);
      toast.error('Failed to submit solution');
    } finally {
      setIsSubmitting(false);
    }
  }, [code, selectedLanguage, problem.id]);

  const handleRequestHint = useCallback(async () => {
    setIsLoadingHint(true);

    try {
      // Mock API call to get AI hint
      await new Promise(resolve => setTimeout(resolve, 1500));

      const nextLevel = hints.length + 1;
      const hintContent = [
        "Consider using a hash map to store numbers you've seen and their indices. This allows O(1) lookup time.",
        "For each number, calculate what its complement should be (target - current number) and check if you've seen it before.",
        'Iterate through the array once, storing each number and its index in the hash map as you go.',
      ];

      const hintTypes: Array<'conceptual' | 'implementation' | 'optimization'> =
        ['conceptual', 'implementation', 'optimization'];

      const mockHint: Hint = {
        id: `hint-${nextLevel}`,
        level: nextLevel,
        content:
          hintContent[nextLevel - 1] ||
          'Consider the edge cases and optimize your solution.',
        type: hintTypes[nextLevel - 1] || 'optimization',
        revealed: false,
      };

      setHints(prev => [...prev, mockHint]);
      toast.success('New hint generated!');
    } catch (error) {
      console.error('Error getting hint:', error);
      toast.error('Failed to generate hint');
    } finally {
      setIsLoadingHint(false);
    }
  }, [hints.length]);

  const handleRevealHint = useCallback((hintId: string) => {
    setHints(prev =>
      prev.map(hint =>
        hint.id === hintId ? { ...hint, revealed: true } : hint
      )
    );
  }, []);

  const handleGetAIFeedback = useCallback(async () => {
    if (!code.trim()) {
      toast.error('Please write some code first');
      return;
    }

    setIsLoadingFeedback(true);

    try {
      // Mock API call to get AI feedback
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockFeedback: AIFeedback = {
        codeQuality: {
          score: 85,
          suggestions: [
            'Consider adding input validation for edge cases',
            'Variable names are clear and descriptive',
            'Good use of modern JavaScript features',
          ],
        },
        complexity: {
          time: 'O(n)',
          space: 'O(n)',
          analysis:
            'The algorithm uses a hash map for O(1) lookups, resulting in linear time complexity. Space complexity is also linear due to the hash map storage.',
        },
        security: {
          issues: [],
        },
        performance: {
          suggestions: [
            'The current solution is already optimal for this problem',
            'Consider using Map instead of object for better performance with large datasets',
          ],
          bottlenecks: [],
        },
        explanation:
          'This solution uses the two-pointer technique with a hash map. It iterates through the array once, storing each number and its index. For each element, it calculates the complement needed to reach the target and checks if it exists in the hash map.',
      };

      setAIFeedback(mockFeedback);
      setShowAIFeedback(true);
      toast.success('AI feedback generated!');
    } catch (error) {
      console.error('Error getting AI feedback:', error);
      toast.error('Failed to generate AI feedback');
    } finally {
      setIsLoadingFeedback(false);
    }
  }, [code]);

  const handleBookmark = useCallback(async () => {
    try {
      if (isBookmarked) {
        await dispatch(unbookmarkProblem(problem.id)).unwrap();
        toast.success('Problem removed from bookmarks');
      } else {
        await dispatch(bookmarkProblem(problem.id)).unwrap();
        toast.success('Problem bookmarked!');
      }
    } catch (error) {
      toast.error('Failed to update bookmark');
    }
  }, [isBookmarked, problem.id, dispatch]);

  const handleViewSubmission = useCallback((submission: Submission) => {
    setCode(submission.code);
    setSelectedLanguage(submission.language);
    setRightPanelTab('editor');
    toast.success('Submission loaded in editor');
  }, []);

  const handleCompareSubmissions = useCallback(
    (submission1: Submission, submission2: Submission) => {
      // This would open a comparison modal/page
      toast.success('Comparison feature coming soon!');
    },
    []
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
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
              problemId={currentProblem?.id}
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
      {showAIFeedback && aiFeedback && (
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
  );
};

export default ProblemDetailPage;
