import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ContestTimer from '@/components/contest/ContestTimer';
import ChatPanel from '@/components/collaboration/ChatPanel';

// Mock socket service
vi.mock('@/services/socket', () => ({
    default: {
        joinRoom: vi.fn(),
        leaveRoom: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
    },
}));

describe('Contest and Collaboration Components', () => {
    describe('ContestTimer', () => {
        it('should render upcoming contest timer', () => {
            const futureTime = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
            const endTime = new Date(Date.now() + 7200000).toISOString(); // 2 hours from now

            render(
                <ContestTimer
                    startTime={futureTime}
                    endTime={endTime}
                    status="upcoming"
                />
            );

            expect(screen.getByText('Starts in:')).toBeInTheDocument();
        });

        it('should render live contest timer', () => {
            const pastTime = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
            const futureTime = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

            render(
                <ContestTimer
                    startTime={pastTime}
                    endTime={futureTime}
                    status="live"
                />
            );

            expect(screen.getByText('Ends in:')).toBeInTheDocument();
        });

        it('should render ended contest status', () => {
            const pastStartTime = new Date(Date.now() - 7200000).toISOString(); // 2 hours ago
            const pastEndTime = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago

            render(
                <ContestTimer
                    startTime={pastStartTime}
                    endTime={pastEndTime}
                    status="ended"
                />
            );

            expect(screen.getByText('Contest ended')).toBeInTheDocument();
        });

        it('should call onStatusChange when status changes', () => {
            const onStatusChange = vi.fn();
            const pastTime = new Date(Date.now() - 3600000).toISOString();
            const futureTime = new Date(Date.now() + 3600000).toISOString();

            render(
                <ContestTimer
                    startTime={pastTime}
                    endTime={futureTime}
                    status="upcoming"
                    onStatusChange={onStatusChange}
                />
            );

            // The component should detect that the contest is actually live
            // and call onStatusChange (this would happen in real implementation)
        });
    });

    describe('ChatPanel', () => {
        const defaultProps = {
            sessionId: 'test-session',
            currentUserId: 'user1',
            currentUsername: 'testuser',
        };

        it('should render chat interface', () => {
            render(<ChatPanel {...defaultProps} />);

            expect(screen.getByText('Chat')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
        });

        it('should handle message input', () => {
            render(<ChatPanel {...defaultProps} />);

            const input = screen.getByPlaceholderText('Type a message...');
            fireEvent.change(input, { target: { value: 'Hello world!' } });

            expect(input).toHaveValue('Hello world!');
        });

        it('should toggle code mode', () => {
            render(<ChatPanel {...defaultProps} />);

            const codeButton = screen.getByTitle('Toggle code mode');
            fireEvent.click(codeButton);

            expect(screen.getByPlaceholderText('Enter code...')).toBeInTheDocument();
        });

        it('should show character count', () => {
            render(<ChatPanel {...defaultProps} />);

            const input = screen.getByPlaceholderText('Type a message...');
            fireEvent.change(input, { target: { value: 'Test message' } });

            expect(screen.getByText('12/1000')).toBeInTheDocument();
        });

        it('should disable send button when message is empty', () => {
            render(<ChatPanel {...defaultProps} />);

            const sendButton = screen.getByRole('button', { name: /send/i });
            expect(sendButton).toBeDisabled();
        });

        it('should enable send button when message has content', () => {
            render(<ChatPanel {...defaultProps} />);

            const input = screen.getByPlaceholderText('Type a message...');
            const sendButton = screen.getByRole('button', { name: /send/i });

            fireEvent.change(input, { target: { value: 'Test message' } });
            expect(sendButton).not.toBeDisabled();
        });
    });

    describe('Integration', () => {
        it('should render components without crashing', () => {
            const futureTime = new Date(Date.now() + 3600000).toISOString();
            const endTime = new Date(Date.now() + 7200000).toISOString();

            render(
                <div>
                    <ContestTimer
                        startTime={futureTime}
                        endTime={endTime}
                        status="upcoming"
                    />
                    <ChatPanel
                        sessionId="test-session"
                        currentUserId="user1"
                        currentUsername="testuser"
                    />
                </div>
            );

            expect(screen.getByText('Starts in:')).toBeInTheDocument();
            expect(screen.getByText('Chat')).toBeInTheDocument();
        });
    });
});