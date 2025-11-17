import { DropRepository } from '../models/Drop';
import { NotFoundError } from '../utils/errors';
import { Drop } from '../types';

/**
 * Drop service - business logic for drop operations
 */
export class DropService {
  /**
   * Get all active and upcoming drops
   */
  static async getDrops(filter?: 'active' | 'upcoming' | 'all') {
    let drops: Drop[];

    switch (filter) {
      case 'active':
        drops = DropRepository.getActive();
        break;
      case 'upcoming':
        drops = DropRepository.getUpcoming();
        break;
      default:
        // Return both active and upcoming by default
        const active = DropRepository.getActive();
        const upcoming = DropRepository.getUpcoming();
        drops = [...active, ...upcoming];
    }

    // Enrich drops with additional info
    return drops.map((drop) => ({
      ...drop,
      remaining_stock: DropRepository.getRemainingStock(drop.id),
      is_claim_window_open: DropRepository.isClaimWindowOpen(drop),
    }));
  }

  /**
   * Get drop by ID with additional metadata
   */
  static async getDropById(dropId: number, userId?: number) {
    const drop = DropRepository.findById(dropId);

    if (!drop) {
      throw new NotFoundError('Drop not found');
    }

    const enrichedDrop = {
      ...drop,
      remaining_stock: DropRepository.getRemainingStock(drop.id),
      is_claim_window_open: DropRepository.isClaimWindowOpen(drop),
      user_has_claimed: userId ? DropRepository.hasUserClaimed(drop.id, userId) : false,
    };

    return enrichedDrop;
  }

  /**
   * Check if drop exists
   */
  static async exists(dropId: number): Promise<boolean> {
    return DropRepository.findById(dropId) !== undefined;
  }
}
