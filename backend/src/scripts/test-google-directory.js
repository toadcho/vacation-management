const { google } = require('googleapis');
require('dotenv').config({ path: '/app/.env' });
const fs = require('fs'); // 파일 시스템 모듈 추가

async function testGoogleDirectory() {
  console.log('🔍 Google Workspace Directory API 테스트 시작\n');
  
  try {
    // 1. 환경변수 및 키 파일 확인
    const keyPath = '/app/credentials/serviceAccountKey.json';
    if (!fs.existsSync(keyPath)) {
      throw new Error(`키 파일을 찾을 수 없습니다: ${keyPath}`);
    }
    const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

    console.log('📋 환경 설정 확인:');
    console.log(`  GOOGLE_ADMIN_EMAIL: ${process.env.GOOGLE_ADMIN_EMAIL || '❌ 미설정'}`);
    console.log(`  서비스 계정: ${key.client_email}\n`);

    if (!process.env.GOOGLE_ADMIN_EMAIL) {
      throw new Error('GOOGLE_ADMIN_EMAIL 환경변수가 설정되지 않았습니다.');
    }

    // 2. 인증 클라이언트 생성 (JWT 방식)
    console.log('🔐 Google 인증 클라이언트 생성 중...');
    const auth = new google.auth.JWT(
      key.client_email,
      null,
      // 환경변수나 파일에서 읽어올 때 개행 문자가 깨지는 현상 방지
      key.private_key.replace(/\\n/g, '\n'), 
      ['https://www.googleapis.com/auth/admin.directory.user.readonly'],
      process.env.GOOGLE_ADMIN_EMAIL // impersonation(대행)할 관리자 이메일
    );

    const directory = google.admin({ 
      version: 'directory_v1', 
      auth 
    });
    console.log('✅ 인증 클라이언트 생성 완료\n');

    // 3. 사용자 목록 조회
    console.log('👥 watch2.co.kr 사용자 조회 중...\n');
    
    const response = await directory.users.list({
      customer: 'my_customer', 
      maxResults: 100,
      orderBy: 'email',
      fields: 'users(primaryEmail,name,orgUnitPath,suspended,archived,creationTime,lastLoginTime)'
    });
    
    const users = response.data.users || [];
    
    if (users.length === 0) {
      console.log('⚠️  조회된 사용자가 없습니다.\n');
      return;
    }

    // 4. 결과 출력
    console.log(`✅ 총 ${users.length}명의 사용자 조회 완료\n`);
    console.log('━'.repeat(100));
    console.log('📊 사용자 목록:\n');

    users.forEach((user, index) => {
      const status = user.suspended 
        ? '🔴 정지됨' 
        : user.archived 
        ? '📦 보관됨' 
        : '🟢 활성';

      console.log(`${index + 1}. ${user.name.fullName}`);
      console.log(`   📧 이메일: ${user.primaryEmail}`);
      console.log(`   📂 부서: ${user.orgUnitPath || '/'}`);
      console.log(`   ${status}`);
      
      if (user.creationTime) {
        console.log(`   📅 생성일: ${new Date(user.creationTime).toLocaleDateString('ko-KR')}`);
      }
      if (user.lastLoginTime) {
        console.log(`   🕐 마지막 로그인: ${new Date(user.lastLoginTime).toLocaleDateString('ko-KR')}`);
      }
      console.log('');
    });

    console.log('━'.repeat(100));
    
    // 5. 통계 출력
    const activeUsers = users.filter(u => !u.suspended && !u.archived).length;
    const suspendedUsers = users.filter(u => u.suspended).length;
    const archivedUsers = users.filter(u => u.archived).length;

    console.log('\n📈 통계:');
    console.log(`  전체: ${users.length}명`);
    console.log(`  활성: ${activeUsers}명`);
    console.log(`  정지: ${suspendedUsers}명`);
    console.log(`  보관: ${archivedUsers}명\n`);

    // 6. 부서별 분류
    const departments = {};
    users.forEach(user => {
      const dept = user.orgUnitPath || '/';
      departments[dept] = (departments[dept] || 0) + 1;
    });

    console.log('📊 부서별 인원:');
    Object.entries(departments)
      .sort((a, b) => b[1] - a[1])
      .forEach(([dept, count]) => {
        console.log(`  ${dept}: ${count}명`);
      });

    console.log('\n✅ 테스트 완료!\n');

  } catch (error) {
    console.error('\n❌ 에러 발생:\n');
    
    if (error.code === 'ENOENT') {
      console.error('서비스 계정 키 파일을 찾을 수 없습니다.');
      console.error('파일 경로: ./credentials/serviceAccountKey.json\n');
    } else if (error.message.includes('domain-wide delegation')) {
      console.error('도메인 전체 위임이 설정되지 않았습니다.');
      console.error('\n해결 방법:');
      console.error('1. Google Admin Console (admin.google.com) 접속');
      console.error('2. 보안 → API 제어 → 도메인 전체 위임 관리');
      console.error('3. 서비스 계정 클라이언트 ID 추가');
      console.error('4. OAuth 범위 추가: https://www.googleapis.com/auth/admin.directory.user.readonly\n');
    } else if (error.message.includes('Not Authorized')) {
      console.error('권한이 없습니다.');
      console.error('GOOGLE_ADMIN_EMAIL이 올바른 관리자 계정인지 확인하세요.\n');
    } else {
      console.error('에러 메시지:', error.message);
      if (error.errors) {
        console.error('상세 정보:', JSON.stringify(error.errors, null, 2));
      }
    }
    
    console.error('\n');
    process.exit(1);
  }
}

// 실행
testGoogleDirectory();
