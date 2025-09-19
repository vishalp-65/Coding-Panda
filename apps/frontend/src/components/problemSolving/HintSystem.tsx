import React, { useState } from 'react';
import { Lightbulb, ChevronRight, ChevronDown, Eye, EyeOff, HelpCircle } from 'lucide-react';
import { Hint } from '@/types/problemSolving';

interface HintSystemProps {
    hints: Hint[];
    onRevealHint: (hintId: string) => void;
    onRequestMoreHints: () => void;
    isLoading: boolean;
}

const HintSystem: React.FC<HintSystemProps> = ({
    hints,
    onRevealHint,
    onRequestMoreHints,
    isLoading,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const getHintTypeColor = (type: string) => {
        switch (type) {
            case 'conceptual':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'implementation':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'optimization':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getHintTypeIcon = (type: string) => {
        switch (type) {
            case 'conceptual':
                return <HelpCircle className="h-3 w-3" />;
            case 'implementation':
                return <Lightbulb className="h-3 w-3" />;
            case 'optimization':
                return <ChevronRight className="h-3 w-3" />;
            default:
                return <Lightbulb className="h-3 w-3" />;
        }
    };

    const revealedHints = hints.filter(hint => hint.revealed);
    const nextHint = hints.find(hint => !hint.revealed);

    if (hints.length === 0) {
        return null;
    }

    return (
        <div className="border border-gray-200 rounded-lg bg-white">
            <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center space-x-3">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    <h3 className="text-sm font-medium text-gray-900">
                        Hints ({revealedHints.length}/{hints.length})
                    </h3>
                </div>

                <div className="flex items-center space-x-2">
                    {revealedHints.length > 0 && (
                        <span className="text-xs text-gray-500">
                            {revealedHints.length} revealed
                        </span>
                    )}
                    {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="border-t border-gray-200 p-4">
                    {/* Revealed Hints */}
                    {revealedHints.length > 0 && (
                        <div className="space-y-3 mb-4">
                            {revealedHints
                                .sort((a, b) => a.level - b.level)
                                .map((hint) => (
                                    <div
                                        key={hint.id}
                                        className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-xs font-medium text-yellow-800">
                                                    Hint {hint.level}
                                                </span>
                                                <span
                                                    className={`px-2 py-1 text-xs font-medium rounded border ${getHintTypeColor(
                                                        hint.type
                                                    )}`}
                                                >
                                                    <div className="flex items-center space-x-1">
                                                        {getHintTypeIcon(hint.type)}
                                                        <span className="capitalize">{hint.type}</span>
                                                    </div>
                                                </span>
                                            </div>
                                            <Eye className="h-4 w-4 text-yellow-600" />
                                        </div>
                                        <p className="text-sm text-yellow-800">{hint.content}</p>
                                    </div>
                                ))}
                        </div>
                    )}

                    {/* Next Hint */}
                    {nextHint && (
                        <div className="mb-4">
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs font-medium text-gray-600">
                                            Hint {nextHint.level}
                                        </span>
                                        <span
                                            className={`px-2 py-1 text-xs font-medium rounded border ${getHintTypeColor(
                                                nextHint.type
                                            )}`}
                                        >
                                            <div className="flex items-center space-x-1">
                                                {getHintTypeIcon(nextHint.type)}
                                                <span className="capitalize">{nextHint.type}</span>
                                            </div>
                                        </span>
                                    </div>
                                    <EyeOff className="h-4 w-4 text-gray-400" />
                                </div>

                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-600">
                                        Click to reveal the next hint
                                    </p>
                                    <button
                                        onClick={() => onRevealHint(nextHint.id)}
                                        className="btn-outline-sm flex items-center space-x-1"
                                    >
                                        <Eye className="h-3 w-3" />
                                        <span>Reveal</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Request More Hints */}
                    {!nextHint && hints.length > 0 && (
                        <div className="text-center">
                            <button
                                onClick={onRequestMoreHints}
                                disabled={isLoading}
                                className="btn-outline flex items-center space-x-2 mx-auto"
                            >
                                <Lightbulb className="h-4 w-4" />
                                <span>{isLoading ? 'Generating...' : 'Get More Hints'}</span>
                            </button>
                        </div>
                    )}

                    {/* No Hints Available */}
                    {hints.length === 0 && (
                        <div className="text-center py-6">
                            <Lightbulb className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm text-gray-500 mb-3">
                                No hints available yet
                            </p>
                            <button
                                onClick={onRequestMoreHints}
                                disabled={isLoading}
                                className="btn-primary flex items-center space-x-2 mx-auto"
                            >
                                <Lightbulb className="h-4 w-4" />
                                <span>{isLoading ? 'Generating...' : 'Get First Hint'}</span>
                            </button>
                        </div>
                    )}

                    {/* Hint Usage Warning */}
                    {revealedHints.length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start space-x-2">
                                <HelpCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                <div className="text-xs text-blue-700">
                                    <p className="font-medium mb-1">Hint Usage</p>
                                    <p>
                                        Using hints may affect your problem-solving score. Try to solve
                                        the problem independently first for the best learning experience.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default HintSystem;