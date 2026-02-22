const { google } = require('googleapis');
const { db, admin } = require('../config/firebase');
const fs = require('fs');

/**
 * Google Admin SDK 클라이언트 생성
 */
function getDirectoryClient() {
  const keyPath = '/app/credentials/serviceAccountKey.json';
  
  if (!fs.existsSync(keyPath)) {
    throw new Error(`서비스 계정 키 파일을 찾을 수 없습니다: ${keyPath}`);
  }
  
  const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  
  const auth = new google.auth.JWT(
    key.client_email,
    null,
    key.private_key.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/admin.directory.user.readonly'],
    process.env.GOOGLE_ADMIN_EMAIL
  );

  return google.admin({ version: 'directory_v1', auth });
}

/**
 * Google Workspace에서 전체 사용자 목록 가져오기
 */
async function fetchAllUsers() {
  try {
    const directory = getDirectoryClient();
    const users = [];
    let pageToken = null;

    do {
      const response = await directory.users.list({
        customer: 'my_customer',
        maxResults: 500,
        orderBy: 'email',
        pageToken: pageToken,
        fields: 'users(primaryEmail,name,orgUnitPath,suspended,archived,creationTime,lastLoginTime),nextPageToken'
      });

      if (response.data.users) {
        users.push(...response.data.users);
      }

      pageToken = response.data.nextPageToken;
    } while (pageToken);

    console.log(`✅ Google Workspace에서 ${users.length}명의 사용자 조회`);
    return users;

  } catch (error) {
    console.error('❌ Google Directory API 에러:', error.message);
    throw error;
  }
}

/**
 * Firestore에 사용자 동기화 (충돌 처리 포함)
 */
async function syncUsersToFirestore(updateExisting = false) {
  try {
    const googleUsers = await fetchAllUsers();
    const stats = { 
      added: 0, 
      updated: 0, 
      skipped: 0, 
      errors: 0,
      conflicts: 0  // 충돌 해결
    };

    for (const googleUser of googleUsers) {
      try {
        // 정지되거나 보관된 사용자는 제외
        if (googleUser.suspended || googleUser.archived) {
          console.log(`⏭️  건너뜀 (비활성): ${googleUser.primaryEmail}`);
          stats.skipped++;
          continue;
        }

        const email = googleUser.primaryEmail;
        const userRef = db.collection('users').doc(email);
        const userDoc = await userRef.get();

        // ✅ Google 사용자 기본 정보
        const googleData = {
          email: email,
          name: googleUser.name.fullName || googleUser.name.givenName,
          department: googleUser.orgUnitPath || '/',
          isActive: true,
          syncedFromGoogle: true,
          googleOrgUnit: googleUser.orgUnitPath,
          lastSyncedAt: new Date()
        };

        if (!userDoc.exists) {
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // 🆕 신규 사용자 생성
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          const newUser = {
            ...googleData,
            totalLeave: 15,      // 기본 연차
            usedLeave: 0,
            remainingLeave: 15,
            role: 'user',        // 기본 권한
            createdAt: new Date(),
            createdBy: 'google_sync'
          };
          
          await userRef.set(newUser);
          console.log(`✅ 신규 사용자 생성: ${email}`);
          stats.added++;

        } else {
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // 🔄 기존 사용자 업데이트
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          const existingData = userDoc.data();

          // 충돌 감지
          const wasManualUser = existingData.syncedFromGoogle === false || !existingData.syncedFromGoogle;
          if (wasManualUser) {
            console.log(`⚠️  충돌 감지: ${email} (수동 생성 → Google 동기화)`);
            stats.conflicts++;
          }

          if (updateExisting) {
            // 업데이트 모드: Google 정보로 갱신하되, 중요 데이터는 보존
            const updateData = {
              ...googleData,
              // ✅ 보존할 데이터
              totalLeave: existingData.totalLeave || 15,    // 휴가 정보 유지
              usedLeave: existingData.usedLeave || 0,
              remainingLeave: existingData.remainingLeave || 15,
              role: existingData.role || 'user',            // 권한 유지
              // Google 정보로 덮어쓸 데이터
              // name, department, isActive는 googleData에서 가져옴
            };

            await userRef.update(updateData);
            console.log(`🔄 사용자 업데이트: ${email}`);
            if (wasManualUser) {
              console.log(`   └─ 수동 → Google 동기화로 전환 (휴가/권한 유지)`);
            }
            stats.updated++;
          } else {
            console.log(`⏭️  건너뜀 (기존): ${email}`);
            stats.skipped++;
          }
        }

      } catch (error) {
        console.error(`❌ 사용자 동기화 실패 (${googleUser.primaryEmail}):`, error.message);
        stats.errors++;
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📊 결과 출력
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 동기화 결과:');
    console.log(`  ✅ 신규 추가: ${stats.added}명`);
    console.log(`  🔄 업데이트: ${stats.updated}명`);
    console.log(`  ⏭️  건너뜀: ${stats.skipped}명`);
    console.log(`  ⚠️  충돌 해결: ${stats.conflicts}명`);
    console.log(`  ❌ 에러: ${stats.errors}명`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return stats;

  } catch (error) {
    console.error('❌ 사용자 동기화 에러:', error);
    throw error;
  }
}

module.exports = {
  fetchAllUsers,
  syncUsersToFirestore
};