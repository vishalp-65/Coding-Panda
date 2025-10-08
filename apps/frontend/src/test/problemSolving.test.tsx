import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ProblemDisplay from '@/components/problemSolving/ProblemDisplay';
import HintSystem from '@/components/problemSolving/HintSystem';
import TestResultsPanel from '@/components/problemSolving/TestResultsPanel';
import { ExecutionResult, Hint } from '@/types/problemSolving';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('Problem Solving Components', () => {
    const mockProblem = {
        id: '1',
        title: 'Two Sum',
        slug: 'two-sum',
        difficulty: 'easy' as const,
        description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
        tags: ['Array', 'Hash Table'],
        constraints: {
            timeLimit: 1000,
            memoryLimit: 256,
            inputFormat: 'Array and target',
            outputFormat: 'Array of indices',
        },
        testCases: [
            {
                input: 'nums = [2,7,11,15], target = 9',
                expectedOutput: '[0,1]',
                isHidden: false,
            },
        ],
        statistics: {
            totalSubmissions: 1000,
            acceptedSubmissions: 500,
            acceptanceRate: 50,
        },
        status: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
    };

    describe('ProblemDisplay Component', () => {
        it('should render problem information correctly', () => {
            const mockOnTabChange = vi.fn();

            render(
                <ProblemDisplay
                    problem={mockProblem}
                    activeTab="description"
                    onTabChange={mockOnTabChange}
                />
            );

            expect(screen.getByText('Two Sum')).toBeInTheDocument();
            expect(screen.getByText('easy')).toBeInTheDocument();
            expect(screen.getByText('Array')).toBeInTheDocument();
            expect(screen.getByText('Hash Table')).toBeInTheDocument();
            expect(screen.getByText('Acceptance Rate: 50%')).toBeInTheDocument();
        });

        it('should switch between tabs correctly', async () => {
            const user = userEvent.setup();
            const mockOnTabChange = vi.fn();

            render(
                <ProblemDisplay
                    problem={mockProblem}
                    activeTab="description"
                    onTabChange={mockOnTabChange}
                />
            );

            // Switch to editorial tab
            await user.click(screen.getByText('Editorial'));
            expect(mockOnTabChange).toHaveBeenCalledWith('editorial');
        });

        it('should handle bookmark functionality', async () => {
            const user = userEvent.setup();
            const mockOnBookmark = vi.fn();
            const mockOnTabChange = vi.fn();

            render(
                <ProblemDisplay
                    problem={mockProblem}
                    activeTab="description"
                    onTabChange={mockOnTabChange}
                    onBookmark={mockOnBookmark}
                    isBookmarked={false}
                />
            );

            // Find the bookmark button specifically (first button in the action buttons)
            const actionButtons = screen.getAllByRole('button');
            const bookmarkButton = actionButtons.find(button =>
                button.querySelector('svg')?.classList.contains('lucide-bookmark')
            );

            if (bookmarkButton) {
                await user.click(bookmarkButton);
                expect(mockOnBookmark).toHaveBeenCalled();
            }
        });

        it('should display problem constraints', () => {
            const mockOnTabChange = vi.fn();

            render(
                <ProblemDisplay
                    problem={mockProblem}
                    activeTab="description"
                    onTabChange={mockOnTabChange}
                />
            );

            expect(screen.getAllByText('Time Limit: 1000ms')[0]).toBeInTheDocument();
        });

        it('should show test cases in examples section', () => {
            const mockOnTabChange = vi.fn();

            render(
                <ProblemDisplay
                    problem={mockProblem}
                    activeTab="description"
                    onTabChange={mockOnTabChange}
                />
            );

            expect(screen.getByText('Examples')).toBeInTheDocument();
            expect(screen.getByText('Example 1:')).toBeInTheDocument();
        });
    });

    describe('HintSystem Component', () => {
        const mockHints: Hint[] = [
            {
                id: 'hint-1',
                level: 1,
                content: 'Consider using a hash map to store numbers and their indices.',
                type: 'conceptual',
                revealed: true,
            },
            {
                id: 'hint-2',
                level: 2,
                content: 'For each number, calculate the complement and check if it exists in the hash map.',
                type: 'implementation',
                revealed: false,
            },
        ];

        it('should render hints correctly', () => {
            const mockOnRevealHint = vi.fn();
            const mockOnRequestMoreHints = vi.fn();

            render(
                <HintSystem
                    hints={mockHints}
                    onRevealHint={mockOnRevealHint}
                    onRequestMoreHints={mockOnRequestMoreHints}
                    isLoading={false}
                />
            );

            expect(screen.getByText('Hints (1/2)')).toBeInTheDocument();
        });

        it('should reveal hints when clicked', async () => {
            const user = userEvent.setup();
            const mockOnRevealHint = vi.fn();
            const mockOnRequestMoreHints = vi.fn();

            render(
                <HintSystem
                    hints={mockHints}
                    onRevealHint={mockOnRevealHint}
                    onRequestMoreHints={mockOnRequestMoreHints}
                    isLoading={false}
                />
            );

            // Expand the hints section first
            await user.click(screen.getByText('Hints (1/2)'));

            // Find and click the reveal button
            const revealButton = screen.getByText('Reveal');
            await user.click(revealButton);

            expect(mockOnRevealHint).toHaveBeenCalledWith('hint-2');
        });

        it('should show revealed hints content', async () => {
            const user = userEvent.setup();
            const mockOnRevealHint = vi.fn();
            const mockOnRequestMoreHints = vi.fn();

            render(
                <HintSystem
                    hints={mockHints}
                    onRevealHint={mockOnRevealHint}
                    onRequestMoreHints={mockOnRequestMoreHints}
                    isLoading={false}
                />
            );

            // Expand the hints section
            await user.click(screen.getByText('Hints (1/2)'));

            expect(screen.getByText('Consider using a hash map to store numbers and their indices.')).toBeInTheDocument();
        });

        it('should handle empty hints state', () => {
            const mockOnRevealHint = vi.fn();
            const mockOnRequestMoreHints = vi.fn();

            render(
                <HintSystem
                    hints={[]}
                    onRevealHint={mockOnRevealHint}
                    onRequestMoreHints={mockOnRequestMoreHints}
                    isLoading={false}
                />
            );

            // Should not render anything when no hints
            expect(screen.queryByText('Hints')).not.toBeInTheDocument();
        });
    });

    describe('TestResultsPanel Component', () => {
        const mockExecutionResult: ExecutionResult = {
            status: 'success',
            executionTime: 125,
            memoryUsed: 1536,
            testResults: [
                {
                    input: 'nums = [2,7,11,15], target = 9',
                    expected: '[0,1]',
                    actual: '[0,1]',
                    passed: true,
                    executionTime: 45,
                    memoryUsed: 512,
                },
                {
                    input: 'nums = [3,2,4], target = 6',
                    expected: '[1,2]',
                    actual: '[1,3]',
                    passed: false,
                    executionTime: 38,
                    memoryUsed: 480,
                },
            ],
        };

        it('should render execution results correctly', () => {
            render(
                <TestResultsPanel
                    executionResult={mockExecutionResult}
                    isVisible={true}
                />
            );

            expect(screen.getByText('Execution Results')).toBeInTheDocument();
            expect(screen.getByText('Success')).toBeInTheDocument();
            expect(screen.getByText('125ms')).toBeInTheDocument();
            expect(screen.getByText('1/2 passed')).toBeInTheDocument();
        });

        it('should display individual test case results', () => {
            render(
                <TestResultsPanel
                    executionResult={mockExecutionResult}
                    isVisible={true}
                />
            );

            expect(screen.getByText('Test Case 1')).toBeInTheDocument();
            expect(screen.getByText('Test Case 2')).toBeInTheDocument();
            expect(screen.getByText('Passed')).toBeInTheDocument();
            expect(screen.getByText('Failed')).toBeInTheDocument();
        });

        it('should not render when not visible', () => {
            render(
                <TestResultsPanel
                    executionResult={mockExecutionResult}
                    isVisible={false}
                />
            );

            expect(screen.queryByText('Execution Results')).not.toBeInTheDocument();
        });

        it('should handle error execution results', () => {
            const errorResult: ExecutionResult = {
                status: 'error',
                error: 'Compilation error: Syntax error on line 5',
                executionTime: 0,
                memoryUsed: 0,
                testResults: [],
            };

            render(
                <TestResultsPanel
                    executionResult={errorResult}
                    isVisible={true}
                />
            );

            expect(screen.getByText('Error')).toBeInTheDocument();
            expect(screen.getByText('Error Details')).toBeInTheDocument();
            expect(screen.getByText('Compilation error: Syntax error on line 5')).toBeInTheDocument();
        });

        it('should format time and memory correctly', () => {
            const longRunningResult: ExecutionResult = {
                status: 'success',
                executionTime: 2500, // 2.5 seconds
                memoryUsed: 2048, // 2MB
                testResults: [],
            };

            render(
                <TestResultsPanel
                    executionResult={longRunningResult}
                    isVisible={true}
                />
            );

            expect(screen.getByText('2.50s')).toBeInTheDocument();
            expect(screen.getByText('2.00MB')).toBeInTheDocument();
        });
    });

    describe('Integration Tests', () => {
        it('should handle problem solving workflow components together', async () => {
            const user = userEvent.setup();
            const mockOnTabChange = vi.fn();
            const mockOnRevealHint = vi.fn();
            const mockOnRequestMoreHints = vi.fn();

            const { rerender } = render(
                <div>
                    <ProblemDisplay
                        problem={mockProblem}
                        activeTab="description"
                        onTabChange={mockOnTabChange}
                    />
                    <HintSystem
                        hints={[]}
                        onRevealHint={mockOnRevealHint}
                        onRequestMoreHints={mockOnRequestMoreHints}
                        isLoading={false}
                    />
                </div>
            );

            // Verify problem is displayed
            expect(screen.getByText('Two Sum')).toBeInTheDocument();

            // Add a hint and rerender
            const hintsWithOne: Hint[] = [
                {
                    id: 'hint-1',
                    level: 1,
                    content: 'Use a hash map',
                    type: 'conceptual',
                    revealed: false,
                },
            ];

            rerender(
                <div>
                    <ProblemDisplay
                        problem={mockProblem}
                        activeTab="description"
                        onTabChange={mockOnTabChange}
                    />
                    <HintSystem
                        hints={hintsWithOne}
                        onRevealHint={mockOnRevealHint}
                        onRequestMoreHints={mockOnRequestMoreHints}
                        isLoading={false}
                    />
                </div>
            );

            // Verify hint system is now visible
            expect(screen.getByText('Hints (0/1)')).toBeInTheDocument();
        });

        it('should handle different problem difficulties', () => {
            const hardProblem = {
                ...mockProblem,
                difficulty: 'hard' as const,
                title: 'Median of Two Sorted Arrays',
            };

            const mockOnTabChange = vi.fn();

            render(
                <ProblemDisplay
                    problem={hardProblem}
                    activeTab="description"
                    onTabChange={mockOnTabChange}
                />
            );

            expect(screen.getByText('Median of Two Sorted Arrays')).toBeInTheDocument();
            expect(screen.getByText('hard')).toBeInTheDocument();
        });

        it('should handle problems with multiple test cases', () => {
            const problemWithMultipleTests = {
                ...mockProblem,
                testCases: [
                    { input: 'nums = [2,7,11,15], target = 9', expectedOutput: '[0,1]', isHidden: false },
                    { input: 'nums = [3,2,4], target = 6', expectedOutput: '[1,2]', isHidden: false },
                    { input: 'nums = [3,3], target = 6', expectedOutput: '[0,1]', isHidden: false },
                ],
            };

            const mockOnTabChange = vi.fn();

            render(
                <ProblemDisplay
                    problem={problemWithMultipleTests}
                    activeTab="description"
                    onTabChange={mockOnTabChange}
                />
            );

            expect(screen.getByText('Example 1:')).toBeInTheDocument();
            expect(screen.getByText('Example 2:')).toBeInTheDocument();
            expect(screen.getByText('Example 3:')).toBeInTheDocument();
        });
    });
});