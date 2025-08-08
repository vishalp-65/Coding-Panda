import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { AuthenticatedSocket } from '../types';

export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  iat: number;
  exp: number;
}

export const authenticateSocket = (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next(new Error('JWT secret not configured'));
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    
    // Attach user information to socket
    const authSocket = socket as AuthenticatedSocket;
    authSocket.userId = decoded.userId;
    authSocket.username = decoded.username;
    authSocket.roles = decoded.roles;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new Error('Invalid authentication token'));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new Error('Authentication token expired'));
    }
    return next(new Error('Authentication failed'));
  }
};

export const requireRole = (requiredRoles: string[]) => {
  return (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
    const userRoles = socket.roles || [];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return next(new Error(`Access denied. Required roles: ${requiredRoles.join(', ')}`));
    }
    
    next();
  };
};

export const validateRoomAccess = async (
  socket: AuthenticatedSocket, 
  roomId: string, 
  roomType: string
): Promise<boolean> => {
  // Basic validation - can be extended with database checks
  if (!socket.userId) {
    return false;
  }

  // Add specific room access logic based on room type
  switch (roomType) {
    case 'contest':
      // Check if user is registered for the contest
      return await validateContestAccess(socket.userId, roomId);
    
    case 'collaboration':
      // Check if user is invited to the collaboration session
      return await validateCollaborationAccess(socket.userId, roomId);
    
    case 'discussion':
      // Most discussion rooms are public
      return true;
    
    case 'interview':
      // Check if user is part of the interview session
      return await validateInterviewAccess(socket.userId, roomId);
    
    default:
      return true;
  }
};

// Placeholder functions - these would integrate with your database
async function validateContestAccess(userId: string, contestId: string): Promise<boolean> {
  // TODO: Check database for contest registration
  return true;
}

async function validateCollaborationAccess(userId: string, sessionId: string): Promise<boolean> {
  // TODO: Check if user is invited to collaboration session
  return true;
}

async function validateInterviewAccess(userId: string, interviewId: string): Promise<boolean> {
  // TODO: Check if user is part of interview session
  return true;
}