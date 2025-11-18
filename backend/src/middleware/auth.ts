import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { JWTPayload } from '../types';

/**
 * Extend Express Request to include user
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

const extractBearerToken = (header?: string): string | null => {
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }
  return header.substring(7);
};

/**
 * Middleware to authenticate requests using JWT
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
}

/**
 * Middleware that optionally attaches user info if a valid token is provided.
 * Does not block the request if no/invalid token is present.
 */
export function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (token) {
      const payload = verifyToken(token);
      req.user = payload;
    }
  } catch {
    // Ignore invalid tokens for optional auth
  } finally {
    next();
  }
}

/**
 * Middleware to check if user has admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  if (req.user.role !== 'admin') {
    throw new ForbiddenError('Admin access required');
  }

  next();
}
