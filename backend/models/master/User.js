const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  email:         { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  role:          { type: String, default: "USER" },
  fcmTokens:     { type: [String], default: [] },
  trusted_devices: {
    type: [
      {
        key_id: { type: String, required: true },
        public_key: { type: String, required: true },
        created_at: { type: Date, default: Date.now }
      }
    ],
    default: []
  },
  created_at:    { type: Date, default: Date.now }
})

module.exports = mongoose.model("User", userSchema)
