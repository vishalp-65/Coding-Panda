import Joi from 'joi';

/**
 * CREATE PROBLEM (with codeSpec)
 */
export const createProblemWithCodeSpecSchema = Joi.object({
  problemData: Joi.object({
    title: Joi.string().trim().min(5).max(200).required().messages({
      'string.min': 'Title must be at least 5 characters long',
      'string.max': 'Title cannot exceed 200 characters',
      'any.required': 'Title is required',
    }),

    description: Joi.string().trim().min(20).max(10000).required().messages({
      'string.min': 'Description must be at least 20 characters long',
      'string.max': 'Description cannot exceed 10000 characters',
      'any.required': 'Description is required',
    }),

    difficulty: Joi.string()
      .valid('easy', 'medium', 'hard')
      .required()
      .messages({
        'any.only': 'Difficulty must be one of: easy, medium, hard',
        'any.required': 'Difficulty is required',
      }),

    tags: Joi.array()
      .items(
        Joi.string()
          .trim()
          .lowercase()
          .min(2)
          .max(30)
          .pattern(/^[a-z0-9-]+$/)
          .messages({
            'string.pattern.base':
              'Tags can only contain lowercase letters, numbers, and hyphens',
          })
      )
      .min(1)
      .max(10)
      .unique()
      .required()
      .messages({
        'array.min': 'At least one tag is required',
        'array.max': 'Cannot have more than 10 tags',
        'array.unique': 'Tags must be unique',
      }),

    constraints: Joi.object({
      timeLimit: Joi.number()
        .integer()
        .min(100)
        .max(30000)
        .required()
        .messages({
          'number.min': 'Time limit must be at least 100ms',
          'number.max': 'Time limit cannot exceed 30 seconds',
          'any.required': 'Time limit is required',
        }),

      memoryLimit: Joi.number().integer().min(16).max(512).required().messages({
        'number.min': 'Memory limit must be at least 16MB',
        'number.max': 'Memory limit cannot exceed 512MB',
        'any.required': 'Memory limit is required',
      }),

      inputFormat: Joi.string().trim().min(10).max(1000).required(),
      outputFormat: Joi.string().trim().min(10).max(1000).required(),
      sampleInput: Joi.string().trim().max(1000).optional(),
      sampleOutput: Joi.string().trim().max(1000).optional(),
    }).required(),

    testCases: Joi.array()
      .items(
        Joi.object({
          input: Joi.string().required().max(10000).messages({
            'string.max': 'Test case input cannot exceed 10000 characters',
          }),
          expectedOutput: Joi.string().required().max(10000).messages({
            'string.max':
              'Test case expected output cannot exceed 10000 characters',
          }),
          isHidden: Joi.boolean().default(false),
          explanation: Joi.string().trim().max(500).optional(),
        })
      )
      .min(2)
      .max(100)
      .required()
      .messages({
        'array.min': 'At least 2 test cases are required',
        'array.max': 'Cannot have more than 100 test cases',
      }),
  }).required(),

  codeSpec: Joi.object({
    functionDefinition: Joi.object({
      name: Joi.string().trim().min(1).max(100).required().messages({
        'any.required': 'Function name is required',
      }),
      returnType: Joi.string().trim().min(1).max(100).required().messages({
        'any.required': 'Return type is required',
      }),
      parameters: Joi.array()
        .items(
          Joi.object({
            name: Joi.string().trim().min(1).max(100).required(),
            type: Joi.string().trim().min(1).max(100).required(),
          })
        )
        .required()
        .messages({
          'array.base': 'Parameters must be an array',
          'array.includesRequiredUnknowns':
            'Each parameter must have name and type',
        }),
    }).required(),

    inputFormat: Joi.string().trim().min(5).max(1000).required().messages({
      'any.required': 'Input format is required',
    }),

    outputFormat: Joi.string().trim().min(5).max(1000).required().messages({
      'any.required': 'Output format is required',
    }),

    helperClasses: Joi.object()
      .pattern(Joi.string(), Joi.string().trim().min(1).max(5000))
      .optional(),

    imports: Joi.object()
      .pattern(
        Joi.string(),
        Joi.array().items(Joi.string().trim().min(1).max(200))
      )
      .optional(),
  }).required(),
});

/**
 * UPDATE PROBLEM
 */
