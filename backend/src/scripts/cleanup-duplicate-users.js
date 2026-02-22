require('dotenv').config();
const { db } = require('../config/firebase');

async function cleanupDuplicateUsers() {
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 중복 사용자 검색 및 정리 시작');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // 1. 모든 사용자 문서 조회
    console.log('📡 Firestore에서 모든 사용자 조회 중...\n');
    const snapshot = await db.collection('users').get();
    
    console.log(`✅ 총 ${snapshot.size}개 문서 조회 완료\n`);
    
    // 2. 이메일별로 그룹화
    const emailMap = {};
    const duplicates = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const email = data.email;
      
      if (!email) {
        console.log(`⚠️  경고: 이메일 없는 문서 발견 (ID: ${doc.id})`);
        return;
      }
      
      if (!emailMap[email]) {
        emailMap[email] = [];
      }
      
      emailMap[email].push({
        id: doc.id,
        data: data
      });
    });
    
    // 3. 중복 찾기
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 중복 검사 결과\n');
    
    for (const [email, docs] of Object.entries(emailMap)) {
      if (docs.length > 1) {
        console.log(`⚠️  중복 발견: ${email} (${docs.length}개 문서)\n`);
        
        docs.forEach((doc, idx) => {
          console.log(`   ${idx + 1}. 문서 ID: ${doc.id}`);
          console.log(`      ├─ 이름: ${doc.data.name || 'N/A'}`);
          console.log(`      ├─ 권한: ${doc.data.role || 'N/A'}`);
          console.log(`      ├─ 부서: ${doc.data.department || 'N/A'}`);
          console.log(`      ├─ 총 연차: ${doc.data.totalLeave || 'N/A'}일`);
          console.log(`      ├─ 사용 연차: ${doc.data.usedLeave || 'N/A'}일`);
          console.log(`      ├─ Google 동기화: ${doc.data.syncedFromGoogle ? 'O' : 'X'}`);
          console.log(`      └─ 생성일: ${doc.data.createdAt ? new Date(doc.data.createdAt.toDate()).toLocaleDateString('ko-KR') : 'N/A'}\n`);
        });
        
        duplicates.push({ email, docs });
      }
    }
    
    if (duplicates.length === 0) {
      console.log('✅ 중복된 사용자 없음 - 정리 불필요\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return;
    }
    
    console.log(`⚠️  총 ${duplicates.length}명의 중복 사용자 발견\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // 4. 병합 및 정리
    console.log('🔄 중복 데이터 병합 시작...\n');
    
    let mergedCount = 0;
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const { email, docs } of duplicates) {
      try {
        console.log(`📧 처리 중: ${email}`);
        
        // 이메일 ID 문서 찾기
        const emailDoc = docs.find(d => d.id === email);
        const uidDocs = docs.filter(d => d.id !== email);
        
        if (!emailDoc) {
          // 이메일 ID 문서가 없으면 첫 번째 UID 문서를 이메일 ID로 복사
          console.log(`   💡 이메일 ID 문서 없음 - 첫 번째 UID 문서를 이메일 ID로 복사`);
          
          const firstDoc = uidDocs[0];
          await db.collection('users').doc(email).set(firstDoc.data);
          console.log(`   ✅ 이메일 ID 문서 생성: ${email}`);
          
          // 모든 UID 문서 삭제
          for (const uidDoc of uidDocs) {
            await db.collection('users').doc(uidDoc.id).delete();
            console.log(`   🗑️  UID 문서 삭제: ${uidDoc.id}`);
            deletedCount++;
          }
          
          mergedCount++;
          console.log(`   ✅ 완료\n`);
          continue;
        }
        
        // 이메일 ID 문서 존재 - 데이터 병합
        let mergedData = { ...emailDoc.data };
        let hasChanges = false;
        
        console.log(`   📦 기존 이메일 ID 문서 발견`);
        
        for (const uidDoc of uidDocs) {
          // 더 나은 데이터로 업데이트
          
          // 권한 (admin 우선)
          if (uidDoc.data.role === 'admin' && mergedData.role !== 'admin') {
            console.log(`   🔼 권한 업그레이드: user → admin`);
            mergedData.role = 'admin';
            hasChanges = true;
          }
          
          // 사용 연차 (더 큰 값 사용)
          if ((uidDoc.data.usedLeave || 0) > (mergedData.usedLeave || 0)) {
            console.log(`   🔼 사용 연차 업데이트: ${mergedData.usedLeave || 0}일 → ${uidDoc.data.usedLeave}일`);
            mergedData.usedLeave = uidDoc.data.usedLeave;
            mergedData.remainingLeave = (mergedData.totalLeave || 15) - uidDoc.data.usedLeave;
            hasChanges = true;
          }
          
          // 이름 (더 구체적인 이름 사용)
          if (uidDoc.data.name && uidDoc.data.name.length > (mergedData.name || '').length) {
            console.log(`   🔼 이름 업데이트: ${mergedData.name || 'N/A'} → ${uidDoc.data.name}`);
            mergedData.name = uidDoc.data.name;
            hasChanges = true;
          }
          
          // 부서 (값이 있으면 사용)
          if (uidDoc.data.department && !mergedData.department) {
            console.log(`   🔼 부서 추가: ${uidDoc.data.department}`);
            mergedData.department = uidDoc.data.department;
            hasChanges = true;
          }
        }
        
        // 병합 완료 표시
        mergedData.mergedAt = new Date();
        mergedData.mergedFrom = uidDocs.map(d => d.id);
        
        // 이메일 ID 문서 업데이트
        if (hasChanges) {
          await db.collection('users').doc(email).update(mergedData);
          console.log(`   ✅ 이메일 ID 문서 업데이트 완료`);
        } else {
          console.log(`   ℹ️  변경 사항 없음`);
        }
        
        // UID 문서 삭제
        for (const uidDoc of uidDocs) {
          await db.collection('users').doc(uidDoc.id).delete();
          console.log(`   🗑️  UID 문서 삭제: ${uidDoc.id.substring(0, 20)}...`);
          deletedCount++;
        }
        
        mergedCount++;
        console.log(`   ✅ 완료\n`);
        
      } catch (error) {
        console.error(`   ❌ 에러: ${error.message}\n`);
        errorCount++;
      }
    }
    
    // 5. 결과 출력
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 정리 완료 - 결과 요약\n');
    console.log(`  ✅ 병합된 사용자: ${mergedCount}명`);
    console.log(`  🗑️  삭제된 문서: ${deletedCount}개`);
    console.log(`  ❌ 에러 발생: ${errorCount}건`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // 6. 최종 확인
    console.log('🔍 최종 사용자 목록 확인...\n');
    const finalSnapshot = await db.collection('users').get();
    
    console.log(`총 ${finalSnapshot.size}개 문서 존재:\n`);
    
    finalSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  📧 ${data.email}`);
      console.log(`     ├─ 문서 ID: ${doc.id}`);
      console.log(`     ├─ 이름: ${data.name}`);
      console.log(`     ├─ 권한: ${data.role}`);
      console.log(`     └─ Google 동기화: ${data.syncedFromGoogle ? 'O' : 'X'}\n`);
    });
    
    console.log('✅ 모든 작업 완료!\n');
    
  } catch (error) {
    console.error('\n❌ 예상치 못한 에러 발생:');
    console.error(error);
    process.exit(1);
  }
}

// 실행
cleanupDuplicateUsers()
  .then(() => {
    console.log('🎉 프로그램 정상 종료\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 프로그램 비정상 종료:', error);
    process.exit(1);
  });
