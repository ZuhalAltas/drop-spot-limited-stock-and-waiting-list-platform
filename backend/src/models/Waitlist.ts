import db from '../config/database';
import { WaitlistEntry } from '../types';
import { calculatePriorityScore, getAccountAgeDays } from '../utils/seed';
import { UserRepository } from './User';

/**
 * Waitlist repository - handles all database operations for waitlist
 * Uses transactions to ensure idempotency and data consistency
 */
export class WaitlistRepository {
  /**
   * Join waitlist (idempotent operation)
   * If user is already in waitlist, returns existing entry
   */
  static join(userId: number, dropId: number): WaitlistEntry {
    // Use IMMEDIATE transaction for write lock
    const transaction = db.transaction(() => {
      // Check if already in waitlist
      const existing = db
        .prepare('SELECT * FROM waitlist WHERE user_id = ? AND drop_id = ?')
        .get(userId, dropId) as WaitlistEntry | undefined;

      if (existing) {
        // Idempotent: return existing entry
        return existing;
      }

      // Calculate priority score
      const user = UserRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const accountAgeDays = getAccountAgeDays(user.created_at);
      const signupLatencyMs = Math.floor(Math.random() * 1000); // Simulated latency
      const rapidActions = 0; // TODO: Track user actions

      const priorityScore = calculatePriorityScore({
        signupLatencyMs,
        accountAgeDays,
        rapidActions,
      });

      // Insert into waitlist
      const stmt = db.prepare(`
        INSERT INTO waitlist (user_id, drop_id, priority_score)
        VALUES (?, ?, ?)
      `);

      const result = stmt.run(userId, dropId, priorityScore);

      return {
        id: Number(result.lastInsertRowid),
        user_id: userId,
        drop_id: dropId,
        priority_score: priorityScore,
        joined_at: new Date().toISOString(),
      };
    });

    // Execute transaction
    return transaction();
  }

  /**
   * Leave waitlist (idempotent operation)
   * Returns true if removed, false if not in waitlist
   */
  static leave(userId: number, dropId: number): boolean {
    const transaction = db.transaction(() => {
      const stmt = db.prepare('DELETE FROM waitlist WHERE user_id = ? AND drop_id = ?');
      const result = stmt.run(userId, dropId);
      return result.changes > 0;
    });

    return transaction();
  }

  /**
   * Check if user is in waitlist
   */
  static isInWaitlist(userId: number, dropId: number): boolean {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM waitlist WHERE user_id = ? AND drop_id = ?');
    const result = stmt.get(userId, dropId) as { count: number };
    return result.count > 0;
  }

  /**
   * Get user's position in waitlist (1-indexed)
   * Higher priority score = higher position
   */
  static getUserPosition(userId: number, dropId: number): number | null {
    const stmt = db.prepare(`
      SELECT COUNT(*) + 1 as position
      FROM waitlist
      WHERE drop_id = ? AND priority_score > (
        SELECT priority_score FROM waitlist WHERE user_id = ? AND drop_id = ?
      )
    `);

    const result = stmt.get(dropId, userId, dropId) as { position: number } | undefined;
    return result ? result.position : null;
  }

  /**
   * Get all waitlist entries for a drop, sorted by priority
   */
  static getByDrop(dropId: number): WaitlistEntry[] {
    const stmt = db.prepare(`
      SELECT * FROM waitlist
      WHERE drop_id = ?
      ORDER BY priority_score DESC, joined_at ASC
    `);
    return stmt.all(dropId) as WaitlistEntry[];
  }

  /**
   * Get all waitlist entries for a user
   */
  static getByUser(userId: number): WaitlistEntry[] {
    const stmt = db.prepare(`
      SELECT * FROM waitlist
      WHERE user_id = ?
      ORDER BY joined_at DESC
    `);
    return stmt.all(userId) as WaitlistEntry[];
  }

  /**
   * Get waitlist count for a drop
   */
  static getCount(dropId: number): number {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM waitlist WHERE drop_id = ?');
    const result = stmt.get(dropId) as { count: number };
    return result.count;
  }

  /**
   * Get waitlist entry with user details
   */
  static getEntryWithUser(userId: number, dropId: number) {
    const stmt = db.prepare(`
      SELECT
        w.*,
        u.email as user_email,
        u.created_at as user_created_at
      FROM waitlist w
      JOIN users u ON w.user_id = u.id
      WHERE w.user_id = ? AND w.drop_id = ?
    `);

    return stmt.get(userId, dropId);
  }
}
