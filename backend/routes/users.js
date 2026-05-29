const express = require("express")
const router = express.Router()
const User = require("../models/master/User")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const { authenticateToken } = require("../middleware/auth")
const { sendOtpEmail } = require("../services/emailService")

const signLoginToken = (user) => {
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured")
  }

  return jwt.sign(
    {
      user_id: user._id.toString(),
      email:   user.email,
      name:    user.name,
      role:    user.role || "USER"
    },
    jwtSecret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    }
  )
}

const OTP_TTL_MS = 5 * 60 * 1000

const generateLoginOtp = () => crypto.randomInt(100000, 1000000).toString()

// GET /api/users
// Get all users with id, name, email
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("_id name email created_at")

    res.status(200).json({
      message: "Users retrieved successfully",
      count:   users.length,
      users:   users.map((u) => ({
        user_id:    u._id,
        name:       u.name,
        email:      u.email,
        role:       u.role || "USER",
        created_at: u.created_at
      }))
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// POST /api/users/add
router.post("/add", async (req, res) => {
  try {
    const { name, email, password, devicePublicKey } = req.body

    // Check all fields are provided
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" })
    }

    // Check if email already exists
    const existing = await User.findOne({ email })
    if (existing) {
      return res.status(400).json({ message: "Email already exists" })
    }

    // Hash the password
    const password_hash = await bcrypt.hash(password, 10)

    let trustedDevices = []
    if (devicePublicKey) {
      try {
        const parsed = JSON.parse(devicePublicKey)
        if (!parsed.kty || !parsed.n || !parsed.e) {
          return res.status(400).json({ message: "devicePublicKey must be a valid RSA JWK string" })
        }

        trustedDevices = [{
          key_id: crypto.randomUUID(),
          public_key: devicePublicKey,
          created_at: new Date()
        }]
      } catch {
        return res.status(400).json({ message: "devicePublicKey must be a valid RSA JWK string" })
      }
    }

    // Create the user
    const user = await User.create({
      name,
      email,
      password_hash,
      trusted_devices: trustedDevices
    })

    res.status(201).json({
      message: "User added successfully",
      user: {
        id:         user._id,
        name:       user.name,
        email:      user.email,
        role:       user.role || "USER",
        created_at: user.created_at
      }
    })

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// POST /api/users/login
router.post("/login", async (req, res) => {
  try {
    const { email, password, key_id } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash)
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    const isRecognizedDevice = Boolean(
      key_id &&
      Array.isArray(user.trusted_devices) &&
      user.trusted_devices.some((device) => device && device.key_id === key_id)
    )

    if (!isRecognizedDevice) {
      const otp = generateLoginOtp()

      user.login_otp = otp
      user.login_otp_expires_at = new Date(Date.now() + OTP_TTL_MS)
      await user.save()

      console.log("[login] AZURE_ACS_CONNECTION_STRING:", process.env.AZURE_ACS_CONNECTION_STRING ? "defined" : "undefined")
      console.log("[login] AZURE_SENDER_EMAIL:", process.env.AZURE_SENDER_EMAIL ? "defined" : "undefined")

      try {
        await sendOtpEmail(user.email, otp)
      } catch (emailError) {
        console.error("============================================================")
        console.error("[sendOtpEmail] emailError.message:", emailError?.message)
        console.error("[sendOtpEmail] emailError.stack:", emailError?.stack)
        console.error("[sendOtpEmail] emailError JSON:", JSON.stringify(emailError, null, 2))

        return res.status(500).json({
          message: "DEBUG_EMAIL_FAILED",
          error: emailError?.message
        })
      }

      return res.status(403).json({ message: "UNRECOGNIZED_DEVICE" })
    }

    user.login_otp = null
    user.login_otp_expires_at = null
    await user.save()

    let token
    try {
      token = signLoginToken(user)
    } catch (err) {
      return res.status(500).json({ message: err.message })
    }

    res.status(200).json({
      message: "Login successful",
      token,
      token_type: "Bearer",
      expires_in: process.env.JWT_EXPIRES_IN || "7d",
      user: {
        user_id:    user._id,
        name:       user.name,
        email:      user.email,
        role:       user.role || "USER",
        created_at: user.created_at
      }
    })
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

// POST /api/users/verify-device
router.post("/verify-device", async (req, res) => {
  try {
    const { email, otpCode, key_id, public_key } = req.body

    if (!email || !otpCode || !key_id || !public_key) {
      return res.status(400).json({ message: "email, otpCode, key_id and public_key are required" })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const otpMatches = user.login_otp === otpCode
    const otpIsValid = user.login_otp_expires_at && user.login_otp_expires_at > new Date()

    if (!otpMatches || !otpIsValid) {
      return res.status(400).json({ message: "Invalid or expired OTP" })
    }

    user.trusted_devices.push({
      key_id,
      public_key,
      created_at: new Date()
    })
    user.login_otp = null
    user.login_otp_expires_at = null
    await user.save()

    let token
    try {
      token = signLoginToken(user)
    } catch (err) {
      return res.status(500).json({ message: err.message })
    }

    return res.status(200).json({
      message: "Login successful",
      token,
      token_type: "Bearer",
      expires_in: process.env.JWT_EXPIRES_IN || "7d",
      user: {
        user_id:    user._id,
        name:       user.name,
        email:      user.email,
        role:       user.role || "USER",
        created_at: user.created_at
      }
    })
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message })
  }
})

// GET /api/users/me
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.user_id).select("_id name email created_at")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.status(200).json({
      message: "Current user retrieved successfully",
      user: {
        user_id:    user._id,
        name:       user.name,
        email:      user.email,
        role:       user.role || "USER",
        created_at: user.created_at
      }
    })
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
})

module.exports = router