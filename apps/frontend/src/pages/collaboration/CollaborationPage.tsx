import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import CollaborativeEditor from '@/components/collaboration/CollaborativeEditor';
import ChatPanel from '@/components/collaboration/ChatPanel';
import { CollaborationSession } from '@/types/collaboration';
import { collaborationApi } from '@/services/api';

const CollaborationPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [session, setSession] = useState<CollaborationSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showChat, setShowChat] = useState(true);

    useEffect(() => {
        if (sessionId) {
            fetchSession();
        }
    }, [sessionId]);

    const fetchSession = async () => {
        try {
            setIsLoading(true);
            const sessionData = await collaborationApi.getSession(sessionId!);
            setSession(sessionData);
        } catch (error) {
            console.error('Failed to fetch session:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCodeChange = (code: string) => {
        if (session) {
            setSession({
                ...session,
                sharedCode: {
                    ...session.sharedCode,
                    content: code,
                    lastModified: new Date().toISOString(),
                    version: session.sharedCode.version + 1
                }
            });
        }
    };

    const handleExecuteCode = () => {
        // Handle code execution
        console.log('Executing code:', session?.sharedCode.content);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading collaboration session...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Session not found</h2>
                    <p className="text-gray-600">The collaboration session you're looking for doesn't exist.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-gray-50 flex">
            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col">
                <CollaborativeEditor
                    session={session}
                    onCodeChange={handleCodeChange}
                    onExecuteCode={handleExecuteCode}
                />
            </div>

            {/* Chat Panel */}
            <ChatPanel
                sessionId={session.id}
                currentUserId="current-user-id" // This should come from auth context
                currentUsername="Current User" // This should come from auth context
                isCollapsed={!showChat}
            />

            {/* Toggle Chat Button */}
            <button
                onClick={() => setShowChat(!showChat)}
                className="fixed bottom-4 right-4 p-3 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-colors z-10"
                title={showChat ? 'Hide chat' : 'Show chat'}
            >
                {showChat ? '→' : '←'}
            </button>
        </div>
    );
};

export default CollaborationPage;