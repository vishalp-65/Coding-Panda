import { Router, Request } from 'express';
import { EventTrackingService } from '../services/EventTrackingService';
import { BehaviorAnalysisService } from '../services/BehaviorAnalysisService';
import { RecommendationService } from '../services/RecommendationService';
import { ABTestingService } from '../services/ABTestingService';
import { DashboardService } from '../services/DashboardService';
import { validateRequest } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import Joi from 'joi';

interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        roles: string[];
    };
}

const router = Router();

// Initialize services
const eventTrackingService = new EventTrackingService();
const behaviorAnalysisService = new BehaviorAnalysisService();
const recommendationService = new RecommendationService();
const abTestingService = new ABTestingService();
const dashboardService = new DashboardService();

// Validation schemas
const trackEventSchema = Joi.object({
    eventType: Joi.string().required(),
    eventData: Joi.object().required(),
    sessionId: Joi.string().optional(),
    userAgent: Joi.string().optional(),
    ipAddress: Joi.string().optional(),
});

const recommendationSchema = Joi.object({
    type: Joi.string().valid('problem', 'learning_path', 'contest').required(),
    context: Joi.object().optional(),
    limit: Joi.number().min(1).max(50).optional(),
});

const abTestSchema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    variants: Joi.array().items(Joi.object({
        id: Joi.string().required(),
        name: Joi.string().required(),
        allocation: Joi.number().min(0).max(100).required(),
        config: Joi.object().required(),
    })).min(2).required(),
    trafficAllocation: Joi.number().min(0).max(100).required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().required(),
    targetMetric: Joi.string().required(),
});

// Event tracking routes
router.post('/events',
    authenticateToken,
    validateRequest(trackEventSchema),
    async (req: AuthenticatedRequest, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            await eventTrackingService.trackEvent({
                userId,
                ...req.body,
            });

            res.status(201).json({ success: true });
        } catch (error) {
            console.error('Error tracking event:', error);
            res.status(500).json({ error: 'Failed to track event' });
        }
    }
);

router.get('/events/recent',
    authenticateToken,
    async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }
            const limit = parseInt(req.query.limit as string) || 50;

            const events = await eventTrackingService.getRecentEvents(userId, limit);
            res.json(events);
        } catch (error) {
            console.error('Error getting recent events:', error);
            res.status(500).json({ error: 'Failed to get recent events' });
        }
    }
);

router.get('/events/stats',
    authenticateToken,
    async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }
            const days = parseInt(req.query.days as string) || 30;

            const stats = await eventTrackingService.getUserEventStats(userId, days);
            res.json(stats);
        } catch (error) {
            console.error('Error getting event stats:', error);
            res.status(500).json({ error: 'Failed to get event stats' });
        }
    }
);

// Behavior analysis routes
router.get('/behavior/analysis',
    authenticateToken,
    async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }
            const analysis = await behaviorAnalysisService.analyzeUserBehavior(userId);
            res.json(analysis);
        } catch (error) {
            console.error('Error analyzing behavior:', error);
            res.status(500).json({ error: 'Failed to analyze behavior' });
        }
    }
);

router.get('/behavior/engagement-score',
    authenticateToken,
    async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }
            const score = await behaviorAnalysisService.calculateEngagementScore(userId);
            res.json({ engagementScore: score });
        } catch (error) {
            console.error('Error calculating engagement score:', error);
            res.status(500).json({ error: 'Failed to calculate engagement score' });
        }
    }
);

router.get('/behavior/dropoff-points',
    authenticateToken,
    async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }
            const dropoffPoints = await behaviorAnalysisService.identifyDropoffPoints(userId);
            res.json({ dropoffPoints });
        } catch (error) {
            console.error('Error identifying dropoff points:', error);
            res.status(500).json({ error: 'Failed to identify dropoff points' });
        }
    }
);

// Recommendation routes
router.post('/recommendations',
    authenticateToken,
    validateRequest(recommendationSchema),
    async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }
            const recommendations = await recommendationService.generateRecommendations({
                userId,
                ...req.body,
            });
            res.json(recommendations);
        } catch (error) {
            console.error('Error generating recommendations:', error);
            res.status(500).json({ error: 'Failed to generate recommendations' });
        }
    }
);

// A/B Testing routes
router.post('/ab-tests',
    authenticateToken,
    validateRequest(abTestSchema),
    async (req, res) => {
        try {
            const test = await abTestingService.createTest(req.body);
            res.status(201).json(test);
        } catch (error) {
            console.error('Error creating A/B test:', error);
            res.status(500).json({ error: 'Failed to create A/B test' });
        }
    }
);

