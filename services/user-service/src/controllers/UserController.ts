import { Request, Response } from 'express';
import { UserService } from '../services';
import { AuthenticatedRequest } from '../middleware/auth';
import { ResponseHandler } from '@ai-platform/common';
import { ValidationUtils } from '@ai-platform/common';
import { asyncHandler } from '@ai-platform/common';
import { logger } from '@ai-platform/common';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  getProfile = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const user = await this.userService.getUserById(req.user!.id);

    if (!user) {
      return ResponseHandler.notFound(res, 'User not found');
    }

    ResponseHandler.success(res, user.toSafeObject(), 'Profile retrieved successfully');
  });

  getUserById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    ValidationUtils.validateRequired(id, 'User ID');

    const user = await this.userService.getUserById(id);

    if (!user) {
      return ResponseHandler.notFound(res, 'User not found');
    }

    ResponseHandler.success(res, user.toSafeObject(), 'User retrieved successfully');
  });

  getUserByUsername = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { username } = req.params;

    ValidationUtils.validateRequired(username, 'Username');

    const user = await this.userService.getUserByUsername(username);

    if (!user) {
      return ResponseHandler.notFound(res, 'User not found');
    }

    ResponseHandler.success(res, user.toSafeObject(), 'User retrieved successfully');
  });

  getAllUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { page, limit } = ValidationUtils.validatePagination(
      req.query.page as string,
      req.query.limit as string
    );

    const result = await this.userService.getAllUsers({ page, limit });

    // Remove sensitive data from all users
    const safeUsers = result.data.map(user => user.toSafeObject());

    ResponseHandler.success(
      res,
      safeUsers,
      'Users retrieved successfully',
      200,
      result.pagination
    );
  });

  updateProfile = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const updatedUser = await this.userService.updateProfile(
      req.user!.id,
      req.body
    );

    if (!updatedUser) {
      return ResponseHandler.notFound(res, 'User not found');
    }

    ResponseHandler.success(res, updatedUser.toSafeObject(), 'Profile updated successfully');
  });

  updatePreferences = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const updatedUser = await this.userService.updatePreferences(
      req.user!.id,
      req.body
    );

    if (!updatedUser) {
      return ResponseHandler.notFound(res, 'User not found');
    }

    ResponseHandler.success(res, updatedUser.toSafeObject(), 'Preferences updated successfully');
  });

  deleteAccount = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const deleted = await this.userService.deleteUser(req.user!.id);

    if (!deleted) {
      return ResponseHandler.notFound(res, 'User not found');
    }

    ResponseHandler.success(res, undefined, 'Account deleted successfully');
  });

  checkEmailAvailability = asyncHandler(async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { email } = req.query;

    ValidationUtils.validateRequired(email, 'Email');

    if (!ValidationUtils.isValidEmail(email as string)) {
      return ResponseHandler.badRequest(res, 'Invalid email format');
    }

    const available = await this.userService.checkEmailAvailability(email as string);

    ResponseHandler.success(
      res,
      { available },
      available ? 'Email is available' : 'Email is already taken'
    );
  });

  checkUsernameAvailability = asyncHandler(async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { username } = req.query;

    ValidationUtils.validateRequired(username, 'Username');

    const available = await this.userService.checkUsernameAvailability(username as string);

    ResponseHandler.success(
      res,
      { available },
      available ? 'Username is available' : 'Username is already taken'
    );
  });

  updateUserRoles = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { roles } = req.body;

    ValidationUtils.validateRequired(id, 'User ID');
    ValidationUtils.validateRequired(roles, 'Roles');

    const updatedUser = await this.userService.updateUserRoles(id, roles);

    if (!updatedUser) {
      return ResponseHandler.notFound(res, 'User not found');
    }

    ResponseHandler.success(res, updatedUser.toSafeObject(), 'User roles updated successfully');
  });
}
