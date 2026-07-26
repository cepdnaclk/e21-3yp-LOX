const express = require('express');
const router = express.Router();

let mockKeys = [];

// GET /activation-keys
router.get('/', (req, res) => {
  res.json({ success: true, activationKeys: mockKeys });
});

// POST /activation-keys
router.post('/', (req, res) => {
  const { label, key } = req.body || {};
  const newKey = {
    _id: 'mock_key_' + Math.random().toString(36).substring(2, 9),
    label: label || 'Unnamed Key',
    key: key || 'LOXA-MOCK-KEY-1234',
    isUsed: false,
    usedAt: null,
    usedBy: null,
    usedForLocker: null,
    createdAt: new Date().toISOString()
  };
  mockKeys.push(newKey);
  res.status(201).json({ success: true, activationKey: newKey });
});

// DELETE /activation-keys/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  mockKeys = mockKeys.filter(k => k._id !== id);
  res.json({ success: true, message: 'Key deleted' });
});

module.exports = router;
