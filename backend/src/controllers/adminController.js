const { db } = require('../config/firebase');
const admin = require('firebase-admin');
const { calendar } = require('../config/google');
const { sendApprovalEmail, sendRejectionEmail } = require('../services/emailService');
const { syncUsersToFirestore, fetchAllUsers } = require('../services/googleDirectoryService');


// 모든 휴가 신청 조회
exports.getAllVacations = async (req, res, next) => {
  try {
    const { status, startDate, endDate } = req.query;

    let query = db.collection('vacations').orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    const vacations = [];

    snapshot.forEach(doc => {
      vacations.push({ id: doc.id, ...doc.data() });
    });

    res.json({
      count: vacations.length,
      vacations
    });

  } catch (error) {
    console.error('Get all vacations error:', error);
    next(error);
  }
};

// 휴가 승인
exports.approveVacation = async (req, res, next) => {
  try {
    const vacationRef = db.collection('vacations').doc(req.params.id);
    const vacationDoc = await vacationRef.get();

    if (!vacationDoc.exists) {
      return res.status(404).json({ error: 'Vacation request not found' });
    }

    const vacation = vacationDoc.data();

    if (vacation.status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    // 연차 차감 (연차인 경우)
    if (vacation.type === '연차') {
      const userRef = db.collection('users').doc(vacation.userId);
      const userDoc = await userRef.get();
      const userData = userDoc.data();

      const newUsedLeave = parseFloat(userData.usedLeave) + parseFloat(vacation.days);
      const newRemainingLeave = parseFloat(userData.totalLeave) - newUsedLeave;

      await userRef.update({
        usedLeave: newUsedLeave,
        remainingLeave: newRemainingLeave,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // ✅ Google Calendar에 이벤트 추가 (반차 시간 반영)
    let calendarEventId = null;
    try {
      let eventStart, eventEnd;

      // ✅ 반차 여부 확인 및 시간 설정
      if (vacation.days === 0.5) {
        const baseDate = vacation.startDate; // "2026-03-09" 형식
        
        // 제목에서 오전/오후 판단 또는 halfDayPeriod 필드 사용
        const isAfternoon = vacation.halfDayPeriod === 'afternoon' 
          || vacation.title?.includes('오후');
        
        if (isAfternoon) {
          // 오후 반차: 14:00 ~ 18:00
          eventStart = {
            dateTime: `${baseDate}T14:00:00`,
            timeZone: 'Asia/Seoul'
          };
          eventEnd = {
            dateTime: `${baseDate}T18:00:00`,
            timeZone: 'Asia/Seoul'
          };
        } else {
          // 오전 반차: 09:00 ~ 13:00 (기본값)
          eventStart = {
            dateTime: `${baseDate}T09:00:00`,
            timeZone: 'Asia/Seoul'
          };
          eventEnd = {
            dateTime: `${baseDate}T13:00:00`,
            timeZone: 'Asia/Seoul'
          };
        }
      } else {
        // 종일 휴가 (기존 로직)
        eventStart = {
          date: vacation.startDate,
          timeZone: 'Asia/Seoul'
        };
        eventEnd = {
          date: new Date(new Date(vacation.endDate).getTime() + 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0],
          timeZone: 'Asia/Seoul'
        };
      }

      const event = {
        summary: `[${vacation.type}] ${vacation.title}`,
        description: `신청자: ${vacation.userName}\n사유: ${vacation.reason || ''}${
          vacation.days === 0.5 
            ? `\n반차 종류: ${vacation.title?.includes('오후') ? '오후' : '오전'} 반차` 
            : ''
        }`,
        start: eventStart,
        end: eventEnd,
        attendees: [{ email: vacation.userEmail }],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: vacation.days === 0.5 ? 30 : 1440 }
          ]
        }
      };

      const calendarResponse = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        sendUpdates: 'all'  // ✅ 참석자에게 이메일 알림
      });

      calendarEventId = calendarResponse.data.id;
      
      console.log(`✅ Calendar event created: ${calendarEventId} (${
        vacation.days === 0.5 
          ? vacation.title?.includes('오후') ? '오후 반차' : '오전 반차'
          : `${vacation.days}일`
      })`);
      
    } catch (calError) {
      console.error('Calendar error:', calError);
      // 캘린더 실패해도 승인은 진행
    }

    // 휴가 상태 업데이트
    await vacationRef.update({
      status: 'approved',
      approvedBy: req.user.uid,
      approvedByName: req.user.name || req.user.displayName || req.user.email,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      googleCalendarEventId: calendarEventId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // ✅ 승인 이메일 발송
    try {
      await sendApprovalEmail({
        to: vacation.userEmail,          // ✅ 'to'로 수정
        userEmail: vacation.userEmail,   // ← 기존 유지
        userName: vacation.userName,
        title: vacation.title,
        startDate: vacation.startDate,
        endDate: vacation.endDate,
        days: vacation.days
      });
    } catch (emailError) {
      console.error('Email error:', emailError);
    }

    res.json({ 
      message: 'Vacation approved successfully',
      calendarEventId
    });

  } catch (error) {
    console.error('Approve vacation error:', error);
    next(error);
  }
};
// 휴가 거부
exports.rejectVacation = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const vacationRef = db.collection('vacations').doc(req.params.id);
    const vacationDoc = await vacationRef.get();

    if (!vacationDoc.exists) {
      return res.status(404).json({ error: 'Vacation request not found' });
    }

    const vacation = vacationDoc.data();

    if (vacation.status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    await vacationRef.update({
      status: 'rejected',
      approvedBy: req.user.uid,
      approvedByName: req.user.name  // ← 추가!
          || req.user.displayName  // ← fallback
          || req.user.email,       // ← fallback
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      rejectedReason: reason || '승인 불가',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 거부 이메일 발송 (선택사항)
    try {
      await sendRejectionEmail({
        userEmail: vacation.userEmail,   
        userName: vacation.userName,
        title: vacation.title,
        reason: reason || '승인 불가'
      });
    } catch (emailError) {
      console.error('Email error:', emailError);
    }

    res.json({ message: 'Vacation rejected successfully' });

  } catch (error) {
    console.error('Reject vacation error:', error);
    next(error);
  }
};

// 통계 조회
exports.getStatistics = async (req, res, next) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const vacationsSnapshot = await db.collection('vacations').get();

    const stats = {
      totalUsers: 0,
      totalVacations: 0,
      pendingVacations: 0,
      approvedVacations: 0,
      rejectedVacations: 0,
      cancelledVacations: 0,
      approvedThisMonth: 0,      // ← 추가
      approvedLastMonth: 0,      // ← 추가 (전월 대비 계산용)
      totalDaysUsed: 0,
      averageUsageRate: 0
    };

    let totalUsageRate = 0;

    // 이번 달과 지난 달 범위 계산
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    usersSnapshot.forEach(doc => {
      const user = doc.data();
      stats.totalUsers++;
      if (user.totalLeave > 0) {
        totalUsageRate += (user.usedLeave / user.totalLeave) * 100;
      }
    });

    vacationsSnapshot.forEach(doc => {
      const vacation = doc.data();
      stats.totalVacations++;
      
      if (vacation.status === 'pending') stats.pendingVacations++;
      if (vacation.status === 'approved') {
        stats.approvedVacations++;
        stats.totalDaysUsed += vacation.days || 0;

        // 승인일 기준 이번 달/지난 달 카운트
        if (vacation.approvedAt) {
          let approvedDate;
          
          // Firestore Timestamp 처리
          if (vacation.approvedAt._seconds) {
            approvedDate = new Date(vacation.approvedAt._seconds * 1000);
          } else if (vacation.approvedAt.toDate) {
            approvedDate = vacation.approvedAt.toDate();
          } else {
            approvedDate = new Date(vacation.approvedAt);
          }

          // 유효한 날짜인지 확인
          if (!isNaN(approvedDate.getTime())) {
            // 이번 달 승인
            if (approvedDate >= thisMonthStart) {
              stats.approvedThisMonth++;
            }
            
            // 지난 달 승인
            if (approvedDate >= lastMonthStart && approvedDate <= lastMonthEnd) {
              stats.approvedLastMonth++;
            }
          }
        }
      }
      if (vacation.status === 'rejected') stats.rejectedVacations++;
      if (vacation.status === 'cancelled') stats.cancelledVacations++; 
    });

    stats.averageUsageRate = stats.totalUsers > 0 
      ? (totalUsageRate / stats.totalUsers).toFixed(1) 
      : 0;
    
      // 전월 대비 증감률 계산
    let monthOverMonthChange = 0;
    if (stats.approvedLastMonth > 0) {
      monthOverMonthChange = Math.round(
        ((stats.approvedThisMonth - stats.approvedLastMonth) / stats.approvedLastMonth) * 100
      );
    } else if (stats.approvedThisMonth > 0) {
      monthOverMonthChange = 100; // 지난 달 0건 → 이번 달 N건
    }
    
    stats.monthOverMonthChange = monthOverMonthChange;
    
    console.log('📊 통계:', {
      이번달승인: stats.approvedThisMonth,
      지난달승인: stats.approvedLastMonth,
      증감률: `${stats.monthOverMonthChange}%`
    });
    
    res.json({ statistics: stats });

  } catch (error) {
    console.error('Get statistics error:', error);
    next(error);
  }
};

