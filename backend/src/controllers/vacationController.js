const { db } = require('../config/firebase');
const admin = require('firebase-admin');

// 날짜 계산 헬퍼
const calculateDays = (startDate, endDate, timeSlot) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

  if (daysDiff === 1 && timeSlot !== '종일') {
    return 0.5;
  }
  return daysDiff;
};

// 휴가 신청
exports.createVacation = async (req, res, next) => {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 Create Vacation Request');
    
    const { title, type, startDate, endDate, timeSlot = '종일', reason } = req.body;

    if (!title || !type || !startDate || !endDate || !reason) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['title', 'type', 'startDate', 'endDate', 'reason']
      });
    }

    const days = calculateDays(startDate, endDate, timeSlot);
    const userEmail = req.user.email;
    
    const userRef = db.collection('users').doc(userEmail);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log('❌ User not found:', userEmail);
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    if (type === '연차' && userData.remainingLeave < days) {
      console.log('❌ Insufficient leave balance');
      return res.status(400).json({
        error: 'Insufficient leave balance',
        required: days,
        available: userData.remainingLeave
      });
    }

    const vacationRef = db.collection('vacations').doc();
    const vacation = {
      id: vacationRef.id,
      userId: userEmail,
      userName: userData.name,
      userEmail: userData.email,
      title,
      type,
      startDate,
      endDate,
      timeSlot,
      days,
      reason,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await vacationRef.set(vacation);
    
    console.log('✅ Vacation created:', vacationRef.id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    res.status(201).json({
      success: true,
      message: 'Vacation request created successfully',
      vacation
    });

  } catch (error) {
    console.error('❌ Create vacation error:', error);
    next(error);
  }
};

// 내 휴가 목록 조회
exports.getMyVacations = async (req, res, next) => {
  try {
    const { status, year } = req.query;
    const userEmail = req.user.email;

    let query = db.collection('vacations')
      .where('userId', '==', userEmail);

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    let vacations = [];

    snapshot.forEach(doc => {
      vacations.push({ id: doc.id, ...doc.data() });
    });

    if (year) {
      vacations = vacations.filter(v =>
        v.startDate && v.startDate.startsWith(year)
      );
    }

    vacations.sort((a, b) => {
      const dateA = a.createdAt?._seconds || 0;
      const dateB = b.createdAt?._seconds || 0;
      return dateB - dateA;
    });

    res.json({
      success: true,
      count: vacations.length,
      vacations
    });

  } catch (error) {
    console.error('❌ Get my vacations error:', error);
    next(error);
  }
};

// 특정 휴가 조회
exports.getVacation = async (req, res, next) => {
  try {
    const userEmail = req.user.email;
    
    const vacationDoc = await db.collection('vacations').doc(req.params.id).get();

    if (!vacationDoc.exists) {
      return res.status(404).json({ error: 'Vacation request not found' });
    }

    const vacation = vacationDoc.data();

    if (vacation.userId !== userEmail && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json({ 
      success: true,
      vacation: { id: vacationDoc.id, ...vacation } 
    });

  } catch (error) {
    console.error('❌ Get vacation error:', error);
    next(error);
  }
};

// 휴가 수정 (신규 추가!)
exports.updateVacation = async (req, res, next) => {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 Update Vacation Request');
    console.log('Vacation ID:', req.params.id);
    
    const userEmail = req.user.email;
    const vacationRef = db.collection('vacations').doc(req.params.id);
    const vacationDoc = await vacationRef.get();

    if (!vacationDoc.exists) {
      console.log('❌ Vacation not found');
      return res.status(404).json({ error: 'Vacation request not found' });
    }

    const vacation = vacationDoc.data();

    // 본인 확인
    if (vacation.userId !== userEmail) {
      console.log('❌ Forbidden: Not owner');
      return res.status(403).json({ error: 'You can only update your own vacation requests' });
    }

    // pending 상태만 수정 가능
    if (vacation.status !== 'pending') {
      console.log('❌ Cannot update: Status is', vacation.status);
      return res.status(400).json({
        error: 'Only pending requests can be updated',
        currentStatus: vacation.status
      });
    }

    const { title, type, startDate, endDate, timeSlot, reason } = req.body;
    
    // 수정할 필드만 포함
    const updates = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (title !== undefined) updates.title = title;
    if (type !== undefined) updates.type = type;
    if (startDate !== undefined) updates.startDate = startDate;
    if (endDate !== undefined) updates.endDate = endDate;
    if (timeSlot !== undefined) updates.timeSlot = timeSlot;
    if (reason !== undefined) updates.reason = reason;

    // 날짜가 변경되면 days 재계산
    if (startDate || endDate || timeSlot) {
      const finalStartDate = startDate || vacation.startDate;
      const finalEndDate = endDate || vacation.endDate;
      const finalTimeSlot = timeSlot || vacation.timeSlot;
      updates.days = calculateDays(finalStartDate, finalEndDate, finalTimeSlot);
    }

    // 연차 잔여 확인 (타입이 연차이고 날짜가 변경된 경우)
    if (updates.days && (type === '연차' || vacation.type === '연차')) {
      const userRef = db.collection('users').doc(userEmail);
      const userDoc = await userRef.get();
      const userData = userDoc.data();

      if (userData.remainingLeave < updates.days) {
        console.log('❌ Insufficient leave balance');
        return res.status(400).json({
          error: 'Insufficient leave balance',
          required: updates.days,
          available: userData.remainingLeave
        });
      }
    }

    await vacationRef.update(updates);
    
    console.log('✅ Vacation updated:', req.params.id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 업데이트된 데이터 반환
    const updatedDoc = await vacationRef.get();

    res.json({
      success: true,
      message: 'Vacation request updated successfully',
      vacation: { id: updatedDoc.id, ...updatedDoc.data() }
    });

  } catch (error) {
    console.error('❌ Update vacation error:', error);
    next(error);
  }
};

// 휴가 취소 (수정!)
exports.cancelVacation = async (req, res, next) => {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🗑️  Cancel Vacation Request');
    console.log('Vacation ID:', req.params.id);
    
    const userEmail = req.user.email;
    const vacationRef = db.collection('vacations').doc(req.params.id);
    const vacationDoc = await vacationRef.get();

    if (!vacationDoc.exists) {
      console.log('❌ Vacation not found');
      return res.status(404).json({ error: 'Vacation request not found' });
    }

    const vacation = vacationDoc.data();

    // 본인 확인
    if (vacation.userId !== userEmail) {
      console.log('❌ Forbidden: Not owner');
      return res.status(403).json({ error: 'You can only cancel your own vacation requests' });
    }

    // pending 상태만 취소 가능
    if (vacation.status !== 'pending') {
      console.log('❌ Cannot cancel: Status is', vacation.status);
      return res.status(400).json({
        error: 'Only pending requests can be cancelled',
        currentStatus: vacation.status
      });
    }

    // ✅ 삭제 대신 상태만 변경
    await vacationRef.update({
      status: 'cancelled',
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      cancelledBy: userEmail,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Vacation cancelled:', req.params.id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    res.json({ 
      success: true,
      message: 'Vacation request cancelled successfully' 
    });

  } catch (error) {
    console.error('❌ Cancel vacation error:', error);
    next(error);
  }
};