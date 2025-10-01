import { Router } from 'express';
import { PrivacyController } from '../controllers/PrivacyController';
import { authenticate } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';

const router = Router();
const privacyController = new PrivacyController();

// Apply authentication to all privacy routes
router.use(authenticate);

// Consent Management Routes
router.post('/consent', rateLimitMiddleware(10, 60), privacyController.recordConsent);
router.get('/consent', rateLimitMiddleware(30, 60), privacyController.getUserConsents);
router.post('/consent/withdraw', rateLimitMiddleware(5, 60), privacyController.withdrawConsent);

// Data Export Routes (GDPR Article 20)
router.post('/export', rateLimitMiddleware(3, 3600), privacyController.requestDataExport); // 3 requests per hour
router.get('/export', rateLimitMiddleware(10, 60), privacyController.getExportRequests);
router.get('/export/:requestId/download', rateLimitMiddleware(10, 60), privacyController.downloadExport);

// Data Deletion Routes (GDPR Article 17)
router.post('/deletion', rateLimitMiddleware(2, 86400), privacyController.requestDataDeletion); // 2 requests per day
router.post('/deletion/:requestId/verify', rateLimitMiddleware(5, 60), privacyController.verifyDataDeletion);
router.get('/deletion', rateLimitMiddleware(10, 60), privacyController.getDeletionRequests);

// Audit and Compliance Routes
router.get('/audit-logs', rateLimitMiddleware(20, 60), privacyController.getAuditLogs);
router.get('/compliance-report', rateLimitMiddleware(5, 3600), privacyController.generateComplianceReport); // 5 reports per hour

export { router as privacyRoutes };