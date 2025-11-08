import logger from './logger';

// Error types
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  DATABASE = 'DATABASE_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT_EXCEEDED',
  NETWORK = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

// Custom Error class
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler utility
export class ErrorHandler {
  // Handle and log errors
  static handle(error: any, context?: string): AppError {
    // Already an AppError
    if (error instanceof AppError) {
      this.log(error, context);
      return error;
    }

    // Database errors
    if (error.code && error.code.startsWith('23')) {
      return this.handleDatabaseError(error, context);
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return this.handleAuthError(error, context);
    }

    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return this.handleNetworkError(error, context);
    }

    // Default unknown error
    const appError = new AppError(
      error.message || 'An unexpected error occurred',
      ErrorType.UNKNOWN,
      500,
      false
    );

    this.log(appError, context);
    return appError;
  }

  // Database error handler
  private static handleDatabaseError(error: any, context?: string): AppError {
    let message = 'Database operation failed';
    let statusCode = 500;

    // Specific database error codes
    switch (error.code) {
      case '23505': // unique violation
        message = 'Duplicate entry found';
        statusCode = 409;
        break;
      case '23503': // foreign key violation
        message = 'Referenced record not found';
        statusCode = 400;
        break;
      case '23502': // not null violation
        message = 'Required field is missing';
        statusCode = 400;
        break;
    }

    const appError = new AppError(
      message,
      ErrorType.DATABASE,
      statusCode,
      true,
      { originalError: error.message }
    );

    this.log(appError, context);
    return appError;
  }

  // Auth error handler
  private static handleAuthError(error: any, context?: string): AppError {
    let message = 'Authentication failed';
    let statusCode = 401;

    if (error.name === 'TokenExpiredError') {
      message = 'Token has expired';
    } else if (error.name === 'JsonWebTokenError') {
      message = 'Invalid token';
    }

    const appError = new AppError(
      message,
      ErrorType.AUTHENTICATION,
      statusCode,
      true
    );

    this.log(appError, context);
    return appError;
  }

  // Network error handler
  private static handleNetworkError(error: any, context?: string): AppError {
    const appError = new AppError(
      'Network connection failed',
      ErrorType.NETWORK,
      503,
      true,
      { originalError: error.message }
    );

    this.log(appError, context);
    return appError;
  }

  // Log errors
  private static log(error: AppError, context?: string): void {
    const errorInfo = {
      type: error.type,
      message: error.message,
      statusCode: error.statusCode,
      context,
      details: error.details,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };

    // Log based on severity
    if (error.statusCode >= 500) {
      logger.error(`[${context || 'Unknown'}] ${error.message}`, errorInfo);
    } else if (error.statusCode >= 400) {
      logger.warn(`[${context || 'Unknown'}] ${error.message}`, errorInfo);
    } else {
      logger.info(`[${context || 'Unknown'}] ${error.message}`, errorInfo);
    }
  }

  // Safe error response for client
  static toClientResponse(error: AppError): {
    error: string;
    message: string;
    details?: any;
  } {
    // Don't expose internal errors to client in production
    if (process.env.NODE_ENV === 'production' && !error.isOperational) {
      return {
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      };
    }

    return {
      error: error.type,
      message: error.message,
      details: error.details,
    };
  }
}

// Async error wrapper for route handlers
export function asyncHandler<T = any>(
  fn: (req: any, res: any, next?: any) => Promise<T>
) {
  return async (req: any, res: any, next: any) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      const appError = ErrorHandler.handle(error, `${req.method} ${req.path}`);
      
      res.status(appError.statusCode).json(
        ErrorHandler.toClientResponse(appError)
      );
    }
  };
}

// Try-catch wrapper with error handling
export async function tryCatch<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<[T | null, AppError | null]> {
  try {
    const result = await operation();
    return [result, null];
  } catch (error) {
    const appError = ErrorHandler.handle(error, context);
    return [null, appError];
  }
}