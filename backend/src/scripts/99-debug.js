require('dotenv').config();
const { google } = require('googleapis');

console.log('\n🔍 상세 디버깅 정보\n');
console.log('CLIENT_ID:', process.env.GOOGLE_CLIENT_ID || '❌ 없음');
console.log('CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET || '❌ 없음');
console.log('REFRESH_TOKEN:', process.env.GOOGLE_REFRESH_TOKEN || '❌ 없음');
console.log('\n');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

oauth2Client.getAccessToken()
  .then(({ token }) => {
    console.log('✅ 성공!');
    console.log('Token:', token.substring(0, 30) + '...');
  })
  .catch((error) => {
    console.log('❌ 에러:', error.message);
    console.log('\n전체 에러:');
    console.log(JSON.stringify(error, null, 2));
  });
