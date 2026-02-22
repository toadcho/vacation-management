const jwt = require('jsonwebtoken');
const { auth: firebaseAuth } = require('../config/firebase');
const jwtConfig = require('../config/jwt');

// Firebase ID Token 검증
exports.verifyFirebaseToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'No token provided' 
      });
    }

    // Firebase ID Token 검증
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    
    // 이메일 도메인 확인 (watch2.co.kr만 허용)
    if (!decodedToken.email?.endsWith('@watch2.co.kr')) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Only watch2.co.kr email addresses are allowed' 
      });
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name
    };

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid or expired token' 
    });
  }
};

// ✅ 관리자 권한 확인 (수정됨)
exports.isAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // ✅ Firestore에서 사용자 역할 확인 (이메일 기준)
    const { db } = require('../config/firebase');
    const userDoc = await db.collection('users').doc(req.user.email).get();  // ← email로 변경
    
    if (!userDoc.exists) {
      console.log(`❌ 관리자 체크 실패: Firestore에 사용자 없음 (${req.user.email})`);
      return res.status(404).json({ 
        error: 'User not found',
        message: 'User data not found in database'
      });
    }

    const userData = userDoc.data();
    
    console.log(`🔍 관리자 체크: ${req.user.email} → role: ${userData.role}`);
    
    if (userData.role !== 'admin') {
      console.log(`❌ 권한 거부: ${req.user.email}은(는) admin이 아님`);
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Admin access required' 
      });
    }

    // ✅ 관리자 확인됨
    req.user.role = userData.role;
    req.user.name = userData.name || req.user.name;
    
    console.log(`✅ 관리자 권한 확인: ${req.user.email}`);
    
    next();
  } catch (error) {
    console.error('❌ Admin check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ✅ 일반 사용자 인증 (옵션)
exports.requireAuth = exports.verifyFirebaseToken;