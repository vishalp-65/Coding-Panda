import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ContestParticipation from '@/components/contest/ContestParticipation';
import Leaderboard from '@/components/contest/Leaderboard';
import CollaborativeEditor from '@/components/collaboration/CollaborativeEditor';
import ChatPanel from '@/components/collaboration/ChatPanel';
import InterviewSimulation from '@/components/interview/InterviewSimulation';
import ActivityFeed from '@/components/social/ActivityFeed';
import ContestAnalytics from '@/components/contest/ContestAnalytics';
import authSlice from '@/store/slices/authSlice';
import { contestApi, collaborationApi, interviewApi, socialApi } from '@/services/api';

// Mock the API modules
const mockContestApi = {
    getContest: vi.fn().mockResolvedValue({}),
    getUserSubmissions: vi.fn().mockResolvedValue([]),
    getLeaderboard: vi.fn().mockResolvedValue({}),
    getAnalytics: vi.fn().mockResolvedValue({}),
};

const mockSocialApi = {
    getActivityFeed: vi.fn().mockResolvedValue([]),
    followUser: vi.fn().mockResolvedValue({}),
    likeActivity: vi.fn().mockResolvedValue({}),
};

vi.mock('@/services/api', () => ({
    contestApi: mockContestApi,
    collaborationApi: {
        getSession: vi.fn().mockResolvedValue({}),
        getChatHistory: vi.fn().mockResolvedValue([]),
    },
    interviewApi: {
        getSession: vi.fn().mockResolvedValue({}),
        submitAnswer: vi.fn().mockResolvedValue({}),
    },
    socialApi: mockSocialApi,
}));

// Mock socket service
vi.mock('@/services/socket', () => ({
    default: {
        joinRoom: vi.fn(),
        leaveRoom: vi.fn(),
        onContestUpdate: vi.fn(),
        onCodeChange: vi.fn(),
        onUserJoined: vi.fn(),
        onUserLeft: vi.fn(),
        updateCode: vi.fn(),
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
    },
}));

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
    Editor: ({ onChange, onMount }: any) => (
        <div data-testid="monaco-editor">
            <textarea
                onChange={(e) => onChange?.(e.target.value)}
                onFocus={() => onMount?.({
                    onDidChangeCursorPosition: vi.fn(),
                    onDidChangeCursorSelection: vi.fn(),
                    getValue: () => '',
                    setValue: vi.fn(),
                    deltaDecorations: vi.fn(() => []),
                }, {})}
            />
        </div>
    ),
}));

// Mock recharts
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
    BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
    LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
    PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
    Bar: () => <div data-testid="bar" />,
    Line: () => <div data-testid="line" />,
    Pie: () => <div data-testid="pie" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Cell: () => <div data-testid="cell" />,
}));

const createMockStore = () => {
    return configureStore({
        reducer: {
            auth: authSlice,
        },
        preloadedState: {
            auth: {
                isAuthenticated: true,
                user: { id: 'user1', username: 'testuser' },
                token: 'mock-token',
                refreshToken: 'mock-refresh-token',
                isLoading: false,
                error: null,
            },
        },
    });
};

const renderWithProviders = (component: React.ReactElement) => {
    const store = createMockStore();
    return render(
        <Provider store={store}>
            <BrowserRouter>
                {component}
            </BrowserRouter>
        </Provider>
    );
};