// 사용자별 통계
exports.getUserStatistics = async (req, res, next) => {
  try {
    const usersSnapshot = await db.collection('users')
      .orderBy('usedLeave', 'desc')
      .get();

    const userStats = [];

    for (const doc of usersSnapshot.docs) {
      const user = doc.data();
      
      // 해당 사용자의 승인된 휴가 수
      const vacationsSnapshot = await db.collection('vacations')
        .where('userId', '==', doc.id)
        .where('status', '==', 'approved')
        .get();

      userStats.push({
        userId: doc.id,
        name: user.name,
        email: user.email,
        department: user.department,
        totalLeave: user.totalLeave,
        usedLeave: user.usedLeave,
        remainingLeave: user.remainingLeave,
        usageRate: ((user.usedLeave / user.totalLeave) * 100).toFixed(1),
        vacationCount: vacationsSnapshot.size
      });
    }

    res.json({
      count: userStats.length,
      statistics: userStats
    });

  } catch (error) {
    console.error('Get user statistics error:', error);
    next(error);
  }
};

/**
 * Firestore 전체 직원 목록 조회
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = [];

    usersSnapshot.forEach(doc => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      users,
      total: users.length
    });
  } catch (error) {
    console.error('Get all users error:', error);
    next(error);
  }
};

/**
 * 직원 정보 수정 (이름, 부서, 연차만)
 */
