const bcrypt = require('bcryptjs');
const Station = require('../models/Station');
const Locker = require('../models/Locker');
const User = require('../models/User');
const { seedProducts } = require('./productService');
const { Roles } = require('../constants/enums');
const { env } = require('../config/env');
const { subscribeLockerState } = require('./mqttService');

async function upsertUser({ name, email, password, role, stationIds }) {
  if (!name || !email || !password) {
    return;
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role,
    stationIds
  });
}

 async function seedSampleData() {
  let station = await Station.findOne({ code: 'ST001' });
  if (!station) {
    station = await Station.create({
      name: 'Default Station',
      code: 'ST001',
      timezone: 'Asia/Colombo',
      schedule: { enabled: true, openTime: '08:00', closeTime: '20:00' }
    });
  }

  // Remove L3 and L4 if they exist in the database
  await Locker.deleteMany({ code: { $in: ['L3', 'L4'] } });

  // Seed L1
  let locker = await Locker.findOne({ code: 'L1' });
  if (!locker) {
    locker = await Locker.create({
      stationId: station._id,
      code: 'L1',
      controlTopic: env.defaultControlTopic || 'locker/L1/control',
      stateTopic: env.defaultStateTopic || 'locker/L1/state',
      doorTopic: env.defaultDoorTopic || 'locker/L1/door',
      securityTopic: 'locker/L1/security'
    });
  } else {
    let modified = false;
    if (!locker.doorTopic) { locker.doorTopic = env.defaultDoorTopic || 'locker/L1/door'; modified = true; }
    if (!locker.securityTopic) { locker.securityTopic = 'locker/L1/security'; modified = true; }
    if (modified) await locker.save();
  }
  await subscribeLockerState(locker);

  // Seed L2
  let locker2 = await Locker.findOne({ code: 'L2' });
  if (!locker2) {
    locker2 = await Locker.create({
      stationId: station._id,
      code: 'L2',
      controlTopic: 'locker/L2/control',
      stateTopic: 'locker/L2/state',
      doorTopic: 'locker/L2/door',
      securityTopic: 'locker/L2/security'
    });
  } else {
    let modified = false;
    if (!locker2.doorTopic) { locker2.doorTopic = 'locker/L2/door'; modified = true; }
    if (!locker2.securityTopic) { locker2.securityTopic = 'locker/L2/security'; modified = true; }
    if (modified) await locker2.save();
  }
  await subscribeLockerState(locker2);

  if (!env.seedSampleData) {
    return;
  }

  await upsertUser({
    name: env.sampleUsers.superAdmin.name,
    email: env.sampleUsers.superAdmin.email,
    password: env.sampleUsers.superAdmin.password,
    role: Roles.SUPER_ADMIN,
    stationIds: []
  });

  await upsertUser({
    name: env.sampleUsers.subAdmin.name,
    email: env.sampleUsers.subAdmin.email,
    password: env.sampleUsers.subAdmin.password,
    role: Roles.SUB_ADMIN,
    stationIds: [station._id]
  });

  await upsertUser({
    name: env.sampleUsers.user.name,
    email: env.sampleUsers.user.email,
    password: env.sampleUsers.user.password,
    role: Roles.USER,
    stationIds: [station._id]
  });

  await seedProducts();

  console.log('Sample data seeded into database');
}

module.exports = {
  seedSampleData
};
