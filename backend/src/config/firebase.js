const admin = require('firebase-admin');
const path = require('path');

// 서비스 계정 키 경로
const serviceAccountPath = path.join(
  __dirname, 
  '../../credentials/serviceAccountKey.json'
);

// Firebase Admin 초기화
try {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath))
  });

  console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  process.exit(1);
}

// Firestore 인스턴스
const db = admin.firestore();

// 한국 시간대 설정
db.settings({ 
  timestampsInSnapshots: true,
  ignoreUndefinedProperties: true
});

// Auth 인스턴스
const auth = admin.auth();

module.exports = { admin, db, auth };