exports.updateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { name, department, totalLeave, role } = req.body;

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (department) updateData.department = department;
    if (role) updateData.role = role;
    
    if (totalLeave !== undefined) {
      updateData.totalLeave = parseFloat(totalLeave);
      const userData = userDoc.data();
      updateData.remainingLeave = parseFloat(totalLeave) - parseFloat(userData.usedLeave || 0);
    }

    updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await userRef.update(updateData);

    res.json({
      success: true,
      message: '사용자 정보가 수정되었습니다.'
    });
  } catch (error) {
    console.error('Update user error:', error);
    next(error);
  }
};

/**
 * Google Workspace 사용자 조회 (수정됨)
 */
exports.getGoogleUsers = async (req, res, next) => {
  try {
    const { fetchAllUsers } = require('../services/googleDirectoryService');
    const users = await fetchAllUsers();

    res.json({
      success: true,
      users: users.map(u => ({
        email: u.primaryEmail,
        name: u.name.fullName,
        department: u.orgUnitPath || '/',
        status: u.suspended ? '정지됨' : u.archived ? '보관됨' : '활성',
        createdAt: u.creationTime,
        lastLogin: u.lastLoginTime
      })),
      total: users.length
    });
  } catch (error) {
    console.error('Get Google users error:', error);
    
    // 더 자세한 에러 메시지 전달
    let errorMessage = '사용자 목록을 불러오는데 실패했습니다.';
    
    if (error.message.includes('Not Authorized')) {
      errorMessage = 'Google Workspace 권한이 없습니다. 도메인 위임 설정을 확인하세요.';
    } else if (error.message.includes('키 파일')) {
      errorMessage = '서비스 계정 키 파일을 찾을 수 없습니다.';
    }
    
    res.status(500).json({ 
      success: false,
      error: errorMessage,
      details: error.message 
    });
  }
};

/**
 * Google Workspace 동기화 (수정됨)
 */
exports.syncGoogleUsers = async (req, res, next) => {
  try {
    const { syncUsersToFirestore } = require('../services/googleDirectoryService');
    const { updateExisting } = req.body;

    const stats = await syncUsersToFirestore(updateExisting || false);

    res.json({
      success: true,
      message: '사용자 동기화 완료',
      stats
    });
  } catch (error) {
    console.error('Sync users error:', error);
    
    let errorMessage = '동기화에 실패했습니다.';
    
    if (error.message.includes('Not Authorized')) {
      errorMessage = 'Google Workspace 권한이 없습니다. 도메인 위임 설정을 확인하세요.';
    } else if (error.message.includes('키 파일')) {
      errorMessage = '서비스 계정 키 파일을 찾을 수 없습니다.';
    }
    
    res.status(500).json({ 
      success: false,
      error: errorMessage,
      details: error.message 
    });
  }
};