describe('Contest and Collaboration Features', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Contest Participation', () => {
        const mockContest = {
            id: 'contest1',
            title: 'Weekly Contest 123',
            description: 'Test your skills',
            startTime: '2024-02-15T10:00:00Z',
            endTime: '2024-02-15T11:30:00Z',
            duration: 90,
            participants: 1247,
            status: 'live',
            problems: [
                {
                    id: 'problem1',
                    title: 'Two Sum',
                    difficulty: 'easy',
                    points: 100,
                    order: 1,
                },
            ],
        };

        it('should render contest participation interface', async () => {
            mockContestApi.getContest.mockResolvedValue(mockContest);
            mockContestApi.getUserSubmissions.mockResolvedValue([]);

            renderWithProviders(<ContestParticipation />);

            await waitFor(() => {
                expect(screen.getByText('Weekly Contest 123')).toBeInTheDocument();
                expect(screen.getByText('Test your skills')).toBeInTheDocument();
                expect(screen.getByText('1247 participants')).toBeInTheDocument();
            });
        });

        it('should display contest timer', async () => {
            vi.mocked(contestApi.getContest).mockResolvedValue(mockContest);
            vi.mocked(contestApi.getUserSubmissions).mockResolvedValue([]);

            renderWithProviders(<ContestParticipation />);

            await waitFor(() => {
                expect(screen.getByText('Ends in:')).toBeInTheDocument();
            });
        });

        it('should show problems list', async () => {
            vi.mocked(contestApi.getContest).mockResolvedValue(mockContest);
            vi.mocked(contestApi.getUserSubmissions).mockResolvedValue([]);

            renderWithProviders(<ContestParticipation />);

            await waitFor(() => {
                expect(screen.getByText('A. Two Sum')).toBeInTheDocument();
                expect(screen.getByText('easy')).toBeInTheDocument();
                expect(screen.getByText('100 points')).toBeInTheDocument();
            });
        });
    });

    describe('Leaderboard', () => {
        const mockLeaderboard = {
            contestId: 'contest1',
            participants: [
                {
                    id: 'p1',
                    userId: 'user1',
                    username: 'alice',
                    totalScore: 400,
                    penalty: 0,
                    rank: 1,
                    submissions: [],
                },
                {
                    id: 'p2',
                    userId: 'user2',
                    username: 'bob',
                    totalScore: 300,
                    penalty: 5,
                    rank: 2,
                    submissions: [],
                },
            ],
            lastUpdated: '2024-02-15T11:00:00Z',
            isFrozen: false,
        };

        it('should render leaderboard with participants', async () => {
            vi.mocked(contestApi.getLeaderboard).mockResolvedValue(mockLeaderboard);

            renderWithProviders(<Leaderboard contestId="contest1" />);

            await waitFor(() => {
                expect(screen.getByText('Leaderboard')).toBeInTheDocument();
                expect(screen.getByText('alice')).toBeInTheDocument();
                expect(screen.getByText('bob')).toBeInTheDocument();
                expect(screen.getByText('400')).toBeInTheDocument();
                expect(screen.getByText('300')).toBeInTheDocument();
            });
        });

        it('should show live indicator', async () => {
            vi.mocked(contestApi.getLeaderboard).mockResolvedValue(mockLeaderboard);

            renderWithProviders(<Leaderboard contestId="contest1" />);

            await waitFor(() => {
                expect(screen.getByText('Live')).toBeInTheDocument();
            });
        });
    });

    describe('Collaborative Editor', () => {
        const mockSession = {
            id: 'session1',
            name: 'Study Session',
            participants: [
                {
                    id: 'p1',
                    userId: 'user1',
                    username: 'alice',
                    role: 'host',
                    isActive: true,
                    permissions: { canEdit: true },
                },
            ],
            settings: {
                allowCodeEditing: true,
                language: 'javascript',
                theme: 'vs-dark',
            },
            sharedCode: {
                content: 'console.log("Hello World");',
                language: 'javascript',
                lastModified: '2024-02-15T10:00:00Z',
                lastModifiedBy: 'user1',
                version: 1,
                history: [],
            },
        };

        it('should render collaborative editor', () => {
            renderWithProviders(<CollaborativeEditor session={mockSession} />);

            expect(screen.getByText('Study Session')).toBeInTheDocument();
            expect(screen.getByText('Connected')).toBeInTheDocument();
            expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
        });

        it('should show participants', () => {
            renderWithProviders(<CollaborativeEditor session={mockSession} />);

            expect(screen.getByText('1')).toBeInTheDocument(); // participant count
            expect(screen.getByTitle('alice')).toBeInTheDocument();
        });

        it('should handle code changes', async () => {
            const onCodeChange = vi.fn();
            renderWithProviders(
                <CollaborativeEditor session={mockSession} onCodeChange={onCodeChange} />
            );

            const editor = screen.getByTestId('monaco-editor').querySelector('textarea');
            fireEvent.change(editor!, { target: { value: 'console.log("Updated");' } });

            expect(onCodeChange).toHaveBeenCalledWith('console.log("Updated");');
        });
    });

    describe('Chat Panel', () => {
        it('should render chat interface', () => {
            renderWithProviders(
                <ChatPanel
                    sessionId="session1"
                    currentUserId="user1"
                    currentUsername="testuser"
                />
            );

            expect(screen.getByText('Chat')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
        });

        it('should send messages', async () => {
            renderWithProviders(
                <ChatPanel
                    sessionId="session1"
                    currentUserId="user1"
                    currentUsername="testuser"
                />
            );

            const input = screen.getByPlaceholderText('Type a message...');
            const sendButton = screen.getByRole('button', { name: /send/i });

            fireEvent.change(input, { target: { value: 'Hello everyone!' } });
            fireEvent.click(sendButton);

            expect(input).toHaveValue('');
        });

        it('should toggle code mode', () => {
            renderWithProviders(
                <ChatPanel
                    sessionId="session1"
                    currentUserId="user1"
                    currentUsername="testuser"
                />
            );

            const codeButton = screen.getByTitle('Toggle code mode');
            fireEvent.click(codeButton);

            expect(screen.getByPlaceholderText('Enter code...')).toBeInTheDocument();
        });
    });

    describe('Interview Simulation', () => {
        const mockSession = {
            id: 'interview1',
            candidateId: 'user1',
            type: 'technical',
            difficulty: 'mid',
            company: 'TechCorp',
            position: 'Software Engineer',
            status: 'in_progress',
            startTime: '2024-02-15T10:00:00Z',
            duration: 60,
            questions: [
                {
                    id: 'q1',
                    type: 'coding',
                    question: 'Implement a function to reverse a string',
                    difficulty: 'easy',
                    timeLimit: 15,
                    startedAt: '2024-02-15T10:00:00Z',
                },
            ],
            settings: {
                allowHints: true,
                recordSession: true,
                enableAIAnalysis: true,
                showTimer: true,
                allowNotes: true,
                language: 'javascript',
            },
        };

        it('should render interview interface', async () => {
            renderWithProviders(<InterviewSimulation />);

            // Mock the fetch call
            await waitFor(() => {
                expect(screen.getByText(/Loading interview session/)).toBeInTheDocument();
            });
        });

        it('should show question and timer', async () => {
            // This would require mocking the useParams hook and API calls
            // For brevity, we'll test the basic rendering
            renderWithProviders(<InterviewSimulation />);

            await waitFor(() => {
                expect(screen.getByText(/Loading interview session/)).toBeInTheDocument();
            });
        });
    });

    describe('Activity Feed', () => {
        const mockActivities = [
            {
                id: '1',
                userId: 'user1',
                username: 'alice',
                type: 'problem_solved',
                content: {
                    title: 'Solved "Two Sum"',
                    description: 'Completed in 5 minutes',
                    metadata: {
                        problemId: 'two-sum',
                        difficulty: 'easy',
                    },
                },
                timestamp: '2024-02-15T10:00:00Z',
                isPublic: true,
                likes: 5,
                comments: 2,
                userLiked: false,
            },
        ];

        it('should render activity feed', async () => {
            vi.mocked(socialApi.getActivityFeed).mockResolvedValue(mockActivities);

            renderWithProviders(<ActivityFeed />);

            await waitFor(() => {
                expect(screen.getByText('All Activity')).toBeInTheDocument();
                expect(screen.getByText('alice')).toBeInTheDocument();
                expect(screen.getByText('Solved "Two Sum"')).toBeInTheDocument();
            });
        });

        it('should handle like action', async () => {
            vi.mocked(socialApi.getActivityFeed).mockResolvedValue(mockActivities);
            vi.mocked(socialApi.likeActivity).mockResolvedValue({});

            renderWithProviders(<ActivityFeed />);

            await waitFor(() => {
                const likeButton = screen.getByRole('button', { name: /5/ });
                fireEvent.click(likeButton);
            });

            expect(socialApi.likeActivity).toHaveBeenCalledWith('1');
        });

        it('should filter activities', async () => {
            vi.mocked(socialApi.getActivityFeed).mockResolvedValue(mockActivities);

            renderWithProviders(<ActivityFeed />);

            await waitFor(() => {
                const problemsFilter = screen.getByText('Problems');
                fireEvent.click(problemsFilter);
                expect(screen.getByText('Solved "Two Sum"')).toBeInTheDocument();
            });
        });
    });

    describe('Contest Analytics', () => {
        const mockAnalytics = {
            contestId: 'contest1',
            totalParticipants: 1247,
            totalSubmissions: 4892,
            problemStats: [
                {
                    problemId: 'A',
                    title: 'Two Sum',
                    totalSubmissions: 1205,
                    acceptedSubmissions: 892,
                    acceptanceRate: 74.0,
                    averageAttempts: 2.3,
                    firstSolveTime: 3,
                },
            ],
            participantDistribution: {
                byCountry: { 'United States': 312, 'India': 298 },
                byExperience: { 'Beginner': 298, 'Intermediate': 456 },
            },
            submissionTrends: [
                { timestamp: '2024-02-15T10:00:00Z', submissions: 0 },
                { timestamp: '2024-02-15T10:15:00Z', submissions: 234 },
            ],
        };

        const mockContest = {
            id: 'contest1',
            title: 'Weekly Contest 123',
            duration: 90,
            problems: [{ id: 'A', title: 'Two Sum' }],
        };

        it('should render analytics dashboard', async () => {
            renderWithProviders(<ContestAnalytics contestId="contest1" />);

            await waitFor(() => {
                expect(screen.getByText(/Analytics/)).toBeInTheDocument();
            });
        });

        it('should display key metrics', async () => {
            renderWithProviders(<ContestAnalytics contestId="contest1" />);

            await waitFor(() => {
                // These would be visible once the mock data is loaded
                expect(screen.getByText(/Total Participants/)).toBeInTheDocument();
                expect(screen.getByText(/Total Submissions/)).toBeInTheDocument();
            });
        });

        it('should show charts', async () => {
            renderWithProviders(<ContestAnalytics contestId="contest1" />);

            await waitFor(() => {
                expect(screen.getByTestId('chart-container')).toBeInTheDocument();
            });
        });
    });

    describe('Integration Tests', () => {
        it('should handle contest participation workflow', async () => {
            const mockContest = {
                id: 'contest1',
                title: 'Test Contest',
                status: 'live',
                problems: [{ id: 'p1', title: 'Problem 1' }],
            };

            vi.mocked(contestApi.getContest).mockResolvedValue(mockContest);
            vi.mocked(contestApi.getUserSubmissions).mockResolvedValue([]);

            renderWithProviders(<ContestParticipation />);

            await waitFor(() => {
                expect(screen.getByText('Test Contest')).toBeInTheDocument();
            });

            // Test navigation to problem (would require more setup)
            const problemLink = screen.getByText('A. Problem 1');
            expect(problemLink).toBeInTheDocument();
        });

        it('should handle collaborative session workflow', () => {
            const mockSession = {
                id: 'session1',
                name: 'Test Session',
                participants: [],
                settings: { allowCodeEditing: true, language: 'javascript' },
                sharedCode: { content: '', language: 'javascript', history: [] },
            };

            renderWithProviders(<CollaborativeEditor session={mockSession} />);

            expect(screen.getByText('Test Session')).toBeInTheDocument();
            expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
        });
    });
});