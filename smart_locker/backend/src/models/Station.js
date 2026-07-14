const mongoose = require('mongoose');

const stationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    timezone: { type: String, default: 'Asia/Colombo' },
    schedule: {
      enabled: { type: Boolean, default: true },
      openTime: { type: String, default: '08:00' },
      closeTime: { type: String, default: '20:00' }
    },
    emergencyMode: { type: Boolean, default: false },

    // ── Overdue payment settings ─────────────────────────────────────────────
    // Minutes a user can use the locker for free before overdue charges begin
    freeDurationMinutes: { type: Number, default: 15, min: 0 },
    // Minutes the user has after payment confirmation to remove goods and release locker
    gracePeriodMinutes: { type: Number, default: 10, min: 0 },
    // Overdue charge rate in LKR per hour (stored per-hour; converted to per-minute in business logic)
    overdueRatePerHour: { type: Number, default: 300, min: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Station', stationSchema);

