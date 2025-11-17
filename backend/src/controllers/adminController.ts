import { Request, Response } from 'express';
import { AdminService } from '../services/adminService';
import { createDropSchema, updateDropSchema } from '../utils/validators';
import { success, created, noContent } from '../utils/response';

/**
 * Admin controller - handles HTTP requests for admin operations
 */
export class AdminController {
  /**
   * POST /admin/drops
   * Create new drop
   */
  static async createDrop(req: Request, res: Response) {
    const input = createDropSchema.parse(req.body);
    const drop = await AdminService.createDrop(input);
    return created(res, drop);
  }

  /**
   * PUT /admin/drops/:id
   * Update drop
   */
  static async updateDrop(req: Request, res: Response) {
    const dropId = parseInt(req.params.id);
    const input = updateDropSchema.parse(req.body);
    const drop = await AdminService.updateDrop(dropId, input);
    return success(res, drop);
  }

  /**
   * DELETE /admin/drops/:id
   * Delete drop
   */
  static async deleteDrop(req: Request, res: Response) {
    const dropId = parseInt(req.params.id);
    const result = await AdminService.deleteDrop(dropId);
    return success(res, result);
  }

  /**
   * GET /admin/drops
   * Get all drops (admin view)
   */
  static async getAllDrops(req: Request, res: Response) {
    const drops = await AdminService.getAllDrops();
    return success(res, drops);
  }
}
