import { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Clock, Zap } from 'lucide-react';
import { Leaderboard as LeaderboardType, ContestParticipant } from '@/types/contest';
import { contestApi } from '@/services/api';
import socketService from '@/services/socket';

interface LeaderboardProps {
    contestId: string;
    showFullLeaderboard?: boolean;
    maxEntries?: number;
}

const Leaderboard: React.FC<LeaderboardProps> = ({
    contestId,
    showFullLeaderboard = false,
    maxEntries = 10
}) => {
    const [leaderboard, setLeaderboard] = useState<LeaderboardType | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    useEffect(() => {
        fetchLeaderboard();
        setupRealtimeUpdates();

        return () => {
            socketService.off('contest_update');
        };
    }, [contestId]);

    const fetchLeaderboard = async () => {
        try {
            setIsLoading(true);
            const data = await contestApi.getLeaderboard(contestId);
            setLeaderboard(data);
            setLastUpdate(new Date());
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const setupRealtimeUpdates = () => {
        socketService.onContestUpdate((data) => {
            if (data.type === 'leaderboard_update' && data.contestId === contestId) {
                setLeaderboard(data.leaderboard);
                setLastUpdate(new Date());
            }
        });
    };

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Trophy className="h-5 w-5 text-yellow-500" />;
            case 2:
                return <Medal className="h-5 w-5 text-gray-400" />;
            case 3:
                return <Award className="h-5 w-5 text-amber-600" />;
            default:
                return (
                    <div className="h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">{rank}</span>
                    </div>
                );
        }
    };

    const getRankColor = (rank: number) => {
        switch (rank) {
            case 1:
                return 'bg-yellow-50 border-yellow-200';
            case 2:
                return 'bg-gray-50 border-gray-200';
            case 3:
                return 'bg-amber-50 border-amber-200';
            default:
                return 'bg-white border-gray-200';
        }
    };

    const formatTime = (timeString: string) => {
        const date = new Date(timeString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatPenalty = (penalty: number) => {
        if (penalty === 0) return '-';
        const hours = Math.floor(penalty / 60);
        const minutes = penalty % 60;
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
                        Leaderboard
                    </h2>
                </div>
                <div className="p-6">
                    <div className="animate-pulse space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center space-x-3">
                                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                                <div className="flex-1">
                                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                </div>
                                <div className="h-4 bg-gray-200 rounded w-16"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!leaderboard) {
        return (
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
                        Leaderboard
                    </h2>
                </div>
                <div className="p-6 text-center text-gray-500">
                    No leaderboard data available
                </div>
            </div>
        );
    }

    const displayedParticipants = showFullLeaderboard
        ? leaderboard.participants
        : leaderboard.participants.slice(0, maxEntries);

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
                        Leaderboard
                    </h2>

                    <div className="flex items-center text-xs text-gray-500">
                        <Zap className="h-3 w-3 mr-1" />
                        Live
                    </div>
                </div>

                {leaderboard.isFrozen && (
                    <div className="mt-2 text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded">
                        Leaderboard is frozen
                    </div>
                )}
            </div>

            <div className="divide-y divide-gray-200">
                {displayedParticipants.map((participant) => (
                    <div
                        key={participant.id}
                        className={`p-4 transition-colors ${getRankColor(participant.rank)}`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                {getRankIcon(participant.rank)}

                                <div className="flex items-center space-x-2">
                                    {participant.avatar ? (
                                        <img
                                            src={participant.avatar}
                                            alt={participant.username}
                                            className="h-8 w-8 rounded-full"
                                        />
                                    ) : (
                                        <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                                            <span className="text-sm font-medium text-gray-600">
                                                {participant.username.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}

                                    <div>
                                        <div className="font-medium text-gray-900">
                                            {participant.username}
                                        </div>
                                        {participant.lastSubmissionTime && (
                                            <div className="text-xs text-gray-500 flex items-center">
                                                <Clock className="h-3 w-3 mr-1" />
                                                {formatTime(participant.lastSubmissionTime)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="font-semibold text-gray-900">
                                    {participant.totalScore}
                                </div>
                                {participant.penalty > 0 && (
                                    <div className="text-xs text-red-600">
                                        -{formatPenalty(participant.penalty)}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Problem status indicators */}
                        <div className="mt-3 flex space-x-1">
                            {participant.submissions.reduce((acc, submission) => {
                                const existing = acc.find(s => s.problemId === submission.problemId);
                                if (!existing || submission.submittedAt > existing.submittedAt) {
                                    const index = acc.findIndex(s => s.problemId === submission.problemId);
                                    if (index >= 0) {
                                        acc[index] = submission;
                                    } else {
                                        acc.push(submission);
                                    }
                                }
                                return acc;
                            }, [] as typeof participant.submissions).map((submission) => (
                                <div
                                    key={submission.problemId}
                                    className={`w-3 h-3 rounded-sm ${submission.status === 'accepted'
                                            ? 'bg-green-500'
                                            : 'bg-red-500'
                                        }`}
                                    title={`Problem ${submission.problemId}: ${submission.status}`}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {!showFullLeaderboard && leaderboard.participants.length > maxEntries && (
                <div className="px-6 py-3 bg-gray-50 text-center">
                    <span className="text-sm text-gray-500">
                        Showing top {maxEntries} of {leaderboard.participants.length} participants
                    </span>
                </div>
            )}

            <div className="px-6 py-3 bg-gray-50 text-xs text-gray-500 text-center">
                Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
        </div>
    );
};

export default Leaderboard;