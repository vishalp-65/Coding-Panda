import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import {
  Play,
  Send,
  RotateCcw,
  Settings,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Code,
  FileText,
  MessageSquare,
  BookOpen,
  CheckCircle,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { fetchProblemById } from '@/store/slices/problemsSlice';
import ModernCodeEditor from '@/components/problemSolving/ModernCodeEditor';
import TemplateCodeEditor from '@/components/problemSolving/TemplateCodeEditor';
import ModernProblemDescription from '@/components/problemSolving/ModernProblemDescription';
import ModernTestResults from '@/components/problemSolving/ModernTestResults';
import { ExecutionResult, TemplateData } from '@/types/problemSolving';
import toast from 'react-hot-toast';
import { CODE_TEMPLATES, getDifficultyColor } from '@/utils/problemHelpers';
import ErrorBoundary from '@/components/ErrorBoundary';

// Types
type LeftPanelTab = 'description' | 'editorial' | 'discuss' | 'submissions';
type RightPanelTab = 'editor' | 'testcases';

interface ExecutionData {
  code: string;
  language: string;
  hidden_code: string;
  test_cases: Array<{
    input: string;
    expected_output: string;
    is_hidden: boolean;
  }>;
  time_limit: number;
  memory_limit: number;
  problem_id: string;
  user_id: string;
}

// Constants
const DEFAULT_TIME_LIMIT = 5;
const MAX_TIME_LIMIT = 60;
const DEFAULT_MEMORY_LIMIT = 256;
const TEST_USER_ID = 'test-user-001';

const ModernProblemDetailPage = () => {
  const { number } = useParams<{ number: string }>();
  const dispatch = useAppDispatch();
  const { currentProblem, isLoading } = useAppSelector(state => state.problems);

  // Code editor state
  const [selectedLanguage, setSelectedLanguage] = useState('java');
  const [code, setCode] = useState('');
  const [hiddenCode, setHiddenCode] = useState('');
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [templateData, setTemplateData] = useState<TemplateData | null>(null);
  const [useTemplateEditor, setUseTemplateEditor] = useState(false);

  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [leftPanelTab, setLeftPanelTab] = useState<LeftPanelTab>('description');
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('editor');

  // Execution state
  const [executionResult, setExecutionResult] =
    useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memoized default template function
  const getDefaultTemplate = useCallback(
    (language: string) => CODE_TEMPLATES[language] || '// Your code here',
    []
  );

  // Memoized execution data builder
  const buildExecutionData = useCallback(
    (includeHiddenTests: boolean): ExecutionData | null => {
      if (!currentProblem) return null;

      const testCases = currentProblem.testCases
        .filter(tc => includeHiddenTests || !tc.isHidden)
        .map(tc => ({
          input: tc.input || '',
          expected_output: tc.expectedOutput || '',
          is_hidden: tc.isHidden,
        }));

      return {
        code,
        language: selectedLanguage,
        hidden_code: hiddenCode,
        test_cases: testCases,
        time_limit: Math.min(
          currentProblem.constraints?.timeLimit || DEFAULT_TIME_LIMIT,
          MAX_TIME_LIMIT
        ),
        memory_limit:
          currentProblem.constraints?.memoryLimit || DEFAULT_MEMORY_LIMIT,
        problem_id: currentProblem.slug || currentProblem.id,
        user_id: TEST_USER_ID,
      };
    },
    [code, selectedLanguage, hiddenCode, currentProblem]
  );

  // Load problem on mount or when number changes
  useEffect(() => {
    if (number) {
      loadProblem(number);
    }
  }, [number]);

  // Load template when problem or language changes
  useEffect(() => {
    // Don't load if already loading to prevent race conditions
    // if (isLoadingTemplate) return;

    if (currentProblem) {
      loadTemplate(currentProblem.id, selectedLanguage);
    } else {
      resetToDefaultTemplate();
    }
  }, [currentProblem?.id, selectedLanguage]);

  const resetToDefaultTemplate = useCallback(() => {
    const defaultCode = getDefaultTemplate(selectedLanguage);
    setCode(defaultCode);
    setHiddenCode('');
    setTemplateData(null);
    setUseTemplateEditor(false);
  }, [selectedLanguage, getDefaultTemplate]);

  const loadProblem = useCallback(
    async (problemNumber: string) => {
      try {
        await dispatch(fetchProblemById(problemNumber)).unwrap();
      } catch (error: any) {
        console.error('Error loading problem:', error);
        toast.error(
          `Problem ${problemNumber} not found. Showing example problem.`
        );
      }
    },
    [dispatch]
  );

  const loadTemplate = useCallback(
    async (problemId: string, language: string) => {
      try {
        setIsLoadingTemplate(true);

        // Clear current state first
        setCode('');
        setHiddenCode('');
        setTemplateData(null);
        setUseTemplateEditor(false);

        // Small delay to ensure state is cleared
        await new Promise(resolve => setTimeout(resolve, 50));

        const { problemsApi } = await import('@/services/api');

        // Try new template format first
        try {
          const response = await problemsApi.getProblemTemplate(
            problemId,
            language
          );
          if (response.success && response.data) {
            setTemplateData(response.data);
            setCode(response.data.userEditableRegion);
            setHiddenCode(response.data.hiddenCode || '');
            setUseTemplateEditor(true);
            return;
          }
        } catch (templateError) {
          console.log('New template API not available, trying old format');
        }

        // Fallback to old template format
        const templateData = await problemsApi.getTemplate(problemId, language);
        if (templateData?.template) {
          setCode(templateData.template);
          setHiddenCode(templateData.hidden_code || '');
          setTemplateData(null);
          setUseTemplateEditor(false);
        } else {
          throw new Error('Invalid template data received');
        }
      } catch (error: any) {
        console.error('Error loading template:', error);
        // Use default template for the language
        const defaultCode = getDefaultTemplate(language);
        setCode(defaultCode);
        setHiddenCode('');
        setTemplateData(null);
        setUseTemplateEditor(false);
      } finally {
        setIsLoadingTemplate(false);
      }
    },
    [getDefaultTemplate]
  );

  const handleRunCode = useCallback(async () => {
    if (!code.trim()) {
      toast.error('Please write some code first');
      return;
    }

    const executionData = buildExecutionData(false);
    if (!executionData) {
      toast.error('Problem data not loaded');
      return;
    }

    setIsRunning(true);
    setShowConsole(true);

    try {
      const { problemsApi } = await import('@/services/api');
      const result = await problemsApi.executeCode(executionData);
      setExecutionResult(result);
      toast.success('Code executed successfully!');
    } catch (error: any) {
      console.error('Error running code:', error);
      toast.error(error.message || 'Failed to execute code');
    } finally {
      setIsRunning(false);
    }
  }, [code, buildExecutionData]);

  const handleSubmit = useCallback(async () => {
    if (!code.trim()) {
      toast.error('Please write some code first');
      return;
    }

    const executionData = buildExecutionData(true);
    if (!executionData) {
      toast.error('Problem data not loaded');
      return;
    }

    setIsSubmitting(true);

    try {
      const { problemsApi } = await import('@/services/api');
      const result = await problemsApi.executeCode(executionData);

      setExecutionResult(result);
      setShowConsole(true);

      if (result.status === 'success') {
        toast.success('Solution submitted successfully!');
      } else {
        toast.error('Submission failed');
      }
    } catch (error: any) {
      console.error('Error submitting solution:', error);
      toast.error(error.message || 'Failed to submit solution');
    } finally {
      setIsSubmitting(false);
    }
  }, [code, buildExecutionData]);

  const handleReset = useCallback(() => {
    if (currentProblem) {
      loadTemplate(currentProblem.id, selectedLanguage);
    } else {
      resetToDefaultTemplate();
    }
  }, [currentProblem, selectedLanguage]);

  const handleFormatCode = useCallback(() => {
    try {
      let formattedCode: string;

      switch (selectedLanguage) {
        case 'java':
        case 'cpp':
        case 'javascript':
          formattedCode = formatCStyleCode(code);
          break;
        case 'python':
          formattedCode = formatPythonCode(code);
          break;
        default:
          formattedCode = formatGenericCode(code);
      }

      setCode(formattedCode);
      toast.success('Code formatted successfully!');
    } catch (error) {
      toast.error('Failed to format code');
    }
  }, [code, selectedLanguage]);

  const handleLanguageChange = useCallback((newLanguage: string) => {
    setSelectedLanguage(newLanguage);
    // Don't clear code immediately, let the useEffect handle template loading
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading problem...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-full w-full bg-gray-50 dark:bg-gray-900 transition-colors duration-200 flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* Top bar */}
      <div className="h-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 transition-colors duration-200 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {currentProblem?.number}. {currentProblem?.title}
          </h1>
          {currentProblem?.difficulty && (
            <span
              className={`text-sm font-medium ${getDifficultyColor(
                currentProblem.difficulty
              )}`}
            >
              {currentProblem.difficulty.toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
          <button
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
        <PanelGroup direction="horizontal" className="h-full w-full">
          {/* Left panel - Problem info */}
          <Panel defaultSize={36} minSize={30} maxSize={55}>
            <div className="h-full flex flex-col bg-white dark:bg-gray-900 relative overflow-hidden">
              {/* Left panel tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                <TabButton
                  active={leftPanelTab === 'description'}
                  onClick={() => setLeftPanelTab('description')}
                  icon={FileText}
                  label="Description"
                />
                <TabButton
                  active={leftPanelTab === 'editorial'}
                  onClick={() => setLeftPanelTab('editorial')}
                  icon={BookOpen}
                  label="Editorial"
                />
                <TabButton
                  active={leftPanelTab === 'discuss'}
                  onClick={() => setLeftPanelTab('discuss')}
                  icon={MessageSquare}
                  label="Discuss"
                />
                <TabButton
                  active={leftPanelTab === 'submissions'}
                  onClick={() => setLeftPanelTab('submissions')}
                  icon={CheckCircle}
                  label="Submissions"
                />
              </div>

              {/* Left panel content */}
              <div className="flex-1 min-h-0 bg-white dark:bg-gray-900 overflow-hidden">
                {leftPanelTab === 'description' && currentProblem && (
                  <div className="h-screen w-full overflow-y-auto bg-white dark:bg-gray-900">
                    <ModernProblemDescription problem={currentProblem} />
                  </div>
                )}
                {leftPanelTab === 'editorial' && (
                  <div className="h-full w-full bg-white dark:bg-gray-900">
                    <EmptyState
                      icon={BookOpen}
                      message="Editorial not available yet"
                    />
                  </div>
                )}
                {leftPanelTab === 'discuss' && (
                  <div className="h-full w-full bg-white dark:bg-gray-900">
                    <EmptyState
                      icon={MessageSquare}
                      message="Discussion coming soon"
                    />
                  </div>
                )}
                {leftPanelTab === 'submissions' && (
                  <div className="h-full w-full bg-white dark:bg-gray-900">
                    <EmptyState
                      icon={CheckCircle}
                      message="No submissions yet"
                    />
                  </div>
                )}
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="w-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors" />

          {/* Right panel - Code editor and test results */}
          <Panel defaultSize={60} minSize={40}>
            <div className="h-full flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
              {/* Right panel tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                <TabButton
                  active={rightPanelTab === 'editor'}
                  onClick={() => setRightPanelTab('editor')}
                  icon={Code}
                  label="Code"
                />
                <TabButton
                  active={rightPanelTab === 'testcases'}
                  onClick={() => setRightPanelTab('testcases')}
                  icon={Play}
                  label="Test Cases"
                />
              </div>

              {/* Right panel content */}
              <div className="flex-1 min-h-0 bg-white dark:bg-gray-900">
                {rightPanelTab === 'editor' ? (
                  <PanelGroup direction="vertical" className="h-full w-full">
                    {/* Code editor */}
                    <Panel defaultSize={showConsole ? 70 : 100} minSize={40}>
                      <div className="h-full flex flex-col bg-white dark:bg-gray-900">
                        {/* Editor toolbar */}
                        <EditorToolbar
                          selectedLanguage={selectedLanguage}
                          onLanguageChange={handleLanguageChange}
                          onReset={handleReset}
                          onFormat={handleFormatCode}
                          onRun={handleRunCode}
                          onSubmit={handleSubmit}
                          isLoadingTemplate={isLoadingTemplate}
                          isRunning={isRunning}
                          isSubmitting={isSubmitting}
                        />

                        {/* Code editor */}
                        <div className="flex-1 min-h-0 bg-white dark:bg-gray-900">
                          <ErrorBoundary
                            fallback={
                              <EditorErrorFallback
                                onReload={() => window.location.reload()}
                              />
                            }
                          >
                            {useTemplateEditor && templateData ? (
                              <TemplateCodeEditor
                                key={`template-${selectedLanguage}-${currentProblem?.id}`}
                                templateData={templateData}
                                onChange={setCode}
                                isLoading={isLoadingTemplate}
                              />
                            ) : (
                              <ModernCodeEditor
                                key={`editor-${selectedLanguage}-${currentProblem?.id}`}
                                code={code}
                                language={selectedLanguage}
                                onChange={setCode}
                                problem={currentProblem}
                                isLoading={isLoadingTemplate}
                              />
                            )}
                          </ErrorBoundary>
                        </div>
                      </div>
                    </Panel>

                    {/* Console panel */}
                    {showConsole && (
                      <>
                        <PanelResizeHandle className="h-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors" />
                        <Panel defaultSize={30} minSize={20}>
                          <ModernTestResults
                            executionResult={executionResult}
                            onClose={() => setShowConsole(false)}
                          />
                        </Panel>
                      </>
                    )}
                  </PanelGroup>
                ) : (
                  <div className="bg-white dark:bg-gray-900 h-full">
                    <EmptyState
                      icon={Play}
                      message="Test cases will appear here after running code"
                    />
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
};

// Helper Components
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const TabButton = ({ active, onClick, icon: Icon, label }: TabButtonProps) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
      active
        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
    }`}
  >
    <Icon className="h-4 w-4" />
    <span>{label}</span>
  </button>
);

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
}

const EmptyState = ({ icon: Icon, message }: EmptyStateProps) => (
  <div className="h-full w-full flex items-center justify-center bg-white dark:bg-gray-900 min-h-[200px]">
    <div className="text-center text-gray-500 dark:text-gray-400 p-8">
      <Icon className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p className="text-lg font-medium">{message}</p>
      <p className="text-sm mt-2 opacity-75">Content will be available soon</p>
    </div>
  </div>
);

interface EditorToolbarProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  onReset: () => void;
  onFormat: () => void;
  onRun: () => void;
  onSubmit: () => void;
  isLoadingTemplate: boolean;
  isRunning: boolean;
  isSubmitting: boolean;
}

const EditorToolbar = ({
  selectedLanguage,
  onLanguageChange,
  onReset,
  onFormat,
  onRun,
  onSubmit,
  isLoadingTemplate,
  isRunning,
  isSubmitting,
}: EditorToolbarProps) => (
  <div className="h-12 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 flex-shrink-0">
    <div className="flex items-center space-x-4">
      <select
        value={selectedLanguage}
        onChange={e => onLanguageChange(e.target.value)}
        disabled={isLoadingTemplate}
        className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        <option value="java">Java</option>
        <option value="python">Python</option>
        <option value="cpp">C++</option>
        <option value="javascript">JavaScript</option>
        <option value="rust">Rust</option>
        <option value="go">Go</option>
      </select>
      {isLoadingTemplate && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
      )}
    </div>

    <div className="flex items-center space-x-2">
      <button
        onClick={onReset}
        disabled={isLoadingTemplate}
        className="flex items-center space-x-2 px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 rounded-md text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:text-gray-400 transition-colors text-sm"
      >
        <RotateCcw className="h-4 w-4" />
        <span>{isLoadingTemplate ? 'Loading...' : 'Reset'}</span>
      </button>
      <button
        onClick={onFormat}
        className="flex items-center space-x-2 px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
      >
        <Code className="h-4 w-4" />
        <span>Format</span>
      </button>
      <button
        onClick={onRun}
        disabled={isRunning}
        className="flex items-center space-x-2 px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 rounded-md text-white transition-colors text-sm"
      >
        <Play className="h-4 w-4" />
        <span>{isRunning ? 'Running...' : 'Run'}</span>
      </button>
      <button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="flex items-center space-x-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 rounded-md text-white transition-colors text-sm"
      >
        <Send className="h-4 w-4" />
        <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
      </button>
    </div>
  </div>
);

const EditorErrorFallback = ({ onReload }: { onReload: () => void }) => (
  <div className="flex items-center justify-center h-full bg-white dark:bg-gray-900">
    <div className="text-center">
      <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
      <p className="text-gray-600 dark:text-gray-400">
        Failed to load code editor
      </p>
      <button
        onClick={onReload}
        className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
      >
        Reload Page
      </button>
    </div>
  </div>
);

// Code formatting utilities
const formatCStyleCode = (code: string): string => {
  return code
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map((line, index, lines) => {
      let indent = 0;

      for (let i = 0; i < index; i++) {
        const prevLine = lines[i];
        indent += (prevLine.match(/{/g) || []).length;
        indent -= (prevLine.match(/}/g) || []).length;
      }

      if (line.includes('}')) {
        indent -= (line.match(/}/g) || []).length;
      }

      return '    '.repeat(Math.max(0, indent)) + line;
    })
    .join('\n');
};

const formatPythonCode = (code: string): string => {
  return code
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map((line, index, lines) => {
      let indent = 0;

      for (let i = 0; i < index; i++) {
        const prevLine = lines[i];
        if (prevLine.endsWith(':')) {
          indent++;
        }
      }

      return '    '.repeat(Math.max(0, indent)) + line;
    })
    .join('\n');
};

const formatGenericCode = (code: string): string => {
  return code
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
};

export default ModernProblemDetailPage;
