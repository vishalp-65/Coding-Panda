import { Router } from 'express';
import { UserController } from '../controllers';
import { 
  authenticate, 
  authorize,
  validateProfileUpdate,
  validatePreferencesUpdate,
  validatePagination,
  validateRoleUpdate
} from '../middleware';

const router = Router();
const userController = new UserController();

// Public routes
router.get('/check-email', userController.checkEmailAvailability);
router.get('/check-username', userController.checkUsernameAvailability);
router.get('/username/:username', userController.getUserByUsername);

// Protected routes - user access
router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, validateProfileUpdate, userController.updateProfile);
router.put('/preferences', authenticate, validatePreferencesUpdate, userController.updatePreferences);
router.delete('/account', authenticate, userController.deleteAccount);

// Protected routes - admin access
router.get('/', authenticate, authorize(['admin', 'moderator']), validatePagination, userController.getAllUsers);
router.get('/:id', authenticate, authorize(['admin', 'moderator']), userController.getUserById);
router.put('/:id/roles', authenticate, authorize(['admin']), validateRoleUpdate, userController.updateUserRoles);

export { router as userRoutes };