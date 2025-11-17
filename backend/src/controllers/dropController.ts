import { Request, Response } from 'express';
import { DropService } from '../services/dropService';
import { success } from '../utils/response';

/**
 * Drop controller - handles HTTP requests for drops
 */
export class DropController {
  /**
   * GET /drops
   * Get all active and upcoming drops
   * Query params: ?filter=active|upcoming|all
   */
  static async getDrops(req: Request, res: Response) {
    const filter = req.query.filter as 'active' | 'upcoming' | 'all' | undefined;
    const drops = await DropService.getDrops(filter);
    return success(res, drops);
  }

  /**
   * GET /drops/:id
   * Get drop details by ID
   */
  static async getDropById(req: Request, res: Response) {
    const dropId = parseInt(req.params.id);
    const userId = req.user?.userId; // Optional - if user is authenticated

    const drop = await DropService.getDropById(dropId, userId);
    return success(res, drop);
  }
}
