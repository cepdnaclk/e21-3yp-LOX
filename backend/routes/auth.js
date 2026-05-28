const express = require("express")
const bcrypt = require("bcrypt")
const crypto = require("crypto")
const jwt = require("jsonwebtoken")

const User = require("../models/master/User")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

const otpChallenges = new Map()

const OTP_TTL_MS = 5 * 60 * 1000
const BIOMETRIC_PAYLOAD_TTL_MS = 2 * 60 * 1000

const signLoginToken = (user) => {
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured")
  }

  return jwt.sign(
    {
      user_id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role || "USER"
    },
    jwtSecret,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  )
}

const verifySignatureWithJwk = ({ publicJwkString, payload, signatureBase64 }) => {
  const parsed = JSON.parse(publicJwkString)
  const publicKey = crypto.createPublicKey({
    key: parsed,
    format: "jwk"
  })

  return crypto.verify(
    "RSA-SHA256",
    Buffer.from(payload, "utf8"),
    publicKey,
    Buffer.from(signatureBase64, "base64")
  )
}

const isDeviceSignatureValid = ({ trustedDevices, payload, signature }) => {
  for (const device of trustedDevices || []) {
    try {
      const valid = verifySignatureWithJwk({
        publicJwkString: device.public_key,
        payload,
        signatureBase64: signature
      })
      if (valid) {
        return true
      }
    } catch {
      // Continue checking other registered devices.
    }
  }
  return false
}

const verifyPasswordViaAzureOrLocal = async ({ user, password }) => {
  const useMock = (process.env.AZURE_B2C_MOCK || "true").toLowerCase() === "true"

  if (useMock) {
    return bcrypt.compare(password, user.password_hash)
  }

  const tenant = process.env.AZURE_B2C_TENANT
  const policy = process.env.AZURE_B2C_POLICY
  const clientId = process.env.AZURE_B2C_CLIENT_ID

  if (!tenant || !policy || !clientId) {
    throw new Error("Azure AD B2C env vars are incomplete")
  }

  const tokenEndpoint =
    `https://${tenant}.b2clogin.com/${tenant}.onmicrosoft.com/${policy}/oauth2/v2.0/token`

  const formData = new URLSearchParams({
    grant_type: "password",
    client_id: clientId,
    scope: `openid ${clientId} offline_access`,
    username: user.email,
    password
  })

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString()
  })

  return response.ok
}

const cleanupExpiredChallenges = () => {
  const now = Date.now()
  for (const [txId, challenge] of otpChallenges.entries()) {
    if (challenge.expiresAt <= now) {
      otpChallenges.delete(txId)
    }
  }
}

const parseAndValidateRsaJwk = (devicePublicKey) => {
  let parsedKey
  try {
    parsedKey = JSON.parse(devicePublicKey)
    if (!parsedKey.kty || !parsedKey.n || !parsedKey.e) {
      throw new Error("Invalid key format")
    }
  } catch {
    return null
  }
  return parsedKey
}

const addTrustedDeviceKeyIfMissing = async ({ user, devicePublicKey }) => {
  const existing = (user.trusted_devices || []).find(
    (entry) => entry.public_key === devicePublicKey
  )

  if (existing) {
    return existing.key_id
  }

  const keyId = crypto.randomUUID()
  user.trusted_devices.push({
    key_id: keyId,
    public_key: devicePublicKey,
    created_at: new Date()
  })
  await user.save()
  return keyId
}

