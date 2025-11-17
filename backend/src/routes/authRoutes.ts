import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * POST /auth/signup
 * Register new user
 */
router.post('/signup', AuthController.signup);

/**
 * POST /auth/login
 * Login existing user
 */
router.post('/login', AuthController.login);

/**
 * GET /auth/me
 * Get current user profile (protected)
 */
router.get('/me', authenticate, AuthController.getProfile);

export default router;
