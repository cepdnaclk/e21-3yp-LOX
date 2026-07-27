const mongoose = require('mongoose');

const activationKeySchema = new mongoose.Schema(
  {
    keyHash: { type: String, required: true }, // bcrypt hash of the plaintext key
    label: { type: String, trim: true, default: '' },
    isUsed: { type: Boolean, default: false },
    usedAt: { type: Date, default: null },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    usedForLocker: { type: mongoose.Schema.Types.ObjectId, ref: 'Locker', default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ActivationKey', activationKeySchema);
