import { Router } from 'express';
import { DropController } from '../controllers/dropController';
import { WaitlistController } from '../controllers/waitlistController';
import { authenticate } from '../middleware/auth';

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

/**
 * POST /drops/:id/join
 * Join waitlist for a drop (protected)
 */
router.post('/:id/join', authenticate, WaitlistController.joinWaitlist);

/**
 * POST /drops/:id/leave
 * Leave waitlist for a drop (protected)
 */
router.post('/:id/leave', authenticate, WaitlistController.leaveWaitlist);

/**
 * GET /drops/:id/waitlist
 * Get waitlist for a drop (public)
 */
router.get('/:id/waitlist', WaitlistController.getDropWaitlist);

export default router;
