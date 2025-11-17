import { UserRepository } from '../models/User';
import { generateToken } from '../utils/jwt';
import { ConflictError, UnauthorizedError } from '../utils/errors';
import { SignupInput, LoginInput } from '../utils/validators';

/**
 * Authentication service - business logic for auth operations
 */
export class AuthService {
  /**
   * Register new user
   */
  static async signup(input: SignupInput) {
    const { email, password } = input;

    // Check if user already exists
    if (UserRepository.emailExists(email)) {
      throw new ConflictError('Email already registered');
    }

    // Create user
    const user = UserRepository.create(email, password);

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user,
      token,
    };
  }

  /**
   * Login existing user
   */
  static async login(input: LoginInput) {
    const { email, password } = input;

    // Find user
    const user = UserRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password
    const isValid = UserRepository.verifyPassword(password, user.password);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * Get current user profile
   */
  static async getProfile(userId: number) {
    const user = UserRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
