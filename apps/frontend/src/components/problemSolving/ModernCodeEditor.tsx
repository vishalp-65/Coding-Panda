import { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import { getMonacoLanguage } from '@/utils/monacoConfig';

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

  // Configure Monaco Editor environment once
  useEffect(() => {
    // Configure Monaco Environment if not already configured
    if (!(window as any).MonacoEnvironment) {
      (window as any).MonacoEnvironment = {
        getWorkerUrl: function (moduleId: string, label: string) {
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
    if (!editorRef.current || monacoRef.current) return;

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
        theme: 'coding-dark',
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
      });

      monacoRef.current = editor;
      setIsEditorReady(true);

      // Set up change listener
      const disposable = editor.onDidChangeModelContent(() => {
        onChange(editor.getValue());
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
  }, []);

  // Update code when it changes externally
  useEffect(() => {
    if (isEditorReady && monacoRef.current && code !== undefined) {
      const currentValue = monacoRef.current.getValue();
      if (code !== currentValue) {
        const position = monacoRef.current.getPosition();
        monacoRef.current.setValue(code);
        if (position) {
          monacoRef.current.setPosition(position);
        }
      }
    }
  }, [code, isEditorReady]);

  // Update language when it changes
  useEffect(() => {
    if (isEditorReady && monacoRef.current) {
      const model = monacoRef.current.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, getMonacoLanguage(language));
      }
    }
  }, [language, isEditorReady]);

  // Update readonly state
  useEffect(() => {
    if (isEditorReady && monacoRef.current) {
      monacoRef.current.updateOptions({ readOnly: isLoading });
    }
  }, [isLoading, isEditorReady]);

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
    <div className="h-full w-full relative">
      <div ref={editorRef} className="h-full w-full" />
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};

export default ModernCodeEditor;
