const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyFirebaseToken, isAdmin } = require('../middlewares/auth');

// ✅ 모든 admin 라우트에 인증 + 관리자 권한 적용
router.use(verifyFirebaseToken, isAdmin);

// 휴가 관리
router.get('/vacations', adminController.getAllVacations);
router.post('/vacations/:id/approve', adminController.approveVacation);
router.post('/vacations/:id/reject', adminController.rejectVacation);

// 통계
router.get('/statistics', adminController.getStatistics);
router.get('/users/statistics', adminController.getUserStatistics);

// ✅ 직원 관리 (읽기 + 수정만, 신규등록/삭제 없음)
router.get('/users', adminController.getAllUsers);
router.put('/users/:userId', adminController.updateUser);

// ✅ Google Workspace 동기화
router.get('/google/users', adminController.getGoogleUsers);
router.post('/google/sync', adminController.syncGoogleUsers);

module.exports = router;