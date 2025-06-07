import Joi from 'joi';
import { validateRequest, validateQuery, commonSchemas } from '@ai-platform/common';

// User registration validation
export const validateRegistration = validateRequest(
  Joi.object({
    email: commonSchemas.email,
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: commonSchemas.password,
    firstName: Joi.string().min(1).max(50).optional(),
    lastName: Joi.string().min(1).max(50).optional(),
  })
);

// User login validation
export const validateLogin = validateRequest(
  Joi.object({
    email: Joi.string().required(), // Can be email or username
    password: Joi.string().required(),
    twoFactorCode: Joi.string().length(6).optional(),
  })
);

// Password reset request validation
export const validatePasswordResetRequest = validateRequest(
  Joi.object({
    email: commonSchemas.email,
  })
);

// Password reset validation
export const validatePasswordReset = validateRequest(
  Joi.object({
    token: Joi.string().uuid().required(),
    newPassword: commonSchemas.password,
  })
);

// Profile update validation
export const validateProfileUpdate = validateRequest(
  Joi.object({
    firstName: Joi.string().min(1).max(50).optional(),
    lastName: Joi.string().min(1).max(50).optional(),
    bio: Joi.string().max(500).optional(),
    location: Joi.string().max(100).optional(),
    website: Joi.string().uri().optional(),
    githubUsername: Joi.string().alphanum().max(39).optional(),
    linkedinProfile: Joi.string().uri().optional(),
    company: Joi.string().max(100).optional(),
    jobTitle: Joi.string().max(100).optional(),
    skillLevel: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').optional(),
    programmingLanguages: Joi.array().items(Joi.string()).optional(),
  })
);

// Preferences update validation
export const validatePreferencesUpdate = validateRequest(
  Joi.object({
    theme: Joi.string().valid('light', 'dark', 'system').optional(),
    language: Joi.string().length(2).optional(),
    timezone: Joi.string().optional(),
    emailNotifications: Joi.object({
      contestReminders: Joi.boolean().optional(),
      newProblems: Joi.boolean().optional(),
      achievementUnlocked: Joi.boolean().optional(),
      weeklyDigest: Joi.boolean().optional(),
      socialActivity: Joi.boolean().optional(),
    }).optional(),
    privacySettings: Joi.object({
      profileVisibility: Joi.string().valid('public', 'private', 'friends').optional(),
      showEmail: Joi.boolean().optional(),
      showRealName: Joi.boolean().optional(),
      showLocation: Joi.boolean().optional(),
      allowDirectMessages: Joi.boolean().optional(),
    }).optional(),
  })
);

// Refresh token validation
export const validateRefreshToken = validateRequest(
  Joi.object({
    refreshToken: Joi.string().required(),
  })
);

// Email verification validation
export const validateEmailVerification = validateQuery(
  Joi.object({
    token: Joi.string().uuid().required(),
  })
);

// Pagination validation
export const validatePagination = validateQuery(commonSchemas.pagination);

// Role update validation (admin only)
export const validateRoleUpdate = validateRequest(
  Joi.object({
    roles: Joi.array().items(
      Joi.string().valid('admin', 'moderator', 'user', 'premium_user')
    ).min(1).required(),
  })
);