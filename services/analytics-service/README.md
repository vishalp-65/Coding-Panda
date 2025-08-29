# Analytics and Recommendation Service

The Analytics and Recommendation Service provides comprehensive analytics, user behavior analysis, personalized recommendations, A/B testing capabilities, and real-time dashboards for the AI-powered coding platform.

## Features

### 📊 Event Tracking
- Real-time event collection and processing
- User behavior tracking across sessions
- Performance metrics collection
- Scalable event processing with Redis queues

### 🧠 Behavior Analysis
- User behavior pattern recognition
- Engagement score calculation
- Dropoff point identification
- Learning pattern analysis

### 🎯 Recommendation Engine
- Content-based recommendations
- Collaborative filtering
- Difficulty progression suggestions
- Personalized learning paths

### 🧪 A/B Testing Framework
- Experiment configuration and management
- Statistical significance testing
- Real-time result tracking
- Traffic allocation control

### 📈 Analytics Dashboard
- Real-time metrics and KPIs
- User engagement trends
- System health monitoring
- Performance analytics

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Event Queue   │    │   PostgreSQL    │    │     Redis       │
│   (Bull/Redis)  │    │   (Analytics)   │    │   (Caching)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Analytics API  │
                    │   (Express.js)  │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Event Tracking  │    │ Recommendation  │    │   A/B Testing   │
│    Service      │    │    Service      │    │    Service      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Behavior Analysis│
                    │    Service      │
                    └─────────────────┘
```

## API Endpoints

### Event Tracking
- `POST /api/analytics/events` - Track user events
- `GET /api/analytics/events/recent` - Get recent user events
- `GET /api/analytics/events/stats` - Get user event statistics

### Behavior Analysis
- `GET /api/analytics/behavior/analysis` - Get user behavior analysis
- `GET /api/analytics/behavior/engagement-score` - Get user engagement score
- `GET /api/analytics/behavior/dropoff-points` - Get user dropoff points

### Recommendations
- `POST /api/analytics/recommendations` - Generate personalized recommendations

### A/B Testing
- `POST /api/analytics/ab-tests` - Create A/B test
- `GET /api/analytics/ab-tests/:testName/assignment` - Get user test assignment
- `GET /api/analytics/ab-tests/:testName/config` - Get test configuration
- `POST /api/analytics/ab-tests/:testName/events` - Record test events
- `GET /api/analytics/ab-tests/:testId/results` - Get test results

### Dashboard
- `GET /api/analytics/dashboard` - Get dashboard data
- `GET /api/analytics/dashboard/realtime` - Get real-time metrics
- `GET /api/analytics/dashboard/engagement-trends` - Get engagement trends
- `GET /api/analytics/dashboard/top-performers` - Get top performers

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Set up PostgreSQL database:
```bash
# Create database
createdb ai_platform_analytics

# Run migrations (if any)
npm run migrate
```

4. Start Redis server:
```bash
redis-server
```

5. Start the service:
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Configuration

### Environment Variables

```env
NODE_ENV=development
PORT=3007

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_platform_analytics
DB_USER=postgres
DB_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-jwt-secret-key

# External Services
USER_SERVICE_URL=http://localhost:3001
PROBLEM_SERVICE_URL=http://localhost:3002
CONTEST_SERVICE_URL=http://localhost:3005

# Analytics Configuration
BATCH_SIZE=1000
PROCESSING_INTERVAL=300000
RETENTION_DAYS=365

# A/B Testing
AB_TEST_CACHE_TTL=3600
```

## Usage Examples

### Track User Events

```javascript
// Track problem view
await fetch('/api/analytics/events', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    eventType: 'problem_view',
    eventData: {
      problemId: 'prob-123',
      difficulty: 'medium',
      category: 'arrays'
    },
    sessionId: 'session-456'
  })
});

// Track code submission
await fetch('/api/analytics/events', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    eventType: 'code_submission',
    eventData: {
      problemId: 'prob-123',
      language: 'javascript',
      result: 'accepted',
      executionTime: 245,
      memoryUsed: 1024
    }
  })
});
```

### Get Personalized Recommendations

```javascript
const recommendations = await fetch('/api/analytics/recommendations', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'problem',
    limit: 10
  })
}).then(res => res.json());

console.log(recommendations);
// [
//   {
//     id: 'prob-456',
//     type: 'problem',
//     score: 0.9,
//     reason: 'Matches your preferred difficulty and interests',
//     metadata: {
//       difficulty: 'medium',
//       topics: ['arrays', 'sorting']
//     }
//   }
// ]
```

### A/B Testing

```javascript
// Get test assignment
const assignment = await fetch('/api/analytics/ab-tests/button_color_test/assignment', {
  headers: { 'Authorization': 'Bearer ' + token }
}).then(res => res.json());

// Get test configuration
const config = await fetch(`/api/analytics/ab-tests/button_color_test/config?variantId=${assignment.variantId}`, {
  headers: { 'Authorization': 'Bearer ' + token }
}).then(res => res.json());

// Apply configuration
if (config.config.buttonColor === 'red') {
  button.style.backgroundColor = 'red';
}

// Record conversion event
await fetch('/api/analytics/ab-tests/button_color_test/events', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    eventType: 'button_click',
    eventData: { buttonId: 'submit' }
  })
});
```

## Testing

Run the test suite:

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

## Performance Considerations

### Caching Strategy
- User behavior patterns cached for 1 hour
- Recommendations cached for 30 minutes
- Dashboard data cached for 15 minutes
- A/B test configurations cached for 1 hour

### Database Optimization
- Partitioned tables for analytics events by date
- Composite indexes on user_id + timestamp
- Separate read replicas for analytics queries

### Queue Processing
- Async event processing with Bull queues
- Batch processing for performance metrics
- Retry logic with exponential backoff

## Monitoring

The service includes comprehensive monitoring:

- Health check endpoint: `GET /health`
- Prometheus metrics collection
- Structured logging with correlation IDs
- Error tracking and alerting
- Performance monitoring dashboards

## Security

- JWT token authentication
- Rate limiting (1000 requests per 15 minutes)
- Input validation with Joi schemas
- SQL injection prevention
- CORS configuration
- Security headers with Helmet

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

This project is licensed under the MIT License.