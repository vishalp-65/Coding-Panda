import {
    CheckCircle,
    XCircle,
    Clock,
    Database,
    X,
    AlertTriangle,
    Play
} from 'lucide-react';
import { ExecutionResult } from '@/types/problemSolving';

interface ModernTestResultsProps {
    executionResult: ExecutionResult | null;
    onClose: () => void;
}

const ModernTestResults = ({ executionResult, onClose }: ModernTestResultsProps) => {
    if (!executionResult) {
        return (
            <div className="h-full bg-gray-900 border-t border-gray-700">
                <div className="flex items-center justify-between p-3 border-b border-gray-700">
                    <h3 className="text-sm font-medium text-white">Console</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="p-4 text-center">
                    <Play className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Run your code to see results</p>
                </div>
            </div>
        );
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="h-5 w-5 text-green-400" />;
            case 'error':
            case 'runtime_error':
                return <XCircle className="h-5 w-5 text-red-400" />;
            case 'timeout':
                return <Clock className="h-5 w-5 text-yellow-400" />;
            default:
                return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success': return 'text-green-400';
            case 'error':
            case 'runtime_error': return 'text-red-400';
            case 'timeout': return 'text-yellow-400';
            default: return 'text-yellow-400';
        }
    };

    const passedTests = executionResult.testResults?.filter(test => test.passed).length || 0;
    const totalTests = executionResult.testResults?.length || 0;

    return (
        <div className="h-full bg-gray-900 border-t border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-700">
                <div className="flex items-center space-x-3">
                    <h3 className="text-sm font-medium text-white">Test Results</h3>
                    <div className="flex items-center space-x-2">
                        {getStatusIcon(executionResult.status)}
                        <span className={`text-sm font-medium ${getStatusColor(executionResult.status)}`}>
                            {executionResult.status === 'success' ? 'Accepted' : 'Failed'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-4 text-xs text-gray-400">
                        <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{executionResult.executionTime}ms</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <Database className="h-3 w-3" />
                            <span>{(executionResult.memoryUsed / 1024).toFixed(1)}KB</span>
                        </div>
                        <span>{passedTests}/{totalTests} passed</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Test cases */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {executionResult.testResults?.map((test, index) => (
                    <div
                        key={index}
                        className={`p-3 rounded-lg border ${test.passed
                                ? 'bg-green-500/10 border-green-500/30'
                                : 'bg-red-500/10 border-red-500/30'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                                {test.passed ? (
                                    <CheckCircle className="h-4 w-4 text-green-400" />
                                ) : (
                                    <XCircle className="h-4 w-4 text-red-400" />
                                )}
                                <span className="text-sm font-medium text-white">
                                    Test Case {index + 1}
                                </span>
                            </div>
                            <div className="flex items-center space-x-3 text-xs text-gray-400">
                                {test.executionTime && (
                                    <div className="flex items-center space-x-1">
                                        <Clock className="h-3 w-3" />
                                        <span>{test.executionTime}ms</span>
                                    </div>
                                )}
                                {test.memoryUsed && (
                                    <div className="flex items-center space-x-1">
                                        <Database className="h-3 w-3" />
                                        <span>{(test.memoryUsed / 1024).toFixed(1)}KB</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2 text-sm">
                            <div>
                                <span className="text-gray-400">Input:</span>
                                <div className="bg-gray-800 p-2 rounded mt-1 font-mono text-gray-300">
                                    {test.input}
                                </div>
                            </div>

                            <div>
                                <span className="text-gray-400">Expected:</span>
                                <div className="bg-gray-800 p-2 rounded mt-1 font-mono text-gray-300">
                                    {test.expected}
                                </div>
                            </div>

                            <div>
                                <span className="text-gray-400">Output:</span>
                                <div className={`p-2 rounded mt-1 font-mono ${test.passed ? 'bg-gray-800 text-gray-300' : 'bg-red-900/30 text-red-300'
                                    }`}>
                                    {test.actual}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {executionResult.error && (
                    <div className="p-3 rounded-lg border bg-red-500/10 border-red-500/30">
                        <div className="flex items-center space-x-2 mb-2">
                            <XCircle className="h-4 w-4 text-red-400" />
                            <span className="text-sm font-medium text-white">Runtime Error</span>
                        </div>
                        <div className="bg-red-900/30 p-2 rounded font-mono text-sm text-red-300">
                            {executionResult.error}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModernTestResults;