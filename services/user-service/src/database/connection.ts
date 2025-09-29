import { DataSource } from 'typeorm';
import { config } from '../config/env';
import * as entities from '../entities';

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: config.database.host,
    port: config.database.port,
    username: config.database.username,
    password: config.database.password,
    database: config.database.name,
    synchronize: config.nodeEnv === 'development',
    logging: config.nodeEnv === 'development',
    entities: [
        entities.User,
        entities.UserSession,
        entities.PasswordResetToken,
        entities.EmailVerificationToken,
        entities.UserStats,
        entities.PrivacyConsent,
        entities.DataExportRequest,
        entities.DataDeletionRequest,
        entities.AuditLog,
    ],
    migrations: ['src/migrations/*.ts'],
    subscribers: ['src/subscribers/*.ts'],
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

export const closeDatabase = async (): Promise<void> => {
    try {
        await AppDataSource.destroy();
        console.log('Database connection closed successfully');
    } catch (error) {
        console.error('Error during database closure:', error);
        throw error;
    }
};