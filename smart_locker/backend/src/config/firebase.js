const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

function getServiceAccount() {
  // 1. Try loading from Base64 Environment Variable (Recommended for EC2)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
      const decodedJson = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
      return JSON.parse(decodedJson);
    } catch (err) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable:', err.message);
    }
  }

  // 2. Fallback to local JSON file
  const fileName = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 'lox-backup-firebase-firebase-adminsdk-fbsvc-8d4bbe8aab.json';
  const serviceAccountPath = path.isAbsolute(fileName) 
    ? fileName 
    : path.resolve(__dirname, '../../', fileName);

  if (fs.existsSync(serviceAccountPath)) {
    try {
      return require(serviceAccountPath);
    } catch (err) {
      console.error('Failed to read local service account JSON file:', err.message);
    }
  }

  return null;
}

function initializeFirebase() {
  const serviceAccount = getServiceAccount();

  if (serviceAccount) {
    try {
      admin.initializeApp({
        credential: admin.cert(serviceAccount)
      });
      console.log('Firebase Admin SDK initialized successfully.');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error.message);
    }
  } else {
    console.warn('Firebase Service Account credential not found. Neither FIREBASE_SERVICE_ACCOUNT_BASE64 nor a valid local JSON file is available.');
  }
}

module.exports = {
  initializeFirebase
};

