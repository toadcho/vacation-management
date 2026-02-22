const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Firebase 초기화
const { db } = require('./config/firebase');

const app = express();

// 1. 미들웨어
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 요청 로깅
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 헬스 체크
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Vacation Management API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Firebase 연결 테스트
app.get('/api/test/firebase', async (req, res) => {
  try {
    const testRef = db.collection('_test').doc('connection');
    await testRef.set({
      message: 'Firebase connection test',
      timestamp: new Date()
    });
    
    const doc = await testRef.get();
    
    res.json({
      success: true,
      message: 'Firebase Firestore connected',
      data: doc.data()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 2. API 라우트
app.use('/api/auth', require('./routes/auth'));
console.log('✅ Auth routes registered at /api/auth'); // 삭제 예정
app.use('/api/vacations', require('./routes/vacations'));
app.use('/api/admin', require('./routes/admin'));


// 모든 요청 로깅 - 삭제 예정
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url} - Headers:`, req.headers);
  next();
});


// 3. 404 핸들러
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// 에러 핸들러
app.use(require('./middlewares/errorHandler'));

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║   🚀 Vacation Management API Server               ║
║                                                    ║
║ Port: ${PORT}                                      ║
║ Environment: ${process.env.NODE_ENV || 'development'}                      ║
║ URL: http://localhost:${PORT}                       ║
╚════════════════════════════════════════════════════╝

📚 Available Endpoints:
   GET  /api/health
   GET  /api/test/firebase
   
   POST /api/auth/google
   GET  /api/auth/me
   
   POST   /api/vacations
   GET    /api/vacations
   GET    /api/vacations/:id
   DELETE /api/vacations/:id
   
   GET  /api/admin/vacations
   POST /api/admin/vacations/:id/approve
   POST /api/admin/vacations/:id/reject
   GET  /api/admin/statistics
   GET  /api/admin/users/statistics
  `);
});

module.exports = app;
