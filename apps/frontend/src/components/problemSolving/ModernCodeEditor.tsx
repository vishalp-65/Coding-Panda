import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';

interface ModernCodeEditorProps {
    code: string;
    language: string;
    onChange: (value: string) => void;
    problem?: any; // Problem data containing initial code
}

const ModernCodeEditor = ({ code, language, onChange, problem }: ModernCodeEditorProps) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const monacoRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

    useEffect(() => {
        if (editorRef.current && !monacoRef.current) {
            // Configure Monaco theme
            monaco.editor.defineTheme('dark-theme', {
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

            monacoRef.current = monaco.editor.create(editorRef.current, {
                value: getDefaultCode(language),
                language: getMonacoLanguage(language),
                theme: 'dark-theme',
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
                readOnly: false,
                cursorStyle: 'line',
            });

            monacoRef.current.onDidChangeModelContent(() => {
                if (monacoRef.current) {
                    onChange(monacoRef.current.getValue());
                }
            });
        }

        return () => {
            if (monacoRef.current) {
                monacoRef.current.dispose();
                monacoRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (monacoRef.current && code !== monacoRef.current.getValue()) {
            monacoRef.current.setValue(code);
        }
    }, [code]);

    useEffect(() => {
        if (monacoRef.current) {
            const model = monacoRef.current.getModel();
            if (model) {
                monaco.editor.setModelLanguage(model, getMonacoLanguage(language));
                if (!code) {
                    monacoRef.current.setValue(getDefaultCode(language));
                }
            }
        }
    }, [language]);

    const getMonacoLanguage = (lang: string) => {
        switch (lang) {
            case 'javascript': return 'javascript';
            case 'python': return 'python';
            case 'java': return 'java';
            case 'cpp': return 'cpp';
            default: return 'javascript';
        }
    };

    const getDefaultCode = (lang: string) => {
        // If we have initial code from the problem, use that
        if (problem?.initialCode?.[lang]) {
            return problem.initialCode[lang];
        }

        // If there's existing code, use it
        if (code && code.trim()) {
            return code;
        }

        // Otherwise, provide language-specific templates
        switch (lang) {
            case 'javascript':
                return `/**
 * Write your solution here
 */
function solution() {
    // Your code here
}`;
            case 'python':
                return `class Solution:
    def solve(self):
        # Your code here
        pass`;
            case 'java':
                return `class Solution {
    public void solve() {
        // Your code here
    }
}`;
            case 'cpp':
                return `class Solution {
public:
    void solve() {
        // Your code here
    }
};`;
            default:
                return '// Write your solution here';
        }
    };

    return <div ref={editorRef} className="h-full w-full" />;
};

export default ModernCodeEditor;