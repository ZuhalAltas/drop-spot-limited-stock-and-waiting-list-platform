import { ClaimRepository } from '../models/Claim';
import { DropRepository } from '../models/Drop';
import { WaitlistRepository } from '../models/Waitlist';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';

/**
 * Claim service - business logic for claim operations
 */
export class ClaimService {
  /**
   * Claim a drop
   * Validates claim window and stock availability
   */
  static async claimDrop(userId: number, dropId: number) {
    // Check if drop exists
    const drop = DropRepository.findById(dropId);
    if (!drop) {
      throw new NotFoundError('Drop not found');
    }

    // Check if claim window is open
    if (!DropRepository.isClaimWindowOpen(drop)) {
      const now = new Date();
      const start = new Date(drop.claim_window_start);
      const end = new Date(drop.claim_window_end);

      if (now < start) {
        throw new ValidationError('Claim window has not started yet');
      }

      if (now > end) {
        throw new ValidationError('Claim window has ended');
      }
    }

    // Check if user is in waitlist (optional business rule)
    const isInWaitlist = WaitlistRepository.isInWaitlist(userId, dropId);
    if (!isInWaitlist) {
      throw new ValidationError('You must join the waitlist first');
    }

    // Check if user already claimed
    const existingClaim = ClaimRepository.findByUserAndDrop(userId, dropId);
    if (existingClaim) {
      // Idempotent: return existing claim
      return {
        claim: existingClaim,
        message: 'You have already claimed this drop',
        is_new: false,
      };
    }

    // Check remaining stock
    const remainingStock = DropRepository.getRemainingStock(dropId);
    if (remainingStock <= 0) {
      throw new ConflictError('Drop is sold out');
    }

    // Create claim (transaction-safe)
    try {
      const claim = ClaimRepository.create(userId, dropId);

      // Remove from waitlist after successful claim
      WaitlistRepository.leave(userId, dropId);

      return {
        claim,
        message: 'Successfully claimed the drop!',
        is_new: true,
      };
    } catch (error: any) {
      if (error.message === 'No stock available') {
        throw new ConflictError('Drop is sold out');
      }
      throw error;
    }
  }

  /**
   * Get user's claims
   */
  static async getUserClaims(userId: number) {
    const claims = ClaimRepository.getByUser(userId);

    // Enrich with drop details
    const enriched = claims.map((claim) => {
      const drop = DropRepository.findById(claim.drop_id);
      return {
        ...claim,
        drop,
      };
    });

    return enriched;
  }

  /**
   * Get claim by claim code
   */
  static async getByClaimCode(claimCode: string) {
    const claim = ClaimRepository.findByClaimCode(claimCode);

    if (!claim) {
      throw new NotFoundError('Claim not found');
    }

    const drop = DropRepository.findById(claim.drop_id);

    return {
      ...claim,
      drop,
    };
  }

  /**
   * Get all claims for a drop (admin)
   */
  static async getDropClaims(dropId: number) {
    const drop = DropRepository.findById(dropId);
    if (!drop) {
      throw new NotFoundError('Drop not found');
    }

    const claims = ClaimRepository.getByDrop(dropId);
    const totalClaims = claims.length;
    const remainingStock = drop.stock - totalClaims;

    return {
      drop,
      total_claims: totalClaims,
      remaining_stock: remainingStock,
      claims,
    };
  }
}
