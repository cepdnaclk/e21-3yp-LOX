const express = require('express');
const {
  listLockersHandler,
  createLockerHandler,
  unlockLockerHandler,
  lockLockerHandler,
  releaseLockerHandler,
  ignoreSecurityAlertHandler,
  toggleMaintenanceHandler
} = require('../controllers/lockerController');
const { requireAuth, allowRoles } = require('../middleware/authMiddleware');
const { Roles } = require('../constants/enums');

const router = express.Router();

router.use(requireAuth);
router.get('/', listLockersHandler);
router.post('/', allowRoles([Roles.SUPER_ADMIN, Roles.SUB_ADMIN]), createLockerHandler);
router.post('/:lockerId/unlock', unlockLockerHandler);
router.post('/:lockerId/lock', lockLockerHandler);
router.post('/:lockerId/release', releaseLockerHandler);
router.post('/:lockerId/security-ignore', ignoreSecurityAlertHandler);
router.post('/:lockerId/maintenance', toggleMaintenanceHandler);

module.exports = router;
