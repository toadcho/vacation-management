#!/usr/bin/env node
require('dotenv').config();

console.log('\n');
console.log('╔════════════════════════════════════════════════════╗');
console.log('║     🔍 Google OAuth 환경 변수 확인                ║');
console.log('╚════════════════════════════════════════════════════╝');
console.log('\n');

const checks = {
  'GOOGLE_CLIENT_ID': process.env.GOOGLE_CLIENT_ID,
  'GOOGLE_CLIENT_SECRET': process.env.GOOGLE_CLIENT_SECRET,
  'GOOGLE_REFRESH_TOKEN': process.env.GOOGLE_REFRESH_TOKEN,
  'GMAIL_USER': process.env.GMAIL_USER,
  'GMAIL_APP_PASSWORD': process.env.GMAIL_APP_PASSWORD
};

let allPassed = true;

Object.entries(checks).forEach(([key, value]) => {
  if (value) {
    const masked = value.length > 20 
      ? value.substring(0, 20) + '...' 
      : value;
    console.log(`✅ ${key.padEnd(25)} ${masked}`);
  } else {
    console.log(`❌ ${key.padEnd(25)} 설정되지 않음`);
    allPassed = false;
  }
});

console.log('\n' + '─'.repeat(56) + '\n');

if (allPassed) {
  console.log('✨ 모든 환경 변수가 설정되었습니다!');
  console.log('💡 다음 단계: node src/scripts/02-test-token.js\n');
  process.exit(0);
} else {
  console.log('❌ 일부 환경 변수가 설정되지 않았습니다.');
  console.log('💡 .env 파일을 확인하세요.\n');
  process.exit(1);
}
