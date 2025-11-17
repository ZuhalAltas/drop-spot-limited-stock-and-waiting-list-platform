import { WaitlistRepository } from '../models/Waitlist';
import { DropRepository } from '../models/Drop';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';

/**
 * Waitlist service - business logic for waitlist operations
 */
export class WaitlistService {
  /**
   * Join waitlist for a drop
   * Idempotent operation - multiple calls return same result
   */
  static async joinWaitlist(userId: number, dropId: number) {
    // Check if drop exists
    const drop = DropRepository.findById(dropId);
    if (!drop) {
      throw new NotFoundError('Drop not found');
    }

    // Check if user already claimed this drop
    if (DropRepository.hasUserClaimed(dropId, userId)) {
      throw new ConflictError('You have already claimed this drop');
    }

    // Check if claim window is over
    const now = new Date();
    const claimEnd = new Date(drop.claim_window_end);
    if (now > claimEnd) {
      throw new ValidationError('This drop is no longer available');
    }

    // Join waitlist (idempotent)
    const entry = WaitlistRepository.join(userId, dropId);

    // Get user's position
    const position = WaitlistRepository.getUserPosition(userId, dropId);
    const totalWaitlist = WaitlistRepository.getCount(dropId);

    return {
      entry,
      position,
      total_waitlist: totalWaitlist,
      message: position === null
        ? 'Successfully joined waitlist'
        : `You are #${position} in the waitlist`,
    };
  }

  /**
   * Leave waitlist for a drop
   * Idempotent operation - multiple calls return same result
   */
  static async leaveWaitlist(userId: number, dropId: number) {
    // Check if drop exists
    const drop = DropRepository.findById(dropId);
    if (!drop) {
      throw new NotFoundError('Drop not found');
    }

    // Leave waitlist (idempotent)
    const removed = WaitlistRepository.leave(userId, dropId);

    return {
      success: true,
      removed,
      message: removed
        ? 'Successfully left waitlist'
        : 'You were not in the waitlist',
    };
  }

  /**
   * Get user's waitlist entries
   */
  static async getUserWaitlist(userId: number) {
    const entries = WaitlistRepository.getByUser(userId);

    // Enrich with drop details and position
    const enriched = entries.map((entry) => {
      const drop = DropRepository.findById(entry.drop_id);
      const position = WaitlistRepository.getUserPosition(userId, entry.drop_id);
      const totalWaitlist = WaitlistRepository.getCount(entry.drop_id);

      return {
        ...entry,
        drop,
        position,
        total_waitlist: totalWaitlist,
      };
    });

    return enriched;
  }

  /**
   * Get waitlist for a drop (admin/public view)
   */
  static async getDropWaitlist(dropId: number) {
    const drop = DropRepository.findById(dropId);
    if (!drop) {
      throw new NotFoundError('Drop not found');
    }

    const entries = WaitlistRepository.getByDrop(dropId);
    const total = entries.length;

    return {
      drop,
      total_waitlist: total,
      entries: entries.map((entry, index) => ({
        ...entry,
        position: index + 1, // 1-indexed position
      })),
    };
  }
}
