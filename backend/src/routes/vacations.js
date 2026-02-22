const express = require('express');
const router = express.Router();
const vacationController = require('../controllers/vacationController');
const { verifyFirebaseToken } = require('../middlewares/auth');

// 모든 라우트에 인증 필요
router.use(verifyFirebaseToken);

// 휴가 신청
router.post('/', vacationController.createVacation);

// 내 휴가 목록
router.get('/', vacationController.getMyVacations);

// 특정 휴가 조회
router.get('/:id', vacationController.getVacation);

// 휴가 수정
router.put('/:id', vacationController.updateVacation);

// 휴가 취소
router.delete('/:id', vacationController.cancelVacation);

module.exports = router;