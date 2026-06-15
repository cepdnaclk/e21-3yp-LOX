const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../presenters/apiPresenter');
const { getStationsForUser } = require('../services/stationService');
const { listRequests, listQueue } = require('../services/requestService');
const { listEvents } = require('../services/eventService');
const { listLockers } = require('../services/lockerService');
const { getOverdueLockersForStation } = require('../services/overdueService');
const { Roles } = require('../constants/enums');

const getDashboardDataHandler = asyncHandler(async (req, res) => {
  const { user } = req;
  const isAdmin = user.role === Roles.SUPER_ADMIN || user.role === Roles.SUB_ADMIN;

  // 1. Fetch stations, requests, and events concurrently
  const [stations, requests, events] = await Promise.all([
    getStationsForUser(user),
    listRequests(user),
    listEvents(user, { limit: 50 })
  ]);

  // Determine which stationId to load data for
  let stationId = req.query.stationId;
  if (!stationId && stations.length > 0) {
    stationId = String(stations[0]._id);
  }

  let lockers = [];
  let queueEntries = [];
  let overdueLockers = [];

  if (stationId) {
    // 2. Fetch station-specific data concurrently
    const [lockersResult, queueResult, overdueResult] = await Promise.all([
      listLockers(user, stationId).catch(() => ({ lockers: [] })),
      listQueue(user, stationId).catch(() => []),
      isAdmin
        ? getOverdueLockersForStation(stationId).catch(() => [])
        : Promise.resolve([])
    ]);

    lockers = lockersResult.lockers || [];
    queueEntries = queueResult || [];
    overdueLockers = overdueResult || [];
  }

  return success(res, {
    stations,
    requests,
    events,
    lockers,
    queueEntries,
    overdueLockers,
    selectedStationId: stationId || ''
  });
});

module.exports = {
  getDashboardDataHandler
};
