import { DataSource } from 'typeorm';
import {
  User,
  UserSession,
  PasswordResetToken,
  EmailVerificationToken,
  UserStats,
} from '../entities';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'user_service_user',
  password: process.env.DB_PASSWORD || 'user_service_pass',
  database: process.env.DB_NAME || 'user_service',
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities: [
    User,
    UserSession,
    PasswordResetToken,
    EmailVerificationToken,
    UserStats,
  ],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts'],
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('Database connection initialized successfully');
  } catch (error) {
    console.error('Error during database initialization:', error);
    throw error;
  }
};
