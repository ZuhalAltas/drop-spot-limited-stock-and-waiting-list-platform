import db from '../config/database';
import { User } from '../types';
import bcrypt from 'bcryptjs';

/**
 * User repository - handles all database operations for users
 */
export class UserRepository {
  /**
   * Find user by email
   */
  static findByEmail(email: string): User | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email) as User | undefined;
  }

  /**
   * Find user by ID
   */
  static findById(id: number): User | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as User | undefined;
  }

  /**
   * Create new user
   * Returns user without password field
   */
  static create(email: string, password: string, role: 'user' | 'admin' = 'user'): Omit<User, 'password'> {
    const hashedPassword = bcrypt.hashSync(password, 10);

    const stmt = db.prepare(`
      INSERT INTO users (email, password, role)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(email, hashedPassword, role);

    return {
      id: Number(result.lastInsertRowid),
      email,
      role,
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Verify password
   */
  static verifyPassword(plainPassword: string, hashedPassword: string): boolean {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  }

  /**
   * Get all users (admin only)
   */
  static getAll(): Omit<User, 'password'>[] {
    const stmt = db.prepare('SELECT id, email, role, created_at FROM users');
    return stmt.all() as Omit<User, 'password'>[];
  }

  /**
   * Delete user by ID
   */
  static delete(id: number): boolean {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Check if email exists
   */
  static emailExists(email: string): boolean {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?');
    const result = stmt.get(email) as { count: number };
    return result.count > 0;
  }
}
