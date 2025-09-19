import React, { useState } from 'react';
import {
    History,
    CheckCircle,
    XCircle,
    Clock,
    Database,
    Code,
    Calendar,
    ChevronRight,
    ChevronDown,
    Eye,
    GitCompare
} from 'lucide-react';
import { Submission } from '@/types/problemSolving';

interface SubmissionHistoryProps {
    submissions: Submission[];
    onViewSubmission: (submission: Submission) => void;
    onCompareSubmissions: (submission1: Submission, submission2: Submission) => void;
    isLoading: boolean;
}

const SubmissionHistory: React.FC<SubmissionHistoryProps> = ({
    submissions,
    onViewSubmission,
    onCompareSubmissions,
    isLoading,
}) => {
    const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);
    const [selectedForComparison, setSelectedForComparison] = useState<Submission[]>([]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'accepted':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'wrong_answer':
                return <XCircle className="h-4 w-4 text-red-500" />;
            case 'time_limit_exceeded':
                return <Clock className="h-4 w-4 text-yellow-500" />;
            case 'memory_limit_exceeded':
                return <Database className="h-4 w-4 text-orange-500" />;
            case 'runtime_error':
                return <XCircle className="h-4 w-4 text-red-500" />;
            case 'compilation_error':
                return <Code className="h-4 w-4 text-red-500" />;
            default:
                return <XCircle className="h-4 w-4 text-gray-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'accepted':
                return 'text-green-600 bg-green-100 border-green-200';
            case 'wrong_answer':
                return 'text-red-600 bg-red-100 border-red-200';
            case 'time_limit_exceeded':
                return 'text-yellow-600 bg-yellow-100 border-yellow-200';
            case 'memory_limit_exceeded':
                return 'text-orange-600 bg-orange-100 border-orange-200';
            case 'runtime_error':
                return 'text-red-600 bg-red-100 border-red-200';
            case 'compilation_error':
                return 'text-red-600 bg-red-100 border-red-200';
            default:
                return 'text-gray-600 bg-gray-100 border-gray-200';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'accepted':
                return 'Accepted';
            case 'wrong_answer':
                return 'Wrong Answer';
            case 'time_limit_exceeded':
                return 'Time Limit Exceeded';
            case 'memory_limit_exceeded':
                return 'Memory Limit Exceeded';
            case 'runtime_error':
                return 'Runtime Error';
            case 'compilation_error':
                return 'Compilation Error';
            default:
                return 'Unknown';
        }
    };

    const formatTime = (time?: number) => {
        if (!time) return 'N/A';
        if (time < 1000) return `${time}ms`;
        return `${(time / 1000).toFixed(2)}s`;
    };

    const formatMemory = (memory?: number) => {
        if (!memory) return 'N/A';
        if (memory < 1024) return `${memory}KB`;
        return `${(memory / 1024).toFixed(2)}MB`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    const toggleSubmissionExpansion = (submissionId: string) => {
        setExpandedSubmission(
            expandedSubmission === submissionId ? null : submissionId
        );
    };

    const handleComparisonSelection = (submission: Submission) => {
        if (selectedForComparison.includes(submission)) {
            setSelectedForComparison(
                selectedForComparison.filter(s => s.id !== submission.id)
            );
        } else if (selectedForComparison.length < 2) {
            setSelectedForComparison([...selectedForComparison, submission]);
        }
    };

    const handleCompare = () => {
        if (selectedForComparison.length === 2) {
            onCompareSubmissions(selectedForComparison[0], selectedForComparison[1]);
            setSelectedForComparison([]);
        }
    };

    if (isLoading) {
        return (
            <div className="border border-gray-200 rounded-lg bg-white p-6">
                <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading submissions...</span>
                </div>
            </div>
        );
    }

    if (submissions.length === 0) {
        return (
            <div className="border border-gray-200 rounded-lg bg-white p-6">
                <div className="text-center">
                    <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Submissions Yet</h3>
                    <p className="text-sm text-gray-500">
                        Your submission history will appear here after you submit solutions.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="border border-gray-200 rounded-lg bg-white">
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <History className="h-5 w-5 text-gray-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                            Submission History ({submissions.length})
                        </h3>
                    </div>

                    {selectedForComparison.length === 2 && (
                        <button
                            onClick={handleCompare}
                            className="btn-primary flex items-center space-x-2"
                        >
                            <GitCompare className="h-4 w-4" />
                            <span>Compare Selected</span>
                        </button>
                    )}
                </div>

                {selectedForComparison.length > 0 && (
                    <div className="mt-2 text-sm text-blue-600">
                        {selectedForComparison.length}/2 submissions selected for comparison
                    </div>
                )}
            </div>

            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {submissions.map((submission) => (
                    <div key={submission.id} className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <input
                                    type="checkbox"
                                    checked={selectedForComparison.includes(submission)}
                                    onChange={() => handleComparisonSelection(submission)}
                                    disabled={
                                        !selectedForComparison.includes(submission) &&
                                        selectedForComparison.length >= 2
                                    }
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />

                                {getStatusIcon(submission.status)}

                                <div>
                                    <div className="flex items-center space-x-2">
                                        <span
                                            className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(
                                                submission.status
                                            )}`}
                                        >
                                            {getStatusText(submission.status)}
                                        </span>
                                        <span className="text-sm text-gray-600">{submission.language}</span>
                                    </div>

                                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                                        <div className="flex items-center space-x-1">
                                            <Calendar className="h-3 w-3" />
                                            <span>{formatDate(submission.submittedAt)}</span>
                                        </div>
                                        {submission.executionTime && (
                                            <div className="flex items-center space-x-1">
                                                <Clock className="h-3 w-3" />
                                                <span>{formatTime(submission.executionTime)}</span>
                                            </div>
                                        )}
                                        {submission.memoryUsed && (
                                            <div className="flex items-center space-x-1">
                                                <Database className="h-3 w-3" />
                                                <span>{formatMemory(submission.memoryUsed)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => onViewSubmission(submission)}
                                    className="btn-outline-sm flex items-center space-x-1"
                                >
                                    <Eye className="h-3 w-3" />
                                    <span>View</span>
                                </button>

                                <button
                                    onClick={() => toggleSubmissionExpansion(submission.id)}
                                    className="p-1 text-gray-400 hover:text-gray-600"
                                >
                                    {expandedSubmission === submission.id ? (
                                        <ChevronDown className="h-4 w-4" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {expandedSubmission === submission.id && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Code Preview</h4>
                                <pre className="text-xs bg-white p-3 rounded border overflow-x-auto max-h-32">
                                    <code>{submission.code}</code>
                                </pre>

                                {submission.testResults && submission.testResults.length > 0 && (
                                    <div className="mt-3">
                                        <h4 className="text-sm font-medium text-gray-900 mb-2">Test Results</h4>
                                        <div className="flex items-center space-x-4 text-xs">
                                            <span className="text-green-600">
                                                Passed: {submission.testResults.filter(t => t.passed).length}
                                            </span>
                                            <span className="text-red-600">
                                                Failed: {submission.testResults.filter(t => !t.passed).length}
                                            </span>
                                            <span className="text-gray-600">
                                                Total: {submission.testResults.length}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SubmissionHistory;