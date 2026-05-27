const fs = require("fs")
const path = require("path")

const admin = require("firebase-admin")

const getServiceAccountPath = () => {
  const configuredPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH

  if (!configuredPath) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_PATH is not configured. Set it to your downloaded Firebase service account JSON file.",
    )
  }

  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(process.cwd(), configuredPath)
}

const getServiceAccountCredentials = () => {
  const configuredJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON

  if (configuredJson) {
    return JSON.parse(configuredJson)
  }

  const serviceAccountPath = getServiceAccountPath()

  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(`Firebase service account file not found at ${serviceAccountPath}`)
  }

  return JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"))
}

const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return admin.app()
  }

  const serviceAccount = getServiceAccountCredentials()

  const app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })

  console.log("Firebase connection established")

  return app
}

module.exports = {
  admin,
  initializeFirebaseAdmin,
}