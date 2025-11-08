import { NextApiRequest, NextApiResponse } from 'next';
import { AuthService } from './authService';
import { AppError, ErrorType } from '@/lib/utils/errorHandler';
import logger from '@/lib/utils/logger';

// Extended request interface with user
export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    userId: number;
    username: string;
    email: string;
    role: string;
  };
}

// Permission levels
export enum Permission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  ADMIN = 'admin',
}

// Role permissions mapping
export const rolePermissions: Record<string, Permission[]> = {
  admin: [Permission.READ, Permission.WRITE, Permission.DELETE, Permission.ADMIN],
  moderator: [Permission.READ, Permission.WRITE, Permission.DELETE],
  user: [Permission.READ, Permission.WRITE],
  viewer: [Permission.READ],
};

// Authentication middleware
export function withAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>,
  requiredPermissions: Permission[] = []
) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      // Get token from header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AppError('No token provided', ErrorType.AUTHENTICATION, 401);
      }

      const token = authHeader.substring(7);

      // Check if token is revoked
      const isRevoked = await AuthService.isTokenRevoked(token);
      if (isRevoked) {
        throw new AppError('Token has been revoked', ErrorType.AUTHENTICATION, 401);
      }

      // Verify token
      const payload = AuthService.verifyToken(token);

      // Check if user still exists and is active
      const user = await AuthService.getUserById(payload.userId);
      if (!user || !user.is_active) {
        throw new AppError('User not found or inactive', ErrorType.AUTHENTICATION, 401);
      }

      // Attach user to request
      req.user = {
        userId: payload.userId,
        username: payload.username,
        email: payload.email,
        role: payload.role,
      };

      // Check permissions if required
      if (requiredPermissions.length > 0) {
        const userPermissions = rolePermissions[user.role] || [];
        const hasAllPermissions = requiredPermissions.every(perm =>
          userPermissions.includes(perm)
        );

        if (!hasAllPermissions) {
          throw new AppError(
            'Insufficient permissions',
            ErrorType.AUTHORIZATION,
            403
          );
        }
      }

      // Log access
      logger.debug(`Authenticated request from ${payload.username} to ${req.url}`);

      // Call the handler
      await handler(req, res);

    } catch (error: any) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          type: error.type,
        });
      }

      logger.error('Authentication middleware error', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };
}

// Optional authentication middleware (doesn't require auth but adds user if present)
export function withOptionalAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      // Get token from header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);

        try {
          // Check if token is revoked
          const isRevoked = await AuthService.isTokenRevoked(token);
          if (!isRevoked) {
            // Verify token
            const payload = AuthService.verifyToken(token);

            // Check if user still exists and is active
            const user = await AuthService.getUserById(payload.userId);
            if (user && user.is_active) {
              // Attach user to request
              req.user = {
                userId: payload.userId,
                username: payload.username,
                email: payload.email,
                role: payload.role,
              };
            }
          }
        } catch (error) {
          // Token is invalid but we don't fail the request
          logger.debug('Invalid token in optional auth');
        }
      }

      // Call the handler
      await handler(req, res);

    } catch (error: any) {
      logger.error('Optional authentication middleware error', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };
}

// Role-based middleware
export function requireRole(roles: string[]) {
  return (
    handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
  ) => {
    return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: `Required role: ${roles.join(' or ')}`,
        });
      }

      await handler(req, res);
    });
  };
}

// API key authentication for external services
export function withApiKey(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const apiKey = req.headers['x-api-key'] as string;

      if (!apiKey) {
        return res.status(401).json({
          success: false,
          error: 'API key required',
        });
      }

      // Validate API key (you should implement this based on your needs)
      // For now, we'll check against environment variable
      const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
      if (!validApiKeys.includes(apiKey)) {
        return res.status(401).json({
          success: false,
          error: 'Invalid API key',
        });
      }

      // Log API key usage
      logger.info(`API key access to ${req.url}`);

      await handler(req, res);

    } catch (error: any) {
      logger.error('API key authentication error', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };
}