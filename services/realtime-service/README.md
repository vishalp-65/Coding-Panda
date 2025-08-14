# Real-time Communication Service

A comprehensive real-time communication service built with Socket.IO, Redis, and TypeScript for the AI-powered coding platform. This service handles WebSocket connections, real-time messaging, collaboration features, notifications, and live updates.

## Features

### 🔐 Authentication & Authorization
- JWT-based authentication for WebSocket connections
- Role-based access control for different room types
- Secure token validation and user session management

### 🏠 Room Management
- Dynamic room creation and management
- User presence tracking and room membership
- Typing indicators and user activity status
- Support for different room types (contest, collaboration, discussion, interview)

### 💬 Real-time Chat
- Instant messaging with message history
- Message editing and deletion
- Typing indicators and user presence
- Message reporting and moderation features
- Reply-to functionality for threaded conversations

### 🤝 Collaborative Code Editing
- Real-time collaborative code editing sessions
- Cursor position synchronization
- Conflict resolution for simultaneous edits
- Multi-language support
- Session invitation and management

### 🔔 Notification System
- Real-time push notifications
- User-targeted and role-based notifications
- Notification history and read status tracking
- Contest announcements and system alerts
- Achievement and submission result notifications

### 🏆 Live Leaderboards
- Real-time contest leaderboard updates
- Live ranking calculations and broadcasts
- Leaderboard freezing and unfreezing
- Performance analytics and statistics
- Top performer tracking

## Architecture

### Technology Stack
- **Node.js** with **TypeScript** for type safety
- **Socket.IO** for WebSocket communication
- **Redis** for data persistence and pub/sub messaging
- **Express.js** for HTTP endpoints
- **JWT** for authentication
- **Jest** for comprehensive testing

### Key Components

#### Services
- `RoomService` - Room management and user presence
- `NotificationService` - Push notifications and alerts
- `CollaborationService` - Real-time code collaboration
- `ChatService` - Messaging and chat features
- `LeaderboardService` - Contest rankings and updates

#### Middleware
- `authenticateSocket` - JWT authentication for WebSocket connections
- `requireRole` - Role-based access control
- `validateRoomAccess` - Room-specific access validation

#### Configuration
- `RedisManager` - Redis connection and data operations
- `SocketHandlers` - Event handling and routing

## Installation

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit environment variables
nano .env
```

## Environment Variables

```env
PORT=3006
NODE_ENV=development
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret-key
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info
```

## Usage

### Development
```bash
# Start in development mode with hot reload
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

### Production
```bash
# Build the application
npm run build

# Start production server
npm start
```

## API Documentation

### Socket.IO Events

#### Connection Events
- `connection` - User connects to the service
- `disconnect` - User disconnects from the service

#### Room Management
- `join-room` - Join a specific room
- `leave-room` - Leave a room
- `room-joined` - Confirmation of room join
- `room-left` - Confirmation of room leave
- `user-joined-room` - Another user joined the room
- `user-left-room` - Another user left the room

#### Chat Events
- `send-message` - Send a chat message
- `message-received` - Receive a chat message
- `edit-message` - Edit an existing message
- `delete-message` - Delete a message
- `typing-start` - Start typing indicator
- `typing-stop` - Stop typing indicator
- `user-typing` - Another user is typing

#### Collaboration Events
- `create-collaboration` - Create a new collaboration session
- `join-collaboration` - Join a collaboration session
- `leave-collaboration` - Leave a collaboration session
- `code-change` - Send code changes
- `code-updated` - Receive code updates
- `cursor-move` - Send cursor position
- `cursor-updated` - Receive cursor updates
- `collaboration-conflict` - Handle edit conflicts

#### Notification Events
- `notification` - Receive a notification
- `mark-notification-read` - Mark notification as read
- `get-notifications` - Request notification history

#### Contest Events
- `join-contest` - Join a contest room
- `leave-contest` - Leave a contest room
- `leaderboard-update` - Receive leaderboard updates
- `contest-announcement` - Receive contest announcements

### HTTP Endpoints

#### Health Check
```
GET /health
```
Returns service health status and information.

## Testing

The service includes comprehensive test coverage:

### Unit Tests
- Service layer testing with mocked dependencies
- Middleware authentication and authorization testing
- Redis operations and data management testing

### Integration Tests
- End-to-end Socket.IO communication testing
- Real-time event flow validation
- Authentication and error handling testing

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test -- RoomService.test.ts

# Run tests with coverage
npm run test:coverage

# Run integration tests only
npm run test:integration

# Run tests in watch mode
npm run test:watch
```

## Deployment

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3006
CMD ["npm", "start"]
```

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: realtime-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: realtime-service
  template:
    metadata:
      labels:
        app: realtime-service
    spec:
      containers:
      - name: realtime-service
        image: ai-platform/realtime-service:latest
        ports:
        - containerPort: 3006
        env:
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
```

## Monitoring

### Health Checks
The service provides a health check endpoint at `/health` that returns:
- Service status
- Timestamp
- Service name

### Metrics
Key metrics to monitor:
- Active WebSocket connections
- Message throughput
- Room occupancy
- Redis connection status
- Memory usage
- Response times

### Logging
Structured logging with different levels:
- `error` - Error conditions
- `warn` - Warning conditions
- `info` - Informational messages
- `debug` - Debug information

## Security Considerations

### Authentication
- JWT tokens are validated on every WebSocket connection
- Tokens must be provided in either `auth.token` or `Authorization` header
- Expired or invalid tokens result in connection rejection

### Authorization
- Role-based access control for sensitive operations
- Room-specific access validation
- User permissions checked before allowing actions

### Data Protection
- All communications are encrypted in transit
- Sensitive data is not logged
- User data is properly sanitized

### Rate Limiting
- Message rate limiting to prevent spam
- Connection rate limiting to prevent abuse
- Resource usage monitoring and limits

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

This project is licensed under the MIT License.