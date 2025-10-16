// Monaco Editor configuration
import * as monaco from 'monaco-editor';

// Configure Monaco Editor workers
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import { CodeTemplate, LanguageConfig } from '@/types/problemSolving';

let isConfigured = false;

export const configureMonaco = () => {
  if (isConfigured) return;

  // Configure Monaco Environment
  (self as any).MonacoEnvironment = {
    getWorker(_: any, label: string) {
      if (label === 'json') {
        return new jsonWorker();
      }
      if (label === 'css' || label === 'scss' || label === 'less') {
        return new cssWorker();
      }
      if (label === 'html' || label === 'handlebars' || label === 'razor') {
        return new htmlWorker();
      }
      if (label === 'typescript' || label === 'javascript') {
        return new tsWorker();
      }
      return new editorWorker();
    },
  };

  // Define custom theme
  monaco.editor.defineTheme('coding-dark', {
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
      'editor.background': '#111827',
      'editor.foreground': '#D4D4D8',
      'editorLineNumber.foreground': '#6B7280',
      'editor.selectionBackground': '#374151',
      'editor.lineHighlightBackground': '#1F2937',
      'editorCursor.foreground': '#FFFFFF',
      'editor.findMatchBackground': '#515C6A',
      'editor.findMatchHighlightBackground': '#EA5906',
    },
  });

  isConfigured = true;
};

export const getMonacoLanguage = (lang: string): string => {
  const languageMap: Record<string, string> = {
    javascript: 'javascript',
    python: 'python',
    java: 'java',
    cpp: 'cpp',
    rust: 'rust',
    go: 'go',
    typescript: 'typescript',
  };
  return languageMap[lang] || 'plaintext';
};

export const CODE_TEMPLATES: Record<string, CodeTemplate> = {
  javascript: {
    language: 'javascript',
    template: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var solution = function(nums, target) {
    // Your code here
    
};`,
  },
  python: {
    language: 'python',
    template: `def solution(nums, target):
    """
    :type nums: List[int]
    :type target: int
    :rtype: List[int]
    """
    # Your code here
    pass`,
  },
  java: {
    language: 'java',
    template: `class Solution {
    public int[] solution(int[] nums, int target) {
        // Your code here
        return new int[0];
    }
}`,
  },
  cpp: {
    language: 'cpp',
    template: `class Solution {
public:
    vector<int> solution(vector<int>& nums, int target) {
        // Your code here
        return {};
    }
};`,
  },
  go: {
    language: 'go',
    template: `func solution(nums []int, target int) []int {
    // Your code here
    return []int{}
}`,
  },
  rust: {
    language: 'rust',
    template: `impl Solution {
    pub fn solution(nums: Vec<i32>, target: i32) -> Vec<i32> {
        // Your code here
        vec![]
    }
}`,
  },
  typescript: {
    language: 'typescript',
    template: `function solution(nums: number[], target: number): number[] {
    // Your code here
    return [];
}`,
  },
};

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    value: 'javascript',
    label: 'JavaScript',
    monacoLanguage: 'javascript',
    fileExtension: 'js',
  },
  {
    value: 'python',
    label: 'Python',
    monacoLanguage: 'python',
    fileExtension: 'py',
  },
  {
    value: 'java',
    label: 'Java',
    monacoLanguage: 'java',
    fileExtension: 'java',
  },
  { value: 'cpp', label: 'C++', monacoLanguage: 'cpp', fileExtension: 'cpp' },
  { value: 'go', label: 'Go', monacoLanguage: 'go', fileExtension: 'go' },
  { value: 'rust', label: 'Rust', monacoLanguage: 'rust', fileExtension: 'rs' },
  {
    value: 'typescript',
    label: 'TypeScript',
    monacoLanguage: 'typescript',
    fileExtension: 'ts',
  },
  {
    value: 'csharp',
    label: 'C#',
    monacoLanguage: 'csharp',
    fileExtension: 'cs',
  },
];

export const createEditorOptions = (
  isReadOnly = false
): monaco.editor.IStandaloneEditorConstructionOptions => ({
  fontSize: 14,
  fontFamily: 'JetBrains Mono, Consolas, Monaco, "Courier New", monospace',
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
  readOnly: isReadOnly,
  cursorStyle: 'line',
  theme: 'coding-dark',
  contextmenu: true,
  mouseWheelZoom: true,
  smoothScrolling: true,
  cursorBlinking: 'blink',
  renderWhitespace: 'selection',
  bracketPairColorization: {
    enabled: true,
  },
});
