# AI-Powered Coding Platform - Complete API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Authentication](#authentication)
4. [API Services](#api-services)
5. [Rate Limiting](#rate-limiting)
6. [Error Handling](#error-handling)
7. [SDK Usage](#sdk-usage)
8. [Examples](#examples)
9. [Testing](#testing)
10. [Deployment](#deployment)

## Overview

This comprehensive API documentation covers all services in the AI-Powered Coding Platform:

- **API Gateway** - Central routing and authentication
- **User Service** - User management and authentication
- **Problem Service** - Coding problem management
- **Code Execution Service** - Secure code execution
- **Contest Service** - Contest management and leaderboards
- **AI Analysis Service** - AI-powered code analysis and learning
- **Notification Service** - Multi-channel notifications
- **Analytics Service** - User behavior and performance analytics
- **Real-time Service** - WebSocket connections and live updates

### Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │────│   API Gateway    │────│   Load Balancer │
│   Applications  │    │   (Port 3000)    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        ┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
        │ User Service │ │Problem Svc  │ │Contest Svc │
        │ (Port 3001)  │ │(Port 3002)  │ │(Port 3003) │
        └──────────────┘ └─────────────┘ └────────────┘
                │               │               │
        ┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
        │Code Exec Svc │ │AI Analysis  │ │Notification│
        │ (Port 3004)  │ │(Port 8001)  │ │(Port 3005) │
        └──────────────┘ └─────────────┘ └────────────┘
                │               │               │
        ┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
        │Analytics Svc │ │Realtime Svc │ │   Redis    │
        │ (Port 3006)  │ │(Port 3007)  │ │            │
        └──────────────┘ └─────────────┘ └────────────┘
```

## Getting Started

### Base URLs

- **Development**: `http://localhost:3000/api/v1`
- **Production**: `https://api.codingplatform.com/api/v1`

### Required Headers

```http
Content-Type: application/json
Authorization: Bearer <jwt_token>  # For authenticated endpoints
X-API-Key: <api_key>              # For service-to-service communication
```

### Quick Start

1. **Install the SDK**:
```bash
npm install @coding-platform/api-client
```

2. **Initialize the client**:
```typescript
import { ApiClient } from '@coding-platform/api-client';

const client = new ApiClient({
  baseURL: 'http://localhost:3000/api/v1',
  timeout: 30000,
});
```

3. **Authenticate**:
```typescript
const response = await client.auth.login({
  email: 'user@example.com',
  password: 'password123'
});

if (response.success) {
  console.log('Logged in successfully!');
}
```

## Authentication

### JWT Token-Based Authentication

The platform uses JWT tokens for authentication with automatic refresh capabilities.

#### Login Flow

```typescript
// 1. Login with credentials
const loginResponse = await client.auth.login({
  email: 'user@example.com',
  password: 'securePassword123'
});

// 2. Tokens are automatically stored in the client
// 3. All subsequent requests include the Bearer token
// 4. Tokens are automatically refreshed when needed
```

#### Registration Flow

```typescript
const registerResponse = await client.auth.register({
  username: 'johndoe',
  email: 'john@example.com',
  password: 'securePassword123',
  firstName: 'John',
  lastName: 'Doe',
  acceptTerms: true
});
```

#### Token Management

```typescript
// Get current tokens
const tokens = client.getTokens();

// Set tokens manually (e.g., from localStorage)
client.setTokens({
  accessToken: 'jwt_access_token',
  refreshToken: 'jwt_refresh_token',
  expiresAt: Date.now() + 3600000
});

// Clear tokens (logout)
client.clearTokens();
```

### API Key Authentication

For service-to-service communication:

```http
X-API-Key: your-service-api-key
```

## API Services

### 1. User Service (Port 3001)

Handles user management, authentication, and preferences.

#### Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | User login | No |
| POST | `/auth/logout` | User logout | Yes |
| GET | `/auth/me` | Get current user | Yes |
| GET | `/users/profile` | Get user profile | Yes |
| PUT | `/users/profile` | Update profile | Yes |
| GET | `/users/check-email` | Check email availability | No |
| GET | `/users/check-username` | Check username availability | No |

#### Examples

**Register a new user:**
```typescript
const response = await client.auth.register({
  username: 'newuser',
  email: 'newuser@example.com',
  password: 'SecurePass123!',
  firstName: 'New',
  lastName: 'User',
  acceptTerms: true
});
```

**Update user profile:**
```typescript
const response = await client.users.updateProfile({
  firstName: 'Updated',
  lastName: 'Name',
  avatar: 'https://example.com/avatar.jpg'
});
```

### 2. Problem Service (Port 3002)

Manages coding problems, test cases, and user interactions.

#### Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/problems` | Search problems | Optional |
| POST | `/problems` | Create problem | Yes (Admin) |
| GET | `/problems/{id}` | Get problem by ID | Optional |
| PUT | `/problems/{id}` | Update problem | Yes (Admin) |
| DELETE | `/problems/{id}` | Delete problem | Yes (Admin) |
| POST | `/problems/{id}/bookmark` | Bookmark problem | Yes |
| DELETE | `/problems/{id}/bookmark` | Remove bookmark | Yes |
| GET | `/problems/bookmarks` | Get user bookmarks | Yes |
| POST | `/problems/{id}/rate` | Rate problem | Yes |
| GET | `/problems/tags/popular` | Get popular tags | No |

#### Examples

**Search problems:**
```typescript
const response = await client.problems.search({
  search: 'binary tree',
  difficulty: 'medium',
  category: 'algorithms',
  tags: ['tree', 'recursion'],
  sortBy: 'popularity',
  sort: 'desc',
  limit: 20,
  offset: 0
});
```

**Create a new problem:**
```typescript
const response = await client.problems.create({
  title: 'Two Sum',
  description: 'Given an array of integers nums and an integer target...',
  difficulty: 'easy',
  category: 'algorithms',
  tags: ['array', 'hash-table'],
  constraints: '2 <= nums.length <= 10^4',
  examples: [
    {
      input: 'nums = [2,7,11,15], target = 9',
      output: '[0,1]',
      explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
    }
  ],
  testCases: [
    {
      id: 'test1',
      input: '[2,7,11,15]\n9',
      expectedOutput: '[0,1]',
      isHidden: false,
      weight: 1
    }
  ],
  timeLimit: 5000,
  memoryLimit: 128
});
```

### 3. Code Execution Service (Port 3004)

Provides secure code execution with multiple language support.

#### Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/execute` | Execute code | Yes |
| GET | `/languages` | Get supported languages | No |
| GET | `/metrics` | Get execution metrics | Yes |
| GET | `/health` | Health check | No |

#### Supported Languages

- Python 3.9+
- JavaScript (Node.js)
- Java 11+
- C++ 17
- Go 1.19+
- Rust 1.65+

#### Examples

**Execute Python code:**
```typescript
const response = await client.codeExecution.execute({
  code: `
def solution(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

# Test the function
nums = [2, 7, 11, 15]
target = 9
print(solution(nums, target))
  `,
  language: 'python',
  testCases: [
    {
      id: 'test1',
      input: '[2,7,11,15]\n9',
      expectedOutput: '[0, 1]'
    }
  ],
  timeLimit: 5000,
  memoryLimit: 128
});
```

### 4. Contest Service (Port 3003)

Manages programming contests and leaderboards.

#### Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/contests` | Search contests | Optional |
| POST | `/contests` | Create contest | Yes (Admin) |
| GET | `/contests/{id}` | Get contest details | Optional |
| PUT | `/contests/{id}` | Update contest | Yes (Creator) |
| DELETE | `/contests/{id}` | Delete contest | Yes (Creator) |
| POST | `/contests/{id}/register` | Register for contest | Yes |
| GET | `/contests/{id}/leaderboard` | Get leaderboard | Optional |
| POST | `/contests/{id}/submit` | Submit solution | Yes |

#### Examples

**Create a contest:**
```typescript
const response = await client.contests.create({
  title: 'Weekly Algorithm Challenge',
  description: 'Test your algorithmic skills in this weekly contest',
  startTime: '2024-01-15T10:00:00Z',
  duration: 120, // 2 hours
  problems: ['problem-uuid-1', 'problem-uuid-2'],
  maxParticipants: 1000,
  registrationDeadline: '2024-01-15T09:30:00Z',
  isPublic: true,
  rules: 'Standard contest rules apply',
  prizes: ['$500 First Place', '$300 Second Place', '$200 Third Place']
});
```

### 5. AI Analysis Service (Port 8001)

Provides AI-powered code analysis, hints, and learning features.

#### Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/analysis/analyze` | Analyze code | Yes |
| POST | `/analysis/hints` | Generate hints | Yes |
| POST | `/analysis/explain` | Explain code | Yes |
| GET | `/analysis/languages` | Supported languages | No |
| POST | `/learning/assess-skills` | Assess user skills | Yes |
| POST | `/learning/generate-learning-path` | Generate learning path | Yes |
| POST | `/interview/sessions` | Create interview session | Yes |
| POST | `/interview/sessions/{id}/start` | Start interview | Yes |

#### Examples

**Analyze code quality:**
```typescript
const response = await client.aiAnalysis.analyzeCode({
  code: `
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
  `,
  language: 'python',
  analysisTypes: ['quality', 'performance', 'complexity'],
  context: {
    problemId: 'fibonacci-problem-uuid',
    userId: 'user-uuid'
  }
});

// Response includes:
// - Overall score (0-100)
// - Issues with severity levels
// - Suggestions for improvement
// - Code metrics (complexity, maintainability)
```

**Generate hints for a problem:**
```typescript
const response = await client.aiAnalysis.generateHints({
  problemId: 'two-sum-uuid',
  userCode: 'def solution(nums, target): pass',
  language: 'python',
  hintLevel: 1
});

// Returns progressive hints based on current code
```

### 6. Notification Service (Port 3005)

Handles multi-channel notifications and user preferences.

#### Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/notifications` | Create notification | Yes |
| GET | `/notifications/user/{userId}` | Get user notifications | Yes |
| GET | `/notifications/{id}` | Get notification by ID | Yes |
| PATCH | `/notifications/{id}/read` | Mark as read | Yes |
| PATCH | `/notifications/user/{userId}/read-all` | Mark all as read | Yes |
| GET | `/notifications/user/{userId}/unread-count` | Get unread count | Yes |
| GET | `/notifications/preferences/{userId}` | Get preferences | Yes |
| PUT | `/notifications/preferences/{userId}` | Update preferences | Yes |

#### Examples

**Create a notification:**
```typescript
const response = await client.notifications.create({
  userId: 'user-uuid',
  type: 'achievement',
  title: 'Problem Solved!',
  message: 'Congratulations! You solved the Two Sum problem.',
  data: {
    problemId: 'two-sum-uuid',
    difficulty: 'easy',
    points: 100
  },
  channels: ['in_app', 'email'],
  priority: 'normal'
});
```

### 7. Analytics Service (Port 3006)

Tracks user behavior and provides insights.

#### Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/events` | Track event | Yes |
| GET | `/events/recent` | Get recent events | Yes |
| GET | `/dashboard` | Get dashboard data | Yes |
| GET | `/behavior/analysis` | Get behavior analysis | Yes |
| GET | `/behavior/engagement-score` | Get engagement score | Yes |

#### Examples

**Track an event:**
```typescript
const response = await client.analytics.trackEvent({
  eventType: 'problem_attempt',
  properties: {
    problemId: 'two-sum-uuid',
    difficulty: 'easy',
    language: 'python',
    timeSpent: 1200, // seconds
    successful: true
  },
  sessionId: 'session-uuid'
});
```

### 8. Real-time Service (Port 3007)

Provides WebSocket connections for live updates.

#### WebSocket Events

- `contest_update` - Live contest leaderboard updates
- `notification_received` - Real-time notifications
- `user_online` - User presence updates
- `code_execution_result` - Live code execution results

#### Example WebSocket Usage

```typescript
const ws = new WebSocket('ws://localhost:3007');

ws.onopen = () => {
  // Authenticate WebSocket connection
  ws.send(JSON.stringify({
    type: 'authenticate',
    token: 'jwt-token'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'contest_update':
      updateLeaderboard(message.payload);
      break;
    case 'notification_received':
      showNotification(message.payload);
      break;
  }
};
```

## Rate Limiting

### Rate Limit Policies

| Endpoint Category | Limit | Window | Headers |
|------------------|-------|--------|---------|
| General API | 1000 requests | 1 hour | `X-Rate-Limit-Remaining`, `X-Rate-Limit-Reset` |
| Authentication | 10 requests | 15 minutes | Same as above |
| Code Execution | 100 requests | 1 hour | Same as above |
| AI Analysis | 50 requests | 1 hour | Same as above |

### Rate Limit Headers

```http
X-Rate-Limit-Remaining: 45
X-Rate-Limit-Reset: 1640995200
X-Rate-Limit-Retry-After: 3600
```

### Handling Rate Limits

```typescript
try {
  const response = await client.codeExecution.execute(request);
} catch (error) {
  if (error.status === 429) {
    const retryAfter = error.headers['X-Rate-Limit-Retry-After'];
    console.log(`Rate limited. Retry after ${retryAfter} seconds`);
  }
}
```

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Error Handling with SDK

```typescript
import { isApiError, ApiError } from '@coding-platform/api-client';

try {
  const response = await client.problems.create(problemData);
} catch (error) {
  if (isApiError(error)) {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        console.log('Validation failed:', error.details);
        break;
      case 'UNAUTHORIZED':
        // Redirect to login
        break;
      case 'RATE_LIMITED':
        // Show rate limit message
        break;
      default:
        console.error('API Error:', error.message);
    }
  } else {
    console.error('Network Error:', error);
  }
}
```

## SDK Usage

### Installation

```bash
npm install @coding-platform/api-client
# or
yarn add @coding-platform/api-client
```

### Basic Setup

```typescript
import { ApiClient } from '@coding-platform/api-client';

const client = new ApiClient({
  baseURL: process.env.API_BASE_URL || 'http://localhost:3000/api/v1',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  onRequest: (config) => {
    console.log('Making request:', config.method, config.url);
    return config;
  },
  onResponse: (response) => {
    console.log('Received response:', response.status);
    return response;
  },
  onError: (error) => {
    console.error('API Error:', error);
  }
});
```

## Examples

### Complete User Registration Flow

```typescript
async function registerUser(userData: RegisterRequest) {
  try {
    // 1. Check if email is available
    const emailCheck = await client.users.checkEmailAvailability(userData.email);
    if (!emailCheck.data.available) {
      throw new Error('Email already exists');
    }

    // 2. Check if username is available
    const usernameCheck = await client.users.checkUsernameAvailability(userData.username);
    if (!usernameCheck.data.available) {
      throw new Error('Username already exists');
    }

    // 3. Register the user
    const registerResponse = await client.auth.register(userData);
    if (!registerResponse.success) {
      throw new Error(registerResponse.error.message);
    }

    // 4. User is automatically logged in after registration
    console.log('Registration successful!', registerResponse.data.user);
    
    return registerResponse.data;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
}
```

### Problem Solving Workflow

```typescript
async function solveProblem(problemId: string, code: string, language: string) {
  try {
    // 1. Get problem details
    const problem = await client.problems.getById(problemId);
    if (!problem.success) {
      throw new Error('Problem not found');
    }

    // 2. Execute code against test cases
    const execution = await client.codeExecution.execute({
      code,
      language,
      testCases: problem.data.testCases,
      timeLimit: problem.data.timeLimit,
      memoryLimit: problem.data.memoryLimit
    });

    // 3. Analyze code quality
    const analysis = await client.aiAnalysis.analyzeCode({
      code,
      language,
      analysisTypes: ['quality', 'performance', 'complexity'],
      context: {
        problemId,
        userId: 'current-user-id'
      }
    });

    // 4. Track the attempt
    await client.analytics.trackEvent({
      eventType: 'problem_attempt',
      properties: {
        problemId,
        language,
        successful: execution.data.overallStatus === 'accepted',
        executionTime: execution.data.executionTime,
        codeQualityScore: analysis.data.overallScore
      }
    });

    // 5. Return results
    return {
      execution: execution.data,
      analysis: analysis.data,
      problem: problem.data
    };
  } catch (error) {
    console.error('Problem solving failed:', error);
    throw error;
  }
}
```

## Testing

### Unit Testing with Jest

```typescript
import { ApiClient } from '@coding-platform/api-client';

// Mock the fetch function
global.fetch = jest.fn();

describe('ApiClient', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient({
      baseURL: 'http://localhost:3000/api/v1'
    });
    
    (fetch as jest.Mock).mockClear();
  });

  test('should login successfully', async () => {
    const mockResponse = {
      success: true,
      data: {
        user: { id: '1', username: 'testuser' },
        tokens: { accessToken: 'token', refreshToken: 'refresh' }
      }
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await client.auth.login({
      email: 'test@example.com',
      password: 'password'
    });

    expect(result.success).toBe(true);
    expect(result.data.user.username).toBe('testuser');
  });
});
```

## Deployment

### Environment Variables

```bash
# API Configuration
API_BASE_URL=https://api.codingplatform.com/api/v1
API_TIMEOUT=30000
API_RETRY_ATTEMPTS=3

# Authentication
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=3600
REFRESH_TOKEN_EXPIRES_IN=604800

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/coding_platform
REDIS_URL=redis://localhost:6379

# External Services
AI_MODEL_PROVIDER=openai
AI_MODEL_API_KEY=your-openai-api-key
EMAIL_SERVICE_API_KEY=your-email-service-key

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

---

## Support and Contributing

### Getting Help

- **Documentation**: [https://docs.codingplatform.com](https://docs.codingplatform.com)
- **API Reference**: [https://api.codingplatform.com/docs](https://api.codingplatform.com/docs)
- **GitHub Issues**: [https://github.com/coding-platform/api/issues](https://github.com/coding-platform/api/issues)
- **Discord Community**: [https://discord.gg/coding-platform](https://discord.gg/coding-platform)

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### License

MIT License - see [LICENSE](LICENSE) file for details.

---

*This documentation is automatically generated from the OpenAPI specification. Last updated: 2024-01-01*
| -----|---------------------|-----|--------|---|
|----ired Auth Requion | t | DescriptdpoinEn
| Method | 
Endpoints

#### .esncser prefereons and u notificatii-channeldles mult3005)

Hance (Port vierion Sficat6. Noti```

### 
});
Limit: 60 time: 5,
 estions',
  maxQuLevel: 'midfficulty  dieer',
ftware Engine: 'So
  targetRolfaang',pe: 'anyTyl',
  comp: 'technicaTypeew,
  interviuuid' 'user-
  userId:({ionw.createSess.intervieclientwait esponse = a rstt
contypescripion:**
```sserview sentate i`

**Cree'
});
``nsivrehe: 'compntType  assessme true,
reas:eakAncludeW
  i'python',: uage
  lang-uuid',serId: 'user
  uls({ssSkilearning.asset.liene = await clesponsnst rcript
co``types
`kills:** ss user`

**Assesnalysis
``exity awith complanation expls detailed  Return
});

//ediate' 'intermnationLevel:  explaython',
uage: 'p..',
  lang: .rr)sort(auick 'def q({
  code:odexplainCsis.eAnalyit client.ai awa response =cript
constpesty``lity:**
`onaunctiode fplain c

**Ex code
```currents based on ssive hintns progreetur

// Rel: 1
});  hintLevython',
uage: 'pngpass',
  larget): n(nums, tasolutioef rCode: 'duseuuid',
  -sum-emId: 'two probl{
 teHints(enerasis.gAnalyit client.ai awa =nseconst respoypescript
**
```ta problem:or te hints f**Genera```

)
inabilityxity, maintaics (compleCode metr
// - rovements for impionst Sugge
// -velsty leith severissues w)
// - Iore (0-100 sceralles:
// - Ovponse includ

// Res }
});
 id': 'user-uu
    userId',-uuid-problemfibonacciproblemId: '
    context: {
  lexity'],e', 'compormancperfality', 'Types: ['qu analysis
 ython',age: 'p
  langu  `,)
bonacci(n-2fiacci(n-1) + eturn fibon  rrn n
          retu n <= 1:
   ifcci(n):
 ef fibona  code: `
dlyzeCode({
Analysis.anaclient.ait nse = awaispoonst repescript
ctyty:**
```de quali*Analyze co

*mples

#### Exaew | Yes |intervi| Start rt` ons/{id}/staew/sessinterviPOST | `/i |
| on | Yesiew sessie intervns` | Creat/sessioiewntervT | `/iOS
| PYes |th | ning paenerate lear | Gng-path`-learniteg/generaarnin| `/lePOST  Yes |
| ls |r skils use | Assessess-skills`ing/asST | `/learn
| PO | No |agesrted langupo | Supguages`s/lan `/analysi GET ||
|| Yes n code  Explaiplain` |exnalysis/| `/a
| POST Yes |hints | ate ` | Gener/hintssisnalyST | `/a Yes |
| PO code || Analyze` yzesis/anal| `/analy|
| POST ------------|----------------------|--------|---|-uired |
th Reqon | Auptiint | Descrindpo| Method | Es

oint Endp###
#.
resng featuearniand ls, hints, alysied code anI-powers Aide

Prov1) (Port 800s ServiceAnalysi AI 
### 5.`

});
``thon'guage: 'py
  lano World"',turn "Hellon(): redef soluti
  code: ',d'problem-uui 'oblemId: {
  pr-uuid',ion('contestubmitSolutontests.s client.cwaitponse = aonst rest
c``typescrip
`solution:**ubmit a 

**S`d');
``'contest-uuiegister(.rt.contestswait clien= a response stescript
con*
```typest:*ontter for a c

**Regis});
```
e']Third Plac'$200 d Place',  Secon300ce', '$00 First Pla['$5izes: ,
  prpply's at rulerd contestanda'S,
  rules: truePublic:   is0:00Z',
1-15T09:3'2024-0ine: rationDeadlregist: 1000,
  Participants'],
  maxuuid-2', 'problem-uuid-1: ['problem-roblems hours
  p 120, // 2
  duration:00:00Z',24-01-15T10:tTime: '20tarest',
  sconty his weeklin tskills ic ur algorithmn: 'Test yoscriptio  deallenge',
rithm Chkly Algoitle: 'Weee({
  ttests.creatonnt.ct clie awaie =responsnst t
co```typescripcontest:**
ate a 

**Creles## Examp
##es |
ion | YlutsoSubmit ubmit` | {id}/scontests/
| POST | `/Optional |aderboard | d` | Get leerboarid}/lead/contests/{ | ` |
| GETst | Yesor conte fRegisterr` | gisteres/{id}/| `/contestT r) |
| POSes (Creatost | Ye conte | Delet/{id}`contestsETE | `/ DEL) |
|eators (Crt | Yentes co| Updatests/{id}` conteT | `/PU
| al |s | Optiontailntest de coid}` | Gettests/{`/conGET | |
| in) s (Admst | Yeate conteCreests` |  `/cont
| POST | |alption | Otsearch contesontests` | SET | `/c--|
| G------------------|--|---------|---------------d |
|RequireAuth iption | t | Descrinthod | Endpots

| Me## Endpoin

##rds.boaand leaderts ing contesrammnages prog3003)

MaPort ice (est Serv## 4. Cont
```

#] }ompilation }needs_cion, le_extens image, filanguage,es: [{ ed_languag supports: {;
// Return()nguagesportedLaupcution.getSodeExeient.cait clawonse =  respnstcoypescript
:**
```tanguagesd lsupporte

**Get });
```8
Limit: 12mory  me 5000,
meLimit:
  ti ],'
    }
 '[0, 1]: dOutput    expecte\n9',
  2,7,11,15]: '[     input
 id: 'test1',   {
    ses: [
   estCaon',
  t 'pythanguage: `,
  larget))
 nums, tnt(solution(9
pri = et
targ1, 15], 7, 1
nums = [2ctionhe funt t Tes

#rn []
    retum] = i[nu     seen
   ment], i]en[compleurn [se        ret seen:
    omplement in if c
       get - numtarent =     complem
    ):numsenumerate( in num
    for i,   seen = {}t):
  ms, targetion(nu
def solu: `
  codee({xecutExecution.eent.codet clinse = awainst respoript
co```typesc:**
 codete Pythonecu
**Exs
## Example1.65+

##
- Rust + Go 1.19 17
-11+
- C++
- Java t (Node.js)aScripJav9+
- ython 3.s

- PnguageLad orte
#### Suppk | No |
 chec | Healthealth`| GET | `/h|
s trics | Yeion meet execut` | G`/metricsET | No |
| Gages |  langupported` | Get suagesngu/laT | ` |
| GEe code | Yes` | Execut| `/execute
| POST ------|----------|--------|------------------|---|
|-d uire Reqption | Authcri | Desdpointethod | Ennts

| MEndpoi

#### ort.nguage supplaultiple h mution witre code execides secu04)

Provt 30rvice (Porxecution Se3. Code E
### ```
');
oblem-uuidokmark('prems.booblt client.prse = awaionst responescript
c:**
```typroblemkmark a pBoo

**});
```8
: 12imityL
  memor,00Limit: 50me,
  ti  }
  ]eight: 1
     walse,
    isHidden: f1]',
     '[0,tput: ctedOuexpe     ',
 1,15]\n9t: '[2,7,1 inpu    ',
  'test1     id:
  {s: [
   setCa tes}
  ],
 .'
    [0, 1]we return 1] == 9,  + nums[se nums[0]tion: 'Becau   explana,
   put: '[0,1]'    out
  = 9',t 5], targe7,11,1s = [2,ut: 'num
      inpes: [
    {',
  examplh <= 10^4nums.lengt=  <nts: '2constrai
  le'],hash-tab, '['array': 
  tagsalgorithms',y: 'categor
  y: 'easy',ficult.',
  dift..er targe an integers nums andegintn array of n ation: 'Give descripum',
 o S  title: 'Tw.create({
.problemsawait client response = stript
conpesc:**
```tyroblem pa newte Crea
```

**: 0
});
  offset0,mit: 2  li: 'desc',
,
  sortty''populari sortBy: ],
 on'ecursi 're',re
  tags: ['tithms',y: 'algortegor
  ca 'medium',lty:fficuee',
  dinary trrch: 'biseaearch({
  blems.snt.pro cliewaitse = aspont reons
ctypescriptms:**
``` problerch
**Seaamples
 Exo |

####ags | N popular tpular` | Getlems/tags/po `/prob GET | Yes |
| problem | | Raterate`d}/ems/{ibl | `/pro |
| POSTkmarks | Yeser boo | Get usarks`kmms/boo | `/proble |
| GETYesbookmark |  Remove bookmark` |ms/{id}/obleETE | `/pr
| DEL Yes |lem |robk pokmar | Bookmark`ems/{id}/bo/problOST | `| PAdmin) |
es ( problem | Yete Delms/{id}` |bleLETE | `/pro| DE|
 (Admin)  Yesem |pdate probl| U` /{id}msproble| `/PUT  |
| Optional by ID |  problem}` | Get{idoblems//pr | `
| GETn) |dmilem | Yes (Ate prob Crea |oblems` `/prT ||
| POSl | Optionaoblems arch prs` | SelemrobGET | `/p---|
| -------------|-------------|-|---------------d |
|-requi Reon | Authpticri Desoint |dp Method | Enints

|
#### Endpoeractions.
 user int, andases, test clemsrobg panages codin3002)

Mvice (Port oblem Ser 2. Pr

###``  }
});
`true
s: Analytic    allowe: true,
amRealN
    show: false,   showEmail
 : 'public',ibilityfileVis: {
    pro  privacye
  },
tes: falsdamUpsyste
    s: true,hievement acue,
   tests: tr,
    conApp: true   in,
 push: false
    ue,l: tr{
    emaiifications: 'en',
  notguage: ark',
  lan theme: 'derences({
 efpdatePrers.uusait client. = aw responset
constescrips:**
```typpreferenceer **Update us;
```

.jpg'
})com/avatar//example.r: 'https:e',
  avataName: 'Nam',
  last'Updatedame: 
  firstNile({teProfda.users.upawait clientesponse = 
const rcriptes```typ**
e:rofildate user p

**Up
});
```rue ts:ptTermcce'User',
  aastName: ,
  ltName: 'New'3!',
  firsSecurePass12assword: '
  p',.comser@exampleemail: 'newu',
  ewuser 'name:sern({
  ugisterh.ret.autenliit csponse = awapt
const reypescriser:**
```tr a new uisteles

**Regmp Exa##| No |

##y litme availabik usernahec` | C-usernamers/check GET | `/useNo |
|ility |  availabail | Check ememail`k-sers/chec`/uT | | GE
 |es profile | Ye` | Updateusers/profil | `/
| PUTes |profile | Yet user | Gofile` rs/prET | `/useYes |
| G |  usert current Ge`/auth/me` ||
| GET | gout | Yes ` | User loauth/logoutPOST | `/| No |
| login er in` | Us `/auth/log POST |er | No |
|usew r nister` | Reguth/registe| POST | `/a-----|
-----------------|---------|------|-------ired |
|--| Auth Requcription nt | Desoithod | EndpMe
| ndpoints
 E##ces.

##erennd pref, ationhenticant, autagememanles user Hand3001)

t rvice (Porr Se
### 1. Usevices
 Ser## API
```

api-keyservice-your-X-API-Key: ```http
n:

unicatiovice commvice-to-ser

For serionhenticatPI Key Aut
### A`

``arTokens();
client.cle)(logoutokens  tar

// Cle0000
});() + 360At: Date.now
  expiresresh_token','jwt_refreshToken:   refn',
