# Notification Service

A comprehensive notification service for the AI Platform that handles email notifications, in-app notifications, user preferences, analytics, and digest emails.

## Features

### Core Functionality
- **Multi-channel Notifications**: Support for email and in-app notifications
- **Queue-based Processing**: Redis and Bull Queue for reliable message processing
- **Email Templates**: Handlebars-based email templates with customization
- **User Preferences**: Granular notification preferences and quiet hours
- **Analytics & Tracking**: Comprehensive notification analytics and reporting
- **Digest Emails**: Daily/weekly digest emails with user activity summaries

### Advanced Features
- **Achievement Notifications**: Milestone and achievement tracking
- **Contest Notifications**: Contest start/end/reminder notifications
- **Real-time Delivery**: Integration with real-time service for instant notifications
- **Bulk Operations**: Efficient bulk notification sending
- **Template Management**: Dynamic email template creation and management
- **Cleanup & Maintenance**: Automatic cleanup of expired notifications and analytics

## Architecture

### Services
- **NotificationService**: Main service for creating and managing notifications
- **EmailService**: Email sending and template rendering
- **QueueService**: Queue management with Bull and Redis
- **PreferencesService**: User notification preferences management
- **AnalyticsService**: Notification analytics and reporting

### Data Storage
- **Redis**: Primary storage for notifications, preferences, and analytics
- **Queue Storage**: Bull queues for background processing
- **Template Storage**: In-memory template storage with Redis backup

## API Endpoints

### Notifications
- `POST /api/notifications` - Create notification
- `GET /api/notifications/user/:userId` - Get user notifications
- `GET /api/notifications/:notificationId` - Get specific notification
- `PATCH /api/notifications/:notificationId/read` - Mark as read
- `PATCH /api/notifications/user/:userId/read-all` - Mark all as read
- `GET /api/notifications/user/:userId/unread-count` - Get unread count

### Preferences
- `GET /api/notifications/preferences/:userId` - Get user preferences
- `PUT /api/notifications/preferences/:userId` - Update preferences
- `POST /api/notifications/preferences/:userId/enable-all` - Enable all notifications
- `POST /api/notifications/preferences/:userId/disable-all` - Disable all notifications

### Analytics
- `GET /api/notifications/analytics/stats` - Get notification statistics
- `GET /api/notifications/analytics/engagement/:userId` - Get user engagement stats
- `GET /api/notifications/analytics/channels` - Get channel performance
- `POST /api/notifications/analytics/report` - Generate analytics report

### Templates
- `GET /api/notifications/templates` - Get all email templates
- `GET /api/notifications/templates/:templateId` - Get specific template
- `POST /api/notifications/test-email` - Send test email

### Predefined Notifications
- `POST /api/notifications/contest/start` - Send contest start notifications
- `POST /api/notifications/achievement` - Send achievement notifications

## Configuration

### Environment Variables

```env
NODE_ENV=development
PORT=3005

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@aiplatform.com
FROM_NAME=AI Platform

# JWT Configuration
JWT_SECRET=your-jwt-secret

# Service URLs
USER_SERVICE_URL=http://localhost:3001
ANALYTICS_SERVICE_URL=http://localhost:3006
REALTIME_SERVICE_URL=http://localhost:3004

# Queue Configuration
QUEUE_CONCURRENCY=5
QUEUE_ATTEMPTS=3
QUEUE_DELAY=5000

# Notification Settings
MAX_NOTIFICATIONS_PER_USER=1000
NOTIFICATION_RETENTION_DAYS=30
DIGEST_EMAIL_HOUR=9
```

## Usage Examples

### Creating a Notification

```typescript
import { NotificationService } from './services/NotificationService';
import { NotificationType, NotificationChannel, NotificationPriority } from './types';

const notificationService = NotificationService.getInstance();

// Create a single notification
await notificationService.createNotification({
  userId: 'user-123',
  type: NotificationType.ACHIEVEMENT,
  channel: NotificationChannel.BOTH,
  priority: NotificationPriority.MEDIUM,
  title: 'Achievement Unlocked!',
  message: 'You solved your first problem!',
  data: { achievementId: 'first-solve' }
});

// Create bulk notifications
await notificationService.createNotification({
  userIds: ['user-1', 'user-2', 'user-3'],
  type: NotificationType.CONTEST_START,
  channel: NotificationChannel.EMAIL,
  priority: NotificationPriority.HIGH,
  title: 'Contest Started',
  message: 'The weekly contest has begun!',
  templateId: 'contest_start'
});
```

### Managing User Preferences

