import { ABTestingService } from '../../src/services/ABTestingService';
import { testDataSource } from '../setup';
import { ABTestConfig } from '../../src/entities/ABTestConfig';
import { ABTestAssignment } from '../../src/entities/ABTestAssignment';

// Mock Redis
jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue(null),
        setex: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        incr: jest.fn().mockResolvedValue(1),
        expire: jest.fn().mockResolvedValue(1),
    }));
});

describe('ABTestingService', () => {
    let abTestingService: ABTestingService;
    let configRepository: any;
    let assignmentRepository: any;

    beforeEach(() => {
        configRepository = testDataSource.getRepository(ABTestConfig);
        assignmentRepository = testDataSource.getRepository(ABTestAssignment);
        abTestingService = new ABTestingService();
    });

    describe('createTest', () => {
        it('should create a new A/B test successfully', async () => {
            const testConfig = {
                name: 'button_color_test',
                description: 'Test different button colors',
                variants: [
                    {
                        id: 'control',
                        name: 'Blue Button',
                        allocation: 50,
                        config: { buttonColor: 'blue' },
                    },
                    {
                        id: 'treatment',
                        name: 'Red Button',
                        allocation: 50,
                        config: { buttonColor: 'red' },
                    },
                ],
                trafficAllocation: 100,
                startDate: new Date('2023-06-01'),
                endDate: new Date('2023-06-30'),
                status: 'draft' as const,
                targetMetric: 'click_rate',
            };

            const createdTest = await abTestingService.createTest(testConfig);

            expect(createdTest).toHaveProperty('id');
            expect(createdTest.name).toBe(testConfig.name);
            expect(createdTest.variants).toHaveLength(2);
        });

        it('should reject test with invalid variant allocations', async () => {
            const testConfig = {
                name: 'invalid_test',
                description: 'Test with invalid allocations',
                variants: [
                    {
                        id: 'control',
                        name: 'Control',
                        allocation: 60, // Total = 110%
                        config: {},
                    },
                    {
                        id: 'treatment',
                        name: 'Treatment',
                        allocation: 50,
                        config: {},
                    },
                ],
                trafficAllocation: 100,
                startDate: new Date('2023-06-01'),
                endDate: new Date('2023-06-30'),
                status: 'draft' as const,
                targetMetric: 'conversion',
            };

            await expect(abTestingService.createTest(testConfig))
                .rejects.toThrow('Variant allocations must sum to 100%');
        });
    });

    describe('getTestAssignment', () => {
        it('should assign user to a variant', async () => {
            const userId = 'user-123';
            const testName = 'button_test';

            // Create test
            const test = configRepository.create({
                name: testName,
                description: 'Button test',
                variants: [
                    {
                        id: 'control',
                        name: 'Control',
                        allocation: 50,
                        config: { buttonColor: 'blue' },
                    },
                    {
                        id: 'treatment',
                        name: 'Treatment',
                        allocation: 50,
                        config: { buttonColor: 'red' },
                    },
                ],
                trafficAllocation: 100,
                startDate: new Date(Date.now() - 86400000), // Yesterday
                endDate: new Date(Date.now() + 86400000),   // Tomorrow
                status: 'active',
                targetMetric: 'click_rate',
            });

            await configRepository.save(test);

            const assignment = await abTestingService.getTestAssignment(userId, testName);

            expect(assignment).toBeTruthy();
            expect(['control', 'treatment']).toContain(assignment);

            // Verify assignment was saved
            const savedAssignment = await assignmentRepository.findOne({
                where: { userId, testId: test.id },
            });
            expect(savedAssignment).toBeTruthy();
            expect(savedAssignment.variantId).toBe(assignment);
        });

        it('should return consistent assignment for same user', async () => {
            const userId = 'user-consistent';
            const testName = 'consistency_test';

            // Create test
            const test = configRepository.create({
                name: testName,
                description: 'Consistency test',
                variants: [
                    {
                        id: 'control',
                        name: 'Control',
                        allocation: 50,
                        config: {},
                    },
                    {
                        id: 'treatment',
                        name: 'Treatment',
                        allocation: 50,
                        config: {},
                    },
                ],
                trafficAllocation: 100,
                startDate: new Date(Date.now() - 86400000),
                endDate: new Date(Date.now() + 86400000),
                status: 'active',
                targetMetric: 'conversion',
            });

            await configRepository.save(test);

            const assignment1 = await abTestingService.getTestAssignment(userId, testName);
            const assignment2 = await abTestingService.getTestAssignment(userId, testName);

            expect(assignment1).toBe(assignment2);
        });

        it('should return null for inactive test', async () => {
            const userId = 'user-inactive';
            const testName = 'inactive_test';

            // Create inactive test
            const test = configRepository.create({
                name: testName,
                description: 'Inactive test',
                variants: [
                    {
                        id: 'control',
                        name: 'Control',
                        allocation: 100,
                        config: {},
                    },
                ],
                trafficAllocation: 100,
                startDate: new Date(Date.now() - 172800000), // 2 days ago
                endDate: new Date(Date.now() - 86400000),    // Yesterday
                status: 'completed',
                targetMetric: 'conversion',
            });

            await configRepository.save(test);

            const assignment = await abTestingService.getTestAssignment(userId, testName);

            expect(assignment).toBeNull();
        });

        it('should respect traffic allocation', async () => {
            const testName = 'traffic_test';

            // Create test with 0% traffic allocation
            const test = configRepository.create({
                name: testName,
                description: 'Traffic test',
                variants: [
                    {
                        id: 'control',
                        name: 'Control',
                        allocation: 100,
                        config: {},
                    },
                ],
                trafficAllocation: 0, // No traffic
                startDate: new Date(Date.now() - 86400000),
                endDate: new Date(Date.now() + 86400000),
                status: 'active',
                targetMetric: 'conversion',
            });

            await configRepository.save(test);

            // Test multiple users - none should be assigned
            const assignments = await Promise.all([
                abTestingService.getTestAssignment('user-1', testName),
                abTestingService.getTestAssignment('user-2', testName),
                abTestingService.getTestAssignment('user-3', testName),
            ]);

            expect(assignments.every(a => a === null)).toBe(true);
        });
    });

    describe('getTestConfig', () => {
        it('should return variant config for assigned user', async () => {
            const testName = 'config_test';

            const test = configRepository.create({
                name: testName,
                description: 'Config test',
                variants: [
                    {
                        id: 'control',
                        name: 'Control',
                        allocation: 50,
                        config: { feature: 'disabled' },
                    },
                    {
                        id: 'treatment',
                        name: 'Treatment',
                        allocation: 50,
                        config: { feature: 'enabled' },
                    },
                ],
                trafficAllocation: 100,
                startDate: new Date(Date.now() - 86400000),
                endDate: new Date(Date.now() + 86400000),
                status: 'active',
                targetMetric: 'engagement',
            });

            await configRepository.save(test);

            const config = await abTestingService.getTestConfig(testName, 'treatment');

            expect(config).toEqual({ feature: 'enabled' });
        });

        it('should return control config when no variant specified', async () => {
            const testName = 'default_config_test';

            const test = configRepository.create({
                name: testName,
                description: 'Default config test',
                variants: [
                    {
                        id: 'control',
                        name: 'control',
                        allocation: 50,
                        config: { defaultFeature: 'on' },
                    },
                    {
                        id: 'treatment',
                        name: 'Treatment',
                        allocation: 50,
                        config: { defaultFeature: 'off' },
                    },
                ],
                trafficAllocation: 100,
                startDate: new Date(Date.now() - 86400000),
                endDate: new Date(Date.now() + 86400000),
                status: 'active',
                targetMetric: 'usage',
            });

            await configRepository.save(test);

            const config = await abTestingService.getTestConfig(testName);

            expect(config).toEqual({ defaultFeature: 'on' });
        });
    });

    describe('recordTestEvent', () => {
        it('should record test event for assigned user', async () => {
            const userId = 'user-event';
            const testName = 'event_test';

            // Create test and assignment
            const test = configRepository.create({
                name: testName,
                description: 'Event test',
                variants: [
                    {
                        id: 'control',
                        name: 'Control',
                        allocation: 100,
                        config: {},
                    },
                ],
                trafficAllocation: 100,
                startDate: new Date(Date.now() - 86400000),
                endDate: new Date(Date.now() + 86400000),
                status: 'active',
                targetMetric: 'click_rate',
            });

            await configRepository.save(test);

            const assignment = assignmentRepository.create({
                userId,
                testId: test.id,
                variantId: 'control',
                assignedAt: new Date(),
            });

            await assignmentRepository.save(assignment);

            // Record event
            await expect(
                abTestingService.recordTestEvent(userId, testName, 'click', { button: 'submit' })
            ).resolves.not.toThrow();
        });

        it('should handle recording event for unassigned user gracefully', async () => {
            const userId = 'user-unassigned';
            const testName = 'nonexistent_test';

            await expect(
                abTestingService.recordTestEvent(userId, testName, 'click')
            ).resolves.not.toThrow();
        });
    });

    describe('getTestResults', () => {
        it('should return test results with statistics', async () => {
            const test = configRepository.create({
                name: 'results_test',
                description: 'Results test',
                variants: [
                    {
                        id: 'control',
                        name: 'Control',
                        allocation: 50,
                        config: {},
                    },
                    {
                        id: 'treatment',
                        name: 'Treatment',
                        allocation: 50,
                        config: {},
                    },
                ],
                trafficAllocation: 100,
                startDate: new Date(Date.now() - 86400000),
                endDate: new Date(Date.now() + 86400000),
                status: 'active',
                targetMetric: 'conversion',
            });

            await configRepository.save(test);

            // Create some assignments
            const assignments = [
                assignmentRepository.create({
                    userId: 'user-1',
                    testId: test.id,
                    variantId: 'control',
                    assignedAt: new Date(),
                }),
                assignmentRepository.create({
                    userId: 'user-2',
                    testId: test.id,
                    variantId: 'treatment',
                    assignedAt: new Date(),
                }),
            ];

            await assignmentRepository.save(assignments);

            const results = await abTestingService.getTestResults(test.id);

            expect(results).toHaveProperty('testId', test.id);
            expect(results).toHaveProperty('testName', test.name);
            expect(results).toHaveProperty('variants');
            expect(results.variants).toHaveLength(2);
            expect(results.variants[0]).toHaveProperty('assignments');
            expect(results.variants[0]).toHaveProperty('conversions');
            expect(results.variants[0]).toHaveProperty('conversionRate');
        });
    });

    describe('updateTestStatus', () => {
        it('should update test status successfully', async () => {
            const test = configRepository.create({
                name: 'status_test',
                description: 'Status test',
                variants: [
                    {
                        id: 'control',
                        name: 'Control',
                        allocation: 100,
                        config: {},
                    },
                ],
                trafficAllocation: 100,
                startDate: new Date(Date.now() - 86400000),
                endDate: new Date(Date.now() + 86400000),
                status: 'draft',
                targetMetric: 'engagement',
            });

            await configRepository.save(test);

            await abTestingService.updateTestStatus(test.id, 'active');

            const updatedTest = await configRepository.findOne({ where: { id: test.id } });
            expect(updatedTest.status).toBe('active');
        });
    });

    describe('getActiveTests', () => {
        it('should return only active tests within date range', async () => {
            const now = new Date();
            const yesterday = new Date(now.getTime() - 86400000);
            const tomorrow = new Date(now.getTime() + 86400000);

            const tests = [
                configRepository.create({
                    name: 'active_test',
                    description: 'Active test',
                    variants: [{ id: 'control', name: 'Control', allocation: 100, config: {} }],
                    trafficAllocation: 100,
                    startDate: yesterday,
                    endDate: tomorrow,
                    status: 'active',
                    targetMetric: 'conversion',
                }),
                configRepository.create({
                    name: 'draft_test',
                    description: 'Draft test',
                    variants: [{ id: 'control', name: 'Control', allocation: 100, config: {} }],
                    trafficAllocation: 100,
                    startDate: yesterday,
                    endDate: tomorrow,
                    status: 'draft',
                    targetMetric: 'conversion',
                }),
                configRepository.create({
                    name: 'expired_test',
                    description: 'Expired test',
                    variants: [{ id: 'control', name: 'Control', allocation: 100, config: {} }],
                    trafficAllocation: 100,
                    startDate: new Date(now.getTime() - 172800000), // 2 days ago
                    endDate: yesterday,
                    status: 'active',
                    targetMetric: 'conversion',
                }),
            ];

            await configRepository.save(tests);

            const activeTests = await abTestingService.getActiveTests();

            expect(activeTests).toHaveLength(1);
            expect(activeTests[0].name).toBe('active_test');
        });
    });
});