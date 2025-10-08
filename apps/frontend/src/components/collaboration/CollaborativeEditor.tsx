import { useState, useEffect, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import { Users, Share2, Settings, Play, Save } from 'lucide-react';
import { CollaborationSession, SessionParticipant, CodeChange, CursorPosition } from '@/types/collaboration';
import socketService from '@/services/socket';
import toast from 'react-hot-toast';

interface CollaborativeEditorProps {
    session: CollaborationSession;
    onCodeChange?: (code: string) => void;
    onExecuteCode?: () => void;
}

const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
    session,
    onCodeChange,
    onExecuteCode
}) => {
    const [code, setCode] = useState(session.sharedCode.content);
    const [participants, setParticipants] = useState<SessionParticipant[]>(session.participants);
    const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
    const [isConnected, setIsConnected] = useState(false);
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<any>(null);
    const decorationsRef = useRef<string[]>([]);

    useEffect(() => {
        joinSession();
        setupRealtimeListeners();

        return () => {
            leaveSession();
        };
    }, [session.id]);

    const joinSession = () => {
        socketService.joinRoom(`session_${session.id}`);
        setIsConnected(true);
        toast.success('Joined collaborative session');
    };

    const leaveSession = () => {
        socketService.leaveRoom(`session_${session.id}`);
        socketService.off('code_change');
        socketService.off('cursor_change');
        socketService.off('user_joined');
        socketService.off('user_left');
        setIsConnected(false);
    };

    const setupRealtimeListeners = () => {
        // Listen for code changes from other users
        socketService.onCodeChange((data) => {
            if (data.userId !== getCurrentUserId()) {
                applyCodeChange(data);
            }
        });

        // Listen for cursor movements
        socketService.on('cursor_change', (data: { userId: string; cursor: CursorPosition }) => {
            if (data.userId !== getCurrentUserId()) {
                setCursors(prev => new Map(prev.set(data.userId, data.cursor)));
                updateCursorDecorations();
            }
        });

        // Listen for user join/leave events
        socketService.onUserJoined((data) => {
            setParticipants(prev => [...prev, data as SessionParticipant]);
            toast.success(`${data.username} joined the session`);
        });

        socketService.onUserLeft((data) => {
            setParticipants(prev => prev.filter(p => p.userId !== data.userId));
            setCursors(prev => {
                const newCursors = new Map(prev);
                newCursors.delete(data.userId);
                return newCursors;
            });
            toast(`${data.username} left the session`);
        });
    };

    const getCurrentUserId = () => {
        // This should come from your auth context
        return 'current-user-id'; // Replace with actual user ID
    };

    const handleEditorDidMount = (editor: any, monaco: any) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        // Listen for cursor position changes
        editor.onDidChangeCursorPosition((e: any) => {
            const position = {
                line: e.position.lineNumber,
                column: e.position.column
            };

            // Emit cursor position to other users
            socketService.emit('cursor_change', {
                sessionId: session.id,
                cursor: position
            });
        });

        // Listen for selection changes
        editor.onDidChangeCursorSelection((e: any) => {
            const selection = e.selection;
            const position = {
                line: selection.startLineNumber,
                column: selection.startColumn,
                selection: {
                    startLine: selection.startLineNumber,
                    startColumn: selection.startColumn,
                    endLine: selection.endLineNumber,
                    endColumn: selection.endColumn
                }
            };

            socketService.emit('cursor_change', {
                sessionId: session.id,
                cursor: position
            });
        });
    };

    const handleCodeChange = (value: string | undefined) => {
        if (value === undefined) return;

        const change: CodeChange = {
            id: generateChangeId(),
            userId: getCurrentUserId(),
            username: getCurrentUsername(),
            timestamp: new Date().toISOString(),
            operation: 'replace', // Simplified for this example
            position: { line: 1, column: 1 },
            content: value
        };

        setCode(value);
        onCodeChange?.(value);

        // Emit code change to other users
        socketService.updateCode(`session_${session.id}`, value, session.settings.language);
    };

    const applyCodeChange = (change: any) => {
        setCode(change.code);

        // Update editor content if it's different
        if (editorRef.current && editorRef.current.getValue() !== change.code) {
            editorRef.current.setValue(change.code);
        }
    };

    const updateCursorDecorations = () => {
        if (!editorRef.current || !monacoRef.current) return;

        // Clear existing decorations
        decorationsRef.current = editorRef.current.deltaDecorations(
            decorationsRef.current,
            []
        );

        // Create new decorations for each cursor
        const decorations: any[] = [];
        cursors.forEach((cursor, userId) => {
            const participant = participants.find(p => p.userId === userId);
            if (!participant) return;

            const color = getUserColor(userId);

            // Cursor decoration
            decorations.push({
                range: new monacoRef.current.Range(
                    cursor.line,
                    cursor.column,
                    cursor.line,
                    cursor.column
                ),
                options: {
                    className: 'collaborative-cursor',
                    beforeContentClassName: 'collaborative-cursor-line',
                    afterContentClassName: 'collaborative-cursor-label',
                    after: {
                        content: participant.username,
                        inlineClassName: 'collaborative-cursor-name'
                    },
                    stickiness: monacoRef.current.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                }
            });

            // Selection decoration
            if (cursor.selection) {
                decorations.push({
                    range: new monacoRef.current.Range(
                        cursor.selection.startLine,
                        cursor.selection.startColumn,
                        cursor.selection.endLine,
                        cursor.selection.endColumn
                    ),
                    options: {
                        className: 'collaborative-selection',
                        backgroundColor: `${color}20`,
                        borderColor: color
                    }
                });
            }
        });

        decorationsRef.current = editorRef.current.deltaDecorations(
            decorationsRef.current,
            decorations
        );
    };

    const getUserColor = (userId: string): string => {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
        ];

        const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[index % colors.length];
    };

    const generateChangeId = (): string => {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    const getCurrentUsername = (): string => {
        // This should come from your auth context
        return 'Current User'; // Replace with actual username
    };

    const handleExecuteCode = () => {
        if (session.settings.allowCodeEditing && onExecuteCode) {
            onExecuteCode();
        }
    };

    const handleSaveCode = () => {
        // Emit save event
        socketService.emit('save_code', {
            sessionId: session.id,
            code,
            language: session.settings.language
        });
        toast.success('Code saved');
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                    <Share2 className="h-5 w-5 text-primary-600" />
                    <h3 className="font-semibold text-gray-900">{session.name}</h3>

                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    {/* Participants */}
                    <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{participants.length}</span>

                        <div className="flex -space-x-1 ml-2">
                            {participants.slice(0, 5).map((participant) => (
                                <div
                                    key={participant.id}
                                    className="relative"
                                    title={participant.username}
                                >
                                    {participant.avatar ? (
                                        <img
                                            src={participant.avatar}
                                            alt={participant.username}
                                            className="h-6 w-6 rounded-full border-2 border-white"
                                        />
                                    ) : (
                                        <div className="h-6 w-6 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center">
                                            <span className="text-xs font-medium text-gray-600">
                                                {participant.username.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}

                                    <div
                                        className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-white"
                                        style={{ backgroundColor: getUserColor(participant.userId) }}
                                    />
                                </div>
                            ))}

                            {participants.length > 5 && (
                                <div className="h-6 w-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center">
                                    <span className="text-xs font-medium text-gray-600">
                                        +{participants.length - 5}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                        <button
                            onClick={handleSaveCode}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                            title="Save code"
                        >
                            <Save className="h-4 w-4" />
                        </button>

                        {session.settings.allowCodeEditing && (
                            <button
                                onClick={handleExecuteCode}
                                className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded"
                                title="Execute code"
                            >
                                <Play className="h-4 w-4" />
                            </button>
                        )}

                        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                            <Settings className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1">
                <Editor
                    height="100%"
                    language={session.settings.language}
                    value={code}
                    onChange={handleCodeChange}
                    onMount={handleEditorDidMount}
                    theme={session.settings.theme}
                    options={{
                        fontSize: 14,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        lineNumbers: 'on',
                        readOnly: !session.settings.allowCodeEditing,
                        automaticLayout: true,
                        tabSize: 2,
                        insertSpaces: true,
                        renderWhitespace: 'selection',
                        cursorBlinking: 'smooth',
                        cursorSmoothCaretAnimation: true
                    }}
                />
            </div>

            {/* Custom styles for collaborative cursors */}
            <style jsx>{`
        .collaborative-cursor {
          border-left: 2px solid var(--cursor-color);
          position: relative;
        }
        
        .collaborative-cursor-name {
          background: var(--cursor-color);
          color: white;
          padding: 2px 4px;
          border-radius: 2px;
          font-size: 11px;
          position: absolute;
          top: -20px;
          left: -2px;
          white-space: nowrap;
          z-index: 1000;
        }
        
        .collaborative-selection {
          border: 1px solid var(--cursor-color);
          border-radius: 2px;
        }
      `}</style>
        </div>
    );
};

export default CollaborativeEditor;