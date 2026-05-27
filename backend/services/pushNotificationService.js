const User = require("../models/master/User")
const { admin, initializeFirebaseAdmin } = require("../config/firebaseAdmin")

const normalizeData = (data = {}) => {
  return Object.entries(data).reduce((accumulator, [key, value]) => {
    if (value === undefined || value === null) {
      return accumulator
    }

    accumulator[key] = String(value)
    return accumulator
  }, {})
}

const removeInvalidTokens = async (userId, tokens) => {
  if (!tokens.length) {
    return
  }

  await User.updateOne(
    { _id: userId },
    { $pullAll: { fcmTokens: tokens } },
  )
}

const sendPushNotification = async ({
  userId,
  topic,
  title,
  body,
  data = {},
}) => {
  if (!title || !body) {
    throw new Error("title and body are required")
  }

  initializeFirebaseAdmin()

  const messageData = normalizeData(data)

  if (topic) {
    return admin.messaging().send({
      topic,
      notification: {
        title,
        body,
      },
      data: messageData,
    })
  }

  if (!userId) {
    throw new Error("Either userId or topic must be provided")
  }

  const user = await User.findById(userId).select("fcmTokens")

  if (!user) {
    throw new Error("User not found")
  }

  const tokens = Array.isArray(user.fcmTokens)
    ? user.fcmTokens.filter((token) => typeof token === "string" && token.trim().length > 0)
    : []

  if (!tokens.length) {
    throw new Error("User has no registered FCM tokens")
  }

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title,
      body,
    },
    data: messageData,
  })

  const invalidTokens = []

  response.responses.forEach((result, index) => {
    if (!result.success) {
      const errorCode = result.error?.code || ""
      if (
        errorCode === "messaging/registration-token-not-registered" ||
        errorCode === "messaging/invalid-registration-token"
      ) {
        invalidTokens.push(tokens[index])
      }
    }
  })

  if (invalidTokens.length > 0) {
    await removeInvalidTokens(user._id, invalidTokens)
  }

  return response
}

module.exports = {
  sendPushNotification,
}