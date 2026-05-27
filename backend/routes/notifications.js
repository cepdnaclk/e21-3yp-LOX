const express = require("express")

const { authenticateToken } = require("../middleware/auth")
const User = require("../models/master/User")

const router = express.Router()

router.post("/register-token", authenticateToken, async (req, res) => {
  try {
    const fcmToken = req.body.fcmToken || req.body.token

    if (!fcmToken || typeof fcmToken !== "string") {
      return res.status(400).json({ message: "fcmToken is required" })
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.user_id,
      {
        $addToSet: {
          fcmTokens: fcmToken,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    ).select("_id fcmTokens")

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" })
    }

    res.status(200).json({
      message: "FCM token registered successfully",
      token_count: updatedUser.fcmTokens.length,
    })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message })
  }
})

module.exports = router