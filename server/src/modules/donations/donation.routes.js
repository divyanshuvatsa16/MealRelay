import { Router } from 'express';
import * as donationController from './donation.controller.js';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { requireRole, requireApprovedOrganization } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  createDonationSchema,
  updateDonationSchema,
  queryDonationsSchema,
  verifyPickupSchema,
  cancelDonationSchema
} from './donation.schema.js';

const router = Router();

router.post(
  '/',
  requireAuth,
  requireRole('DONOR'),
  requireApprovedOrganization('DONOR'),
  validate(createDonationSchema),
  donationController.createDonation
);

router.get(
  '/',
  optionalAuth,
  validate(queryDonationsSchema, 'query'),
  donationController.getDonations
);

router.get(
  '/:id',
  optionalAuth,
  donationController.getDonationById
);

router.patch(
  '/:id',
  requireAuth,
  validate(updateDonationSchema),
  donationController.updateDonation
);

// Donation Claiming
router.post(
  '/:id/claim',
  requireAuth,
  requireRole('NGO'),
  requireApprovedOrganization('NGO'),
  donationController.claimDonation
);

// Pickup Verification
router.post(
  '/:id/verify-pickup',
  requireAuth,
  requireRole('NGO'),
  validate(verifyPickupSchema),
  donationController.verifyPickup
);

// Cancellation
router.post(
  '/:id/cancel',
  requireAuth,
  validate(cancelDonationSchema),
  donationController.cancelDonation
);

// Secure Pickup Code Retrieval (for Owning Donor)
router.get(
  '/:id/pickup-code',
  requireAuth,
  donationController.getPickupCode
);

// Audit History Timeline
router.get(
  '/:id/history',
  requireAuth,
  donationController.getDonationHistory
);

export default router;