router.get('/ab-tests/:testName/assignment',
    authenticateToken,
    async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }
            const { testName } = req.params;

            const assignment = await abTestingService.getTestAssignment(userId, testName);
            res.json({ variantId: assignment });
        } catch (error) {
            console.error('Error getting test assignment:', error);
            res.status(500).json({ error: 'Failed to get test assignment' });
        }
    }
);

router.get('/ab-tests/:testName/config',
    authenticateToken,
    async (req, res) => {
        try {
            const { testName } = req.params;
            const { variantId } = req.query;

            const config = await abTestingService.getTestConfig(testName, variantId as string);
            res.json({ config });
        } catch (error) {
            console.error('Error getting test config:', error);
            res.status(500).json({ error: 'Failed to get test config' });
        }
    }
);

router.post('/ab-tests/:testName/events',
    authenticateToken,
    async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }
            const { testName } = req.params;
            const { eventType, eventData } = req.body;

            await abTestingService.recordTestEvent(userId, testName, eventType, eventData);
            res.json({ success: true });
        } catch (error) {
            console.error('Error recording test event:', error);
            res.status(500).json({ error: 'Failed to record test event' });
        }
    }
);

router.get('/ab-tests/:testId/results',
    authenticateToken,
    async (req, res) => {
        try {
            const { testId } = req.params;
            const results = await abTestingService.getTestResults(testId);
            res.json(results);
        } catch (error) {
            console.error('Error getting test results:', error);
            res.status(500).json({ error: 'Failed to get test results' });
        }
    }
);

router.patch('/ab-tests/:testId/status',
    authenticateToken,
    async (req, res) => {
        try {
            const { testId } = req.params;
            const { status } = req.body;

            await abTestingService.updateTestStatus(testId, status);
            res.json({ success: true });
        } catch (error) {
            console.error('Error updating test status:', error);
            res.status(500).json({ error: 'Failed to update test status' });
        }
    }
);

router.get('/ab-tests/active',
    authenticateToken,
    async (req, res) => {
        try {
            const activeTests = await abTestingService.getActiveTests();
            res.json(activeTests);
        } catch (error) {
            console.error('Error getting active tests:', error);
            res.status(500).json({ error: 'Failed to get active tests' });
        }
    }
);

// Dashboard routes
router.get('/dashboard',
    authenticateToken,
    async (req, res) => {
        try {
            const timeRange = req.query.timeRange as string || '30d';
            const dashboardData = await dashboardService.getDashboardData(timeRange);
            res.json(dashboardData);
        } catch (error) {
            console.error('Error getting dashboard data:', error);
            res.status(500).json({ error: 'Failed to get dashboard data' });
        }
    }
);

router.get('/dashboard/realtime',
    authenticateToken,
    async (req, res) => {
        try {
            const realtimeMetrics = await dashboardService.getRealtimeMetrics();
            res.json(realtimeMetrics);
        } catch (error) {
            console.error('Error getting realtime metrics:', error);
            res.status(500).json({ error: 'Failed to get realtime metrics' });
        }
    }
);

router.get('/dashboard/engagement-trends',
    authenticateToken,
    async (req, res) => {
        try {
            const userId = req.query.userId as string;
            const days = parseInt(req.query.days as string) || 30;

            const trends = await dashboardService.getUserEngagementTrends(userId, days);
            res.json(trends);
        } catch (error) {
            console.error('Error getting engagement trends:', error);
            res.status(500).json({ error: 'Failed to get engagement trends' });
        }
    }
);

router.get('/dashboard/top-performers',
    authenticateToken,
    async (req, res) => {
        try {
            const metric = req.query.metric as string || 'problemsSolved';
            const limit = parseInt(req.query.limit as string) || 10;

            const topPerformers = await dashboardService.getTopPerformers(metric, limit);
            res.json(topPerformers);
        } catch (error) {
            console.error('Error getting top performers:', error);
            res.status(500).json({ error: 'Failed to get top performers' });
        }
    }
);

router.get('/dashboard/system-health',
    authenticateToken,
    async (req, res) => {
        try {
            const healthMetrics = await dashboardService.getSystemHealthMetrics();
            res.json(healthMetrics);
        } catch (error) {
            console.error('Error getting system health metrics:', error);
            res.status(500).json({ error: 'Failed to get system health metrics' });
        }
    }
);

export default router;