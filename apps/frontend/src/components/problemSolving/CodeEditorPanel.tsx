import React, { useState, useEffect } from 'react';
import { Play, Send, RotateCcw, Settings, Lightbulb, Zap } from 'lucide-react';
import CodeEditor from '@/components/editor/CodeEditor';
import { LanguageConfig, CodeTemplate } from '@/types/problemSolving';

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
}

const SUPPORTED_LANGUAGES: LanguageConfig[] = [
    { value: 'javascript', label: 'JavaScript', monacoLanguage: 'javascript', fileExtension: 'js' },
    { value: 'python', label: 'Python', monacoLanguage: 'python', fileExtension: 'py' },
    { value: 'java', label: 'Java', monacoLanguage: 'java', fileExtension: 'java' },
    { value: 'cpp', label: 'C++', monacoLanguage: 'cpp', fileExtension: 'cpp' },
    { value: 'go', label: 'Go', monacoLanguage: 'go', fileExtension: 'go' },
    { value: 'rust', label: 'Rust', monacoLanguage: 'rust', fileExtension: 'rs' },
    { value: 'typescript', label: 'TypeScript', monacoLanguage: 'typescript', fileExtension: 'ts' },
    { value: 'csharp', label: 'C#', monacoLanguage: 'csharp', fileExtension: 'cs' },
];

const CODE_TEMPLATES: Record<string, CodeTemplate> = {
    javascript: {
        language: 'javascript',
        template: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var solution = function(nums, target) {
    // Your code here
    
};`
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
    pass`
    },
    java: {
        language: 'java',
        template: `class Solution {
    public int[] solution(int[] nums, int target) {
        // Your code here
        return new int[0];
    }
}`
    },
    cpp: {
        language: 'cpp',
        template: `class Solution {
public:
    vector<int> solution(vector<int>& nums, int target) {
        // Your code here
        return {};
    }
};`
    },
    go: {
        language: 'go',
        template: `func solution(nums []int, target int) []int {
    // Your code here
    return []int{}
}`
    },
    rust: {
        language: 'rust',
        template: `impl Solution {
    pub fn solution(nums: Vec<i32>, target: i32) -> Vec<i32> {
        // Your code here
        vec![]
    }
}`
    },
    typescript: {
        language: 'typescript',
        template: `function solution(nums: number[], target: number): number[] {
    // Your code here
    return [];
}`
    },
    csharp: {
        language: 'csharp',
        template: `public class Solution {
    public int[] Solution(int[] nums, int target) {
        // Your code here
        return new int[0];
    }
}`
    },
};

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
}) => {
    const [showSettings, setShowSettings] = useState(false);
    const [editorTheme, setEditorTheme] = useState<'light' | 'dark'>('light');
    const [fontSize, setFontSize] = useState(14);
    const [tabSize, setTabSize] = useState(2);

    const currentLanguageConfig = SUPPORTED_LANGUAGES.find(lang => lang.value === language);

    const handleLanguageChange = (newLanguage: string) => {
        onLanguageChange(newLanguage);
        // Auto-load template for new language if current code is empty or is a template
        const currentTemplate = CODE_TEMPLATES[language]?.template || '';
        if (!code.trim() || code.trim() === currentTemplate.trim()) {
            const newTemplate = CODE_TEMPLATES[newLanguage]?.template || '';
            onCodeChange(newTemplate);
        }
    };

    const handleResetCode = () => {
        const template = CODE_TEMPLATES[language]?.template || '';
        onCodeChange(template);
    };

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
                            onChange={(e) => handleLanguageChange(e.target.value)}
                            className="input w-auto min-w-[120px]"
                        >
                            {SUPPORTED_LANGUAGES.map((lang) => (
                                <option key={lang.value} value={lang.value}>
                                    {lang.label}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={handleResetCode}
                            className="btn-outline-sm flex items-center space-x-1"
                            title="Reset to template"
                        >
                            <RotateCcw className="h-3 w-3" />
                            <span>Reset</span>
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
                                    onChange={(e) => setEditorTheme(e.target.value as 'light' | 'dark')}
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
                                    onChange={(e) => setFontSize(Number(e.target.value))}
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
                                    onChange={(e) => setTabSize(Number(e.target.value))}
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