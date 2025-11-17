import db from '../config/database';
import { Claim } from '../types';
import { generateClaimCode } from '../utils/claimCode';

/**
 * Claim repository - handles all database operations for claims
 * Uses transactions to ensure stock consistency
 */
export class ClaimRepository {
  /**
   * Create claim (transaction-safe, idempotent)
   * Returns existing claim if already claimed
   * Ensures stock is not exceeded
   */
  static create(userId: number, dropId: number): Claim {
    const transaction = db.transaction(() => {
      // Check if user already claimed this drop (idempotent)
      const existingClaim = db
        .prepare('SELECT * FROM claims WHERE user_id = ? AND drop_id = ?')
        .get(userId, dropId) as Claim | undefined;

      if (existingClaim) {
        return existingClaim;
      }

      // Get drop with row lock
      const drop = db
        .prepare('SELECT * FROM drops WHERE id = ?')
        .get(dropId) as any;

      if (!drop) {
        throw new Error('Drop not found');
      }

      // Count existing claims
      const claimCount = db
        .prepare('SELECT COUNT(*) as count FROM claims WHERE drop_id = ?')
        .get(dropId) as { count: number };

      // Check if stock is available
      if (claimCount.count >= drop.stock) {
        throw new Error('No stock available');
      }

      // Generate unique claim code
      let claimCode: string;
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        claimCode = generateClaimCode();

        // Check if code is unique
        const existingCode = db
          .prepare('SELECT COUNT(*) as count FROM claims WHERE claim_code = ?')
          .get(claimCode) as { count: number };

        if (existingCode.count === 0) {
          break;
        }

        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique claim code');
      }

      // Create claim
      const stmt = db.prepare(`
        INSERT INTO claims (user_id, drop_id, claim_code)
        VALUES (?, ?, ?)
      `);

      const result = stmt.run(userId, dropId, claimCode!);

      return {
        id: Number(result.lastInsertRowid),
        user_id: userId,
        drop_id: dropId,
        claim_code: claimCode!,
        claimed_at: new Date().toISOString(),
      };
    });

    return transaction();
  }

  /**
   * Find claim by ID
   */
  static findById(id: number): Claim | undefined {
    const stmt = db.prepare('SELECT * FROM claims WHERE id = ?');
    return stmt.get(id) as Claim | undefined;
  }

  /**
   * Find claim by user and drop
   */
  static findByUserAndDrop(userId: number, dropId: number): Claim | undefined {
    const stmt = db.prepare('SELECT * FROM claims WHERE user_id = ? AND drop_id = ?');
    return stmt.get(userId, dropId) as Claim | undefined;
  }

  /**
   * Find claim by claim code
   */
  static findByClaimCode(claimCode: string): Claim | undefined {
    const stmt = db.prepare('SELECT * FROM claims WHERE claim_code = ?');
    return stmt.get(claimCode) as Claim | undefined;
  }

  /**
   * Get all claims for a drop
   */
  static getByDrop(dropId: number): Claim[] {
    const stmt = db.prepare(`
      SELECT * FROM claims
      WHERE drop_id = ?
      ORDER BY claimed_at ASC
    `);
    return stmt.all(dropId) as Claim[];
  }

  /**
   * Get all claims for a user
   */
  static getByUser(userId: number): Claim[] {
    const stmt = db.prepare(`
      SELECT * FROM claims
      WHERE user_id = ?
      ORDER BY claimed_at DESC
    `);
    return stmt.all(userId) as Claim[];
  }

  /**
   * Get claim count for a drop
   */
  static getClaimCount(dropId: number): number {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM claims WHERE drop_id = ?');
    const result = stmt.get(dropId) as { count: number };
    return result.count;
  }

  /**
   * Check if user has claimed a drop
   */
  static hasClaimed(userId: number, dropId: number): boolean {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM claims WHERE user_id = ? AND drop_id = ?');
    const result = stmt.get(userId, dropId) as { count: number };
    return result.count > 0;
  }

  /**
   * Get claim with drop and user details
   */
  static getClaimWithDetails(claimId: number) {
    const stmt = db.prepare(`
      SELECT
        c.*,
        u.email as user_email,
        d.title as drop_title,
        d.description as drop_description
      FROM claims c
      JOIN users u ON c.user_id = u.id
      JOIN drops d ON c.drop_id = d.id
      WHERE c.id = ?
    `);

    return stmt.get(claimId);
  }

  /**
   * Delete claim (admin only, for testing)
   */
  static delete(id: number): boolean {
    const stmt = db.prepare('DELETE FROM claims WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
}
