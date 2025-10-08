import React, { useState } from 'react';
import {
    Zap,
    ChevronRight,
    ChevronDown,
    CheckCircle,
    AlertTriangle,
    XCircle,
    Clock,
    Database,
    Shield,
    TrendingUp,
    BookOpen
} from 'lucide-react';
import { AIFeedback, SecurityIssue } from '@/types/problemSolving';

interface AIFeedbackPanelProps {
    feedback: AIFeedback | null;
    isVisible: boolean;
    onClose: () => void;
}

const AIFeedbackPanel: React.FC<AIFeedbackPanelProps> = ({
    feedback,
    isVisible,
    onClose,
}) => {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(['quality', 'complexity'])
    );

    if (!isVisible || !feedback) {
        return null;
    }

    const toggleSection = (section: string) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(section)) {
            newExpanded.delete(section);
        } else {
            newExpanded.add(section);
        }
        setExpandedSections(newExpanded);
    };

    const getQualityColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-100';
        if (score >= 60) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'text-red-600 bg-red-100 border-red-200';
            case 'high':
                return 'text-orange-600 bg-orange-100 border-orange-200';
            case 'medium':
                return 'text-yellow-600 bg-yellow-100 border-yellow-200';
            case 'low':
                return 'text-blue-600 bg-blue-100 border-blue-200';
            default:
                return 'text-gray-600 bg-gray-100 border-gray-200';
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'critical':
            case 'high':
                return <XCircle className="h-4 w-4" />;
            case 'medium':
                return <AlertTriangle className="h-4 w-4" />;
            case 'low':
                return <CheckCircle className="h-4 w-4" />;
            default:
                return <AlertTriangle className="h-4 w-4" />;
        }
    };

    const sections = [
        {
            id: 'quality',
            title: 'Code Quality',
            icon: <CheckCircle className="h-5 w-5" />,
            content: (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Overall Score</span>
                        <span
                            className={`px-3 py-1 text-sm font-medium rounded-full ${getQualityColor(
                                feedback.codeQuality.score
                            )}`}
                        >
                            {feedback.codeQuality.score}/100
                        </span>
                    </div>

                    {feedback.codeQuality.suggestions.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Suggestions</h4>
                            <ul className="space-y-2">
                                {feedback.codeQuality.suggestions.map((suggestion, index) => (
                                    <li key={index} className="flex items-start space-x-2">
                                        <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-gray-700">{suggestion}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            ),
        },
        {
            id: 'complexity',
            title: 'Complexity Analysis',
            icon: <Clock className="h-5 w-5" />,
            content: (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center space-x-2 mb-1">
                                <Clock className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-900">Time Complexity</span>
                            </div>
                            <span className="text-lg font-mono text-blue-800">
                                {feedback.complexity.time}
                            </span>
                        </div>

                        <div className="p-3 bg-purple-50 rounded-lg">
                            <div className="flex items-center space-x-2 mb-1">
                                <Database className="h-4 w-4 text-purple-600" />
                                <span className="text-sm font-medium text-purple-900">Space Complexity</span>
                            </div>
                            <span className="text-lg font-mono text-purple-800">
                                {feedback.complexity.space}
                            </span>
                        </div>
                    </div>

                    {feedback.complexity.analysis && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Analysis</h4>
                            <p className="text-sm text-gray-700">{feedback.complexity.analysis}</p>
                        </div>
                    )}
                </div>
            ),
        },
        {
            id: 'security',
            title: 'Security Issues',
            icon: <Shield className="h-5 w-5" />,
            content: (
                <div className="space-y-3">
                    {feedback.security.issues.length === 0 ? (
                        <div className="flex items-center space-x-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm">No security issues detected</span>
                        </div>
                    ) : (
                        feedback.security.issues.map((issue, index) => (
                            <div
                                key={index}
                                className={`p-3 rounded-lg border ${getSeverityColor(issue.severity)}`}
                            >
                                <div className="flex items-start space-x-2">
                                    {getSeverityIcon(issue.severity)}
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium">{issue.type}</span>
                                            <span className="text-xs px-2 py-1 rounded uppercase font-medium">
                                                {issue.severity}
                                            </span>
                                        </div>
                                        <p className="text-sm mb-2">{issue.description}</p>
                                        {issue.line && (
                                            <p className="text-xs text-gray-600 mb-2">Line {issue.line}</p>
                                        )}
                                        <div className="text-xs">
                                            <span className="font-medium">Suggestion: </span>
                                            <span>{issue.suggestion}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ),
        },
        {
            id: 'performance',
            title: 'Performance Insights',
            icon: <TrendingUp className="h-5 w-5" />,
            content: (
                <div className="space-y-4">
                    {feedback.performance.suggestions.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Optimization Suggestions</h4>
                            <ul className="space-y-2">
                                {feedback.performance.suggestions.map((suggestion, index) => (
                                    <li key={index} className="flex items-start space-x-2">
                                        <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-gray-700">{suggestion}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {feedback.performance.bottlenecks.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Potential Bottlenecks</h4>
                            <ul className="space-y-2">
                                {feedback.performance.bottlenecks.map((bottleneck, index) => (
                                    <li key={index} className="flex items-start space-x-2">
                                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-gray-700">{bottleneck}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            ),
        },
    ];

    if (feedback.explanation) {
        sections.push({
            id: 'explanation',
            title: 'Code Explanation',
            icon: <BookOpen className="h-5 w-5" />,
            content: (
                <div className="prose prose-sm max-w-none">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {feedback.explanation}
                    </p>
                </div>
            ),
        });
    }

    return (
        <div className="border border-gray-200 rounded-lg bg-white">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                    <Zap className="h-5 w-5 text-blue-500" />
                    <h3 className="text-lg font-semibold text-gray-900">AI Code Analysis</h3>
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <XCircle className="h-5 w-5" />
                </button>
            </div>

            <div className="divide-y divide-gray-200">
                {sections.map((section) => (
                    <div key={section.id}>
                        <button
                            onClick={() => toggleSection(section.id)}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center space-x-3">
                                <div className="text-gray-600">{section.icon}</div>
                                <span className="text-sm font-medium text-gray-900">
                                    {section.title}
                                </span>
                            </div>
                            {expandedSections.has(section.id) ? (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                            ) : (
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                        </button>

                        {expandedSections.has(section.id) && (
                            <div className="px-4 pb-4">{section.content}</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AIFeedbackPanel;