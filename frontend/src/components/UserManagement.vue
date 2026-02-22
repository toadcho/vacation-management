<template>
  <div class="user-management">
    <!-- 기존 헤더, 통계, 필터 등... -->

    <!-- 직원 목록 테이블 -->
    <div class="table-container">
      <table class="user-table">
        <thead>
          <tr>
            <th>상태</th>
            <th>이름</th>
            <th>이메일</th>
            <th>부서</th>
            <th>총 연차</th>
            <th>사용</th>
            <th>잔여</th>
            <th>권한</th>
            <th>동기화</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in filteredUsers" :key="user.id">
            <td>
              <span v-if="user.isActive !== false" class="status-badge active">활성</span>
              <span v-else class="status-badge inactive">비활성</span>
            </td>
            <td>{{ user.name }}</td>
            <td class="email">{{ user.email }}</td>
            <td>{{ user.department || '-' }}</td>
            <td>{{ user.totalLeave || 0 }}일</td>
            <td>{{ user.usedLeave || 0 }}일</td>
            <td>{{ user.remainingLeave || 0 }}일</td>
            <td>
              <span :class="'badge badge-' + user.role">
                {{ getRoleText(user.role) }}
              </span>
            </td>
            <td>
              <span v-if="user.syncedFromGoogle" class="badge badge-success">✓</span>
              <span v-else class="badge badge-gray">-</span>
            </td>
            <td>
              <div class="action-buttons">
                <button @click="editUser(user)" class="btn-edit" title="수정">✏️</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ✅ 편집 모달 -->
    <div v-if="showEditModal" class="modal-overlay" @click="closeEditModal">
      <div class="modal" @click.stop>
        <h3>✏️ 직원 정보 수정</h3>
        
        <form @submit.prevent="saveUser">
          <div class="form-group">
            <label>이메일</label>
            <input 
              v-model="editForm.email" 
              type="email" 
              disabled
            />
            <small>이메일은 변경할 수 없습니다</small>
          </div>

          <div class="form-group">
            <label>이름 <span class="required">*</span></label>
            <input v-model="editForm.name" type="text" required />
          </div>
          
          <div class="form-group">
            <label>부서</label>
            <input v-model="editForm.department" type="text" />
          </div>
          
          <div class="form-group">
            <label>총 연차 <span class="required">*</span></label>
            <input 
              v-model.number="editForm.totalLeave" 
              type="number" 
              step="0.5" 
              min="0" 
              max="30"
              required 
            />
            <small>사용 연차: {{ editForm.usedLeave }}일 / 잔여: {{ remainingLeave }}일</small>
          </div>
          
          <div class="form-group">
            <label>권한 <span class="required">*</span></label>
            <select v-model="editForm.role" required>
              <option value="user">일반 사용자</option>
              <option value="admin">관리자</option>
            </select>
          </div>

          <div class="modal-actions">
            <button type="button" @click="closeEditModal" class="btn-cancel">취소</button>
            <button type="submit" class="btn-primary">저장</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Google 동기화 모달 (기존 유지) -->
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { userApi } from '../services/api';

