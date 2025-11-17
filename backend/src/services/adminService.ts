import { DropRepository } from '../models/Drop';
import { NotFoundError, ValidationError } from '../utils/errors';
import { CreateDropInput, UpdateDropInput } from '../utils/validators';

/**
 * Admin service - business logic for admin operations
 */
export class AdminService {
  /**
   * Create new drop
   */
  static async createDrop(input: CreateDropInput) {
    // Validate dates
    const start = new Date(input.claim_window_start);
    const end = new Date(input.claim_window_end);

    if (end <= start) {
      throw new ValidationError('Claim window end must be after start');
    }

    // Validate stock
    if (input.stock <= 0) {
      throw new ValidationError('Stock must be greater than 0');
    }

    // Create drop
    const drop = DropRepository.create({
      title: input.title,
      description: input.description,
      stock: input.stock,
      claim_window_start: input.claim_window_start,
      claim_window_end: input.claim_window_end,
    });

    return drop;
  }

  /**
   * Update drop
   */
  static async updateDrop(dropId: number, input: UpdateDropInput) {
    // Check if drop exists
    const existingDrop = DropRepository.findById(dropId);
    if (!existingDrop) {
      throw new NotFoundError('Drop not found');
    }

    // Validate dates if both are provided
    if (input.claim_window_start && input.claim_window_end) {
      const start = new Date(input.claim_window_start);
      const end = new Date(input.claim_window_end);

      if (end <= start) {
        throw new ValidationError('Claim window end must be after start');
      }
    }

    // Validate stock if provided
    if (input.stock !== undefined && input.stock < 0) {
      throw new ValidationError('Stock cannot be negative');
    }

    // Check if reducing stock below current claims
    if (input.stock !== undefined) {
      const claimCount = DropRepository.getRemainingStock(dropId);
      const currentClaims = existingDrop.stock - claimCount;

      if (input.stock < currentClaims) {
        throw new ValidationError(
          `Cannot reduce stock below current claims (${currentClaims})`
        );
      }
    }

    // Update drop
    const updated = DropRepository.update(dropId, input);

    if (!updated) {
      throw new Error('Failed to update drop');
    }

    // Return updated drop
    return DropRepository.findById(dropId);
  }

  /**
   * Delete drop
   */
  static async deleteDrop(dropId: number) {
    // Check if drop exists
    const drop = DropRepository.findById(dropId);
    if (!drop) {
      throw new NotFoundError('Drop not found');
    }

    // Check if there are active claims
    const claimCount = drop.stock - DropRepository.getRemainingStock(dropId);
    if (claimCount > 0) {
      throw new ValidationError(
        `Cannot delete drop with active claims (${claimCount} claims)`
      );
    }

    // Delete drop (will cascade delete waitlist entries)
    const deleted = DropRepository.delete(dropId);

    if (!deleted) {
      throw new Error('Failed to delete drop');
    }

    return {
      success: true,
      message: 'Drop deleted successfully',
    };
  }

  /**
   * Get all drops (admin view with all statuses)
   */
  static async getAllDrops() {
    const drops = DropRepository.getAll();

    // Enrich with stats
    const enriched = drops.map((drop) => ({
      ...drop,
      remaining_stock: DropRepository.getRemainingStock(drop.id),
      is_claim_window_open: DropRepository.isClaimWindowOpen(drop),
      claim_count: drop.stock - DropRepository.getRemainingStock(drop.id),
    }));

    return enriched;
  }
}