router.post("/b2c/register-device-authenticated", authenticateToken, async (req, res) => {
  try {
    const { userId, devicePublicKey } = req.body

    if (!userId || !devicePublicKey) {
      return res.status(400).json({ message: "userId and devicePublicKey are required" })
    }

    if (req.user.user_id !== userId) {
      return res.status(403).json({ message: "Token user does not match target user" })
    }

    const parsed = parseAndValidateRsaJwk(devicePublicKey)
    if (!parsed) {
      return res.status(400).json({ message: "devicePublicKey must be a valid RSA JWK string" })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const keyId = await addTrustedDeviceKeyIfMissing({ user, devicePublicKey })

    return res.status(201).json({
      message: "Device registered successfully",
      keyId,
      userId: user._id
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
})

router.post("/b2c/find-account", async (req, res) => {
  try {
    cleanupExpiredChallenges()

    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ message: "Account not found" })
    }

    const passwordValid = await verifyPasswordViaAzureOrLocal({ user, password })
    if (!passwordValid) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    const transactionId = crypto.randomUUID()
    const otp = (Math.floor(100000 + Math.random() * 900000)).toString()

    otpChallenges.set(transactionId, {
      userId: user._id.toString(),
      otp,
      verified: false,
      expiresAt: Date.now() + OTP_TTL_MS
    })

    return res.status(200).json({
      message: "OTP sent via Azure AD B2C",
      transactionId,
      userId: user._id,
      userName: user.name,
      debugOtp: process.env.NODE_ENV === "production" ? undefined : otp
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
})

router.post("/b2c/verify-otp", async (req, res) => {
  try {
    cleanupExpiredChallenges()

    const { transactionId, otp } = req.body

    if (!transactionId || !otp) {
      return res.status(400).json({ message: "transactionId and otp are required" })
    }

    const challenge = otpChallenges.get(transactionId)
    if (!challenge) {
      return res.status(400).json({ message: "OTP transaction expired or invalid" })
    }

    if (challenge.otp !== otp) {
      return res.status(401).json({ message: "Invalid OTP" })
    }

    challenge.verified = true
    otpChallenges.set(transactionId, challenge)

    const user = await User.findById(challenge.userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const token = signLoginToken(user)

    return res.status(200).json({
      message: "OTP verified",
      token,
      user: {
        user_id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "USER",
        created_at: user.created_at
      }
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
})

router.post("/b2c/register-device", async (req, res) => {
  try {
    cleanupExpiredChallenges()

    const { transactionId, otp, userId, devicePublicKey } = req.body

    if (!transactionId || !otp || !userId || !devicePublicKey) {
      return res.status(400).json({
        message: "transactionId, otp, userId and devicePublicKey are required"
      })
    }

    const challenge = otpChallenges.get(transactionId)
    if (!challenge || challenge.userId !== userId) {
      return res.status(401).json({ message: "Invalid device registration transaction" })
    }

    if (!challenge.verified || challenge.otp !== otp) {
      return res.status(401).json({ message: "OTP verification required before device registration" })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const parsedKey = parseAndValidateRsaJwk(devicePublicKey)
    if (!parsedKey) {
      return res.status(400).json({ message: "devicePublicKey must be a valid RSA JWK string" })
    }

    const keyId = await addTrustedDeviceKeyIfMissing({ user, devicePublicKey })

    otpChallenges.delete(transactionId)

    return res.status(201).json({
      message: "Device registered successfully",
      keyId,
      userId: user._id
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
})

router.post("/b2c/device-login", async (req, res) => {
  try {
    const { userId, password, deviceSignature } = req.body

    if (!userId || !password || !deviceSignature) {
      return res.status(400).json({
        message: "userId, password and deviceSignature are required"
      })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    const payload = `${userId}:${password}`
    const signatureValid = isDeviceSignatureValid({
      trustedDevices: user.trusted_devices,
      payload,
      signature: deviceSignature
    })

    if (!signatureValid) {
      return res.status(401).json({ message: "Invalid device signature" })
    }

    const passwordValid = await verifyPasswordViaAzureOrLocal({ user, password })
    if (!passwordValid) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    const token = signLoginToken(user)

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        user_id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "USER",
        created_at: user.created_at
      }
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
})

router.post("/b2c/device-login-biometric", async (req, res) => {
  try {
    const { userId, signedPayload, deviceSignature } = req.body

    if (!userId || !signedPayload || !deviceSignature) {
      return res.status(400).json({
        message: "userId, signedPayload and deviceSignature are required"
      })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    const parts = signedPayload.split(":")
    if (parts.length !== 3 || parts[0] !== userId || parts[1] !== "biometric") {
      return res.status(401).json({ message: "Invalid biometric payload" })
    }

    const timestamp = Number(parts[2])
    if (!Number.isFinite(timestamp)) {
      return res.status(401).json({ message: "Invalid biometric payload timestamp" })
    }

    if (Math.abs(Date.now() - timestamp) > BIOMETRIC_PAYLOAD_TTL_MS) {
      return res.status(401).json({ message: "Biometric payload expired" })
    }

    const signatureValid = isDeviceSignatureValid({
      trustedDevices: user.trusted_devices,
      payload: signedPayload,
      signature: deviceSignature
    })

    if (!signatureValid) {
      return res.status(401).json({ message: "Invalid device signature" })
    }

    const token = signLoginToken(user)

    return res.status(200).json({
      message: "Biometric login successful",
      token,
      user: {
        user_id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "USER",
        created_at: user.created_at
      }
    })
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message })
  }
})

module.exports = router
