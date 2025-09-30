import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { redis } from '../config/redis';
import { ABTestConfig } from '../entities/ABTestConfig';
import { ABTestAssignment } from '../entities/ABTestAssignment';
import { ABTestConfig as IABTestConfig, ABTestAssignment as IABTestAssignment } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ABTestingService {
    private configRepository: Repository<ABTestConfig>;
    private assignmentRepository: Repository<ABTestAssignment>;

    constructor() {
        this.configRepository = AppDataSource.getRepository(ABTestConfig);
        this.assignmentRepository = AppDataSource.getRepository(ABTestAssignment);
    }

    async createTest(testConfig: Omit<IABTestConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<IABTestConfig> {
        try {
            // Validate variant allocations sum to 100%
            const totalAllocation = testConfig.variants.reduce((sum, variant) => sum + variant.allocation, 0);
            if (Math.abs(totalAllocation - 100) > 0.01) {
                throw new Error('Variant allocations must sum to 100%');
            }

            const test = this.configRepository.create({
                ...testConfig,
                id: uuidv4(),
            });

            const savedTest = await this.configRepository.save(test);

            // Cache active test configuration
            if (savedTest.status === 'active') {
                await this.cacheActiveTest(savedTest);
            }

            return savedTest;
        } catch (error) {
            console.error('Error creating A/B test:', error);
            throw error;
        }
    }

    async getTestAssignment(userId: string, testName: string): Promise<string | null> {
        try {
            // Check cache first
            const cacheKey = `ab_assignment:${userId}:${testName}`;
            const cached = await redis.get(cacheKey);
            if (cached) {
                return cached;
            }

            // Get test configuration
            const test = await this.getActiveTestByName(testName);
            if (!test) {
                return null;
            }

            // Check if user already has assignment
            const existingAssignment = await this.assignmentRepository.findOne({
                where: { userId, testId: test.id },
            });

            if (existingAssignment) {
                await redis.setex(cacheKey, 3600, existingAssignment.variantId);
                return existingAssignment.variantId;
            }

            // Check if user should be included in test
            if (!this.shouldIncludeUser(userId, test.trafficAllocation)) {
                return null;
            }

            // Assign user to variant
            const variantId = this.assignUserToVariant(userId, test.variants);

            // Save assignment
            const assignment = this.assignmentRepository.create({
                userId,
                testId: test.id,
                variantId,
                assignedAt: new Date(),
            });

            await this.assignmentRepository.save(assignment);

            // Cache assignment
            await redis.setex(cacheKey, 3600, variantId);

            return variantId;
        } catch (error) {
            console.error('Error getting test assignment:', error);
            return null;
        }
    }

    async getTestConfig(testName: string, variantId?: string): Promise<Record<string, any> | null> {
        try {
            const test = await this.getActiveTestByName(testName);
            if (!test) {
                return null;
            }

            if (!variantId) {
                // Return control variant config
                const controlVariant = test.variants.find(v => v.name === 'control') || test.variants[0];
                return controlVariant.config;
            }

            const variant = test.variants.find(v => v.id === variantId);
            return variant ? variant.config : null;
        } catch (error) {
            console.error('Error getting test config:', error);
            return null;
        }
    }

    async recordTestEvent(userId: string, testName: string, eventType: string, eventData?: any): Promise<void> {
        try {
            const assignment = await this.getUserTestAssignment(userId, testName);
            if (!assignment) {
                return;
            }

            // Record event for analysis
            const eventKey = `ab_event:${assignment.testId}:${assignment.variantId}:${eventType}`;
            await redis.incr(eventKey);
            await redis.expire(eventKey, 86400 * 30); // 30 days TTL

            // Store detailed event data if provided
            if (eventData) {
                const detailKey = `ab_event_detail:${assignment.testId}:${userId}:${Date.now()}`;
                await redis.setex(detailKey, 86400 * 7, JSON.stringify({
                    testId: assignment.testId,
                    variantId: assignment.variantId,
                    eventType,
                    eventData,
                    timestamp: new Date(),
                }));
            }
        } catch (error) {
            console.error('Error recording test event:', error);
        }
    }

    async getTestResults(testId: string): Promise<any> {
        try {
            const test = await this.configRepository.findOne({ where: { id: testId } });
            if (!test) {
                throw new Error('Test not found');
            }

            const results: any = {
                testId,
                testName: test.name,
                status: test.status,
                variants: [],
            };

            for (const variant of test.variants) {
                const assignments = await this.assignmentRepository.count({
                    where: { testId, variantId: variant.id },
                });

                // Get conversion events (example: problem_solved)
                const conversionKey = `ab_event:${testId}:${variant.id}:${test.targetMetric}`;
                const conversions = await redis.get(conversionKey);

                const variantResult = {
                    variantId: variant.id,
                    variantName: variant.name,
                    assignments,
                    conversions: parseInt(conversions || '0'),
                    conversionRate: assignments > 0 ? (parseInt(conversions || '0') / assignments) * 100 : 0,
                };

                results.variants.push(variantResult);
            }

            // Calculate statistical significance
            results.statisticalSignificance = this.calculateStatisticalSignificance(results.variants);

            return results;
        } catch (error) {
            console.error('Error getting test results:', error);
            throw error;
        }
    }

    async updateTestStatus(testId: string, status: string): Promise<void> {
        try {
            await this.configRepository.update(testId, { status });

            const test = await this.configRepository.findOne({ where: { id: testId } });
            if (test) {
                if (status === 'active') {
                    await this.cacheActiveTest(test);
                } else {
                    await this.removeTestFromCache(test.name);
                }
            }
        } catch (error) {
            console.error('Error updating test status:', error);
            throw error;
        }
    }

    async getActiveTests(): Promise<IABTestConfig[]> {
        try {
            const now = new Date();
            return await this.configRepository.find({
                where: {
                    status: 'active',
                    startDate: { $lte: now } as any,
                    endDate: { $gte: now } as any,
                },
            });
        } catch (error) {
            console.error('Error getting active tests:', error);
            return [];
        }
    }

    private async getActiveTestByName(testName: string): Promise<ABTestConfig | null> {
        try {
            // Check cache first
            const cacheKey = `ab_test:${testName}`;
            const cached = await redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }

            const now = new Date();
            const test = await this.configRepository.findOne({
                where: {
                    name: testName,
                    status: 'active',
                    startDate: { $lte: now } as any,
                    endDate: { $gte: now } as any,
                },
            });

            if (test) {
                await redis.setex(cacheKey, 3600, JSON.stringify(test));
            }

            return test;
        } catch (error) {
            console.error('Error getting active test by name:', error);
            return null;
        }
    }

    private async getUserTestAssignment(userId: string, testName: string): Promise<ABTestAssignment | null> {
        try {
            const test = await this.getActiveTestByName(testName);
            if (!test) {
                return null;
            }

            return await this.assignmentRepository.findOne({
                where: { userId, testId: test.id },
            });
        } catch (error) {
            console.error('Error getting user test assignment:', error);
            return null;
        }
    }

    private shouldIncludeUser(userId: string, trafficAllocation: number): boolean {
        // Use consistent hashing to determine if user should be included
        const hash = this.hashUserId(userId);
        const threshold = (trafficAllocation / 100) * 0xFFFFFFFF;
        return hash < threshold;
    }

    private assignUserToVariant(userId: string, variants: any[]): string {
        // Use consistent hashing for variant assignment
        const hash = this.hashUserId(userId);
        const normalizedHash = hash / 0xFFFFFFFF;

        let cumulativeAllocation = 0;
        for (const variant of variants) {
            cumulativeAllocation += variant.allocation / 100;
            if (normalizedHash <= cumulativeAllocation) {
                return variant.id;
            }
        }

        // Fallback to last variant
        return variants[variants.length - 1].id;
    }

    private hashUserId(userId: string): number {
        // Simple hash function for consistent assignment
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            const char = userId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    private calculateStatisticalSignificance(variants: any[]): any {
        if (variants.length < 2) {
            return { significant: false, pValue: null };
        }

        // Simple chi-square test implementation
        const control = variants[0];
        const treatment = variants[1];

        if (control.assignments === 0 || treatment.assignments === 0) {
            return { significant: false, pValue: null };
        }

        const controlSuccess = control.conversions;
        const controlFailure = control.assignments - control.conversions;
        const treatmentSuccess = treatment.conversions;
        const treatmentFailure = treatment.assignments - treatment.conversions;

        // Chi-square calculation (simplified)
        const total = control.assignments + treatment.assignments;
        const totalSuccess = controlSuccess + treatmentSuccess;
        const totalFailure = controlFailure + treatmentFailure;

        const expectedControlSuccess = (control.assignments * totalSuccess) / total;
        const expectedControlFailure = (control.assignments * totalFailure) / total;
        const expectedTreatmentSuccess = (treatment.assignments * totalSuccess) / total;
        const expectedTreatmentFailure = (treatment.assignments * totalFailure) / total;

        const chiSquare =
            Math.pow(controlSuccess - expectedControlSuccess, 2) / expectedControlSuccess +
            Math.pow(controlFailure - expectedControlFailure, 2) / expectedControlFailure +
            Math.pow(treatmentSuccess - expectedTreatmentSuccess, 2) / expectedTreatmentSuccess +
            Math.pow(treatmentFailure - expectedTreatmentFailure, 2) / expectedTreatmentFailure;

        // Degrees of freedom = 1 for 2x2 contingency table
        const pValue = this.chiSquareToPValue(chiSquare, 1);
        const significant = pValue < 0.05;

        return {
            significant,
            pValue,
            chiSquare,
            confidenceLevel: significant ? 95 : null,
        };
    }

    private chiSquareToPValue(chiSquare: number, degreesOfFreedom: number): number {
        // Simplified p-value calculation for chi-square test
        // In production, use a proper statistical library
        if (degreesOfFreedom === 1) {
            if (chiSquare > 3.841) return 0.05;
            if (chiSquare > 2.706) return 0.10;
            if (chiSquare > 1.642) return 0.20;
            return 0.50;
        }
        return 0.50; // Default for other degrees of freedom
    }

    private async cacheActiveTest(test: ABTestConfig): Promise<void> {
        const cacheKey = `ab_test:${test.name}`;
        await redis.setex(cacheKey, 3600, JSON.stringify(test));
    }

    private async removeTestFromCache(testName: string): Promise<void> {
        const cacheKey = `ab_test:${testName}`;
        await redis.del(cacheKey);
    }
}