import db from '../config/database';
import { Drop } from '../types';

/**
 * Drop repository - handles all database operations for drops
 */
export class DropRepository {
  /**
   * Get all drops
   */
  static getAll(): Drop[] {
    const stmt = db.prepare('SELECT * FROM drops ORDER BY created_at DESC');
    return stmt.all() as Drop[];
  }

  /**
   * Get active drops (claim window is currently open)
   */
  static getActive(): Drop[] {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      SELECT * FROM drops
      WHERE claim_window_start <= ? AND claim_window_end >= ?
      ORDER BY claim_window_start ASC
    `);
    return stmt.all(now, now) as Drop[];
  }

  /**
   * Get upcoming drops (claim window hasn't started yet)
   */
  static getUpcoming(): Drop[] {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      SELECT * FROM drops
      WHERE claim_window_start > ?
      ORDER BY claim_window_start ASC
    `);
    return stmt.all(now) as Drop[];
  }

  /**
   * Find drop by ID
   */
  static findById(id: number): Drop | undefined {
    const stmt = db.prepare('SELECT * FROM drops WHERE id = ?');
    return stmt.get(id) as Drop | undefined;
  }

  /**
   * Create new drop
   */
  static create(data: {
    title: string;
    description?: string;
    stock: number;
    claim_window_start: string;
    claim_window_end: string;
  }): Drop {
    const stmt = db.prepare(`
      INSERT INTO drops (title, description, stock, claim_window_start, claim_window_end)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.title,
      data.description || null,
      data.stock,
      data.claim_window_start,
      data.claim_window_end
    );

    return {
      id: Number(result.lastInsertRowid),
      ...data,
      description: data.description || '',
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Update drop
   */
  static update(
    id: number,
    data: Partial<{
      title: string;
      description: string;
      stock: number;
      claim_window_start: string;
      claim_window_end: string;
    }>
  ): boolean {
    const fields = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(', ');

    if (!fields) return false;

    const stmt = db.prepare(`UPDATE drops SET ${fields} WHERE id = ?`);
    const values = [...Object.values(data), id];
    const result = stmt.run(...values);

    return result.changes > 0;
  }

  /**
   * Delete drop
   */
  static delete(id: number): boolean {
    const stmt = db.prepare('DELETE FROM drops WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Check if drop is currently in claim window
   */
  static isClaimWindowOpen(drop: Drop): boolean {
    const now = new Date();
    const start = new Date(drop.claim_window_start);
    const end = new Date(drop.claim_window_end);
    return now >= start && now <= end;
  }

  /**
   * Get remaining stock for drop
   */
  static getRemainingStock(dropId: number): number {
    const drop = this.findById(dropId);
    if (!drop) return 0;

    const stmt = db.prepare('SELECT COUNT(*) as claimed FROM claims WHERE drop_id = ?');
    const result = stmt.get(dropId) as { claimed: number };

    return drop.stock - result.claimed;
  }

  /**
   * Check if user has claimed this drop
   */
  static hasUserClaimed(dropId: number, userId: number): boolean {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM claims WHERE drop_id = ? AND user_id = ?');
    const result = stmt.get(dropId, userId) as { count: number };
    return result.count > 0;
  }
}
