import { Request, Response } from 'express';
import { ClaimService } from '../services/claimService';
import { success } from '../utils/response';

/**
 * Claim controller - handles HTTP requests for claim operations
 */
export class ClaimController {
  /**
   * POST /drops/:id/claim
   * Claim a drop
   */
  static async claimDrop(req: Request, res: Response) {
    const dropId = parseInt(req.params.id);
    const userId = req.user!.userId;

    const result = await ClaimService.claimDrop(userId, dropId);

    // Return 201 for new claim, 200 for existing
    const statusCode = result.is_new ? 201 : 200;
    return success(res, result, statusCode);
  }

  /**
   * GET /claims/me
   * Get current user's claims
   */
  static async getMyClaims(req: Request, res: Response) {
    const userId = req.user!.userId;
    const claims = await ClaimService.getUserClaims(userId);
    return success(res, claims);
  }

  /**
   * GET /claims/:code
   * Get claim by claim code
   */
  static async getByClaimCode(req: Request, res: Response) {
    const claimCode = req.params.code.toUpperCase();
    const claim = await ClaimService.getByClaimCode(claimCode);
    return success(res, claim);
  }

  /**
   * GET /drops/:id/claims
   * Get all claims for a drop (admin)
   */
  static async getDropClaims(req: Request, res: Response) {
    const dropId = parseInt(req.params.id);
    const result = await ClaimService.getDropClaims(dropId);
    return success(res, result);
  }
}
