const nodemailer = require('nodemailer');

const createTransport = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
};

// 승인 이메일 발송
exports.sendApprovalEmail = async (vacation) => {
  try {
    // ✅ to, userEmail, email 모두 fallback 처리
    const toEmail = vacation.to
      || vacation.userEmail
      || vacation.email
      || vacation.user?.email;

    if (!toEmail) {
      console.error('❌ 수신자 이메일 없음:', JSON.stringify(vacation));
      return;
    }

    console.log('📧 승인 이메일 발송 시도:', toEmail);

    // ✅ 휴가 일수 처리 - 0이나 0.5도 정상 표시
    const daysValue = (vacation.days !== undefined && vacation.days !== null) 
      ? vacation.days 
      : 0;

    // ✅ 반차 구분 표시 (시간 수정)
    let daysText = `${daysValue}일`;
    let timeInfo = '';
    
    if (daysValue === 0.5) {
      const isAfternoon = vacation.halfDayPeriod === 'afternoon' 
        || vacation.title?.includes('오후');
      
      if (isAfternoon) {
        daysText = '0.5일 (오후 반차)';
        timeInfo = '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>휴가 시간</strong></td><td style="padding: 8px; border: 1px solid #ddd; color: #0369A1; font-weight: bold;">14:00 ~ 18:00</td></tr>';
      } else {
        daysText = '0.5일 (오전 반차)';
        timeInfo = '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>휴가 시간</strong></td><td style="padding: 8px; border: 1px solid #ddd; color: #0369A1; font-weight: bold;">09:00 ~ 13:00</td></tr>';
      }
    }

    const transporter = createTransport();

    await transporter.sendMail({
      from: `"Watch2 휴가관리" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: `✅ 휴가 승인 완료 - ${vacation.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #047857;">✅ 휴가가 승인되었습니다</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>신청자</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${vacation.name || vacation.userName || ''}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>휴가 제목</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${vacation.title}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>휴가 기간</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${vacation.startDate} ~ ${vacation.endDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>휴가 일수</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${daysText}</td>
            </tr>
            ${timeInfo}
          </table>
          <p style="margin-top: 20px; color: #666;">문의사항은 관리자에게 연락하세요.</p>
        </div>
      `
    });

    console.log('✅ 승인 이메일 발송 성공:', toEmail);
  } catch (error) {
    console.error('Email error:', error.message);
  }
};
// 거부 이메일 발송
exports.sendRejectionEmail = async (vacation, reason) => {
  try {
    // ✅ to, userEmail, email 모두 fallback 처리
    const toEmail = vacation.to
      || vacation.userEmail
      || vacation.email
      || vacation.user?.email;

    if (!toEmail) {
      console.error('❌ 수신자 이메일 없음:', JSON.stringify(vacation));
      return;
    }

    console.log('📧 거부 이메일 발송 시도:', toEmail);

    const transporter = createTransport();

    await transporter.sendMail({
      from: `"Watch2 휴가관리" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: `❌ 휴가 거부 - ${vacation.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #B91C1C;">❌ 휴가 신청이 거부되었습니다</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>신청자</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${vacation.name || vacation.userName || ''}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>휴가 제목</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${vacation.title}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>휴가 기간</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${vacation.startDate} ~ ${vacation.endDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>거부 사유</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd; color: #B91C1C;">${reason || '사유 없음'}</td>
            </tr>
          </table>
          <p style="margin-top: 20px; color: #666;">문의사항은 관리자에게 연락하세요.</p>
        </div>
      `
    });

    console.log('✅ 거부 이메일 발송 성공:', toEmail);
  } catch (error) {
    console.error('Email error:', error.message);
  }
};
