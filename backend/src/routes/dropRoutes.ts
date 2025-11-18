import { Router } from 'express';
import { DropController } from '../controllers/dropController';
import { WaitlistController } from '../controllers/waitlistController';
import { ClaimController } from '../controllers/claimController';
import { authenticate, optionalAuthenticate } from '../middleware/auth';

const router = Router();

/**
 * GET /drops
 * Get all drops (active and upcoming)
 * Public endpoint - attaches user context if token provided
 */
router.get('/', optionalAuthenticate, DropController.getDrops);

/**
 * GET /drops/:id
 * Get drop details by ID
 * Public endpoint - but shows extra info if authenticated
 */
router.get('/:id', optionalAuthenticate, DropController.getDropById);

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

/**
 * POST /drops/:id/claim
 * Claim a drop (protected)
 */
router.post('/:id/claim', authenticate, ClaimController.claimDrop);

/**
 * GET /drops/:id/claims
 * Get all claims for a drop (public)
 */
router.get('/:id/claims', ClaimController.getDropClaims);

export default router;
