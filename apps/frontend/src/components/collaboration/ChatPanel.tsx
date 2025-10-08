import { useState, useEffect, useRef } from 'react';
import { Send, Smile, Paperclip, Code, MoreVertical } from 'lucide-react';
import { ChatMessage, MessageReaction } from '@/types/collaboration';
import socketService from '@/services/socket';
import toast from 'react-hot-toast';

interface ChatPanelProps {
    sessionId: string;
    currentUserId: string;
    currentUsername: string;
    isCollapsed?: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
    sessionId,
    currentUserId,
    currentUsername,
    isCollapsed = false
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isCodeMode, setIsCodeMode] = useState(false);
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setupChatListeners();
        fetchChatHistory();

        return () => {
            socketService.off('chat_message');
            socketService.off('message_reaction');
        };
    }, [sessionId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const setupChatListeners = () => {
        socketService.on('chat_message', (message: ChatMessage) => {
            setMessages(prev => [...prev, message]);
        });

        socketService.on('message_reaction', (data: { messageId: string; reaction: MessageReaction }) => {
            setMessages(prev => prev.map(msg =>
                msg.id === data.messageId
                    ? { ...msg, reactions: updateReactions(msg.reactions || [], data.reaction) }
                    : msg
            ));
        });
    };

    const fetchChatHistory = async () => {
        try {
            // This would typically fetch from an API
            // For now, we'll start with an empty array
            setMessages([]);
        } catch (error) {
            console.error('Failed to fetch chat history:', error);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = () => {
        if (!newMessage.trim()) return;

        const message: Omit<ChatMessage, 'id' | 'timestamp'> = {
            sessionId,
            userId: currentUserId,
            username: currentUsername,
            content: newMessage.trim(),
            type: isCodeMode ? 'code' : 'text',
            replyTo,
            metadata: isCodeMode ? { language: 'javascript' } : undefined
        };

        socketService.emit('chat_message', message);
        setNewMessage('');
        setReplyTo(null);
        setIsCodeMode(false);

        // Focus back to input
        inputRef.current?.focus();
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleReaction = (messageId: string, emoji: string) => {
        socketService.emit('message_reaction', {
            messageId,
            emoji,
            userId: currentUserId
        });
    };

    const updateReactions = (reactions: MessageReaction[], newReaction: MessageReaction): MessageReaction[] => {
        const existingIndex = reactions.findIndex(r => r.emoji === newReaction.emoji);

        if (existingIndex >= 0) {
            const updated = [...reactions];
            updated[existingIndex] = newReaction;
            return updated;
        }

        return [...reactions, newReaction];
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const getReplyMessage = (messageId: string) => {
        return messages.find(m => m.id === messageId);
    };

    if (isCollapsed) {
        return (
            <div className="w-12 bg-gray-50 border-l border-gray-200 flex flex-col items-center py-4">
                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                    <Send className="h-4 w-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Chat</h3>
                <p className="text-sm text-gray-500">{messages.length} messages</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => {
                    const replyMessage = message.replyTo ? getReplyMessage(message.replyTo) : null;

                    return (
                        <div key={message.id} className="group">
                            {/* Reply indicator */}
                            {replyMessage && (
                                <div className="ml-8 mb-1 text-xs text-gray-500 border-l-2 border-gray-200 pl-2">
                                    Replying to {replyMessage.username}: {replyMessage.content.substring(0, 50)}...
                                </div>
                            )}

                            <div className="flex space-x-3">
                                {/* Avatar */}
                                {message.avatar ? (
                                    <img
                                        src={message.avatar}
                                        alt={message.username}
                                        className="h-8 w-8 rounded-full"
                                    />
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                                        <span className="text-sm font-medium text-gray-600">
                                            {message.username.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    {/* Header */}
                                    <div className="flex items-center space-x-2">
                                        <span className="font-medium text-gray-900">{message.username}</span>
                                        <span className="text-xs text-gray-500">
                                            {formatTimestamp(message.timestamp)}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <div className="mt-1">
                                        {message.type === 'code' ? (
                                            <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm font-mono overflow-x-auto">
                                                <pre>{message.content}</pre>
                                            </div>
                                        ) : message.type === 'system' ? (
                                            <div className="text-sm text-gray-500 italic">
                                                {message.content}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-900 whitespace-pre-wrap">
                                                {message.content}
                                            </div>
                                        )}
                                    </div>

                                    {/* Reactions */}
                                    {message.reactions && message.reactions.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {message.reactions.map((reaction) => (
                                                <button
                                                    key={reaction.emoji}
                                                    onClick={() => handleReaction(message.id, reaction.emoji)}
                                                    className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${reaction.users.includes(currentUserId)
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    <span>{reaction.emoji}</span>
                                                    <span>{reaction.count}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Actions (visible on hover) */}
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                                        <div className="flex items-center space-x-2 text-xs">
                                            <button
                                                onClick={() => setReplyTo(message.id)}
                                                className="text-gray-500 hover:text-gray-700"
                                            >
                                                Reply
                                            </button>
                                            <button
                                                onClick={() => handleReaction(message.id, '👍')}
                                                className="text-gray-500 hover:text-gray-700"
                                            >
                                                👍
                                            </button>
                                            <button
                                                onClick={() => handleReaction(message.id, '❤️')}
                                                className="text-gray-500 hover:text-gray-700"
                                            >
                                                ❤️
                                            </button>
                                            <button className="text-gray-500 hover:text-gray-700">
                                                <MoreVertical className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                <div ref={messagesEndRef} />
            </div>

            {/* Reply indicator */}
            {replyTo && (
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                            Replying to {getReplyMessage(replyTo)?.username}
                        </span>
                        <button
                            onClick={() => setReplyTo(null)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-gray-200">
                <div className="flex items-end space-x-2">
                    <div className="flex-1">
                        <textarea
                            ref={inputRef}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={isCodeMode ? "Enter code..." : "Type a message..."}
                            className={`w-full resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${isCodeMode ? 'font-mono bg-gray-50' : ''
                                }`}
                            rows={newMessage.split('\n').length || 1}
                            maxLength={1000}
                        />
                    </div>

                    <div className="flex flex-col space-y-1">
                        <button
                            onClick={() => setIsCodeMode(!isCodeMode)}
                            className={`p-2 rounded ${isCodeMode
                                    ? 'bg-primary-100 text-primary-700'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                }`}
                            title="Toggle code mode"
                        >
                            <Code className="h-4 w-4" />
                        </button>

                        <button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim()}
                            className="p-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>Press Enter to send, Shift+Enter for new line</span>
                    <span>{newMessage.length}/1000</span>
                </div>
            </div>
        </div>
    );
};

export default ChatPanel;