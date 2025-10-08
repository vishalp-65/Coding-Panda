export interface CollaborationSession {
    id: string;
    name: string;
    description?: string;
    type: 'practice' | 'interview' | 'contest' | 'study_group';
    createdBy: string;
    participants: SessionParticipant[];
    maxParticipants: number;
    isPublic: boolean;
    status: 'active' | 'paused' | 'ended';
    createdAt: string;
    endedAt?: string;
    settings: SessionSettings;
    currentProblem?: string;
    sharedCode: SharedCode;
}

export interface SessionParticipant {
    id: string;
    userId: string;
    username: string;
    avatar?: string;
    role: 'host' | 'participant' | 'observer';
    joinedAt: string;
    isActive: boolean;
    cursor?: CursorPosition;
    permissions: ParticipantPermissions;
}

export interface SessionSettings {
    allowCodeEditing: boolean;
    allowVoiceChat: boolean;
    allowScreenShare: boolean;
    autoSave: boolean;
    showCursors: boolean;
    language: string;
    theme: string;
}

export interface ParticipantPermissions {
    canEdit: boolean;
    canExecute: boolean;
    canInvite: boolean;
    canKick: boolean;
    canChangeSettings: boolean;
}

export interface SharedCode {
    content: string;
    language: string;
    lastModified: string;
    lastModifiedBy: string;
    version: number;
    history: CodeChange[];
}

export interface CodeChange {
    id: string;
    userId: string;
    username: string;
    timestamp: string;
    operation: 'insert' | 'delete' | 'replace';
    position: {
        line: number;
        column: number;
    };
    content: string;
    length?: number; // for delete operations
}

export interface CursorPosition {
    line: number;
    column: number;
    selection?: {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
    };
}

export interface ChatMessage {
    id: string;
    sessionId: string;
    userId: string;
    username: string;
    avatar?: string;
    content: string;
    type: 'text' | 'code' | 'system' | 'file';
    timestamp: string;
    replyTo?: string;
    reactions?: MessageReaction[];
    metadata?: {
        language?: string;
        fileName?: string;
        fileSize?: number;
    };
}

export interface MessageReaction {
    emoji: string;
    users: string[];
    count: number;
}

export interface DiscussionThread {
    id: string;
    title: string;
    content: string;
    author: {
        id: string;
        username: string;
        avatar?: string;
    };
    category: 'general' | 'help' | 'contest' | 'problem' | 'announcement';
    tags: string[];
    isPinned: boolean;
    isLocked: boolean;
    votes: number;
    userVote?: 'up' | 'down';
    replies: ThreadReply[];
    replyCount: number;
    lastActivity: string;
    createdAt: string;
    updatedAt: string;
}

export interface ThreadReply {
    id: string;
    content: string;
    author: {
        id: string;
        username: string;
        avatar?: string;
    };
    votes: number;
    userVote?: 'up' | 'down';
    parentId?: string; // for nested replies
    createdAt: string;
    updatedAt: string;
}

export interface InterviewSession {
    id: string;
    candidateId: string;
    interviewerId?: string; // null for AI interviewer
    type: 'technical' | 'behavioral' | 'system_design';
    difficulty: 'junior' | 'mid' | 'senior' | 'staff';
    company?: string;
    position?: string;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    startTime: string;
    endTime?: string;
    duration: number; // in minutes
    currentQuestion?: InterviewQuestion;
    questions: InterviewQuestion[];
    evaluation?: InterviewEvaluation;
    recording?: {
        audioUrl?: string;
        videoUrl?: string;
        transcriptUrl?: string;
    };
    settings: InterviewSettings;
}

export interface InterviewQuestion {
    id: string;
    type: 'coding' | 'behavioral' | 'system_design' | 'technical';
    question: string;
    context?: string;
    hints?: string[];
    expectedAnswer?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    timeLimit?: number; // in minutes
    startedAt?: string;
    answeredAt?: string;
    answer?: {
        content: string;
        code?: string;
        language?: string;
    };
    aiAnalysis?: {
        score: number;
        feedback: string;
        strengths: string[];
        improvements: string[];
    };
}

export interface InterviewEvaluation {
    overallScore: number;
    technicalScore: number;
    communicationScore: number;
    problemSolvingScore: number;
    codeQualityScore?: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
    recommendation: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire';
    nextSteps?: string;
}

export interface InterviewSettings {
    allowHints: boolean;
    recordSession: boolean;
    enableAIAnalysis: boolean;
    showTimer: boolean;
    allowNotes: boolean;
    language: string;
}