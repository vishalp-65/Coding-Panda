export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: string;
  requestId?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export class HttpUtils {
  static success<T>(data: T, requestId?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      requestId,
    };
  }

  static error(code: string, message: string, details?: any, requestId?: string): ApiResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
      requestId,
    };
  }

  static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
};

export const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
};

// Error handling middleware
export const errorHandler = (err: any, req: any, res: any, next: any) => {
  const requestId = req.headers['x-request-id'] || HttpUtils.generateRequestId();
  
  // Log error
  console.error(`[${requestId}] Error:`, err);

  // Handle known error types
  if (err.statusCode && err.code) {
    return res.status(err.statusCode).json(
      HttpUtils.error(err.code, err.message, err.details, requestId)
    );
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json(
      HttpUtils.error('VALIDATION_ERROR', err.message, err.details, requestId)
    );
  }

  // Handle MongoDB errors
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    if (err.code === 11000) {
      return res.status(409).json(
        HttpUtils.error('DUPLICATE_RESOURCE', 'Resource already exists', err.keyValue, requestId)
      );
    }
    return res.status(500).json(
      HttpUtils.error('DATABASE_ERROR', 'Database operation failed', null, requestId)
    );
  }

  // Handle Mongoose errors
  if (err.name === 'CastError') {
    return res.status(400).json(
      HttpUtils.error('INVALID_ID', 'Invalid resource ID format', null, requestId)
    );
  }

  // Default error response
  res.status(500).json(
    HttpUtils.error('INTERNAL_ERROR', 'An unexpected error occurred', null, requestId)
  );
};