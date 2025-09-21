import React from 'react';
import { BookmarkIcon, ThumbsUp, MessageSquare, Clock, Database, Users } from 'lucide-react';
import { Problem } from '@/store/slices/problemsSlice';

interface ProblemDisplayProps {
    problem: Problem;
    activeTab: 'description' | 'editorial' | 'submissions' | 'discussion';
    onTabChange: (tab: 'description' | 'editorial' | 'submissions' | 'discussion') => void;
    onBookmark?: () => void;
    onLike?: () => void;
    isBookmarked?: boolean;
    isLiked?: boolean;
}

const ProblemDisplay: React.FC<ProblemDisplayProps> = ({
    problem,
    activeTab,
    onTabChange,
    onBookmark,
    onLike,
    isBookmarked = false,
    isLiked = false,
}) => {
    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy':
                return 'text-green-600 bg-green-100';
            case 'medium':
                return 'text-yellow-600 bg-yellow-100';
            case 'hard':
                return 'text-red-600 bg-red-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    const formatDescription = (description: string) => {
        // Convert markdown-like formatting to HTML
        return description
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
            .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-3 rounded-md overflow-x-auto"><code>$1</code></pre>')
            .replace(/\n/g, '<br>');
    };

    return (
        <div className="card flex-1 flex flex-col">
            <div className="card-header">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <h1 className="text-xl font-bold text-gray-900">{problem.title}</h1>
                        <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(
                                problem.difficulty
                            )}`}
                        >
                            {problem.difficulty}
                        </span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={onBookmark}
                            className={`p-2 transition-colors ${isBookmarked ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
                                }`}
                        >
                            <BookmarkIcon className="h-4 w-4" fill={isBookmarked ? 'currentColor' : 'none'} />
                        </button>
                        <button
                            onClick={onLike}
                            className={`p-2 transition-colors ${isLiked ? 'text-green-500' : 'text-gray-400 hover:text-green-500'
                                }`}
                        >
                            <ThumbsUp className="h-4 w-4" fill={isLiked ? 'currentColor' : 'none'} />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-blue-500 transition-colors">
                            <MessageSquare className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center space-x-6 text-sm text-gray-500 mt-2">
                    <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>Acceptance Rate: {problem.statistics.acceptanceRate}%</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <Database className="h-4 w-4" />
                        <span>{problem.statistics.totalSubmissions.toLocaleString()} submissions</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>Time Limit: {problem.constraints.timeLimit}ms</span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                    {problem.tags.map((tag) => (
                        <span
                            key={tag}
                            className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-md border border-blue-200"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </div>

            <div className="card-content flex-1 flex flex-col">
                <div className="flex border-b border-gray-200 mb-4">
                    {[
                        { key: 'description', label: 'Description' },
                        { key: 'editorial', label: 'Editorial' },
                        { key: 'submissions', label: 'Submissions' },
                        { key: 'discussion', label: 'Discussion' },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => onTabChange(tab.key as any)}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.key
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="overflow-y-auto flex-1">
                    {activeTab === 'description' && (
                        <div className="prose prose-sm max-w-none">
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: formatDescription(problem.description)
                                }}
                            />

                            {problem.testCases && problem.testCases.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="text-lg font-semibold mb-3">Examples</h3>
                                    {problem.testCases
                                        .filter(tc => !tc.isHidden)
                                        .map((testCase, index) => (
                                            <div key={index} className="mb-4 p-4 bg-gray-50 rounded-lg">
                                                <h4 className="font-medium mb-2">Example {index + 1}:</h4>
                                                <div className="space-y-2">
                                                    <div>
                                                        <span className="font-medium">Input:</span>
                                                        <pre className="bg-white p-2 rounded border mt-1 text-sm overflow-x-auto">
                                                            {testCase.input}
                                                        </pre>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Output:</span>
                                                        <pre className="bg-white p-2 rounded border mt-1 text-sm overflow-x-auto">
                                                            {testCase.expectedOutput}
                                                        </pre>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}

                            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                <h3 className="text-lg font-semibold mb-2">Constraints</h3>
                                <div className="text-sm space-y-1">
                                    <div>Time Limit: {problem.constraints.timeLimit}ms</div>
                                    <div>Memory Limit: {problem.constraints.memoryLimit}MB</div>
                                    {problem.constraints.inputFormat && (
                                        <div>Input Format: {problem.constraints.inputFormat}</div>
                                    )}
                                    {problem.constraints.outputFormat && (
                                        <div>Output Format: {problem.constraints.outputFormat}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'editorial' && (
                        <div className="text-center py-12 text-gray-500">
                            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium mb-2">Editorial Coming Soon</p>
                            <p className="text-sm">
                                The editorial will be available after you solve the problem or after the contest ends.
                            </p>
                        </div>
                    )}

                    {activeTab === 'submissions' && (
                        <div className="text-center py-12 text-gray-500">
                            <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium mb-2">No Submissions Yet</p>
                            <p className="text-sm">
                                Your submission history will appear here after you submit solutions.
                            </p>
                        </div>
                    )}

                    {activeTab === 'discussion' && (
                        <div className="text-center py-12 text-gray-500">
                            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium mb-2">Join the Discussion</p>
                            <p className="text-sm">
                                Share your thoughts and learn from other developers' approaches.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProblemDisplay;