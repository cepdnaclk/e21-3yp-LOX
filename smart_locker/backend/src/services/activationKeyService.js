const bcrypt = require('bcryptjs');
const ActivationKey = require('../models/ActivationKey');
const { createLocker } = require('./lockerService');

/**
 * List all activation keys (SUPER_ADMIN only).
 * Returns keys with masked hash; populates usedBy and usedForLocker.
 */
async function listActivationKeys() {
  const keys = await ActivationKey.find()
    .sort({ createdAt: -1 })
    .populate('usedBy', 'name email')
    .populate('usedForLocker', 'code');

  return { activationKeys: keys };
}

/**
 * Create a new activation key (SUPER_ADMIN only).
 * The plaintext key is returned once and never stored.
 */
async function createActivationKey({ key, label = '' }) {
  if (!key) {
    const error = new Error('key is required');
    error.statusCode = 400;
    throw error;
  }

  const normalizedKey = key.trim().toUpperCase();
  const keyPattern = /^LOXA-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  if (!keyPattern.test(normalizedKey)) {
    const error = new Error('Invalid key format. Expected: LOXA-XXXX-XXXX-XXXX');
    error.statusCode = 400;
    throw error;
  }

  const keyHash = await bcrypt.hash(normalizedKey, 10);
  const activationKey = await ActivationKey.create({ keyHash, label: label.trim() });

  return {
    activationKey: {
      _id: activationKey._id,
      label: activationKey.label,
      isUsed: activationKey.isUsed,
      createdAt: activationKey.createdAt,
      plaintextKey: normalizedKey  // returned once only
    }
  };
}

/**
 * Delete an activation key (SUPER_ADMIN only).
 */
async function deleteActivationKey(keyId) {
  const key = await ActivationKey.findById(keyId);
  if (!key) {
    const error = new Error('Activation key not found');
    error.statusCode = 404;
    throw error;
  }

  await key.deleteOne();
}

/**
 * Use an activation key to create a locker (SUB_ADMIN).
 * Validates the plaintext key against all unused keys, then creates the locker.
 */
async function useActivationKey(user, { activationKey: plaintextKey, stationId, code }) {
  if (!plaintextKey || !stationId || !code) {
    const error = new Error('activationKey, stationId, and code are required');
    error.statusCode = 400;
    throw error;
  }

  const normalizedKey = plaintextKey.trim().toUpperCase();

  // Find all unused keys and compare against the hash
  const unusedKeys = await ActivationKey.find({ isUsed: false });
  let matchedKey = null;

  for (const k of unusedKeys) {
    const isMatch = await bcrypt.compare(normalizedKey, k.keyHash);
    if (isMatch) {
      matchedKey = k;
      break;
    }
  }

  if (!matchedKey) {
    const error = new Error('Invalid or already-used activation key');
    error.statusCode = 403;
    throw error;
  }

  // Create the locker using the existing service
  const locker = await createLocker(user, { stationId, code });

  // Mark the key as used
  matchedKey.isUsed = true;
  matchedKey.usedAt = new Date();
  matchedKey.usedBy = user._id;
  matchedKey.usedForLocker = locker._id;
  await matchedKey.save();

  return { locker, message: `Locker "${locker.code}" created successfully` };
}

module.exports = {
  listActivationKeys,
  createActivationKey,
  deleteActivationKey,
  useActivationKey
};
