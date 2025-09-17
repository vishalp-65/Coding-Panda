import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Trophy, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import ContestTimer from './ContestTimer';
import Leaderboard from './Leaderboard';
import { Contest, ContestSubmission } from '@/types/contest';
import { contestApi } from '@/services/api';
import socketService from '@/services/socket';
import toast from 'react-hot-toast';

const ContestParticipation: React.FC = () => {
    const { contestId } = useParams<{ contestId: string }>();
    const navigate = useNavigate();
    const [contest, setContest] = useState<Contest | null>(null);
    const [submissions, setSubmissions] = useState<ContestSubmission[]>([]);
    const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!contestId) return;

        fetchContestData();
        joinContestRoom();

        return () => {
            leaveContestRoom();
        };
    }, [contestId]);

    const fetchContestData = async () => {
        try {
            setIsLoading(true);
            const contestData = await contestApi.getContest(contestId!);
            setContest(contestData);

            // Fetch user's submissions for this contest
            const userSubmissions = await contestApi.getUserSubmissions(contestId!);
            setSubmissions(userSubmissions);
        } catch (error) {
            console.error('Failed to fetch contest data:', error);
            toast.error('Failed to load contest data');
        } finally {
            setIsLoading(false);
        }
    };

    const joinContestRoom = () => {
        socketService.joinRoom(`contest_${contestId}`);

        // Listen for real-time updates
        socketService.onContestUpdate((data) => {
            if (data.type === 'leaderboard_update') {
                // Leaderboard component will handle this
            } else if (data.type === 'submission_result') {
                handleSubmissionResult(data.submission);
            }
        });
    };

    const leaveContestRoom = () => {
        socketService.leaveRoom(`contest_${contestId}`);
        socketService.off('contest_update');
    };

    const handleSubmissionResult = (submission: ContestSubmission) => {
        setSubmissions(prev => {
            const existingIndex = prev.findIndex(s => s.id === submission.id);
            if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = submission;
                return updated;
            }
            return [...prev, submission];
        });

        // Show toast notification
        const statusMessages = {
            accepted: 'Solution accepted! 🎉',
            wrong_answer: 'Wrong answer. Try again!',
            time_limit_exceeded: 'Time limit exceeded',
            memory_limit_exceeded: 'Memory limit exceeded',
            runtime_error: 'Runtime error occurred',
            compilation_error: 'Compilation error'
        };

        toast[submission.status === 'accepted' ? 'success' : 'error'](
            statusMessages[submission.status] || 'Submission processed'
        );
    };

    const handleStatusChange = (newStatus: 'upcoming' | 'live' | 'ended') => {
        if (contest) {
            setContest({ ...contest, status: newStatus });
        }
    };

    const navigateToProblem = (problemIndex: number) => {
        if (!contest) return;

        const problem = contest.problems[problemIndex];
        navigate(`/contests/${contestId}/problems/${problem.id}`, {
            state: { contest, problemIndex }
        });
    };

    const getProblemStatus = (problemId: string) => {
        const problemSubmissions = submissions.filter(s => s.problemId === problemId);
        const acceptedSubmission = problemSubmissions.find(s => s.status === 'accepted');

        if (acceptedSubmission) return 'solved';
        if (problemSubmissions.length > 0) return 'attempted';
        return 'not_attempted';
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'solved':
                return <CheckCircle className="h-5 w-5 text-green-600" />;
            case 'attempted':
                return <AlertCircle className="h-5 w-5 text-yellow-600" />;
            default:
                return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'solved':
                return 'bg-green-50 border-green-200 text-green-800';
            case 'attempted':
                return 'bg-yellow-50 border-yellow-200 text-yellow-800';
            default:
                return 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50';
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading contest...</p>
                </div>
            </div>
        );
    }

    if (!contest) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Contest not found</h2>
                    <p className="text-gray-600 mb-4">The contest you're looking for doesn't exist or has been removed.</p>
                    <button
                        onClick={() => navigate('/contests')}
                        className="btn-primary"
                    >
                        Back to Contests
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Contest Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{contest.title}</h1>
                            <p className="text-gray-600 mt-1">{contest.description}</p>
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className="flex items-center text-sm text-gray-500">
                                <Users className="h-4 w-4 mr-1" />
                                {contest.participants} participants
                            </div>

                            <ContestTimer
                                startTime={contest.startTime}
                                endTime={contest.endTime}
                                status={contest.status}
                                onStatusChange={handleStatusChange}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Problems List */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg shadow">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                    <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
                                    Problems
                                </h2>
                            </div>

                            <div className="divide-y divide-gray-200">
                                {contest.problems.map((problem, index) => {
                                    const status = getProblemStatus(problem.id);

                                    return (
                                        <div
                                            key={problem.id}
                                            className={`p-6 cursor-pointer transition-colors ${getStatusColor(status)}`}
                                            onClick={() => navigateToProblem(index)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    {getStatusIcon(status)}
                                                    <div>
                                                        <h3 className="font-medium">
                                                            {String.fromCharCode(65 + index)}. {problem.title}
                                                        </h3>
                                                        <div className="flex items-center space-x-2 mt-1">
                                                            <span className={`text-xs px-2 py-1 rounded ${problem.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                                                                    problem.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                                        'bg-red-100 text-red-800'
                                                                }`}>
                                                                {problem.difficulty}
                                                            </span>
                                                            <span className="text-sm text-gray-500">
                                                                {problem.points} points
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    {status === 'solved' && (
                                                        <div className="text-sm text-green-600 font-medium">
                                                            Solved
                                                        </div>
                                                    )}
                                                    {status === 'attempted' && (
                                                        <div className="text-sm text-yellow-600">
                                                            {submissions.filter(s => s.problemId === problem.id).length} attempts
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Leaderboard */}
                    <div className="lg:col-span-1">
                        <Leaderboard contestId={contestId!} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContestParticipation;