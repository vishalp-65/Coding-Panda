import { Request, Response } from 'express';
import { UserService } from '../services';
import { AuthenticatedRequest } from '../middleware/auth';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = await this.userService.getUserById(req.user!.id);
      
      if (!user) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      res.json({
        success: true,
        data: user.toSafeObject(),
        message: 'Profile retrieved successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'PROFILE_FETCH_FAILED',
          message: 'Failed to retrieve profile',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);
      
      if (!user) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      res.json({
        success: true,
        data: user.toSafeObject(),
        message: 'User retrieved successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'USER_FETCH_FAILED',
          message: 'Failed to retrieve user',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  getUserByUsername = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username } = req.params;
      const user = await this.userService.getUserByUsername(username);
      
      if (!user) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      res.json({
        success: true,
        data: user.toSafeObject(),
        message: 'User retrieved successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'USER_FETCH_FAILED',
          message: 'Failed to retrieve user',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await this.userService.getAllUsers({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });

      // Remove sensitive data from all users
      const safeUsers = result.data.map(user => user.toSafeObject());

      res.json({
        success: true,
        data: {
          ...result,
          data: safeUsers,
        },
        message: 'Users retrieved successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'USERS_FETCH_FAILED',
          message: 'Failed to retrieve users',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const updatedUser = await this.userService.updateProfile(req.user!.id, req.body);
      
      if (!updatedUser) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      res.json({
        success: true,
        data: updatedUser.toSafeObject(),
        message: 'Profile updated successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      
      res.status(400).json({
        error: {
          code: 'PROFILE_UPDATE_FAILED',
          message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  updatePreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const updatedUser = await this.userService.updatePreferences(req.user!.id, req.body);
      
      if (!updatedUser) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      res.json({
        success: true,
        data: updatedUser.toSafeObject(),
        message: 'Preferences updated successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update preferences';
      
      res.status(400).json({
        error: {
          code: 'PREFERENCES_UPDATE_FAILED',
          message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  deleteAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const deleted = await this.userService.deleteUser(req.user!.id);
      
      if (!deleted) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      res.json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete account';
      
      res.status(400).json({
        error: {
          code: 'ACCOUNT_DELETE_FAILED',
          message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  checkEmailAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.query;
      const available = await this.userService.checkEmailAvailability(email as string);
      
      res.json({
        success: true,
        data: { available },
        message: available ? 'Email is available' : 'Email is already taken',
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'EMAIL_CHECK_FAILED',
          message: 'Failed to check email availability',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  checkUsernameAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username } = req.query;
      const available = await this.userService.checkUsernameAvailability(username as string);
      
      res.json({
        success: true,
        data: { available },
        message: available ? 'Username is available' : 'Username is already taken',
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'USERNAME_CHECK_FAILED',
          message: 'Failed to check username availability',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  updateUserRoles = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { roles } = req.body;
      
      const updatedUser = await this.userService.updateUserRoles(id, roles);
      
      if (!updatedUser) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      res.json({
        success: true,
        data: updatedUser.toSafeObject(),
        message: 'User roles updated successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update user roles';
      
      res.status(400).json({
        error: {
          code: 'ROLE_UPDATE_FAILED',
          message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  };
}