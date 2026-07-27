const express = require('express');
const {
  listActivationKeysHandler,
  createActivationKeyHandler,
  deleteActivationKeyHandler,
  useActivationKeyHandler
} = require('../controllers/activationKeyController');
const { requireAuth, allowRoles } = require('../middleware/authMiddleware');
const { Roles } = require('../constants/enums');

const router = express.Router();

router.use(requireAuth);

// SUPER_ADMIN routes
router.get('/', allowRoles([Roles.SUPER_ADMIN]), listActivationKeysHandler);
router.post('/', allowRoles([Roles.SUPER_ADMIN]), createActivationKeyHandler);
router.delete('/:keyId', allowRoles([Roles.SUPER_ADMIN]), deleteActivationKeyHandler);

// SUB_ADMIN: use a key to create a locker
router.post('/use', allowRoles([Roles.SUB_ADMIN]), useActivationKeyHandler);

module.exports = router;
