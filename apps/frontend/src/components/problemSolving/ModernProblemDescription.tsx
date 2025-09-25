import { useState } from 'react';
import {
    BookOpen,
    MessageSquare,
    History,
    Bookmark,
    BookmarkCheck,
    ThumbsUp,
    ThumbsDown,
    Share,
    BarChart3
} from 'lucide-react';

interface Problem {
    id: string;
    title: string;
    difficulty: 'easy' | 'medium' | 'hard';
    description: string;
    tags: string[];
    statistics: {
        totalSubmissions: number;
        acceptedSubmissions: number;
        acceptanceRate: number;
    };
}

interface ModernProblemDescriptionProps {
    problem: Problem;
}

const ModernProblemDescription = ({ problem }: ModernProblemDescriptionProps) => {
    const [activeTab, setActiveTab] = useState<'description' | 'editorial' | 'submissions' | 'discuss'>('description');
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [liked, setLiked] = useState<boolean | null>(null);

    const tabs = [
        { id: 'description', label: 'Description', icon: BookOpen },
        { id: 'editorial', label: 'Editorial', icon: BookOpen },
        { id: 'submissions', label: 'Submissions', icon: History },
        { id: 'discuss', label: 'Discuss', icon: MessageSquare },
    ];

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'hard': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    const formatNumber = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    return (
        <div className="h-full flex flex-col bg-gray-900">
            {/* Header */}
            <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getDifficultyColor(problem.difficulty)}`}>
                            {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
                        </span>
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                            <div className="flex items-center space-x-1">
                                <BarChart3 className="h-4 w-4" />
                                <span>{problem.statistics.acceptanceRate}%</span>
                            </div>
                            <span>{formatNumber(problem.statistics.totalSubmissions)} submissions</span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setLiked(liked === true ? null : true)}
                            className={`p-2 rounded-md transition-colors ${liked === true ? 'bg-green-500/20 text-green-400' : 'hover:bg-gray-700 text-gray-400'
                                }`}
                        >
                            <ThumbsUp className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setLiked(liked === false ? null : false)}
                            className={`p-2 rounded-md transition-colors ${liked === false ? 'bg-red-500/20 text-red-400' : 'hover:bg-gray-700 text-gray-400'
                                }`}
                        >
                            <ThumbsDown className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setIsBookmarked(!isBookmarked)}
                            className={`p-2 rounded-md transition-colors ${isBookmarked ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-gray-700 text-gray-400'
                                }`}
                        >
                            {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                        </button>
                        <button className="p-2 rounded-md hover:bg-gray-700 text-gray-400 transition-colors">
                            <Share className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                    {problem.tags.map((tag) => (
                        <span
                            key={tag}
                            className="px-2 py-1 bg-gray-700 text-gray-300 rounded-md text-xs hover:bg-gray-600 cursor-pointer transition-colors"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-700">
                <nav className="flex space-x-1 px-4">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center space-x-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-400'
                                    : 'border-transparent text-gray-400 hover:text-gray-300'
                                }`}
                        >
                            <tab.icon className="h-4 w-4" />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'description' && (
                    <div className="prose prose-invert max-w-none">
                        <div
                            className="text-gray-300 leading-relaxed"
                            dangerouslySetInnerHTML={{
                                __html: problem.description
                                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                                    .replace(/\*(.*?)\*/g, '<em class="text-gray-400">$1</em>')
                                    .replace(/`(.*?)`/g, '<code class="bg-gray-800 text-blue-400 px-1 py-0.5 rounded text-sm">$1</code>')
                                    .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-800 p-3 rounded-md overflow-x-auto"><code class="text-gray-300">$1</code></pre>')
                                    .replace(/\n/g, '<br>')
                            }}
                        />
                    </div>
                )}

                {activeTab === 'editorial' && (
                    <div className="text-center py-12">
                        <BookOpen className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">Editorial coming soon...</p>
                    </div>
                )}

                {activeTab === 'submissions' && (
                    <div className="text-center py-12">
                        <History className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">No submissions yet</p>
                    </div>
                )}

                {activeTab === 'discuss' && (
                    <div className="text-center py-12">
                        <MessageSquare className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">Join the discussion...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModernProblemDescription;