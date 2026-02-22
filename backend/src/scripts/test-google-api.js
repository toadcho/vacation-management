require('dotenv').config();
const { google } = require('googleapis');

async function testGoogleAPI() {
  try {
    // OAuth2 클라이언트 설정
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    // Refresh Token 설정
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    // Calendar API 테스트
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const response = await calendar.calendarList.list();
    
    console.log('✅ Google Calendar API 연결 성공!');
    console.log('📅 캘린더 목록:');
    response.data.items.forEach(cal => {
      console.log(`  - ${cal.summary}`);
    });

  } catch (error) {
    console.error('❌ 에러:', error.message);
  }
}

testGoogleAPI();