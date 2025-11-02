import { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import { getMonacoLanguage } from '@/utils/monacoConfig';
import { useTheme } from '@/contexts/ThemeContext';

interface ModernCodeEditorProps {
  code: string;
  language: string;
  onChange: (value: string) => void;
  problem?: any;
  isLoading?: boolean;
}

const ModernCodeEditor = ({
  code,
  language,
  onChange,
  problem,
  isLoading = false,
}: ModernCodeEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const { actualTheme } = useTheme();

  // Configure Monaco Editor environment once
  useEffect(() => {
    // Configure Monaco Environment if not already configured
    if (!(window as any).MonacoEnvironment) {
      (window as any).MonacoEnvironment = {
        getWorkerUrl: function (_moduleId: string, label: string) {
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

  // Initialize editor
  useEffect(() => {
    if (!editorRef.current) return;

    // Clean up existing editor if it exists
    if (monacoRef.current) {
      monacoRef.current.dispose();
      monacoRef.current = null;
      setIsEditorReady(false);
    }

    try {
      // Define custom theme
      monaco.editor.defineTheme('coding-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6A9955' },
          { token: 'keyword', foreground: '569CD6' },
          { token: 'string', foreground: 'CE9178' },
          { token: 'number', foreground: 'B5CEA8' },
        ],
        colors: {
          'editor.background': '#111827',
          'editor.foreground': '#D4D4D8',
          'editorLineNumber.foreground': '#6B7280',
          'editor.selectionBackground': '#374151',
          'editor.lineHighlightBackground': '#1F2937',
        },
      });

      const editor = monaco.editor.create(editorRef.current, {
        value: code || getDefaultCode(language),
        language: getMonacoLanguage(language),
        theme: actualTheme === 'dark' ? 'coding-dark' : 'vs',
        fontSize: 14,
        fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        insertSpaces: true,
        wordWrap: 'on',
        lineNumbers: 'on',
        renderLineHighlight: 'line',
        selectOnLineNumbers: true,
        roundedSelection: false,
        readOnly: isLoading,
        cursorStyle: 'line',
        contextmenu: true,
        mouseWheelZoom: true,
        multiCursorModifier: 'ctrlCmd',
        formatOnPaste: true,
        formatOnType: true,
        autoIndent: 'full',
        acceptSuggestionOnCommitCharacter: true,
        acceptSuggestionOnEnter: 'on',
        dragAndDrop: true,
        find: {
          addExtraSpaceOnTop: false,
          autoFindInSelection: 'never',
          seedSearchStringFromSelection: 'always',
        },
        folding: true,
        foldingHighlight: true,
        fontLigatures: true,
        glyphMargin: true,
        matchBrackets: 'always',
        occurrencesHighlight: true,
        parameterHints: {
          enabled: true,
        },
        renderControlCharacters: false,
        renderFinalNewline: 'on',
        renderValidationDecorations: 'editable',
        scrollbar: {
          useShadows: false,
          verticalHasArrows: false,
          horizontalHasArrows: false,
          vertical: 'visible',
          horizontal: 'visible',
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
        selectionClipboard: true,
        selectionHighlight: true,
        showFoldingControls: 'mouseover',
        showUnused: true,
        snippetSuggestions: 'top',
        suggestOnTriggerCharacters: true,
        useTabStops: true,
        wordBasedSuggestions: true,
      });

      monacoRef.current = editor;

      // Set up change listener with minimal debouncing
      let changeTimeout: NodeJS.Timeout;
      const disposable = editor.onDidChangeModelContent((e) => {
        // Skip if this is an external change
        if (isExternalChangeRef.current) {
          return;
        }

        // Update the last external code ref to current value to prevent conflicts
        const newValue = editor.getValue();
        lastExternalCodeRef.current = newValue;

        // Only debounce if it's not a user typing event
        const isUserTyping = e.changes.some(change =>
          change.text.length === 1 && change.rangeLength === 0
        );

        clearTimeout(changeTimeout);
        const delay = isUserTyping ? 0 : 50; // No delay for typing, minimal for other changes

        changeTimeout = setTimeout(() => {
          onChange(newValue);
        }, delay);
      });

      // Focus the editor after a short delay to ensure it's ready
      setTimeout(() => {
        editor.focus();
        setIsEditorReady(true);
      }, 100);

      return () => {
        clearTimeout(changeTimeout);
        disposable.dispose();
        editor.dispose();
        monacoRef.current = null;
        setIsEditorReady(false);
      };
    } catch (error) {
      console.error('Failed to initialize Monaco Editor:', error);
    }
  }, [language]); // Re-initialize when language changes

  // Track if the change is from external source
  const isExternalChangeRef = useRef(false);
  const lastExternalCodeRef = useRef<string>('');

  // Update code when it changes externally (but not from user input)
  useEffect(() => {
    if (isEditorReady && monacoRef.current && code !== undefined) {
      const currentValue = monacoRef.current.getValue();

      // Only update if the code is different and it's not the same as what user is typing
      if (code !== currentValue && code !== lastExternalCodeRef.current) {
        lastExternalCodeRef.current = code;
        isExternalChangeRef.current = true;

        // Store cursor position before update
        const position = monacoRef.current.getPosition();
        const selection = monacoRef.current.getSelection();

        // Use setValue for external changes
        monacoRef.current.setValue(code);

        // Only restore cursor position if it was a template/language change (significant change)
        // For small changes, let cursor stay at end
        if (Math.abs(code.length - currentValue.length) > 10) {
          setTimeout(() => {
            if (position && monacoRef.current) {
              monacoRef.current.setPosition(position);
            }
            if (selection && monacoRef.current) {
              monacoRef.current.setSelection(selection);
            }
            monacoRef.current?.focus();
            isExternalChangeRef.current = false;
          }, 0);
        } else {
          isExternalChangeRef.current = false;
          monacoRef.current?.focus();
        }
      }
    }
  }, [code, isEditorReady]);



  // Update readonly state
  useEffect(() => {
    if (isEditorReady && monacoRef.current) {
      monacoRef.current.updateOptions({ readOnly: isLoading });
    }
  }, [isLoading, isEditorReady]);

  // Update theme when it changes
  useEffect(() => {
    if (isEditorReady && monacoRef.current) {
      const theme = actualTheme === 'dark' ? 'coding-dark' : 'vs';
      monaco.editor.setTheme(theme);

      // Update editor background to match theme
      const editorElement = editorRef.current;
      if (editorElement) {
        editorElement.style.backgroundColor = actualTheme === 'dark' ? '#111827' : '#ffffff';
      }
    }
  }, [actualTheme, isEditorReady]);

  const getDefaultCode = (lang: string): string => {
    // If we have initial code from the problem, use that
    if (problem?.initialCode?.[lang]) {
      return problem.initialCode[lang];
    }

    // Otherwise, provide language-specific templates
    switch (lang) {
      case 'java':
        return `class Solution {
    public void solve() {
        // Your code here
    }
}`;
      case 'python':
        return `class Solution:
    def solve(self):
        # Your code here
        pass`;
      case 'cpp':
        return `class Solution {
public:
    void solve() {
        // Your code here
    }
};`;
      case 'rust':
        return `fn solve() {
    // Your code here
}`;
      case 'go':
        return `package main

func solve() {
    // Your code here
}`;
      case 'javascript':
        return `/**
 * Write your solution here
 */
function solution() {
    // Your code here
}`;
      default:
        return '// Write your solution here';
    }
  };

  return (
    <div className="h-full w-full relative bg-white dark:bg-gray-900">
      <div ref={editorRef} className="h-full w-full bg-white dark:bg-gray-900" />
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};

export default ModernCodeEditor;
