import Joi from 'joi';
import { InputSanitizer } from './security';

export const commonSchemas = {
  email: Joi.string().email().max(255).required(),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required(),
  uuid: Joi.string().uuid().required(),
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required(),
  apiKey: Joi.string()
    .pattern(/^ap_[A-Za-z0-9_-]{43}$/)
    .required(),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).max(1000).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
  searchQuery: Joi.string()
    .max(200)
    .pattern(/^[a-zA-Z0-9\s\-_\.]+$/)
    .optional(),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc'),
  dateRange: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  }),
};

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errors,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    req.validatedBody = value;
    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Query validation failed',
          details: errors,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    req.validatedQuery = value;
    next();
  };
};

export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Parameter validation failed',
          details: errors,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    req.validatedParams = value;
    next();
  };
};

// Enhanced validation with security checks
export const secureValidateRequest = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any): void => {
    try {
      // First check for malicious input
      if (req.body) {
        const bodyStr = JSON.stringify(req.body);
        if (InputSanitizer.detectSQLInjection(bodyStr) || InputSanitizer.detectXSS(bodyStr)) {
          return res.status(400).json({
            error: {
              code: 'MALICIOUS_INPUT_DETECTED',
              message: 'Request contains potentially malicious content',
              timestamp: new Date().toISOString(),
            },
          });
        }
      }

      // Then validate with Joi
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));

        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: errors,
            timestamp: new Date().toISOString(),
          },
        });
      }

      req.validatedBody = value;
      next();
    } catch (err) {
      next(err);
    }
  };
};
