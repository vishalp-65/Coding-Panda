export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  roles?: string[];
}

export interface RoomData {
  id: string;
  type: RoomType;
  participants: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  lastActivity: Date;
}

export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  targetUsers?: string[];
  targetRoles?: string[];
  createdAt: Date;
  expiresAt?: Date;
}

export interface CollaborationSession {
  id: string;
  problemId?: string;
  participants: string[];
  sharedCode: string;
  language: string;
  cursors: Record<string, CursorPosition>;
  lastModified: Date;
  version: number;
}

export interface CursorPosition {
  userId: string;
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
  userId: string;
  username: string;
  content: string;
  roomId: string;
  timestamp: Date;
  edited?: boolean;
  editedAt?: Date;
  replyTo?: string;
}

export interface LeaderboardUpdate {
  contestId: string;
  rankings: ContestRanking[];
  lastUpdated: Date;
}

export interface ContestRanking {
  userId: string;
  username: string;
  score: number;
  rank: number;
  solvedProblems: number;
  penalty: number;
  lastSubmissionTime: Date;
}

export enum RoomType {
  CONTEST = 'contest',
  COLLABORATION = 'collaboration',
  DISCUSSION = 'discussion',
  INTERVIEW = 'interview',
  GENERAL = 'general'
}

export enum NotificationType {
  CONTEST_START = 'contest_start',
  CONTEST_END = 'contest_end',
  SUBMISSION_RESULT = 'submission_result',
  ACHIEVEMENT = 'achievement',
  SYSTEM = 'system',
  CHAT_MESSAGE = 'chat_message',
  COLLABORATION_INVITE = 'collaboration_invite'
}

export interface SocketEvents {
  // Connection events
  connection: (socket: AuthenticatedSocket) => void;
  disconnect: (reason: string) => void;
  
  // Room management
  'join-room': (data: { roomId: string; roomType: RoomType }) => void;
  'leave-room': (data: { roomId: string }) => void;
  'room-joined': (data: { roomId: string; participants: string[] }) => void;
  'room-left': (data: { roomId: string }) => void;
  'user-joined-room': (data: { roomId: string; userId: string; username: string }) => void;
  'user-left-room': (data: { roomId: string; userId: string; username: string }) => void;
  
  // Chat and messaging
  'send-message': (data: { roomId: string; content: string; replyTo?: string }) => void;
  'message-received': (message: ChatMessage) => void;
  'typing-start': (data: { roomId: string; userId: string }) => void;
  'typing-stop': (data: { roomId: string; userId: string }) => void;
  'user-typing': (data: { roomId: string; userId: string; username: string }) => void;
  
  // Collaboration
  'code-change': (data: { sessionId: string; code: string; version: number; userId: string }) => void;
  'code-updated': (data: { sessionId: string; code: string; version: number; userId: string }) => void;
  'cursor-move': (data: { sessionId: string; position: CursorPosition }) => void;
  'cursor-updated': (data: { sessionId: string; cursors: Record<string, CursorPosition> }) => void;
  'collaboration-conflict': (data: { sessionId: string; conflictVersion: number }) => void;
  
  // Notifications
  'notification': (notification: NotificationData) => void;
  'mark-notification-read': (data: { notificationId: string }) => void;
  
  // Contest updates
  'leaderboard-update': (data: LeaderboardUpdate) => void;
  'contest-announcement': (data: { contestId: string; message: string; timestamp: Date }) => void;
  
  // Error handling
  error: (error: { message: string; code?: string }) => void;
}

import { Socket } from 'socket.io';