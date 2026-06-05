const Agenda = require("agenda")

const { getStationDB } = require("./stationDB")
const lockerSchema = require("../models/station/Locker")
const { processNextInQueue } = require("../utils/queueProcessor")
const { sendToUser, sendPushNotification } = require("../services/pushNotificationService")

const notifyUser = sendToUser || ((userId, title, body) =>
  sendPushNotification({ userId, title, body }))

const JOB_NAME = "auto-release-overdue-locker"

let agendaInstance = null
let agendaStartPromise = null

const getLockerModel = (stationId) => {
  const conn = getStationDB(stationId)
  return conn.models.Locker || conn.model("Locker", lockerSchema)
}

const getPublishCommand = () => {
  if (!process.env.MQTT_SERVER) {
    return async () => {
      throw new Error("MQTT disabled")
    }
  }

  return require("../services/mqttService").publishCommand
}

const buildAgenda = () => {
  if (agendaInstance) {
    return agendaInstance
  }

  if (!process.env.MASTER_DB_URI) {
    throw new Error("MASTER_DB_URI is required for Agenda initialization")
  }

  agendaInstance = new Agenda({
    db: {
      address: process.env.MASTER_DB_URI,
      collection: "agendaJobs"
    },
    processEvery: "30 seconds"
  })

  agendaInstance.define(JOB_NAME, async (job) => {
    const { stationId, lockerId, gracePeriodExpiresAt, userId } = job.attrs.data || {}

    if (!stationId || !lockerId) {
      return
    }

    const Locker = getLockerModel(stationId)
    const locker = await Locker.findOne({ locker_id: lockerId })

    if (!locker) {
      return
    }

    const expectedExpiry = gracePeriodExpiresAt ? new Date(gracePeriodExpiresAt).getTime() : null
    const actualExpiry = locker.grace_period_expires_at ? new Date(locker.grace_period_expires_at).getTime() : null

    if (locker.payment_status !== "paid" || expectedExpiry !== actualExpiry) {
      return
    }

    const reservedBy = locker.reserved_by?.toString() || userId || null

    locker.reserved_by = null
    locker.reserved_at = null
    locker.overdue_at = null
    locker.payment_status = "unpaid"
    locker.payment_reference = null
    locker.payment_amount = null
    locker.payment_paid_at = null
    locker.grace_period_expires_at = null
    locker.release_requested = false
    locker.release_requested_at = null
    locker.lock_state = "locked"
    locker.door_state = "closed"
    locker.state = "lock_close"
    locker.availability = "available"
    locker.last_reported_at = new Date()
    await locker.save()

    try {
      const publishCommand = getPublishCommand()
      await publishCommand(stationId, lockerId, "LOCK")
    } catch {
      // No hardware connected; the locker is still released logically.
    }

    if (reservedBy) {
      notifyUser(
        reservedBy,
        "Grace period ended",
        `Locker ${lockerId} was automatically released after the 30-minute grace period ended.`
      ).catch((error) => {
        console.error("Failed to notify user about auto-release:", error.message)
      })
    }

    await processNextInQueue(stationId, lockerId)
  })

  return agendaInstance
}

const initializeAgenda = async () => {
  if (!agendaStartPromise) {
    const agenda = buildAgenda()
    agendaStartPromise = agenda.start().then(() => {
      console.log("Agenda initialized for locker grace-period jobs")
      return agenda
    })
  }

  return agendaStartPromise
}

const scheduleAutoReleaseJob = async ({ stationId, lockerId, gracePeriodExpiresAt, userId }) => {
  const agenda = await initializeAgenda()

  await agenda.cancel({
    name: JOB_NAME,
    "data.stationId": stationId,
    "data.lockerId": lockerId
  })

  return agenda.schedule(gracePeriodExpiresAt, JOB_NAME, {
    stationId,
    lockerId,
    userId: userId || null,
    gracePeriodExpiresAt: new Date(gracePeriodExpiresAt).toISOString()
  })
}

module.exports = { initializeAgenda, scheduleAutoReleaseJob }