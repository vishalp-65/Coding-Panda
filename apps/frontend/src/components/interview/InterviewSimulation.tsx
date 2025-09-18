import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, Clock, Brain, MessageSquare, FileText } from 'lucide-react';
import { InterviewSession, InterviewQuestion } from '@/types/collaboration';
import { Editor } from '@monaco-editor/react';
import toast from 'react-hot-toast';

const InterviewSimulation: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();

    const [session, setSession] = useState<InterviewSession | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
    const [code, setCode] = useState('');
    const [notes, setNotes] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [aiResponse, setAiResponse] = useState('');
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [showHints, setShowHints] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    useEffect(() => {
        if (sessionId) {
            fetchInterviewSession();
            setupMediaDevices();
        }

        return () => {
            cleanup();
        };
    }, [sessionId]);

    useEffect(() => {
        if (currentQuestion?.timeLimit) {
            const timer = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        handleTimeUp();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [currentQuestion]);

    const fetchInterviewSession = async () => {
        try {
            // Mock data for demonstration
            const mockSession: InterviewSession = {
                id: sessionId!,
                candidateId: 'current-user',
                type: 'technical',
                difficulty: 'mid',
                company: 'TechCorp',
                position: 'Software Engineer',
                status: 'in_progress',
                startTime: new Date().toISOString(),
                duration: 60,
                questions: [
                    {
                        id: '1',
                        type: 'coding',
                        question: 'Implement a function to find the longest palindromic substring in a given string.',
                        context: 'This is a classic string manipulation problem that tests your understanding of algorithms and optimization.',
                        hints: [
                            'Consider the expand around centers approach',
                            'Think about dynamic programming solutions',
                            'What about Manacher\'s algorithm for optimal solution?'
                        ],
                        difficulty: 'medium',
                        timeLimit: 30,
                        startedAt: new Date().toISOString()
                    }
                ],
                settings: {
                    allowHints: true,
                    recordSession: true,
                    enableAIAnalysis: true,
                    showTimer: true,
                    allowNotes: true,
                    language: 'javascript'
                }
            };

            setSession(mockSession);
            setCurrentQuestion(mockSession.questions[0]);
            setTimeRemaining(mockSession.questions[0].timeLimit! * 60); // Convert to seconds
        } catch (error) {
            console.error('Failed to fetch interview session:', error);
            toast.error('Failed to load interview session');
        }
    };

    const setupMediaDevices = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            // Setup recording if enabled
            if (session?.settings.recordSession) {
                mediaRecorderRef.current = new MediaRecorder(stream);
                setIsRecording(true);
            }
        } catch (error) {
            console.error('Failed to setup media devices:', error);
            toast.error('Failed to access camera/microphone');
        }
    };

    const cleanup = () => {
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const handleTimeUp = () => {
        toast.custom('Time is up for this question!');
        // Auto-submit or move to next question
    };

    const handleSubmitAnswer = async () => {
        if (!currentQuestion || !session) return;

        try {
            setIsAiThinking(true);

            const answer = {
                content: aiResponse,
                code: currentQuestion.type === 'coding' ? code : undefined,
                language: currentQuestion.type === 'coding' ? session.settings.language : undefined
            };

            // Mock AI analysis
            setTimeout(() => {
                const mockAnalysis = {
                    score: Math.floor(Math.random() * 40) + 60, // 60-100
                    feedback: 'Good approach! Your solution demonstrates understanding of the problem. Consider optimizing the time complexity.',
                    strengths: ['Clear problem understanding', 'Correct implementation', 'Good variable naming'],
                    improvements: ['Time complexity could be optimized', 'Consider edge cases', 'Add more comments']
                };

                setCurrentQuestion(prev => prev ? {
                    ...prev,
                    answeredAt: new Date().toISOString(),
                    answer,
                    aiAnalysis: mockAnalysis
                } : null);

                setIsAiThinking(false);
                toast.success('Answer submitted successfully!');
            }, 2000);

        } catch (error) {
            console.error('Failed to submit answer:', error);
            toast.error('Failed to submit answer');
            setIsAiThinking(false);
        }
    };

    const handleGetHint = () => {
        if (!currentQuestion?.hints || !session?.settings.allowHints) return;

        setShowHints(true);
        toast.custom('Hint revealed! This may affect your score.');
    };

    const toggleMute = () => {
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = isMuted;
                setIsMuted(!isMuted);
            }
        }
    };

    const toggleVideo = () => {
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !isVideoOn;
                setIsVideoOn(!isVideoOn);
            }
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!session || !currentQuestion) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading interview session...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900">
                                {session.company} - {session.position} Interview
                            </h1>
                            <p className="text-sm text-gray-600">
                                {session.type} • {session.difficulty} level
                            </p>
                        </div>

                        <div className="flex items-center space-x-4">
                            {session.settings.showTimer && (
                                <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${timeRemaining < 300 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                    }`}>
                                    <Clock className="h-4 w-4" />
                                    <span className="font-mono">{formatTime(timeRemaining)}</span>
                                </div>
                            )}

                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={toggleMute}
                                    className={`p-2 rounded-lg ${isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                                        }`}
                                >
                                    {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                </button>

                                <button
                                    onClick={toggleVideo}
                                    className={`p-2 rounded-lg ${!isVideoOn ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                                        }`}
                                >
                                    {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                                </button>

                                {isRecording && (
                                    <div className="flex items-center space-x-1 text-red-600">
                                        <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                                        <span className="text-sm">Recording</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Question */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">Question</h2>
                                <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                                        currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                        {currentQuestion.difficulty}
                                    </span>
                                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                                        {currentQuestion.type}
                                    </span>
                                </div>
                            </div>

                            <div className="prose max-w-none">
                                <p className="text-gray-900 mb-4">{currentQuestion.question}</p>
                                {currentQuestion.context && (
                                    <p className="text-gray-600 text-sm">{currentQuestion.context}</p>
                                )}
                            </div>

                            {session.settings.allowHints && currentQuestion.hints && (
                                <div className="mt-4">
                                    <button
                                        onClick={handleGetHint}
                                        className="btn-secondary flex items-center space-x-2"
                                    >
                                        <Brain className="h-4 w-4" />
                                        <span>Get Hint</span>
                                    </button>

                                    {showHints && (
                                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                                            <h4 className="font-medium text-yellow-800 mb-2">Hints:</h4>
                                            <ul className="text-sm text-yellow-700 space-y-1">
                                                {currentQuestion.hints.map((hint, index) => (
                                                    <li key={index}>• {hint}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Code Editor (for coding questions) */}
                        {currentQuestion.type === 'coding' && (
                            <div className="bg-white rounded-lg shadow">
                                <div className="p-4 border-b border-gray-200">
                                    <h3 className="font-semibold text-gray-900">Code Editor</h3>
                                </div>
                                <div className="h-96">
                                    <Editor
                                        height="100%"
                                        language={session.settings.language}
                                        value={code}
                                        onChange={(value) => setCode(value || '')}
                                        theme="vs-dark"
                                        options={{
                                            fontSize: 14,
                                            minimap: { enabled: false },
                                            scrollBeyondLastLine: false,
                                            wordWrap: 'on'
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Response Area */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="font-semibold text-gray-900 mb-4">Your Response</h3>
                            <textarea
                                value={aiResponse}
                                onChange={(e) => setAiResponse(e.target.value)}
                                placeholder="Explain your approach, thought process, and solution..."
                                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                            />

                            <div className="flex items-center justify-between mt-4">
                                <span className="text-sm text-gray-500">
                                    {aiResponse.length}/1000 characters
                                </span>

                                <button
                                    onClick={handleSubmitAnswer}
                                    disabled={isAiThinking || (!aiResponse.trim() && !code.trim())}
                                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                                >
                                    {isAiThinking ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                            <span>Analyzing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <MessageSquare className="h-4 w-4" />
                                            <span>Submit Answer</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* AI Feedback */}
                        {currentQuestion.aiAnalysis && (
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="font-semibold text-gray-900 mb-4">AI Feedback</h3>

                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-700">Score</span>
                                        <span className="text-lg font-bold text-primary-600">
                                            {currentQuestion.aiAnalysis.score}/100
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-primary-600 h-2 rounded-full"
                                            style={{ width: `${currentQuestion.aiAnalysis.score}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-2">Feedback</h4>
                                        <p className="text-gray-700">{currentQuestion.aiAnalysis.feedback}</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="font-medium text-green-800 mb-2">Strengths</h4>
                                            <ul className="text-sm text-green-700 space-y-1">
                                                {currentQuestion.aiAnalysis.strengths.map((strength, index) => (
                                                    <li key={index}>• {strength}</li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div>
                                            <h4 className="font-medium text-amber-800 mb-2">Areas for Improvement</h4>
                                            <ul className="text-sm text-amber-700 space-y-1">
                                                {currentQuestion.aiAnalysis.improvements.map((improvement, index) => (
                                                    <li key={index}>• {improvement}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Video Feed */}
                        <div className="bg-white rounded-lg shadow p-4">
                            <h3 className="font-semibold text-gray-900 mb-3">Video</h3>
                            <div className="relative">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    className="w-full h-48 bg-gray-900 rounded-lg object-cover"
                                />
                                {!isVideoOn && (
                                    <div className="absolute inset-0 bg-gray-900 rounded-lg flex items-center justify-center">
                                        <VideoOff className="h-8 w-8 text-gray-400" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Notes */}
                        {session.settings.allowNotes && (
                            <div className="bg-white rounded-lg shadow p-4">
                                <div className="flex items-center space-x-2 mb-3">
                                    <FileText className="h-4 w-4 text-gray-500" />
                                    <h3 className="font-semibold text-gray-900">Notes</h3>
                                </div>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Take notes during the interview..."
                                    className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-sm"
                                />
                            </div>
                        )}

                        {/* Progress */}
                        <div className="bg-white rounded-lg shadow p-4">
                            <h3 className="font-semibold text-gray-900 mb-3">Progress</h3>
                            <div className="space-y-2">
                                {session.questions.map((question, index) => (
                                    <div
                                        key={question.id}
                                        className={`flex items-center space-x-2 p-2 rounded ${question.id === currentQuestion.id
                                            ? 'bg-primary-100 text-primary-800'
                                            : question.answeredAt
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-600'
                                            }`}
                                    >
                                        <span className="text-sm font-medium">Q{index + 1}</span>
                                        <span className="text-sm">{question.type}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InterviewSimulation;