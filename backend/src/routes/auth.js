const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middlewares/auth');
const { db } = require('../config/firebase');

/**
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

module.exports = router;