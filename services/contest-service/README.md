# Contest Management Service

The Contest Management Service is a core component of the AI-powered coding platform that handles contest creation, participant registration, submission management, real-time rankings, and contest analytics.

## Features

- **Contest Management**: Create, update, and manage coding contests
- **Participant Registration**: Handle user registration and team management
- **Submission Processing**: Process code submissions and calculate scores
- **Real-time Rankings**: Live leaderboard updates during contests
- **Contest Analytics**: Performance reporting and statistics
- **Notification System**: Contest event notifications
- **Scheduled Tasks**: Automated contest status updates and notifications

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Redis for caching
- **Authentication**: JWT tokens
- **Validation**: Joi schema validation
- **Testing**: Jest with Supertest
- **Logging**: Winston
- **Scheduling**: node-cron

## API Endpoints

### Public Endpoints

- `GET /api/v1/contests` - Search and list contests
- `GET /api/v1/contests/:id` - Get contest details
- `GET /api/v1/contests/:id/leaderboard` - Get contest leaderboard
- `GET /health` - Health check

### Protected Endpoints (Require Authentication)

- `POST /api/v1/contests` - Create new contest
- `PUT /api/v1/contests/:id` - Update contest
- `DELETE /api/v1/contests/:id` - Delete contest
- `POST /api/v1/contests/:id/register` - Register for contest
- `POST /api/v1/contests/:id/submit` - Submit solution

## Database Schema

The service uses PostgreSQL with the following main tables:

- `contests` - Contest information and configuration
- `contest_participants` - Participant registration data
- `contest_submissions` - Code submissions and results
- `contest_rankings` - Calculated rankings and scores
- `contest_analytics` - Contest statistics and metrics

## Environment Variables

```bash
# Server Configuration
PORT=3003
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=contest_service
DB_USER=contest_service_user
DB_PASSWORD=contest_service_pass

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=24h

# External Services
USER_SERVICE_URL=http://localhost:3006
PROBLEM_SERVICE_URL=http://localhost:3002
NOTIFICATION_SERVICE_URL=http://localhost:3005
CODE_EXECUTION_SERVICE_URL=http://localhost:3004

# Logging
LOG_LEVEL=info
```

## Installation and Setup

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Set up environment variables**:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run database migrations**:

   ```bash
   psql -h localhost -U contest_service_user -d contest_service -f migrations/001_create_contests_schema.sql
   ```

4. **Start the service**:

   ```bash
   # Development
   npm run dev

   # Production
   npm run build
   npm start
   ```

## Development

### Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Test coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Code Quality

```bash
# Linting
npm run lint
npm run lint:fix

# Type checking
npm run build
```

### Docker

```bash
# Build image
docker build -t contest-service .

# Run container
docker run -p 3003:3003 --env-file .env contest-service
```

## Contest Workflow

1. **Contest Creation**: Authorized users create contests with problems and rules
2. **Registration**: Users register for upcoming contests
3. **Contest Start**: Automated status updates and notifications
4. **Submissions**: Participants submit solutions during active contests
5. **Real-time Ranking**: Rankings updated after each successful submission
6. **Contest End**: Final rankings calculated and notifications sent

## Scoring Systems

### Standard Scoring

- Each problem has a maximum score (typically 100 points)
- Partial credit based on test cases passed
- Time penalties for wrong submissions

### ICPC Scoring (Future)

- Binary scoring (solved/not solved)
- Time penalties for wrong submissions
- Ranking based on problems solved, then time

### IOI Scoring (Future)

- Subtask-based scoring
- No time penalties
- Best submission counts

## Monitoring and Observability

The service includes:

- **Health checks** at `/health`
- **Structured logging** with Winston
- **Request tracking** with correlation IDs
- **Error handling** with proper HTTP status codes
- **Performance metrics** (planned)

## Security Features

- **JWT authentication** for protected endpoints
- **Input validation** with Joi schemas
- **SQL injection prevention** with parameterized queries
- **Rate limiting** (planned)
- **CORS configuration**
- **Security headers** with Helmet

## Scheduled Tasks

The service runs several background tasks:

- **Contest status updates** (every minute)
- **Contest reminders** (24h and 1h before start)
- **Start/end notifications** (when contests begin/end)
- **Final rankings calculation** (for ended contests)

## Integration with Other Services

- **User Service**: User authentication and profile data
- **Problem Service**: Problem validation and test cases
- **Code Execution Service**: Code execution and result processing
- **Notification Service**: Email and in-app notifications
- **Analytics Service**: Contest performance metrics

## Error Handling

All API responses follow a consistent error format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "req-123456"
  }
}
```

## Performance Considerations

- **Redis caching** for frequently accessed data
- **Database indexing** for optimal query performance
- **Connection pooling** for database connections
- **Pagination** for large result sets
- **Async processing** for non-critical operations

## Contributing

1. Follow TypeScript and ESLint configurations
2. Write tests for new features
3. Update documentation for API changes
4. Use conventional commit messages
5. Ensure all tests pass before submitting PRs

## License

This project is licensed under the MIT License.
