import { useEffect, useRef, useState, useCallback } from 'react';
import * as monaco from 'monaco-editor';
import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { getMonacoLanguage } from '@/utils/monacoConfig';

interface TemplateData {
  userEditableRegion: string;
  hiddenCode: string;
  functionSignature: string;
  imports: string;
  helperClasses: string;
  language: string;
  problemId: string;
  problemTitle: string;
}

interface TemplateCodeEditorProps {
  templateData: TemplateData | null;
  onChange: (userCode: string) => void;
  isLoading?: boolean;
}

const TemplateCodeEditor = ({
  templateData,
  onChange,
  isLoading = false,
}: TemplateCodeEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [showHiddenCode, setShowHiddenCode] = useState(false);
  const [userCode, setUserCode] = useState('');

  // Configure Monaco Editor environment once
  useEffect(() => {
    if (!(window as any).MonacoEnvironment) {
      (window as any).MonacoEnvironment = {
        getWorkerUrl: function (_: string, label: string) {
          if (label === 'json') {
            return './monaco-editor/min/vs/language/json/json.worker.js';
          }
          if (label === 'css' || label === 'scss' || label === 'less') {
            return './monaco-editor/min/vs/language/css/css.worker.js';
          }
          if (label === 'html' || label === 'handlebars' || label === 'razor') {
            return './monaco-editor/min/vs/language/html/html.worker.js';
          }
          if (label === 'typescript' || label === 'javascript') {
            return './monaco-editor/min/vs/language/typescript/ts.worker.js';
          }
          return './monaco-editor/min/vs/editor/editor.worker.js';
        },
      };
    }
  }, []);

  // Initialize user code from template
  useEffect(() => {
    if (templateData?.userEditableRegion && !userCode) {
      setUserCode(templateData.userEditableRegion);
      onChange(templateData.userEditableRegion);
    }
  }, [templateData, userCode, onChange]);

  // Get the complete code for display
  const getCompleteCode = useCallback(() => {
    if (!templateData) return '';

    const parts = [];

    // Add imports if present
    if (templateData.imports && templateData.imports.trim()) {
      parts.push(templateData.imports);
    }

    // Add helper classes if present
    if (templateData.helperClasses && templateData.helperClasses.trim()) {
      parts.push(templateData.helperClasses);
    }

    // Add hidden code with user editable region placeholder
    if (templateData.hiddenCode) {
      const hiddenWithUserCode = templateData.hiddenCode.replace(
        '// USER_CODE_PLACEHOLDER',
        userCode || templateData.userEditableRegion
      );
      parts.push(hiddenWithUserCode);
    }

    return parts.join('\n\n');
  }, [templateData, userCode]);

  // Get only the user editable code for the focused editor
  const getUserEditableCode = useCallback(() => {
    return userCode || templateData?.userEditableRegion || '';
  }, [userCode, templateData]);

  // Initialize editor
  useEffect(() => {
    if (!editorRef.current || monacoRef.current || !templateData) return;

    try {
      // Define custom theme
      monaco.editor.defineTheme('gfg-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6A9955' },
          { token: 'keyword', foreground: '569CD6' },
          { token: 'string', foreground: 'CE9178' },
          { token: 'number', foreground: 'B5CEA8' },
          { token: 'type', foreground: '4EC9B0' },
          { token: 'function', foreground: 'DCDCAA' },
        ],
        colors: {
          'editor.background': '#0F172A',
          'editor.foreground': '#E2E8F0',
          'editorLineNumber.foreground': '#64748B',
          'editor.selectionBackground': '#334155',
          'editor.lineHighlightBackground': '#1E293B',
          'editorCursor.foreground': '#3B82F6',
        },
      });

      const editor = monaco.editor.create(editorRef.current, {
        value: getUserEditableCode(),
        language: getMonacoLanguage(templateData.language),
        theme: 'gfg-dark',
        fontSize: 14,
        fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        insertSpaces: true,
        wordWrap: 'on',
        lineNumbers: 'on',
        renderLineHighlight: 'line',
        selectOnLineNumbers: true,
        roundedSelection: false,
        readOnly: isLoading,
        cursorStyle: 'line',
        contextmenu: true,
        quickSuggestions: true,
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: 'on',
        bracketPairColorization: { enabled: true },
      });

      monacoRef.current = editor;
      setIsEditorReady(true);

      // Set up change listener
      const disposable = editor.onDidChangeModelContent(() => {
        const newValue = editor.getValue();
        setUserCode(newValue);
        onChange(newValue);
      });

      return () => {
        disposable.dispose();
        editor.dispose();
        monacoRef.current = null;
        setIsEditorReady(false);
      };
    } catch (error) {
      console.error('Failed to initialize Monaco Editor:', error);
    }
  }, [templateData, isLoading, getUserEditableCode, onChange]);

  // Update editor content when user code changes externally
  useEffect(() => {
    if (isEditorReady && monacoRef.current && templateData) {
      const currentValue = monacoRef.current.getValue();
      const expectedValue = getUserEditableCode();

      if (expectedValue !== currentValue) {
        const position = monacoRef.current.getPosition();
        monacoRef.current.setValue(expectedValue);
        if (position) {
          monacoRef.current.setPosition(position);
        }
      }
    }
  }, [templateData, isEditorReady, getUserEditableCode]);

  // Update readonly state
  useEffect(() => {
    if (isEditorReady && monacoRef.current) {
      monacoRef.current.updateOptions({ readOnly: isLoading });
    }
  }, [isLoading, isEditorReady]);

  if (!templateData) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-slate-900">
      {/* Header with template info and controls */}
      <div className="flex-shrink-0 bg-slate-800 border-b border-slate-700 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-slate-300">
              {templateData.problemTitle}
            </span>
            <span className="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded">
              {templateData.language.toUpperCase()}
            </span>
          </div>

          <button
            onClick={() => setShowHiddenCode(!showHiddenCode)}
            className="flex items-center space-x-2 px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-300 hover:text-white transition-colors text-sm"
          >
            {showHiddenCode ? (
              <>
                <EyeOff className="h-4 w-4" />
                <span>Hide Template</span>
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                <span>Show Template</span>
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hidden code preview (collapsible) */}
      {showHiddenCode && (
        <div className="flex-shrink-0 bg-slate-800 border-b border-slate-700">
          <div className="p-3">
            <div className="text-xs text-slate-400 mb-2 flex items-center">
              <span>Complete Template Code (Read-only)</span>
            </div>
            <div className="bg-slate-900 rounded-md p-3 max-h-60 overflow-y-auto">
              <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap">
                {getCompleteCode()}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Function signature display */}
      {templateData.functionSignature && (
        <div className="flex-shrink-0 bg-slate-800/50 border-b border-slate-700 px-3 py-2">
          <div className="text-xs text-slate-400 mb-1">Function Signature:</div>
          <code className="text-sm text-blue-400 font-mono">
            {templateData.functionSignature}
          </code>
        </div>
      )}

      {/* User editable region label */}
      <div className="flex-shrink-0 bg-slate-800/30 border-b border-slate-700 px-3 py-2">
        <div className="text-xs text-emerald-400 font-medium">
          ✏️ Your Code (Editable Region)
        </div>
      </div>

      {/* Main editor */}
      <div className="flex-1 relative">
        <div ref={editorRef} className="h-full w-full" />
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Footer with helpful info */}
      <div className="flex-shrink-0 bg-slate-800 border-t border-slate-700 px-3 py-2">
        <div className="text-xs text-slate-500">
          💡 Only the code in the editable region will be evaluated. Use the
          "Show Template" button to see the complete code structure.
        </div>
      </div>
    </div>
  );
};

export default TemplateCodeEditor;
