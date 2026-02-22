require('dotenv').config({ path: '/app/.env' });
const { google } = require('googleapis');
const fs = require('fs');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 Google Workspace Directory API 완전 진단');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 1. 환경변수 확인
console.log('📋 STEP 1: 환경변수 확인');
console.log('   GOOGLE_ADMIN_EMAIL:', process.env.GOOGLE_ADMIN_EMAIL || '❌ 미설정');
console.log('');

// 2. 서비스 계정 파일 확인
console.log('📄 STEP 2: 서비스 계정 파일 확인');
const keyPath = '/app/credentials/serviceAccountKey.json';

if (!fs.existsSync(keyPath)) {
  console.log('   ❌ 파일 없음:', keyPath);
  process.exit(1);
}

console.log('   ✅ 파일 존재:', keyPath);
const key = require(keyPath);
console.log('   📧 서비스 계정:', key.client_email);
console.log('   🆔 클라이언트 ID:', key.client_id);
console.log('   🏢 프로젝트 ID:', key.project_id);
console.log('');
console.log('   ┌─────────────────────────────────────────────────────────┐');
console.log('   │ Google Admin Console에 등록할 정보                        │');
console.log('   ├─────────────────────────────────────────────────────────┤');
console.log('   │ 클라이언트 ID (복사하세요):                               │');
console.log('   │', key.client_id.padEnd(55), '│');
console.log('   ├─────────────────────────────────────────────────────────┤');
console.log('   │ OAuth 범위 (복사하세요):                                  │');
console.log('   │ https://www.googleapis.com/auth/admin.directory.        │');
console.log('   │ user.readonly                                            │');
console.log('   └─────────────────────────────────────────────────────────┘');
console.log('');

// 3. API 테스트 함수
async function testAPI(testName, params) {
  console.log(`   ${testName}`);
  try {
    // 수정 후 (JWT 방식 권장)
    const auth = new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      ['https://www.googleapis.com/auth/admin.directory.user.readonly'],
      process.env.GOOGLE_ADMIN_EMAIL // subject
    );
    
    const directory = google.admin({ version: 'directory_v1', auth });
    const response = await directory.users.list({
      ...params,
      maxResults: 5
    });
    
    console.log('   ✅ 성공! 사용자 수:', response.data.users?.length || 0);
    
    if (response.data.users && response.data.users.length > 0) {
      console.log('   \n   📧 조회된 사용자:');
      response.data.users.forEach(u => {
        console.log('      -', u.primaryEmail, '|', u.name.fullName, '|', u.orgUnitPath || '/');
      });
    }
    
    return true;
  } catch (error) {
    console.log('   ❌ 실패:', error.message);
    
    if (error.code === 403) {
      console.log('   💡 403 에러 = 권한 없음');
      console.log('      → Admin SDK API 활성화 확인');
      console.log('      → 도메인 위임 설정 확인');
      console.log('      → hrcho@watch2.co.kr가 슈퍼 관리자인지 확인');
    } else if (error.code === 400) {
      console.log('   💡 400 에러 = 잘못된 요청');
      console.log('      → 클라이언트 ID가 정확한지 확인');
      console.log('      → OAuth 범위가 정확한지 확인');
      console.log('      → 도메인 위임 설정 전파 대기 (10~15분)');
    } else if (error.code === 401) {
      console.log('   💡 401 에러 = 인증 실패');
      console.log('      → serviceAccountKey.json 파일 확인');
      console.log('      → GOOGLE_ADMIN_EMAIL 확인');
    }
    
    if (error.response?.data) {
      console.log('   📄 상세 에러:', JSON.stringify(error.response.data, null, 2));
    }
    
    return false;
  }
}

// 메인 테스트 실행
async function runTests() {
  console.log('🧪 STEP 3: API 연결 테스트\n');
  
  // 테스트 1: my_customer
  const test1 = await testAPI(
    '테스트 1: customer="my_customer" 사용',
    { customer: 'my_customer' }
  );
  console.log('');
  
  // 테스트 2: domain
  const test2 = await testAPI(
    '테스트 2: domain="watch2.co.kr" 사용',
    { domain: 'watch2.co.kr' }
  );
  console.log('');
  
  // 요약
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 진단 요약\n');
  console.log('1. 환경변수:', process.env.GOOGLE_ADMIN_EMAIL ? '✅ 설정됨' : '❌ 미설정');
  console.log('2. 서비스 계정 파일:', fs.existsSync(keyPath) ? '✅ 존재함' : '❌ 없음');
  console.log('3. API 테스트 1 (my_customer):', test1 ? '✅ 성공' : '❌ 실패');
  console.log('4. API 테스트 2 (domain):', test2 ? '✅ 성공' : '❌ 실패');
  
  if (!test1 && !test2) {
    console.log('\n⚠️  모든 테스트 실패\n');
    console.log('💡 해결 방법:\n');
    console.log('1. Admin SDK API 활성화');
    console.log('   https://console.cloud.google.com/apis/library/admin.googleapis.com\n');
    console.log('2. 도메인 전체 위임 설정');
    console.log('   https://admin.google.com/ac/owl/domainwidedelegation');
    console.log('   → 위에 표시된 클라이언트 ID와 OAuth 범위 사용\n');
    console.log('3. hrcho@watch2.co.kr 계정이 슈퍼 관리자인지 확인');
    console.log('   https://admin.google.com/ac/users\n');
    console.log('4. 설정 후 10~15분 대기 후 다시 실행\n');
  } else if (test1 || test2) {
    console.log('\n✅ API 연결 성공!');
    console.log('   Google Workspace 사용자를 정상적으로 조회할 수 있습니다.\n');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// 실행
runTests().catch(err => {
  console.error('\n❌ 예상치 못한 에러:', err.message);
  console.error(err.stack);
  process.exit(1);
});