```typescript
import { PreferencesService } from './services/PreferencesService';

const preferencesService = PreferencesService.getInstance();

// Update user preferences
await preferencesService.updateUserPreferences('user-123', {
  emailNotifications: true,
  digestFrequency: 'weekly',
  quietHours: {
    start: '22:00',
    end: '08:00',
    timezone: 'America/New_York'
  }
});

// Enable specific notification type
await preferencesService.updateNotificationTypePreference(
  'user-123',
  NotificationType.CONTEST_START,
  true,
  [NotificationChannel.EMAIL]
);
```

### Sending Templated Emails

```typescript
import { EmailService } from './services/EmailService';

const emailService = EmailService.getInstance();

// Send using template
await emailService.sendTemplatedEmail(
  'user@example.com',
  'achievement_unlocked',
  {
    username: 'john_doe',
    achievementTitle: 'Problem Solver',
    achievementDescription: 'Solved 10 problems',
    profileUrl: 'https://platform.com/profile/john_doe'
  }
);
```

### Analytics and Reporting

```typescript
import { AnalyticsService } from './services/AnalyticsService';

const analyticsService = AnalyticsService.getInstance();

// Get notification statistics
const stats = await analyticsService.getNotificationStats(
  new Date('2024-01-01'),
  new Date('2024-01-31')
);

// Generate comprehensive report
const report = await analyticsService.generateAnalyticsReport(
  new Date('2024-01-01'),
  new Date('2024-01-31'),
  true // include user breakdown
);
```

## Email Templates

The service includes several built-in email templates:

### Contest Start Template
- **ID**: `contest_start`
- **Variables**: `username`, `contestTitle`, `duration`, `problemCount`, `contestUrl`

### Achievement Template
- **ID**: `achievement_unlocked`
- **Variables**: `username`, `achievementTitle`, `achievementDescription`, `profileUrl`

### Daily Digest Template
- **ID**: `daily_digest`
- **Variables**: `username`, `date`, `hasActivity`, `problemsSolved`, `contestsParticipated`, etc.

## Queue Management

The service uses Bull queues for processing:

- **Notification Queue**: Processes notification creation and delivery
- **Email Queue**: Handles email sending with retry logic
- **Digest Queue**: Generates and sends digest emails

### Queue Monitoring

```bash
# Get queue statistics
curl http://localhost:3005/api/notifications/admin/queues/stats

# Pause all queues
curl -X POST http://localhost:3005/api/notifications/admin/queues/pause

# Resume all queues
curl -X POST http://localhost:3005/api/notifications/admin/queues/resume
```

## Development

### Installation

```bash
cd services/notification-service
npm install
```

### Running the Service

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Linting

```bash
# Check for linting errors
npm run lint

# Fix linting errors
npm run lint:fix
```

## Monitoring and Maintenance

### Health Check

```bash
curl http://localhost:3005/api/notifications/health
```

### Cleanup Operations

The service automatically runs cleanup operations:

- **Daily at 2:00 AM**: Cleanup expired notifications and old analytics
- **Daily at 9:00 AM**: Schedule digest emails for users

### Manual Cleanup

```typescript
// Cleanup expired notifications
const notificationService = NotificationService.getInstance();
const cleanedNotifications = await notificationService.cleanupExpiredNotifications();

// Cleanup old analytics (keep 90 days)
const analyticsService = AnalyticsService.getInstance();
const cleanedAnalytics = await analyticsService.cleanupOldAnalytics(90);
```

## Integration with Other Services

### User Service Integration
- Fetches user email addresses and usernames
- Validates user existence

### Real-time Service Integration
- Sends real-time notifications via HTTP API
- Handles WebSocket delivery for in-app notifications

### Analytics Service Integration
- Sends notification events for analytics tracking
- Retrieves user behavior data for digest emails

### Contest Service Integration
- Receives contest event notifications
- Handles contest-specific notification logic

## Security Considerations

- **Input Validation**: All inputs are validated using Joi schemas
- **Rate Limiting**: Implemented at the API gateway level
- **Email Security**: SMTP authentication and TLS encryption
- **Data Privacy**: User preferences and notification data are encrypted
- **Access Control**: JWT-based authentication for sensitive operations

## Performance Optimization

- **Queue-based Processing**: Asynchronous processing prevents blocking
- **Redis Caching**: Fast access to notifications and preferences
- **Bulk Operations**: Efficient handling of multiple notifications
- **Connection Pooling**: Optimized database and Redis connections
- **Template Caching**: Compiled templates are cached in memory

## Troubleshooting

### Common Issues

1. **Email Not Sending**
   - Check SMTP configuration
   - Verify email credentials
   - Check firewall settings

2. **Queue Processing Slow**
   - Increase queue concurrency
   - Check Redis connection
   - Monitor system resources

3. **High Memory Usage**
   - Implement notification cleanup
   - Reduce template cache size
   - Monitor Redis memory usage

### Debugging

Enable debug logging by setting:
```env
NODE_ENV=development
```

Check service logs for detailed error information and performance metrics.