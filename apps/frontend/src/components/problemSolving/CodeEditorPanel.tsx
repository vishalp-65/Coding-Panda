import React, { useState, useEffect } from 'react';
import { Play, Send, RotateCcw, Settings, Lightbulb, Zap, Code } from 'lucide-react';
import CodeEditor from '@/components/editor/CodeEditor';
import { SUPPORTED_LANGUAGES } from '@/utils/monacoConfig';
import { problemsApi } from '@/services/api';
import toast from 'react-hot-toast';

interface CodeEditorPanelProps {
  code: string;
  language: string;
  onCodeChange: (code: string) => void;
  onLanguageChange: (language: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  onRequestHint: () => void;
  onGetAIFeedback: () => void;
  isRunning: boolean;
  isSubmitting: boolean;
  isLoadingHint: boolean;
  isLoadingFeedback: boolean;
  problemId?: string;
}

const CodeEditorPanel: React.FC<CodeEditorPanelProps> = ({
  code,
  language,
  onCodeChange,
  onLanguageChange,
  onRun,
  onSubmit,
  onRequestHint,
  onGetAIFeedback,
  isRunning,
  isSubmitting,
  isLoadingHint,
  isLoadingFeedback,
  problemId,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [editorTheme, setEditorTheme] = useState<'light' | 'dark'>('light');
  const [fontSize, setFontSize] = useState(14);
  const [tabSize, setTabSize] = useState(2);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [templateCache, setTemplateCache] = useState<Record<string, string>>({});

  const currentLanguageConfig = SUPPORTED_LANGUAGES.find(
    lang => lang.value === language
  );

  // Default fallback templates
  const getDefaultTemplate = (lang: string): string => {
    const templates: Record<string, string> = {
      java: `class Solution {
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
    return templates[lang] || '// Your code here';
  };

  // Load template from API
  const loadTemplate = async (lang: string): Promise<string> => {
    if (!problemId) {
      return getDefaultTemplate(lang);
    }

    const cacheKey = `${problemId}-${lang}`;
    if (templateCache[cacheKey]) {
      return templateCache[cacheKey];
    }

    try {
      setIsLoadingTemplate(true);
      const templateData = await problemsApi.getTemplate(problemId, lang);
      const template = templateData?.template || getDefaultTemplate(lang);

      setTemplateCache(prev => ({
        ...prev,
        [cacheKey]: template
      }));

      return template;
    } catch (error) {
      console.error('Error loading template:', error);
      return getDefaultTemplate(lang);
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  const handleLanguageChange = async (newLanguage: string) => {
    onLanguageChange(newLanguage);

    // Load template for new language
    const template = await loadTemplate(newLanguage);
    onCodeChange(template);
  };

  const handleResetCode = async () => {
    const template = await loadTemplate(language);
    onCodeChange(template);
  };

  const handleFormatCode = () => {
    // Simple code formatting - this could be enhanced with language-specific formatters
    try {
      let formattedCode = code;

      // Basic formatting for different languages
      switch (language) {
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

      onCodeChange(formattedCode);
      toast.success('Code formatted successfully!');
    } catch (error) {
      toast.error('Failed to format code');
    }
  };

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

  // Load initial template when component mounts or problemId changes
  useEffect(() => {
    if (problemId && !code.trim()) {
      loadTemplate(language).then(template => {
        onCodeChange(template);
      });
    }
  }, [problemId, language]);

  const editorOptions = {
    fontSize,
    tabSize,
    insertSpaces: true,
    wordWrap: 'on' as const,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    lineNumbers: 'on' as const,
    roundedSelection: false,
  };

  return (
    <div className="card flex-1 flex flex-col">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <select
              value={language}
              onChange={e => handleLanguageChange(e.target.value)}
              className="input w-auto min-w-[120px]"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>

            <button
              onClick={handleResetCode}
              disabled={isLoadingTemplate}
              className="btn-outline-sm flex items-center space-x-1"
              title="Reset to template"
            >
              <RotateCcw className="h-3 w-3" />
              <span>{isLoadingTemplate ? 'Loading...' : 'Reset'}</span>
            </button>

            <button
              onClick={handleFormatCode}
              className="btn-outline-sm flex items-center space-x-1"
              title="Format code"
            >
              <Code className="h-3 w-3" />
              <span>Format</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onRequestHint}
              disabled={isLoadingHint}
              className="btn-outline-sm flex items-center space-x-1"
              title="Get AI hint"
            >
              <Lightbulb className="h-3 w-3" />
              <span>{isLoadingHint ? 'Loading...' : 'Hint'}</span>
            </button>

            <button
              onClick={onGetAIFeedback}
              disabled={isLoadingFeedback}
              className="btn-outline-sm flex items-center space-x-1"
              title="Get AI feedback"
            >
              <Zap className="h-3 w-3" />
              <span>{isLoadingFeedback ? 'Analyzing...' : 'AI Feedback'}</span>
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="btn-outline-sm"
              title="Editor settings"
            >
              <Settings className="h-3 w-3" />
            </button>

            <button
              onClick={onRun}
              disabled={isRunning}
              className="btn-outline flex items-center space-x-2"
            >
              <Play className="h-4 w-4" />
              <span>{isRunning ? 'Running...' : 'Run'}</span>
            </button>

            <button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="btn-primary flex items-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <h3 className="text-sm font-medium mb-3">Editor Settings</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Theme
                </label>
                <select
                  value={editorTheme}
                  onChange={e =>
                    setEditorTheme(e.target.value as 'light' | 'dark')
                  }
                  className="input text-sm"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Font Size
                </label>
                <select
                  value={fontSize}
                  onChange={e => setFontSize(Number(e.target.value))}
                  className="input text-sm"
                >
                  <option value={12}>12px</option>
                  <option value={14}>14px</option>
                  <option value={16}>16px</option>
                  <option value={18}>18px</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Tab Size
                </label>
                <select
                  value={tabSize}
                  onChange={e => setTabSize(Number(e.target.value))}
                  className="input text-sm"
                >
                  <option value={2}>2 spaces</option>
                  <option value={4}>4 spaces</option>
                  <option value={8}>8 spaces</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card-content flex-1">
        <CodeEditor
          value={code}
          onChange={onCodeChange}
          language={currentLanguageConfig?.monacoLanguage || language}
          theme={editorTheme}
          height="100%"
          options={editorOptions}
        />
      </div>
    </div>
  );
};

export default CodeEditorPanel;