export const updateProblemSchema = Joi.object({
  title: Joi.string().trim().min(5).max(200).optional(),

  description: Joi.string().trim().min(20).max(10000).optional(),

  difficulty: Joi.string().valid('easy', 'medium', 'hard').optional(),

  tags: Joi.array()
    .items(
      Joi.string()
        .trim()
        .lowercase()
        .min(2)
        .max(30)
        .pattern(/^[a-z0-9-]+$/)
    )
    .min(1)
    .max(10)
    .unique()
    .optional(),

  constraints: Joi.object({
    timeLimit: Joi.number().integer().min(100).max(30000).optional(),
    memoryLimit: Joi.number().integer().min(16).max(512).optional(),
    inputFormat: Joi.string().trim().min(10).max(1000).optional(),
    outputFormat: Joi.string().trim().min(10).max(1000).optional(),
    sampleInput: Joi.string().trim().max(1000).optional(),
    sampleOutput: Joi.string().trim().max(1000).optional(),
  }).optional(),

  testCases: Joi.array()
    .items(
      Joi.object({
        input: Joi.string().required().max(10000),
        expectedOutput: Joi.string().required().max(10000),
        isHidden: Joi.boolean().optional(),
        explanation: Joi.string().trim().max(500).optional(),
      })
    )
    .min(2)
    .max(100)
    .optional(),

  codeSpec: Joi.object({
    functionDefinition: Joi.object({
      name: Joi.string().trim().min(1).max(100).optional(),
      returnType: Joi.string().trim().min(1).max(100).optional(),
      parameters: Joi.array()
        .items(
          Joi.object({
            name: Joi.string().trim().min(1).max(100).required(),
            type: Joi.string().trim().min(1).max(100).required(),
          })
        )
        .optional(),
    }).optional(),

    inputFormat: Joi.string().trim().min(5).max(1000).optional(),
    outputFormat: Joi.string().trim().min(5).max(1000).optional(),
    helperClasses: Joi.object()
      .pattern(Joi.string(), Joi.string().trim().min(1).max(5000))
      .optional(),
    imports: Joi.object()
      .pattern(
        Joi.string(),
        Joi.array().items(Joi.string().trim().min(1).max(200))
      )
      .optional(),
  }).optional(),
}).min(1);

/**
 * SEARCH PROBLEMS
 */
export const searchProblemsSchema = Joi.object({
  query: Joi.string().trim().min(2).max(100).optional(),

  difficulty: Joi.alternatives()
    .try(
      Joi.array()
        .items(Joi.string().valid('easy', 'medium', 'hard'))
        .unique(),
      Joi.string().valid('easy', 'medium', 'hard')
    )
    .optional(),

  tags: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().trim().lowercase()).unique().max(5),
      Joi.string().trim().lowercase()
    )
    .optional(),

  status: Joi.string().valid('solved', 'attempted', 'unsolved').optional(),

  sortBy: Joi.string()
    .valid('title', 'difficulty', 'acceptance_rate', 'created_at')
    .default('created_at'),

  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),

  page: Joi.alternatives()
    .try(Joi.number().integer().min(1), Joi.string().pattern(/^\d+$/))
    .default(1),

  limit: Joi.alternatives()
    .try(Joi.number().integer().min(1).max(100), Joi.string().pattern(/^\d+$/))
    .default(20),
}).custom((value, helpers) => {
  if (typeof value.difficulty === 'string') {
    value.difficulty = [value.difficulty];
  }
  if (typeof value.tags === 'string') {
    value.tags = [value.tags];
  }
  if (typeof value.page === 'string') {
    value.page = parseInt(value.page, 10);
  }
  if (typeof value.limit === 'string') {
    value.limit = parseInt(value.limit, 10);
  }
  return value;
});

/**
 * RATING
 */
export const ratingSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating cannot exceed 5',
    'any.required': 'Rating is required',
  }),
});

/**
 * PAGINATION
 */
export const paginationSchema = Joi.object({
  page: Joi.alternatives()
    .try(Joi.number().integer().min(1), Joi.string().pattern(/^\d+$/))
    .default(1),

  limit: Joi.alternatives()
    .try(Joi.number().integer().min(1).max(100), Joi.string().pattern(/^\d+$/))
    .default(20),
}).custom(value => {
  if (typeof value.page === 'string') value.page = parseInt(value.page, 10);
  if (typeof value.limit === 'string') value.limit = parseInt(value.limit, 10);
  return value;
});