ke_to 'jwt_accessoken:ssT  acces({
setTokenlient.
calStorage)g., from locnually (e.kens ma
// Set to;
getTokens()nt.lie = cokensonst tns
cent toke Get currript
//``typescagement

`n Man#### Toke
```

ue
});ms: trtTer accepDoe',
 me: '',
  lastNaohnrstName: 'J3',
  fiord12urePasswssword: 'seccom',
  pan@example.mail: 'joh,
  eoe''johndme: 
  usernaer({auth.registt.wait cliensponse = aterRet regis
conspescript``ty

`tion Flowegistra## R
##
needed
```en  whrefreshedally maticautoens are 
// 4. Toktoken Bearer include thets ent requesAll subsequnt
// 3. the clien ored imatically sts are auto/ 2. Token});

/ssword123'
urePasec password: 'm',
 xample.co'user@e: 
  emailn({.auth.logiit clientsponse = awa loginReals
constedentih crogin wit L
// 1.ptscri``typein Flow

`
#### Loges.
ilitiesh capabatic refrutomn with athenticatiofor auWT tokens es Jplatform usn

The tioenticaAuthd Basen-WT Toke## Jn

#tiocaenti Auth}
```

##!');
cessfully sucged ing('Logconsole.lo
   {success)esponse.if (r
3'
});
 'password12 password:m',
 xample.co 'user@e
  email:gin({nt.auth.loait cliesponse = awret
const escrip
```typte**:ticathen
3. **Au`

});
``00,00  timeout: 31',
000/api/vcalhost:3/lo 'http:/  baseURL:t({
ClienApi new t client =nt';

consorm/api-clieding-platffrom '@cont }  { ApiClie
importt`typescrip*:
`` client*ize the*Initial``

2. *nt
`orm/api-clieding-platf install @cobash
npmK**:
```SDll the nstart

1. **Ick Sta### Quin
```

cationiice commu-to-servservice# For          ey>     -Key: <api_kPI
X-Aointsndpated ethentic# For au_token>  er <jwtearation: Biz
Authoron/jsonplicati apt-Type:
Conten

```httped Headers# Requir1`

##/v/apiatform.comingpl//api.codhttps:: `oduction***Pr- *pi/v1`
:3000/a/localhost*: `http:/ment*lopDeve

- ** URLsse Ba

###artedng St Getti`

##─┘
``────────────┘ └─────────┘ └───────────     └──────     │
   │       )  │ Port 3007│ │(006)     │ (Port 3   │
   is   RedSvc │ │   ealtime │ │R Svc nalytics   │A    ▼──────┐
 ┌────────┐ ─── ┌──────▼─┐──────▼─────   ┌─   │
                   │        │                
     ─────────┘─────┘ └─────────┘ └──────└──────────
        005) ││ │(Port 3rt 8001)  04)  │ │(Port 30       │ (Po
 tification│No │is  │nalysAI Axec Svc │ ││Code E      ─┐
  ▼───── ┌─────────▼──────┐───▼──────┐ ┌    ┌──────        │
    │                     │                 ─────────┘
┘ └──────────────────┘ └─────────        └───3) │
│ │(Port 300  t 3002)  │ │(Por 3001)(Port   │    t Svc │
  tes │ │Con Svc leme │ │Prob Servic    │ User──┐
    ────┐ ┌─────▼──▼─────┐ ┌───────────   ┌───────▼ │
                        │     │                    
 ─────┐─────────┼──────── ┌────────          
             │                     ──┘
   ─────────  └─────────┘  ───────────────    └───────────┘─── │
└───                │    │  0)  00(Port 3    │    │lications   Apper │
│ oad Balanc────│   L  │teway    API Ga │────│ d     ronten
│   F─────┐────────────┐    ┌─────────────┌────────────┐    ─────`
┌─────ecture

``chit## Arupdates

#nd live ions aconnectSocket  - Webe**vicime Ser*Real-tics
- *ce analyterformanhavior and p- User beervice** nalytics S*As
- *tification nonelanMulti-ch** - icetion Serv **Notificarning
-lealysis and  code ana AI-poweredce** -erviysis S
- **AI Analdserboarnt and leadanageme- Contest mervice** est Snt **Con
-tioxecue eSecure codice** - ervon Sutie Execod*C- *t
enanagemblem mro Coding p -ervice** Sblem **Pro
-icationentent and authagemmanUser * - ervice*er Son
- **Ustiticag and authenutinroCentral y** - atewa
- **API Gform:
g Platred CodinPowe in the AI-l servicesalrs oveation cment docuehensive APIcompriew

This verv

## Oloyment)t](#deploymen [Dep
10.ng)#testi[Testing](
9. examples)es](#. [Examplge)
8e](#sdk-usa7. [SDK Usagndling)
or-hang](#errdli[Error Hanmiting)
6. -li(#rate Limiting]teRa5. [services)
api-ces](#PI Servi
4. [Atication)hen#autcation]([Authenti3. ted)
ng-starrted](#gettiing Sta)
2. [Gettrviewrview](#oveOve
1. [nts
f Contee obl## Ta

tionntaumeI Docomplete APPlatform - C Coding  AI-Powered#