import { DataSource } from 'typeorm';
import { AnalyticsEvent } from '../entities/AnalyticsEvent';
import { UserBehaviorPattern } from '../entities/UserBehaviorPattern';
import { PerformanceMetrics } from '../entities/PerformanceMetrics';
import { ABTestConfig } from '../entities/ABTestConfig';
import { ABTestAssignment } from '../entities/ABTestAssignment';
import { EngagementMetrics } from '../entities/EngagementMetrics';

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'ai_platform_analytics',
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development',
    entities: [
        AnalyticsEvent,
        UserBehaviorPattern,
        PerformanceMetrics,
        ABTestConfig,
        ABTestAssignment,
        EngagementMetrics,
    ],
    migrations: ['src/migrations/*.ts'],
    subscribers: ['src/subscribers/*.ts'],
});

export const initializeDatabase = async (): Promise<void> => {
    try {
        await AppDataSource.initialize();
        console.log('Database connection established successfully');
    } catch (error) {
        console.error('Error during database initialization:', error);
        throw error;
    }
};