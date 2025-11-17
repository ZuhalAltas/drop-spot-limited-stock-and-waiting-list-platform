import { Router } from 'express';
import { DropController } from '../controllers/dropController';

const router = Router();

/**
 * GET /drops
 * Get all drops (active and upcoming)
 * Public endpoint - no authentication required
 */
router.get('/', DropController.getDrops);

/**
 * GET /drops/:id
 * Get drop details by ID
 * Public endpoint - but shows extra info if authenticated
 */
router.get('/:id', DropController.getDropById);

export default router;
