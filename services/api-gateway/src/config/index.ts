import { z } from 'zod';

const configSchema = z.object({
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().default(8080),

  // Redis configuration
  redis: z.object({
    host: z.string().default('localhost'),
    port: z.coerce.number().default(6379),
    password: z.string().optional(),
    db: z.coerce.number().default(0),
  }),

  // JWT configuration
  jwt: z.object({
    secret: z.string().min(32),
    expiresIn: z.string().default('1h'),
    refreshExpiresIn: z.string().default('7d'),
  }),

  // Rate limiting configuration
  rateLimit: z.object({
    windowMs: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
    max: z.coerce.number().default(100), // limit each IP to 100 requests per windowMs
    skipSuccessfulRequests: z.boolean().default(false),
  }),

  // Service discovery configuration
  services: z.object({
    userService: z.object({
      url: z.string().default('http://localhost:3006'),
      timeout: z.coerce.number().default(5000),
    }),
    problemService: z.object({
      url: z.string().default('http://localhost:3002'),
      timeout: z.coerce.number().default(5000),
    }),
    executionService: z.object({
      url: z.string().default('http://localhost:3004'),
      timeout: z.coerce.number().default(30000),
    }),
    aiService: z.object({
      url: z.string().default('http://localhost:8001'),
      timeout: z.coerce.number().default(10000),
    }),
    contestService: z.object({
      url: z.string().default('http://localhost:3003'),
      timeout: z.coerce.number().default(5000),
    }),
    analyticsService: z.object({
      url: z.string().default('http://localhost:3005'),
      timeout: z.coerce.number().default(5000),
    }),
    notificationService: z.object({
      url: z.string().default('http://localhost:3007'),
      timeout: z.coerce.number().default(5000),
    }),
    realtimeService: z.object({
      url: z.string().default('http://localhost:3008'),
      timeout: z.coerce.number().default(5000),
    }),
  }),

  // CORS configuration
  cors: z.object({
    origin: z.union([z.string(), z.array(z.string())]).default('*'),
    credentials: z.boolean().default(true),
  }),
});

const env = {
  nodeEnv: process.env.NODE_ENV,
  port: process.env.PORT || process.env.API_GATEWAY_PORT,

  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB,
  },

  jwt: {
    secret:
      process.env.JWT_SECRET ||
      'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  },

  rateLimit: {
    windowMs: process.env.RATE_LIMIT_WINDOW_MS,
    max: process.env.RATE_LIMIT_MAX,
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL,
  },

  services: {
    userService: {
      url: process.env.USER_SERVICE_URL,
      timeout: process.env.USER_SERVICE_TIMEOUT,
    },
    problemService: {
      url: process.env.PROBLEM_SERVICE_URL,
      timeout: process.env.PROBLEM_SERVICE_TIMEOUT,
    },
    executionService: {
      url: process.env.EXECUTION_SERVICE_URL,
      timeout: process.env.EXECUTION_SERVICE_TIMEOUT,
    },
    aiService: {
      url: process.env.AI_SERVICE_URL,
      timeout: process.env.AI_SERVICE_TIMEOUT,
    },
    contestService: {
      url: process.env.CONTEST_SERVICE_URL,
      timeout: process.env.CONTEST_SERVICE_TIMEOUT,
    },
    analyticsService: {
      url: process.env.ANALYTICS_SERVICE_URL,
      timeout: process.env.ANALYTICS_SERVICE_TIMEOUT,
    },
    notificationService: {
      url: process.env.NOTIFICATION_SERVICE_URL,
      timeout: process.env.NOTIFICATION_SERVICE_TIMEOUT,
    },
    realtimeService: {
      url: process.env.REALTIME_SERVICE_URL,
      timeout: process.env.REALTIME_SERVICE_TIMEOUT,
    },
  },

  cors: {
    origin: process.env.CORS_ORIGIN,
    credentials: process.env.CORS_CREDENTIALS,
  },
};

export const config = configSchema.parse(env);
export type Config = z.infer<typeof configSchema>;
