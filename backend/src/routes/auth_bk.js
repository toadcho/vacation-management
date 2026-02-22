const express = require('express');
const router = express.Router();
const { auth: firebaseAuth } = require('../config/firebase');
const { verifyFirebaseToken } = require('../middlewares/auth');
const { db } = require('../config/firebase');

/**
 * POST /api/auth/google
 * Google 로그인
 */
router.post('/google', async (req, res) => {
  try {
    console.log('📝 Google login request received');
    
    // Body 또는 Authorization 헤더에서 토큰 읽기
    let idToken = req.body.idToken;
    
    // Body에 없으면 Authorization 헤더 확인
    if (!idToken && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        idToken = authHeader.substring(7);
        console.log('🔑 Token from Authorization header');
      }
    }
    
    if (!idToken) {
      console.log('❌ No idToken provided');
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'idToken is required in body or Authorization header' 
      });
    }

    console.log('🔍 Verifying Firebase ID Token...');
    
    // Firebase ID Token 검증
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    
    console.log('✅ Token verified:', decodedToken.email);
    
    // 이메일 도메인 확인
    if (!decodedToken.email?.endsWith('@watch2.co.kr')) {
      console.log('❌ Invalid email domain:', decodedToken.email);
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Only watch2.co.kr email addresses are allowed' 
      });
    }

    // Firestore에서 사용자 확인/생성
    const userRef = db.collection('users').doc(decodedToken.email);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log('💡 Creating new user:', decodedToken.email);
      
      const newUser = {
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email.split('@')[0],
        role: 'user',
        department: '',
        totalLeave: 15,
        usedLeave: 0,
        remainingLeave: 15,
        isActive: true,
        syncedFromGoogle: false,
        createdAt: new Date(),
        createdBy: 'google_login'
      };
      
      await userRef.set(newUser);
      console.log('✅ New user created');
    }

    console.log('✅ Login successful:', decodedToken.email);
    
    res.json({
      success: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
        picture: decodedToken.picture
      },
      token: idToken
    });
    
  } catch (error) {
    console.error('❌ Google login error:', error);
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid or expired token',
      details: error.message
    });
  }
});

/**
 * GET /api/auth/me
 * 현재 로그인한 사용자 정보 조회
 */
router.get('/me', verifyFirebaseToken, async (req, res, next) => {
  try {
    const userEmail = req.user.email;
    
    console.log('🔍 사용자 정보 조회:', userEmail);
    
    // ✅ 이메일을 문서 ID로 사용
    const userRef = db.collection('users').doc(userEmail);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log('❌ Firestore에 사용자 없음:', userEmail);
      console.log('💡 신규 사용자 생성');
      
      // ✅ 이메일을 문서 ID로 생성
      const defaultUser = {
        email: userEmail,
        name: req.user.name || userEmail.split('@')[0],
        role: 'user',
        department: '',
        totalLeave: 15,
        usedLeave: 0,
        remainingLeave: 15,
        isActive: true,
        syncedFromGoogle: false,
        createdAt: new Date(),
        createdBy: 'auto_login'
      };
      
      await userRef.set(defaultUser);
      console.log('✅ 사용자 생성 (문서 ID: 이메일):', userEmail);
      
      return res.json({
        success: true,
        user: {
          uid: req.user.uid,
          email: userEmail,
          name: defaultUser.name,
          role: defaultUser.role,
          department: defaultUser.department,
          totalLeave: defaultUser.totalLeave,
          usedLeave: defaultUser.usedLeave,
          remainingLeave: defaultUser.remainingLeave
        }
      });
    }

    const userData = userDoc.data();
    
    console.log('✅ 사용자 정보:', {
      email: userEmail,
      role: userData.role,
      syncedFromGoogle: userData.syncedFromGoogle
    });

    res.json({
      success: true,
      user: {
        uid: req.user.uid,
        email: userEmail,
        name: userData.name || userEmail.split('@')[0],
        role: userData.role || 'user',
        department: userData.department || '',
        totalLeave: userData.totalLeave || 15,
        usedLeave: userData.usedLeave || 0,
        remainingLeave: userData.remainingLeave || 15
      }
    });
  } catch (error) {
    console.error('❌ Get me error:', error);
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * 로그아웃
 */
router.post('/logout', (req, res) => {
  console.log('👋 Logout request');
  res.json({ 
    success: true,
    message: 'Logout successful' 
  });
});

module.exports = router;