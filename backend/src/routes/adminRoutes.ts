import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /admin/drops
 * Get all drops (admin view with stats)
 */
router.get('/drops', AdminController.getAllDrops);

/**
 * POST /admin/drops
 * Create new drop
 */
router.post('/drops', AdminController.createDrop);

/**
 * PUT /admin/drops/:id
 * Update drop
 */
router.put('/drops/:id', AdminController.updateDrop);

/**
 * DELETE /admin/drops/:id
 * Delete drop
 */
router.delete('/drops/:id', AdminController.deleteDrop);

export default router;