export default {
  name: 'UserManagement',
  setup() {
    const users = ref([]);
    const showSyncModal = ref(false);
    const showEditModal = ref(false);
    const updateExisting = ref(false);
    const syncing = ref(false);
    const searchQuery = ref('');
    const filterStatus = ref('all');
    const isEditing = ref(false);
    
    const editForm = ref({
      id: '',
      email: '',
      name: '',
      department: '',
      totalLeave: 15,
      usedLeave: 0,
      role: 'user'
    });

    const loadUsers = async () => {
      try {
        console.log('📡 사용자 조회 시작...');
        
        const response = await userApi.getAll();
        
        console.log('📦 API 응답:', response);
        
        if (response && response.users) {
          users.value = response.users;
        } else if (Array.isArray(response)) {
          users.value = response;
        } else {
          console.warn('⚠️ 예상치 못한 응답 구조:', response);
          users.value = [];
        }
        
        console.log('✅ 사용자 목록:', users.value.length + '명');
        
      } catch (error) {
        console.error('❌ 사용자 조회 실패:', error);
        alert('사용자 목록을 불러오는데 실패했습니다: ' + error.message);
      }
    };

    // ✅ 편집 모달 열기
    const editUser = (user) => {
      isEditing.value = true;
      editForm.value = {
        id: user.id,
        email: user.email,
        name: user.name || '',
        department: user.department || '',
        totalLeave: user.totalLeave || 15,
        usedLeave: user.usedLeave || 0,
        role: user.role || 'user'
      };
      showEditModal.value = true;
    };

    // ✅ 편집 모달 닫기
    const closeEditModal = () => {
      showEditModal.value = false;
      editForm.value = {
        id: '',
        email: '',
        name: '',
        department: '',
        totalLeave: 15,
        usedLeave: 0,
        role: 'user'
      };
    };

    // ✅ 저장 (수정만 가능)
    const saveUser = async () => {
      try {
        await userApi.update(editForm.value.id, {
          name: editForm.value.name,
          department: editForm.value.department,
          totalLeave: editForm.value.totalLeave,
          role: editForm.value.role
        });
        
        alert('수정되었습니다.');
        closeEditModal();
        await loadUsers();
      } catch (error) {
        console.error('저장 실패:', error);
        alert(error.response?.data?.error || '저장에 실패했습니다.');
      }
    };

    const syncUsers = async () => {
      try {
        syncing.value = true;
        
        console.log('🔄 동기화 시작...');
        
        const response = await userApi.syncGoogleUsers(updateExisting.value);
        
        console.log('✅ 동기화 성공:', response);
        
        alert(`동기화 완료!\n신규: ${response.stats?.added || 0}명\n업데이트: ${response.stats?.updated || 0}명`);
        
        showSyncModal.value = false;
        await loadUsers();
      } catch (error) {
        console.error('❌ 동기화 실패:', error);
        
        const errorMsg = error.response?.data?.error 
          || error.response?.data?.message 
          || error.message 
          || '알 수 없는 오류';
        
        alert('동기화에 실패했습니다: ' + errorMsg);
      } finally {
        syncing.value = false;
      }
    };

    // 통계
    const totalUsers = computed(() => users.value.length);
    const activeUsers = computed(() => users.value.filter(u => u.isActive !== false).length);
    const inactiveUsers = computed(() => users.value.filter(u => u.isActive === false).length);
    const syncedUsers = computed(() => users.value.filter(u => u.syncedFromGoogle).length);
    
    const remainingLeave = computed(() => {
      const total = parseFloat(editForm.value.totalLeave) || 0;
      const used = parseFloat(editForm.value.usedLeave) || 0;
      return (total - used).toFixed(1);
    });

    // 필터링
    const filteredUsers = computed(() => {
      let result = [...users.value];

      if (filterStatus.value === 'active') {
        result = result.filter(u => u.isActive !== false);
      } else if (filterStatus.value === 'inactive') {
        result = result.filter(u => u.isActive === false);
      }

      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(u => 
          u.name?.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query)
        );
      }

      return result;
    });

    const getRoleText = (role) => {
      return role === 'admin' ? '관리자' : '사용자';
    };

    onMounted(() => {
      loadUsers();
    });

    return {
      users,
      showSyncModal,
      showEditModal,
      updateExisting,
      syncing,
      searchQuery,
      filterStatus,
      isEditing,
      editForm,
      totalUsers,
      activeUsers,
      inactiveUsers,
      syncedUsers,
      remainingLeave,
      filteredUsers,
      loadUsers,
      editUser,        // ✅ 추가
      closeEditModal,  // ✅ 추가
      saveUser,        // ✅ 추가
      syncUsers,
      getRoleText
    };
  }
};
</script>

<style scoped>
.user-management {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.actions {
  display: flex;
  gap: 10px;
}

.btn-sync, .btn-refresh {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.btn-sync {
  background: #0369A1;
  color: white;
}

.btn-refresh {
  background: #E5E7EB;
  color: #374151;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #0369A1;
}

.stat-label {
  color: #6B7280;
  margin-top: 5px;
}

.search-box {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 14px;
}

.table-container {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.user-table {
  width: 100%;
  border-collapse: collapse;
}

.user-table th {
  background: #F3F4F6;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #374151;
}

.user-table td {
  padding: 12px;
  border-top: 1px solid #E5E7EB;
}

.email {
  color: #6B7280;
  font-size: 13px;
}

.low-leave {
  color: #DC2626;
  font-weight: 600;
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.badge-admin {
  background: #FEE2E2;
  color: #DC2626;
}

.badge-user {
  background: #E0F2FE;
  color: #0369A1;
}

.badge-success {
  background: #D1FAE5;
  color: #047857;
}

.badge-gray {
  background: #F3F4F6;
  color: #9CA3AF;
}

.btn-edit {
  padding: 6px 12px;
  background: #E0F2FE;
  color: #0369A1;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.btn-edit:hover {
  background: #BAE6FD;
}

/* 모달 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 30px;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal h3 {
  margin-bottom: 15px;
}

.sync-options {
  margin: 20px 0;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #374151;
}

.form-group input, .form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.btn-cancel {
  padding: 10px 20px;
  background: #E5E7EB;
  color: #374151;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-primary {
  padding: 10px 20px;
  background: #0369A1;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>