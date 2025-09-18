import { useRef } from 'react';
import Editor from '@monaco-editor/react';
import { editor, KeyMod, KeyCode } from 'monaco-editor';

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
  theme = 'light',
  height = '400px',
  readOnly = false,
  options = {},
}: CodeEditorProps) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    // Focus the editor
    editor.focus();

    // Set up keyboard shortcuts
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyS, () => {
      // Handle save (could trigger submission)
      console.log('Save shortcut pressed');
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };

  const defaultOptions: editor.IStandaloneEditorConstructionOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on',
    roundedSelection: false,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    insertSpaces: true,
    wordWrap: 'on',
    readOnly,
    ...options,
  };

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      <Editor
        height={height}
        language={language}
        value={value}
        theme={theme === 'dark' ? 'vs-dark' : 'vs'}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={defaultOptions}
        loading={
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        }
      />
    </div>
  );
};

export default CodeEditor;
