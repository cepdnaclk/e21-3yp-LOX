const express = require("express")

const { getStationDB } = require("../config/stationDB")
const lockerSchema = require("../models/station/Locker")
const stationMemberSchema = require("../models/station/StationMember")
const { scheduleAutoReleaseJob } = require("../config/agenda")
const { sendToUser, sendPushNotification } = require("../services/pushNotificationService")
const { getOrCreateSettings } = require("../utils/Overduechecker")

const router = express.Router()

const notifyUser = sendToUser || ((userId, title, body) =>
  sendPushNotification({ userId, title, body }))

const getLockerModel = (stationId) => {
  const conn = getStationDB(stationId)
  return conn.models.Locker || conn.model("Locker", lockerSchema)
}

const getStationMemberModel = (stationId) => {
  const conn = getStationDB(stationId)
  return conn.models.StationMember || conn.model("StationMember", stationMemberSchema)
}

const verifyMembership = async (stationId, userId) => {
  const StationMember = getStationMemberModel(stationId)
  return StationMember.findOne({ user_id: userId, local_status: "active" })
}

const isLockerPaymentRequired = async (stationId, locker) => {
  if (locker.payment_status === "paid") {
    return false
  }

  if (locker.availability === "overdue" || locker.overdue_at) {
    return true
  }

  const settings = await getOrCreateSettings(stationId)
  if (!settings.free_minutes || settings.free_minutes === 0 || !locker.reserved_at) {
    return false
  }

  const expiresAt = new Date(locker.reserved_at.getTime() + settings.free_minutes * 60 * 1000)
  return Date.now() >= expiresAt.getTime()
}

router.post("/mock-checkout", async (req, res) => {
  try {
    const { station_id, user_id, locker_id, amount } = req.body

    if (!station_id || !user_id || !locker_id) {
      return res.status(400).json({ message: "station_id, user_id and locker_id are required" })
    }

    const member = await verifyMembership(station_id, user_id)
    if (!member) {
      return res.status(403).json({ message: "Access denied. You are not an active member of this station." })
    }

    const Locker = getLockerModel(station_id)
    const locker = await Locker.findOne({ locker_id })

    if (!locker) {
      return res.status(404).json({ message: `Locker ${locker_id} not found` })
    }

    if (!locker.reserved_by || locker.reserved_by.toString() !== user_id.toString()) {
      return res.status(403).json({ message: "You can only pay for your own reserved locker" })
    }

    const paymentRequired = await isLockerPaymentRequired(station_id, locker)
    if (!paymentRequired) {
      return res.status(400).json({
        message: `Locker ${locker_id} is not overdue. Current availability: ${locker.availability}`
      })
    }

    if (locker.payment_status === "paid") {
      return res.status(400).json({
        message: "Payment has already been completed for this locker.",
        grace_period_expires_at: locker.grace_period_expires_at
      })
    }

    const paymentAmount = Number.isFinite(Number(amount)) ? Number(amount) : 5
    const paidAt = new Date()
    const gracePeriodExpiresAt = new Date(paidAt.getTime() + 30 * 60 * 1000)

    locker.payment_status = "paid"
    locker.payment_reference = `MOCK-${station_id}-${locker_id}-${paidAt.getTime()}`
    locker.payment_amount = paymentAmount
    locker.payment_paid_at = paidAt
    locker.grace_period_expires_at = gracePeriodExpiresAt
    locker.release_requested = false
    locker.release_requested_at = null
    if (locker.availability === "reserved" || locker.availability === "unavailable") {
      locker.availability = "unavailable"
    }
    await locker.save()

    await scheduleAutoReleaseJob({
      stationId: station_id,
      lockerId: locker_id,
      gracePeriodExpiresAt,
      userId: user_id
    })

    notifyUser(
      user_id,
      "Payment done",
      "Payment done. You have 30 minutes to retrieve your items."
    ).catch((error) => {
      console.error("Failed to send payment notification:", error.message)
    })

    res.status(200).json({
      message: "Mock payment completed successfully",
      gateway: "mock_sandbox",
      payment_status: locker.payment_status,
      payment_amount: locker.payment_amount,
      grace_period_expires_at: locker.grace_period_expires_at,
      locker: {
        locker_id: locker.locker_id,
        availability: locker.availability,
        payment_status: locker.payment_status,
        payment_amount: locker.payment_amount,
        grace_period_expires_at: locker.grace_period_expires_at
      }
    })
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

module.exports = router