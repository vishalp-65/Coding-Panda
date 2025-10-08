export interface ExecutionResult {
    status: 'success' | 'error' | 'timeout' | 'memory_limit' | 'runtime_error';
    output?: string;
    error?: string;
    executionTime: number;
    memoryUsed: number;
    testResults: TestResult[];
}

export interface TestResult {
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
    executionTime?: number;
    memoryUsed?: number;
}

export interface Submission {
    id: string;
    problemId: string;
    userId: string;
    code: string;
    language: string;
    status: 'accepted' | 'wrong_answer' | 'time_limit_exceeded' | 'memory_limit_exceeded' | 'runtime_error' | 'compilation_error';
    executionTime?: number;
    memoryUsed?: number;
    submittedAt: string;
    testResults?: TestResult[];
}

export interface Hint {
    id: string;
    level: number;
    content: string;
    type: 'conceptual' | 'implementation' | 'optimization';
    revealed: boolean;
}

export interface AIFeedback {
    codeQuality: {
        score: number;
        suggestions: string[];
    };
    complexity: {
        time: string;
        space: string;
        analysis: string;
    };
    security: {
        issues: SecurityIssue[];
    };
    performance: {
        suggestions: string[];
        bottlenecks: string[];
    };
    explanation?: string;
}

export interface SecurityIssue {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    line?: number;
    suggestion: string;
}

export interface CodeTemplate {
    language: string;
    template: string;
}

export interface LanguageConfig {
    value: string;
    label: string;
    monacoLanguage: string;
    fileExtension: string;
}