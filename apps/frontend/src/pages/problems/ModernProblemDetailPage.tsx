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
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { fetchProblemById } from '@/store/slices/problemsSlice';
import ModernCodeEditor from '@/components/problemSolving/ModernCodeEditor';
import TemplateCodeEditor from '@/components/problemSolving/TemplateCodeEditor';
import ModernProblemDescription from '@/components/problemSolving/ModernProblemDescription';
import ModernTestResults from '@/components/problemSolving/ModernTestResults';
import { ExecutionResult } from '@/types/problemSolving';
import toast from 'react-hot-toast';
import { getDifficultyColor } from '@/utils/problemHelpers';
import ErrorBoundary from '@/components/ErrorBoundary';
const { problemsApi } = await import('@/services/api');

const ModernProblemDetailPage = () => {
  const { number } = useParams<{ number: string }>();
  const dispatch = useAppDispatch();
  const { currentProblem, isLoading } = useAppSelector(state => state.problems);

  // Code editor state
  const [selectedLanguage, setSelectedLanguage] = useState('java');
  const [code, setCode] = useState('');
  const [hiddenCode, setHiddenCode] = useState('');
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateData, setTemplateData] = useState<any>(null);
  const [useTemplateEditor, setUseTemplateEditor] = useState(false);

  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showConsole, setShowConsole] = useState(false);

  // Execution state
  const [executionResult, setExecutionResult] =
    useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memoize default template function
  const getDefaultTemplate = useCallback((language: string) => {
    const templates: Record<string, string> = {
      java: `public class Solution {
    public void solve() {
        // Your code here
    }
}`,
      python: `class Solution:
    def solve(self):
        # Your code here
        pass`,
      cpp: `class Solution {
public:
    void solve() {
        // Your code here
    }
};`,
      javascript: `/**
 * @return {void}
 */
var solve = function() {
    // Your code here
};`,
      rust: `fn solve() {
    // Your code here
}`,
      go: `func solve() {
    // Your code here
}`,
    };
    return templates[language] || '// Your code here';
  }, []);

  // Load problem on mount or when number changes
  useEffect(() => {
    if (number) {
      loadProblem(number);
    }
  }, [number, dispatch]);

  // Load template when problem or language changes
  useEffect(() => {
    if (currentProblem && selectedLanguage) {
      loadTemplate(currentProblem.id, selectedLanguage);
    } else if (!currentProblem && selectedLanguage) {
      // Always set default template when no problem is loaded
      setCode(getDefaultTemplate(selectedLanguage));
      setHiddenCode('');
      setTemplateData(null);
      setUseTemplateEditor(false);
    }
  }, [currentProblem, selectedLanguage, getDefaultTemplate]);

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
        setTemplateError(null);

        const { problemsApi } = await import('@/services/api');

        // Try to get the new template format first
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
          console.log('Template API not available, falling back to old format');
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
        setTemplateError(error.message || 'Failed to load template');
        setCode(getDefaultTemplate(language));
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

    setIsRunning(true);
    setShowConsole(true);

    try {
      const executionData = {
        code,
        language: selectedLanguage,
        hidden_code: hiddenCode,
        test_cases:
          currentProblem?.testCases
            ?.filter((tc: any) => !tc.isHidden)
            .map((tc: any) => ({
              input: tc.input,
              expected_output: tc.expectedOutput,
              is_hidden: false,
            })) || [],
        time_limit: Math.min(currentProblem?.constraints?.timeLimit || 5, 60),
        memory_limit: currentProblem?.constraints?.memoryLimit || 256,
        problem_id: currentProblem?.slug ?? currentProblem?.id ?? '',
        user_id: 'test-user-001',
      };

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
  }, [code, selectedLanguage, hiddenCode, currentProblem]);

  const handleSubmit = useCallback(async () => {
    if (!code.trim()) {
      toast.error('Please write some code first');
      return;
    }

    setIsSubmitting(true);

    try {
      const submissionData = {
        code,
        language: selectedLanguage,
        hidden_code: hiddenCode,
        test_cases:
          currentProblem?.testCases?.map((tc: any) => ({
            input: tc.input,
            expected_output: tc.expectedOutput,
            is_hidden: tc.isHidden,
          })) || [],
        time_limit: Math.min(currentProblem?.constraints?.timeLimit || 5, 60),
        memory_limit: currentProblem?.constraints?.memoryLimit || 256,
        problem_id: currentProblem?.slug ?? currentProblem?.id ?? '',
        user_id: 'test-user-001',
      };
      const result = await problemsApi.executeCode(submissionData);

      if (result.status === 'success') {
        toast.success('Solution submitted successfully!');
        setExecutionResult(result);
        setShowConsole(true);
      } else {
        toast.error('Submission failed');
        setExecutionResult(result);
        setShowConsole(true);
      }
    } catch (error: any) {
      console.error('Error submitting solution:', error);
      toast.error(error.message || 'Failed to submit solution');
    } finally {
      setIsSubmitting(false);
    }
  }, [code, selectedLanguage, hiddenCode, currentProblem]);

  const handleReset = useCallback(() => {
    if (currentProblem) {
      loadTemplate(currentProblem.id, selectedLanguage);
    } else {
      setCode(getDefaultTemplate(selectedLanguage));
      setTemplateData(null);
      setUseTemplateEditor(false);
    }
  }, [currentProblem, selectedLanguage, loadTemplate, getDefaultTemplate]);

  const handleFormatCode = useCallback(() => {
    try {
      let formattedCode = code;

      // Basic formatting for different languages
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

  // Basic C-style language formatter
  const formatCStyleCode = (code: string): string => {
    return code
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map((line, index, lines) => {
        let indent = 0;

        // Count opening braces before this line
        for (let i = 0; i < index; i++) {
          const prevLine = lines[i];
          indent += (prevLine.match(/{/g) || []).length;
          indent -= (prevLine.match(/}/g) || []).length;
        }

        // Adjust for closing brace on current line
        if (line.includes('}')) {
          indent -= (line.match(/}/g) || []).length;
        }

        return '    '.repeat(Math.max(0, indent)) + line;
      })
      .join('\n');
  };

  // Basic Python formatter
  const formatPythonCode = (code: string): string => {
    return code
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map((line, index, lines) => {
        let indent = 0;

        // Count indentation based on previous lines
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

  // Generic formatter
  const formatGenericCode = (code: string): string => {
    return code
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  };

  const handleLanguageChange = useCallback((newLanguage: string) => {
    setSelectedLanguage(newLanguage);
    // Clear current code to force template reload
    setCode('');
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading problem...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-gray-900' : ''}`}
    >
      {/* Top bar */}
      <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold text-white">
            {currentProblem?.number}. {currentProblem?.title}
          </h1>
          {currentProblem?.difficulty && (
            <span
              className={`text-sm font-medium ${getDifficultyColor(currentProblem.difficulty)}`}
            >
              {currentProblem.difficulty.toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-md hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
          <button
            className="p-2 rounded-md hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="h-[calc(100%-3rem)]">
        <PanelGroup direction="horizontal">
          {/* Left panel - Problem description */}
          <Panel defaultSize={40} minSize={25}>
            {currentProblem && (
              <ModernProblemDescription problem={currentProblem} />
            )}
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
                        onChange={e => handleLanguageChange(e.target.value)}
                        disabled={isLoadingTemplate}
                        className="bg-gray-700 border border-gray-600 rounded-md px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <option value="java">Java</option>
                        <option value="python">Python</option>
                        <option value="cpp">C++</option>
                        <option value="javascript">JavaScript</option>
                        <option value="rust">Rust</option>
                        <option value="go">Go</option>
                      </select>
                      {isLoadingTemplate && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleReset}
                        disabled={isLoadingTemplate}
                        className="flex items-center space-x-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 rounded-md text-gray-300 hover:text-white disabled:text-gray-500 transition-colors text-sm"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>{isLoadingTemplate ? 'Loading...' : 'Reset'}</span>
                      </button>
                      <button
                        onClick={handleFormatCode}
                        className="flex items-center space-x-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-gray-300 hover:text-white transition-colors text-sm"
                      >
                        <Code className="h-4 w-4" />
                        <span>Format</span>
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
                    <ErrorBoundary
                      fallback={
                        <div className="flex items-center justify-center h-full bg-gray-900">
                          <div className="text-center">
                            <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                            <p className="text-gray-400">
                              Failed to load code editor
                            </p>
                            <button
                              onClick={() => window.location.reload()}
                              className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
                            >
                              Reload Page
                            </button>
                          </div>
                        </div>
                      }
                    >
                      {useTemplateEditor && templateData ? (
                        <TemplateCodeEditor
                          templateData={templateData}
                          onChange={setCode}
                          isLoading={isLoadingTemplate}
                        />
                      ) : (
                        <ModernCodeEditor
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
