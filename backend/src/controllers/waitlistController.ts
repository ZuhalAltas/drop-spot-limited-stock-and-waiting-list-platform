import { Request, Response } from 'express';
import { WaitlistService } from '../services/waitlistService';
import { success } from '../utils/response';

/**
 * Waitlist controller - handles HTTP requests for waitlist operations
 */
export class WaitlistController {
  /**
   * POST /drops/:id/join
   * Join waitlist for a drop
   */
  static async joinWaitlist(req: Request, res: Response) {
    const dropId = parseInt(req.params.id);
    const userId = req.user!.userId;

    const result = await WaitlistService.joinWaitlist(userId, dropId);
    return success(res, result, 201);
  }

  /**
   * POST /drops/:id/leave
   * Leave waitlist for a drop
   */
  static async leaveWaitlist(req: Request, res: Response) {
    const dropId = parseInt(req.params.id);
    const userId = req.user!.userId;

    const result = await WaitlistService.leaveWaitlist(userId, dropId);
    return success(res, result);
  }

  /**
   * GET /waitlist/me
   * Get current user's waitlist entries
   */
  static async getMyWaitlist(req: Request, res: Response) {
    const userId = req.user!.userId;
    const entries = await WaitlistService.getUserWaitlist(userId);
    return success(res, entries);
  }

  /**
   * GET /drops/:id/waitlist
   * Get waitlist for a specific drop
   */
  static async getDropWaitlist(req: Request, res: Response) {
    const dropId = parseInt(req.params.id);
    const result = await WaitlistService.getDropWaitlist(dropId);
    return success(res, result);
  }
}
