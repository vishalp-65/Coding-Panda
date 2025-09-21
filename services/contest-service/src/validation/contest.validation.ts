import Joi from 'joi';
import { ScoringType, ContestStatus } from '../types/contest.types';

export const createContestSchema = Joi.object({
  title: Joi.string().min(3).max(255).required(),
  description: Joi.string().max(2000).optional(),
  startTime: Joi.date().iso().greater('now').required(),
  endTime: Joi.date().iso().greater(Joi.ref('startTime')).required(),
  registrationEnd: Joi.date().iso().max(Joi.ref('startTime')).optional(),
  maxParticipants: Joi.number().integer().min(1).max(10000).optional(),
  problemIds: Joi.array()
    .items(Joi.string().required())
    .min(1)
    .max(20)
    .required(),
  rules: Joi.object().optional(),
  scoringType: Joi.string()
    .valid(...Object.values(ScoringType))
    .default(ScoringType.STANDARD),
  isPublic: Joi.boolean().default(true),
  prizePool: Joi.number().min(0).default(0),
});

export const updateContestSchema = Joi.object({
  title: Joi.string().min(3).max(255).optional(),
  description: Joi.string().max(2000).optional(),
  startTime: Joi.date().iso().greater('now').optional(),
  endTime: Joi.date().iso().optional(),
  registrationEnd: Joi.date().iso().optional(),
  maxParticipants: Joi.number().integer().min(1).max(10000).optional(),
  problemIds: Joi.array()
    .items(Joi.string().required())
    .min(1)
    .max(20)
    .optional(),
  rules: Joi.object().optional(),
  scoringType: Joi.string()
    .valid(...Object.values(ScoringType))
    .optional(),
  isPublic: Joi.boolean().optional(),
  prizePool: Joi.number().min(0).optional(),
}).custom((value, helpers) => {
  // Validate that endTime is after startTime if both are provided
  if (
    value.startTime &&
    value.endTime &&
    new Date(value.endTime) <= new Date(value.startTime)
  ) {
    return helpers.error('any.invalid', {
      message: 'endTime must be after startTime',
    });
  }

  // Validate that registrationEnd is before startTime if both are provided
  if (
    value.registrationEnd &&
    value.startTime &&
    new Date(value.registrationEnd) > new Date(value.startTime)
  ) {
    return helpers.error('any.invalid', {
      message: 'registrationEnd must be before startTime',
    });
  }

  return value;
});

export const contestRegistrationSchema = Joi.object({
  teamName: Joi.string().min(2).max(100).optional(),
});

export const submitSolutionSchema = Joi.object({
  problemId: Joi.string().required(),
  code: Joi.string().min(1).max(50000).required(),
  language: Joi.string()
    .valid('python', 'javascript', 'java', 'cpp', 'go', 'rust')
    .required(),
});

export const contestSearchSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(ContestStatus))
    .optional(),
  isPublic: Joi.boolean().optional(),
  createdBy: Joi.string().uuid().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string()
    .valid('startTime', 'createdAt', 'title')
    .default('startTime'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

export const uuidSchema = Joi.string().uuid().required();
