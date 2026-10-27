import * as donationService from './donation.service.js';

export async function createDonation(req, res, next) {
  try {
    const donation = await donationService.createDonation(req.body, req.user);
    res.status(201).json({
      success: true,
      message: 'Donation created successfully',
      data: donation
    });
  } catch (err) {
    next(err);
  }
}

export async function getDonations(req, res, next) {
  try {
    const result = await donationService.getDonations(req.query, req.user);
    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (err) {
    next(err);
  }
}

export async function getDonationById(req, res, next) {
  try {
    const donation = await donationService.getDonationById(req.params.id, req.user);
    res.status(200).json({
      success: true,
      data: donation
    });
  } catch (err) {
    next(err);
  }
}

export async function updateDonation(req, res, next) {
  try {
    const updated = await donationService.updateDonation(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json({
      success: true,
      message: 'Donation updated successfully',
      data: updated
    });
  } catch (err) {
    next(err);
  }
}

export async function claimDonation(req, res, next) {
  try {
    const donation = await donationService.claimDonation(req.params.id, req.user);
    res.status(200).json({
      success: true,
      message: 'Donation claimed successfully',
      data: donation
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyPickup(req, res, next) {
  try {
    const completed = await donationService.verifyPickup(
      req.params.id,
      req.body.code,
      req.user
    );
    res.status(200).json({
      success: true,
      message: 'Pickup verified and donation completed successfully',
      data: completed
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelDonation(req, res, next) {
  try {
    const cancelled = await donationService.cancelDonation(
      req.params.id,
      req.body?.reason,
      req.user
    );
    res.status(200).json({
      success: true,
      message: 'Donation cancelled successfully',
      data: cancelled
    });
  } catch (err) {
    next(err);
  }
}

export async function getPickupCode(req, res, next) {
  try {
    const result = await donationService.getPickupCode(req.params.id, req.user);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function getDonationHistory(req, res, next) {
  try {
    const history = await donationService.getDonationHistory(req.params.id, req.user);
    res.status(200).json({
      success: true,
      data: history
    });
  } catch (err) {
    next(err);
  }
}
