require('dotenv').config();

console.log('═══════════════════════════════════════');
console.log('🔍 환경 변수 확인');
console.log('═══════════════════════════════════════\n');

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

console.log('CLIENT_ID:', clientId ? 
  `✅ ${clientId.substring(0, 20)}...` : '❌ 없음');
console.log('CLIENT_SECRET:', clientSecret ? 
  `✅ ${clientSecret.substring(0, 15)}...` : '❌ 없음');
console.log('REFRESH_TOKEN:', refreshToken ? 
  `✅ ${refreshToken.substring(0, 15)}...` : '❌ 없음');

if (!clientId || !clientSecret || !refreshToken) {
  console.log('\n❌ 환경 변수가 설정되지 않았습니다.');
  console.log('💡 .env 파일을 확인하세요.\n');
  process.exit(1);
}

console.log('\n═══════════════════════════════════════');
console.log('📡 Google API 연결 테스트');
console.log('═══════════════════════════════════════\n');

const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret
);

oauth2Client.setCredentials({
  refresh_token: refreshToken
});

// Access Token 발급 테스트
oauth2Client.getAccessToken()
  .then(({ token }) => {
    console.log('✅ Access Token 발급 성공!');
    console.log('Token:', token.substring(0, 20) + '...\n');
    
    // Calendar API 테스트
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    return calendar.calendarList.list();
  })
  .then((response) => {
    console.log('✅ Google Calendar API 연결 성공!\n');
    console.log('📅 캘린더 목록:');
    response.data.items.forEach(cal => {
      console.log(`  - ${cal.summary}`);
    });
    console.log('\n✨ 모든 테스트 통과!\n');
  })
  .catch((error) => {
    console.error('❌ 에러 발생:', error.message);
    
    if (error.message.includes('unauthorized_client')) {
      console.log('\n💡 해결 방법:');
      console.log('1. Google Cloud Console에서 OAuth 동의 화면 확인');
      console.log('2. 테스트 사용자에 본인 계정이 추가되었는지 확인');
      console.log('3. OAuth 2.0 Playground에서 새로운 Refresh Token 발급');
      console.log('4. .env 파일에 정확히 복사했는지 확인\n');
    }
    
    if (error.message.includes('invalid_grant')) {
      console.log('\n💡 해결 방법:');
      console.log('1. Refresh Token이 만료되었거나 잘못되었습니다');
      console.log('2. OAuth 2.0 Playground에서 새로 발급하세요');
      console.log('3. "prompt: consent" 옵션을 사용하세요\n');
    }
  });
