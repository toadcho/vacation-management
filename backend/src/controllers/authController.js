const { db, auth } = require('../config/firebase');
const admin = require('firebase-admin');

// Google 로그인 (Firebase ID Token으로 사용자 생성/조회)
exports.googleLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }

    // Firebase ID Token 검증
    const decodedToken = await auth.verifyIdToken(idToken);
    const { uid, email, name } = decodedToken;

    // watch2.co.kr 도메인 확인
    if (!email.endsWith('@watch2.co.kr')) {
      return res.status(403).json({ 
        error: 'Only watch2.co.kr email addresses are allowed' 
      });
    }

    // Firestore에서 사용자 찾기 또는 생성
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // 새 사용자 생성
      const newUser = {
        uid,
        email,
        name: name || email.split('@')[0],
        department: '미지정',
        role: 'user',
        totalLeave: 15.0,
        usedLeave: 0.0,
        remainingLeave: 15.0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await userRef.set(newUser);

      return res.status(201).json({
        message: 'User created successfully',
        user: newUser
      });
    }

    // 기존 사용자 정보 반환
    const userData = userDoc.data();
    
    // 마지막 로그인 시간 업데이트
    await userRef.update({
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({
      message: 'Login successful',
      user: userData
    });

  } catch (error) {
    console.error('Google login error:', error);
    next(error);
  }
};

// 현재 사용자 정보 조회
exports.getCurrentUser = async (req, res, next) => {
  try {
    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: userDoc.data()
    });

  } catch (error) {
    console.error('Get current user error:', error);
    next(error);
  }
};

// 로그아웃
exports.logout = async (req, res) => {
  // Firebase는 클라이언트에서 토큰을 삭제하면 됨
  res.json({ message: 'Logout successful' });
};
