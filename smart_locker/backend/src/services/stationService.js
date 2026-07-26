const Station = require('../models/Station');

function getStationsForUser(user) {
  if (user.role === 'SUPER_ADMIN' || user.role === 'USER') {
    return Station.find({}).sort({ createdAt: 1 });
  }

  return Station.find({ _id: { $in: user.stationIds || [] } }).sort({ createdAt: 1 });
}

function getAllStations() {
  return Station.find({}).sort({ createdAt: 1 });
}

async function createStation(payload) {
  const stationData = {
    name: payload.name,
    code: payload.code.toUpperCase(),
    timezone: payload.timezone || 'Asia/Colombo',
    schedule: {
      enabled: true,
      openTime: payload.openTime || '08:00',
      closeTime: payload.closeTime || '20:00'
    }
  };

  if (payload.location && Array.isArray(payload.location.coordinates) && payload.location.coordinates.length === 2) {
    stationData.location = {
      type: 'Point',
      coordinates: payload.location.coordinates
    };
  }

  return Station.create(stationData);
}

/**
 * Update the overdue payment settings for a station.
 * Only SUB_ADMIN (for their own stations) and SUPER_ADMIN may call this.
 */
async function updateOverdueSettings(user, stationId, payload) {
  // Access guard: sub-admin must own the station
  if (user.role !== 'SUPER_ADMIN') {
    const allowed = (user.stationIds || []).map(String);
    if (!allowed.includes(String(stationId))) {
      const err = new Error('Station access denied');
      err.statusCode = 403;
      throw err;
    }
  }

  const updates = {};

  if (payload.freeDurationMinutes !== undefined) {
    const v = Number(payload.freeDurationMinutes);
    if (!Number.isFinite(v) || v < 0) {
      const err = new Error('freeDurationMinutes must be a non-negative number');
      err.statusCode = 400;
      throw err;
    }
    updates.freeDurationMinutes = v;
  }

  if (payload.gracePeriodMinutes !== undefined) {
    const v = Number(payload.gracePeriodMinutes);
    if (!Number.isFinite(v) || v < 0) {
      const err = new Error('gracePeriodMinutes must be a non-negative number');
      err.statusCode = 400;
      throw err;
    }
    updates.gracePeriodMinutes = v;
  }

  if (payload.overdueRatePerHour !== undefined) {
    const v = Number(payload.overdueRatePerHour);
    if (!Number.isFinite(v) || v < 0) {
      const err = new Error('overdueRatePerHour must be a non-negative number');
      err.statusCode = 400;
      throw err;
    }
    updates.overdueRatePerHour = v;
  }

  if (Object.keys(updates).length === 0) {
    const err = new Error('No valid fields provided');
    err.statusCode = 400;
    throw err;
  }

  const station = await Station.findByIdAndUpdate(
    stationId,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!station) {
    const err = new Error('Station not found');
    err.statusCode = 404;
    throw err;
  }

  return station;
}

module.exports = {
  getStationsForUser,
  getAllStations,
  createStation,
  updateOverdueSettings
};

