#!/usr/bin/env node
require('dotenv').config();
const { google } = require('googleapis');

console.log('\n');
console.log('╔════════════════════════════════════════════════════╗');
console.log('║     🔐 Refresh Token 유효성 테스트                ║');
console.log('╚════════════════════════════════════════════════════╝');
console.log('\n');

async function testToken() {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    console.log('⏳ Access Token 발급 시도 중...\n');

    const { token } = await oauth2Client.getAccessToken();

    if (!token) {
      throw new Error('Access Token을 받지 못했습니다.');
    }

    console.log('✅ Access Token 발급 성공!');
    console.log(`📝 Token: ${token.substring(0, 30)}...\n`);

    console.log('─'.repeat(56) + '\n');
    console.log('✨ Refresh Token이 정상 작동합니다!');
    console.log('💡 다음 단계: node src/scripts/03-test-calendar.js\n');

  } catch (error) {
    console.log('─'.repeat(56) + '\n');
    console.error('❌ 에러 발생:', error.message);
    console.log('\n💡 해결 방법:\n');

    if (error.message.includes('invalid_grant')) {
      console.log('1. Refresh Token이 만료되었거나 잘못되었습니다');
      console.log('2. OAuth 2.0 Playground에서 새로 발급하세요');
      console.log('3. 기존 권한을 삭제하고 다시 인증하세요\n');
    } else if (error.message.includes('deleted_client')) {
      console.log('1. OAuth 클라이언트가 삭제되었습니다');
      console.log('2. Google Cloud Console에서 새로 생성하세요');
      console.log('3. 새 Client ID와 Secret으로 다시 설정하세요\n');
    } else if (error.message.includes('unauthorized_client')) {
      console.log('1. OAuth 동의 화면을 확인하세요');
      console.log('2. 테스트 사용자가 추가되었는지 확인하세요');
      console.log('3. 올바른 계정으로 로그인했는지 확인하세요\n');
    } else {
      console.log('1. .env 파일의 값이 정확한지 확인하세요');
      console.log('2. Google Cloud Console 설정을 확인하세요');
      console.log('3. API가 활성화되었는지 확인하세요\n');
    }

    process.exit(1);
  }
}

testToken();
