const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the backend's .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { env } = require('../src/config/env');
const Locker = require('../src/models/Locker');
const Station = require('../src/models/Station');
const User = require('../src/models/User');
const { initializeFirebase } = require('../src/config/firebase');
const { sendPushNotification } = require('../src/services/notificationService');
const { publishLockerBookingStatus } = require('../src/services/mqttService');

async function run() {
  console.log('Initializing Firebase...');
  initializeFirebase();

  console.log('Connecting to database...');
  const dbStart = performance.now();
  await mongoose.connect(env.mongoUri);
  console.log(`Database connected in ${(performance.now() - dbStart).toFixed(2)}ms`);

  const locker = await Locker.findOne({ code: 'L1' });
  if (!locker) {
    console.error('Locker L1 not found');
    process.exit(1);
  }
  console.log(`Found locker: ${locker._id}`);

  // 1. Measure Locker.findById 5 times
  for (let i = 1; i <= 5; i++) {
    const t1 = performance.now();
    const l = await Locker.findById(locker._id);
    console.log(`Locker.findById iteration ${i} took ${(performance.now() - t1).toFixed(2)}ms`);
  }

  // 2. Measure Station.findById
  const t2 = performance.now();
  const s = await Station.findById(locker.stationId);
  console.log(`Station.findById took ${(performance.now() - t2).toFixed(2)}ms`);

  // 3. Measure publishLockerBookingStatus (MQTT publish)
  const t3 = performance.now();
  await publishLockerBookingStatus(l);
  console.log(`publishLockerBookingStatus took ${(performance.now() - t3).toFixed(2)}ms`);

  // 4. Measure sendPushNotification (with await)
  const user = await User.findOne({ role: 'USER' });
  if (user) {
    console.log(`Test user fcmToken: ${user.fcmToken ? 'Yes' : 'No'}`);
    
    const t4 = performance.now();
    await sendPushNotification(user._id, 'Test Notification', 'Hello', { type: 'TEST' });
    console.log(`sendPushNotification (awaited) took ${(performance.now() - t4).toFixed(2)}ms`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
