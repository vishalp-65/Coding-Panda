import { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { configureMonaco } from '@/utils/monacoConfig';
import { useTheme } from '@/contexts/ThemeContext';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  theme?: 'light' | 'dark';
  height?: string;
  readOnly?: boolean;
  options?: editor.IStandaloneEditorConstructionOptions;
}

const CodeEditor = ({
  value,
  onChange,
  language,
  theme,
  height = '100%',
  readOnly = false,
  options = {},
}: CodeEditorProps) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const { actualTheme } = useTheme();

  // Use theme from context if not provided
  const editorTheme = theme || actualTheme;

  useEffect(() => {
    configureMonaco();
  }, []);

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    // Focus the editor
    setTimeout(() => {
      editor.focus();
    }, 100);

    // Monaco editor handles standard shortcuts automatically
    // Just ensure the editor is properly configured
    editor.updateOptions({
      contextmenu: true,
      selectOnLineNumbers: true,
      mouseWheelZoom: true,
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && !readOnly) {
      onChange(value);
    }
  };

  const defaultOptions: editor.IStandaloneEditorConstructionOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    fontFamily: 'JetBrains Mono, Consolas, Monaco, "Courier New", monospace',
    lineNumbers: 'on',
    roundedSelection: false,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    insertSpaces: true,
    wordWrap: 'on',
    readOnly,
    contextmenu: true,
    selectOnLineNumbers: true,
    mouseWheelZoom: true,
    smoothScrolling: true,
    cursorBlinking: 'blink',
    renderWhitespace: 'selection',
    bracketPairColorization: {
      enabled: true,
    },
    quickSuggestions: {
      other: true,
      comments: true,
      strings: true,
    },
    // Enable all standard editing features
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
    links: true,
    matchBrackets: 'always',
    occurrencesHighlight: true,
    parameterHints: {
      enabled: true,
    },
    renderControlCharacters: false,
    renderFinalNewline: 'on',
    renderLineHighlight: 'line',
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
    snippetSuggestions: 'top',
    suggestOnTriggerCharacters: true,
    useTabStops: true,
    ...options,
  };

  return (
    <div className="w-full h-full overflow-hidden">
      <Editor
        height={height}
        language={language}
        value={value}
        theme={editorTheme === 'dark' ? 'vs-dark' : 'vs'}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={defaultOptions}
        loading={
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        }
      />
    </div>
  );
};

export default CodeEditor;
