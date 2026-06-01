const express = require("express")
const router = express.Router()
const LockerStation = require("../models/master/LockerStation")
const Membership = require("../models/master/Membership")
const User = require("../models/master/User")
const { authenticateToken, requireRole } = require("../middleware/auth")
const { getStationDB } = require("../config/stationDB")
const lockerSchema = require("../models/station/Locker")

const normalizeStationId = (value) => String(value || "").trim().toUpperCase()

const getLockerModel = (stationId) => {
  try {
    const conn = getStationDB(stationId)
    return conn.models.Locker || conn.model("Locker", lockerSchema)
  } catch {
    return null
  }
}

const getStationCreatedAt = (station) => {
  const fallbackTimestamp = station._id && typeof station._id.getTimestamp === "function"
    ? station._id.getTimestamp()
    : null

  return station.created_at || fallbackTimestamp || station.last_heartbeat_at || null
}

const toDateKey = (date) => {
  const value = new Date(date)
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
}

const formatChartLabel = (date) => {
  const value = new Date(date)
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(value)
}

router.get("/", authenticateToken, requireRole("super_admin"), async (req, res) => {
  try {
    const stations = await LockerStation.find({ status: { $ne: "deleted" } })
      .select("station_id name locker_count estimated_members notes station_db_uri status location last_heartbeat_at created_at")
      .sort({ created_at: -1, name: 1 })

    const stationRows = await Promise.all(stations.map(async (station) => {
      const Locker = getLockerModel(station.station_id)
      const [actualLockers, inUseLockers, owner] = await Promise.all([
        Locker ? Locker.countDocuments() : Promise.resolve(station.locker_count || 0),
        Locker ? Locker.countDocuments({ availability: { $ne: "available" } }) : Promise.resolve(0),
        User.findOne({ station_id: normalizeStationId(station.station_id), role: "sub_admin", status: { $ne: "disabled" } })
          .select("name")
          .lean()
      ])

      const occupancyRate = actualLockers > 0 ? Math.round((inUseLockers / actualLockers) * 100) : 0
      const createdAt = getStationCreatedAt(station)

      return {
        station_id: station.station_id,
        name: station.name,
        status: station.status,
        city: station.location?.city || "",
        district: station.location?.district || "",
        locker_count: actualLockers,
        in_use_count: inUseLockers,
        occupancy_rate: occupancyRate,
        owner_name: owner?.name || "Unassigned",
        created_at: createdAt ? createdAt.toISOString() : null,
        last_heartbeat_at: station.last_heartbeat_at || null
      }
    }))

    const activeMembers = await Membership.countDocuments({ status: "active" })
    const pendingMembers = await Membership.countDocuments({ status: "pending" })

    const totalLockers = stationRows.reduce((sum, station) => sum + station.locker_count, 0)
    const totalInUse = stationRows.reduce((sum, station) => sum + station.in_use_count, 0)
    const averageOccupancyRate = totalLockers > 0 ? Math.round((totalInUse / totalLockers) * 100) : 0

    const chartWindow = 6
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - chartWindow)

    const creationCounts = new Map()
    for (let offset = 0; offset <= chartWindow; offset += 1) {
      const current = new Date(startDate)
      current.setDate(startDate.getDate() + offset)
      creationCounts.set(toDateKey(current), 0)
    }

    stationRows.forEach((station) => {
      if (!station.created_at) {
        return
      }

      const createdAt = new Date(station.created_at)
      if (Number.isNaN(createdAt.getTime()) || createdAt < startDate) {
        return
      }

      const dateKey = toDateKey(createdAt)
      if (creationCounts.has(dateKey)) {
        creationCounts.set(dateKey, creationCounts.get(dateKey) + 1)
      }
    })

    const station_creation_series = Array.from(creationCounts.entries()).map(([date, count]) => ({
      date,
      label: formatChartLabel(date),
      count
    }))

    res.status(200).json({
      message: "Overview data retrieved successfully",
      stats: {
        station_count: stationRows.length,
        locker_count: totalLockers,
        member_count: activeMembers,
        new_stations_this_week: station_creation_series.reduce((sum, day) => sum + day.count, 0)
      },
      network: {
        average_occupancy_rate: averageOccupancyRate,
        pending_memberships: pendingMembers,
        stations_with_lockers: stationRows.length
      },
      station_creation_series,
      stations: stationRows
    })
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

module.exports = router