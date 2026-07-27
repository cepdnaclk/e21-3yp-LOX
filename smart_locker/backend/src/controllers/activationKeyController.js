const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../presenters/apiPresenter');
const {
  listActivationKeys,
  createActivationKey,
  deleteActivationKey,
  useActivationKey
} = require('../services/activationKeyService');
const { Roles } = require('../constants/enums');

/**
 * GET /activation-keys
 * List all activation keys — SUPER_ADMIN only
 */
const listActivationKeysHandler = asyncHandler(async (req, res) => {
  if (req.user.role !== Roles.SUPER_ADMIN) {
    return res.status(403).json({ message: 'Only super admins can list activation keys' });
  }

  const data = await listActivationKeys();
  return success(res, data);
});

/**
 * POST /activation-keys
 * Create a new activation key — SUPER_ADMIN only
 */
const createActivationKeyHandler = asyncHandler(async (req, res) => {
  if (req.user.role !== Roles.SUPER_ADMIN) {
    return res.status(403).json({ message: 'Only super admins can create activation keys' });
  }

  const { key, label } = req.body;
  const data = await createActivationKey({ key, label });
  return success(res, data, 201);
});

/**
 * DELETE /activation-keys/:keyId
 * Delete an activation key — SUPER_ADMIN only
 */
const deleteActivationKeyHandler = asyncHandler(async (req, res) => {
  if (req.user.role !== Roles.SUPER_ADMIN) {
    return res.status(403).json({ message: 'Only super admins can delete activation keys' });
  }

  await deleteActivationKey(req.params.keyId);
  return success(res, { message: 'Activation key deleted successfully' });
});

/**
 * POST /activation-keys/use
 * Use an activation key to create a locker — SUB_ADMIN only
 */
const useActivationKeyHandler = asyncHandler(async (req, res) => {
  if (req.user.role !== Roles.SUB_ADMIN) {
    return res.status(403).json({ message: 'Only sub-admins can use activation keys to create lockers' });
  }

  const { activationKey, stationId, code } = req.body;
  const data = await useActivationKey(req.user, { activationKey, stationId, code });
  return success(res, data, 201);
});

module.exports = {
  listActivationKeysHandler,
  createActivationKeyHandler,
  deleteActivationKeyHandler,
  useActivationKeyHandler
};
