#!/usr/bin/env node
require('dotenv').config();
const { google } = require('googleapis');

console.log('\n');
console.log('╔════════════════════════════════════════════════════╗');
console.log('║     📅 Google Calendar API 테스트                  ║');
console.log('╚════════════════════════════════════════════════════╝');
console.log('\n');

async function testCalendar() {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    console.log('⏳ Calendar API 연결 중...\n');

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const response = await calendar.calendarList.list();

    console.log('✅ Calendar API 연결 성공!\n');
    console.log('📅 캘린더 목록:\n');

    response.data.items.forEach((cal, index) => {
      console.log(`   ${index + 1}. ${cal.summary}`);
      if (cal.primary) {
        console.log(`      (기본 캘린더)`);
      }
    });

    console.log('\n' + '─'.repeat(56) + '\n');

    console.log('⏳ 테스트 이벤트 생성 중...\n');

    const event = {
      summary: '[테스트] 휴가 시스템 연동 확인',
      description: 'Google Calendar API 테스트 이벤트입니다.',
      start: {
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        timeZone: 'Asia/Seoul',
      },
      end: {
        dateTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        timeZone: 'Asia/Seoul',
      },
    };

    const createdEvent = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    console.log('✅ 테스트 이벤트 생성 성공!');
    console.log(`📝 이벤트 ID: ${createdEvent.data.id}`);
    console.log(`🔗 링크: ${createdEvent.data.htmlLink}\n`);

    console.log('─'.repeat(56) + '\n');

    console.log('⏳ 테스트 이벤트 삭제 중...\n');

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: createdEvent.data.id,
    });

    console.log('✅ 테스트 이벤트 삭제 완료!\n');
    console.log('─'.repeat(56) + '\n');
    console.log('✨ Google Calendar API가 정상 작동합니다!');
    console.log('💡 다음 단계: node src/scripts/04-test-gmail.js\n');

  } catch (error) {
    console.log('─'.repeat(56) + '\n');
    console.error('❌ 에러 발생:', error.message);
    
    if (error.response) {
      console.log('상태 코드:', error.response.status);
      console.log('상세:', JSON.stringify(error.response.data, null, 2));
    }

    console.log('\n💡 해결 방법:\n');
    console.log('1. Google Calendar API가 활성화되었는지 확인하세요');
    console.log('2. OAuth 범위에 calendar 권한이 포함되었는지 확인하세요');
    console.log('3. Refresh Token을 다시 발급받으세요\n');

    process.exit(1);
  }
}

testCalendar();
