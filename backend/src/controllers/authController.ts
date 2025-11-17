import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { signupSchema, loginSchema } from '../utils/validators';
import { success } from '../utils/response';

/**
 * Auth controller - handles HTTP requests for authentication
 */
export class AuthController {
  /**
   * POST /auth/signup
   * Register new user
   */
  static async signup(req: Request, res: Response) {
    const input = signupSchema.parse(req.body);
    const result = await AuthService.signup(input);
    return success(res, result, 201);
  }

  /**
   * POST /auth/login
   * Login existing user
   */
  static async login(req: Request, res: Response) {
    const input = loginSchema.parse(req.body);
    const result = await AuthService.login(input);
    return success(res, result);
  }

  /**
   * GET /auth/me
   * Get current user profile
   */
  static async getProfile(req: Request, res: Response) {
    const userId = req.user!.userId;
    const user = await AuthService.getProfile(userId);
    return success(res, user);
  }
}
