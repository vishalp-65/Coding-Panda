import Joi from 'joi';

export const commonSchemas = {
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required(),
  uuid: Joi.string().uuid().required(),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
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
