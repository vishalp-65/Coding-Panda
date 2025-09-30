import { DataSource } from 'typeorm';
import { AnalyticsEvent } from '../src/entities/AnalyticsEvent';
import { UserBehaviorPattern } from '../src/entities/UserBehaviorPattern';
import { PerformanceMetrics } from '../src/entities/PerformanceMetrics';
import { ABTestConfig } from '../src/entities/ABTestConfig';
import { ABTestAssignment } from '../src/entities/ABTestAssignment';
import { EngagementMetrics } from '../src/entities/EngagementMetrics';

export let testDataSource: DataSource;

beforeAll(async () => {
    testDataSource = new DataSource({
        type: 'postgres',
        host: process.env.TEST_DB_HOST || 'localhost',
        port: parseInt(process.env.TEST_DB_PORT || '5432'),
        username: process.env.TEST_DB_USER || 'postgres',
        password: process.env.TEST_DB_PASSWORD || 'password',
        database: process.env.TEST_DB_NAME || 'ai_platform_analytics_test',
        synchronize: true,
        dropSchema: true,
        entities: [
            AnalyticsEvent,
            UserBehaviorPattern,
            PerformanceMetrics,
            ABTestConfig,
            ABTestAssignment,
            EngagementMetrics,
        ],
    });

    await testDataSource.initialize();
});

afterAll(async () => {
    if (testDataSource && testDataSource.isInitialized) {
        await testDataSource.destroy();
    }
});

beforeEach(async () => {
    // Clean up all tables before each test
    const entities = testDataSource.entityMetadatas;

    for (const entity of entities) {
        const repository = testDataSource.getRepository(entity.name);
        await repository.clear();
    }
});