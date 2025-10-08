import React from 'react';
import { CheckCircle, XCircle, Clock, Database, AlertTriangle, Bug } from 'lucide-react';
import { ExecutionResult, TestResult } from '@/types/problemSolving';

interface TestResultsPanelProps {
    executionResult: ExecutionResult | null;
    isVisible: boolean;
}

const TestResultsPanel: React.FC<TestResultsPanelProps> = ({
    executionResult,
    isVisible,
}) => {
    if (!isVisible || !executionResult) {
        return null;
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'error':
            case 'runtime_error':
                return <XCircle className="h-5 w-5 text-red-500" />;
            case 'timeout':
                return <Clock className="h-5 w-5 text-yellow-500" />;
            case 'memory_limit':
                return <Database className="h-5 w-5 text-orange-500" />;
            default:
                return <AlertTriangle className="h-5 w-5 text-gray-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success':
                return 'text-green-600 bg-green-50 border-green-200';
            case 'error':
            case 'runtime_error':
                return 'text-red-600 bg-red-50 border-red-200';
            case 'timeout':
                return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'memory_limit':
                return 'text-orange-600 bg-orange-50 border-orange-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'success':
                return 'Success';
            case 'error':
                return 'Error';
            case 'runtime_error':
                return 'Runtime Error';
            case 'timeout':
                return 'Time Limit Exceeded';
            case 'memory_limit':
                return 'Memory Limit Exceeded';
            default:
                return 'Unknown';
        }
    };

    const formatTime = (time: number) => {
        if (time < 1000) {
            return `${time}ms`;
        }
        return `${(time / 1000).toFixed(2)}s`;
    };

    const formatMemory = (memory: number) => {
        if (memory < 1024) {
            return `${memory}KB`;
        }
        return `${(memory / 1024).toFixed(2)}MB`;
    };

    const passedTests = executionResult.testResults.filter(test => test.passed).length;
    const totalTests = executionResult.testResults.length;

    return (
        <div className="border-t border-gray-200 bg-white">
            <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        {getStatusIcon(executionResult.status)}
                        <h3 className="text-lg font-semibold text-gray-900">
                            Execution Results
                        </h3>
                        <span
                            className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(
                                executionResult.status
                            )}`}
                        >
                            {getStatusText(executionResult.status)}
                        </span>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatTime(executionResult.executionTime)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <Database className="h-4 w-4" />
                            <span>{formatMemory(executionResult.memoryUsed)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <CheckCircle className="h-4 w-4" />
                            <span>{passedTests}/{totalTests} passed</span>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {executionResult.error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start space-x-2">
                            <Bug className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <h4 className="text-sm font-medium text-red-800 mb-1">Error Details</h4>
                                <pre className="text-sm text-red-700 whitespace-pre-wrap font-mono">
                                    {executionResult.error}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}

                {/* Output */}
                {executionResult.output && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">Output</h4>
                        <pre className="text-sm text-blue-700 whitespace-pre-wrap font-mono">
                            {executionResult.output}
                        </pre>
                    </div>
                )}

                {/* Test Results */}
                <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-900">Test Cases</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {executionResult.testResults.map((result, index) => (
                            <div
                                key={index}
                                className={`p-3 rounded-lg border ${result.passed
                                        ? 'bg-green-50 border-green-200'
                                        : 'bg-red-50 border-red-200'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                        {result.passed ? (
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-red-500" />
                                        )}
                                        <span className="text-sm font-medium">
                                            Test Case {index + 1}
                                        </span>
                                    </div>

                                    <div className="flex items-center space-x-3 text-xs text-gray-600">
                                        {result.executionTime && (
                                            <span>{formatTime(result.executionTime)}</span>
                                        )}
                                        {result.memoryUsed && (
                                            <span>{formatMemory(result.memoryUsed)}</span>
                                        )}
                                        <span
                                            className={`px-2 py-1 rounded ${result.passed
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                }`}
                                        >
                                            {result.passed ? 'Passed' : 'Failed'}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                    <div>
                                        <div className="font-medium text-gray-700 mb-1">Input:</div>
                                        <pre className="bg-white p-2 rounded border text-gray-800 overflow-x-auto">
                                            {result.input}
                                        </pre>
                                    </div>

                                    <div>
                                        <div className="font-medium text-gray-700 mb-1">Expected:</div>
                                        <pre className="bg-white p-2 rounded border text-gray-800 overflow-x-auto">
                                            {result.expected}
                                        </pre>
                                    </div>

                                    <div>
                                        <div className="font-medium text-gray-700 mb-1">Actual:</div>
                                        <pre
                                            className={`p-2 rounded border overflow-x-auto ${result.passed
                                                    ? 'bg-white text-gray-800'
                                                    : 'bg-red-50 text-red-800 border-red-200'
                                                }`}
                                        >
                                            {result.actual}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TestResultsPanel;