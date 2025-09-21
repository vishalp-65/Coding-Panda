import { Pool, PoolConfig } from 'pg';
import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

// PostgreSQL connection
const dbConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'contest_service',
  user: process.env.DB_USER || 'contest_service_user',
  password: process.env.DB_PASSWORD || 'contest_service_pass',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const db = new Pool(dbConfig);

// Test database connection
db.on('connect', () => {
  logger.info('Connected to PostgreSQL database');
});

db.on('error', err => {
  logger.error('PostgreSQL connection error:', err);
});

// Redis connection
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
};

export const redis: RedisClientType = createClient({
  socket: {
    host: redisConfig.host,
    port: redisConfig.port,
  },
  password: redisConfig.password,
});

redis.on('connect', () => {
  logger.info('Connected to Redis');
});

redis.on('error', err => {
  logger.error('Redis connection error:', err);
});

// Initialize connections
export const initializeDatabase = async (): Promise<void> => {
  try {
    // Test PostgreSQL connection
    const client = await db.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('PostgreSQL connection established successfully');

    // Connect to Redis
    await redis.connect();
    logger.info('Redis connection established successfully');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
};

// Graceful shutdown
export const closeDatabase = async (): Promise<void> => {
  try {
    await db.end();
    await redis.quit();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections:', error);
  }
};
